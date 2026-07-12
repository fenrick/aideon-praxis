//! The derived SQLite projection — a rebuildable cache of the canonical op log,
//! never an authoritative store ([ADR-0001], [ADR-0027]).
//!
//! M0 owns only the **foundation** projections: the applied-operation registry,
//! the actor registry, the partition registry, the authored-schema-document
//! registry, the object index, the HLC watermark, and the replay frontier.
//! Resolution/fact tables are M2.

use rusqlite::{Connection, OptionalExtension, params};

use mneme_core::Id;
use mneme_core::ops::{OpEnvelope, OpPayload};

use crate::error::{Result, StoreError};
use crate::paths::Paths;

/// The derived-runtime schema version; a mismatch forces a full rebuild.
/// v2 added the `aideon_nodes` foundation projection.
/// v3 added the `aideon_facts` property-fact projection (M2 resolution input).
pub const RUNTIME_SCHEMA_VERSION: i64 = 3;

/// The replay frontier persisted per partition ([workspace-integrity-and-recovery],
/// "The replay frontier (`ReplayHead`)").
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReplayHead {
    /// Logical segment sequence (the loose segment is the next after the
    /// highest sealed).
    pub segment_seqno: u32,
    /// Next unread op-record byte within that logical segment.
    pub byte_offset: u64,
    /// Applied record count traversed.
    pub applied_record_count: u64,
    /// Canonical digest of the op immediately before the cursor; `None` on an
    /// empty log.
    pub last_record_digest: Option<String>,
}

impl ReplayHead {
    /// The empty-log frontier (logical segment 1, offset 0).
    #[must_use]
    pub fn empty() -> Self {
        Self {
            segment_seqno: 1,
            byte_offset: 0,
            applied_record_count: 0,
            last_record_digest: None,
        }
    }
}

/// The outcome of applying one operation to the projection.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ApplyOutcome {
    /// The operation was newly applied.
    Applied,
    /// The operation's `(partition, op_id)` was already present with identical
    /// canonical content — a replay no-op.
    DuplicateNoop,
}

/// Open (creating if needed) the derived runtime database and ensure its
/// foundation schema exists.
pub fn open_runtime(paths: &Paths) -> Result<Connection> {
    if let Some(parent) = paths.runtime_db().parent() {
        std::fs::create_dir_all(parent)?;
    }
    let conn = Connection::open(paths.runtime_db())?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    init_schema(&conn)?;
    Ok(conn)
}

/// Create the foundation projection tables if they do not exist.
pub fn init_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS aideon_meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS aideon_partitions (
            partition_id TEXT PRIMARY KEY
        );
        CREATE TABLE IF NOT EXISTS aideon_actors (
            actor_id TEXT PRIMARY KEY,
            actor_kind TEXT NOT NULL,
            display_name TEXT NOT NULL,
            declaration_digest TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS aideon_applied_ops (
            partition_id TEXT NOT NULL,
            op_id TEXT NOT NULL,
            canonical_record_digest TEXT NOT NULL,
            asserted_at INTEGER NOT NULL,
            PRIMARY KEY (partition_id, op_id)
        );
        CREATE TABLE IF NOT EXISTS aideon_schema_docs (
            package_id TEXT NOT NULL,
            version TEXT NOT NULL,
            relative_path TEXT NOT NULL,
            canonical_digest TEXT NOT NULL,
            PRIMARY KEY (package_id, version)
        );
        CREATE TABLE IF NOT EXISTS aideon_objects (
            sha256 TEXT PRIMARY KEY,
            byte_length INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS aideon_replay_head (
            partition_id TEXT PRIMARY KEY,
            segment_seqno INTEGER NOT NULL,
            byte_offset INTEGER NOT NULL,
            applied_record_count INTEGER NOT NULL,
            last_record_digest TEXT
        );
        CREATE TABLE IF NOT EXISTS aideon_hlc_state (
            partition_id TEXT PRIMARY KEY,
            last_hlc INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS aideon_nodes (
            partition_id TEXT NOT NULL,
            node_id TEXT NOT NULL,
            type_id TEXT,
            tombstoned INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (partition_id, node_id)
        );
        -- One row per set-property-interval operation: an asserted claim of a
        -- slot value over a valid-time interval on a layer. Resolution (M2)
        -- selects the effective value at a viewpoint from these rows; this table
        -- is append-shaped and never authoritative ([ADR-0027]).
        CREATE TABLE IF NOT EXISTS aideon_facts (
            apply_seq INTEGER PRIMARY KEY AUTOINCREMENT,
            partition_id TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            field_id TEXT NOT NULL,
            layer TEXT NOT NULL,
            valid_from INTEGER NOT NULL,
            valid_to INTEGER,
            asserted_at INTEGER NOT NULL,
            value_json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS aideon_facts_slot
            ON aideon_facts (partition_id, entity_id, field_id);
        ",
    )?;
    set_meta(
        conn,
        "runtime_schema_version",
        &RUNTIME_SCHEMA_VERSION.to_string(),
    )?;
    Ok(())
}

/// Set a `aideon_meta` key.
pub fn set_meta(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO aideon_meta(key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

/// Read a `aideon_meta` key.
pub fn get_meta(conn: &Connection, key: &str) -> Result<Option<String>> {
    Ok(conn
        .query_row(
            "SELECT value FROM aideon_meta WHERE key = ?1",
            params![key],
            |row| row.get::<_, String>(0),
        )
        .optional()?)
}

/// Record the workspace and partition identity, and the partition registry row.
pub fn set_identity(conn: &Connection, workspace_id: Id, partition_id: Id) -> Result<()> {
    set_meta(conn, "workspace_id", &workspace_id.to_canonical_string())?;
    set_meta(conn, "partition_id", &partition_id.to_canonical_string())?;
    conn.execute(
        "INSERT OR IGNORE INTO aideon_partitions(partition_id) VALUES (?1)",
        params![partition_id.to_canonical_string()],
    )?;
    Ok(())
}

/// The recorded `(workspace_id, partition_id)`, if set.
pub fn identity(conn: &Connection) -> Result<Option<(String, String)>> {
    let workspace = get_meta(conn, "workspace_id")?;
    let partition = get_meta(conn, "partition_id")?;
    Ok(match (workspace, partition) {
        (Some(w), Some(p)) => Some((w, p)),
        _ => None,
    })
}

/// Record an applied operation, detecting identity collisions. Returns whether
/// it was newly applied or a duplicate no-op.
pub fn record_applied_op(
    conn: &Connection,
    partition_id: Id,
    op_id: Id,
    canonical_record_digest: &str,
    asserted_at: i64,
) -> Result<ApplyOutcome> {
    let existing: Option<String> = conn
        .query_row(
            "SELECT canonical_record_digest FROM aideon_applied_ops
             WHERE partition_id = ?1 AND op_id = ?2",
            params![
                partition_id.to_canonical_string(),
                op_id.to_canonical_string()
            ],
            |row| row.get(0),
        )
        .optional()?;
    if let Some(existing_digest) = existing {
        if existing_digest == canonical_record_digest {
            return Ok(ApplyOutcome::DuplicateNoop);
        }
        return Err(StoreError::IdentityCollision {
            op_id: op_id.to_canonical_string(),
        });
    }
    conn.execute(
        "INSERT INTO aideon_applied_ops(partition_id, op_id, canonical_record_digest, asserted_at)
         VALUES (?1, ?2, ?3, ?4)",
        params![
            partition_id.to_canonical_string(),
            op_id.to_canonical_string(),
            canonical_record_digest,
            asserted_at
        ],
    )?;
    Ok(ApplyOutcome::Applied)
}

/// Apply the per-kind foundation effect of an operation (actor and node
/// registries at the projection level; schema-doc and object effects are
/// applied by the workspace where the on-disk projection is materialised).
pub fn apply_kind_effect(conn: &Connection, env: &OpEnvelope) -> Result<()> {
    match &env.payload {
        OpPayload::ActorDeclare(actor) => {
            let digest = env.canonical_record_digest()?;
            conn.execute(
                "INSERT INTO aideon_actors(actor_id, actor_kind, display_name, declaration_digest)
                 VALUES (?1, ?2, ?3, ?4)
                 ON CONFLICT(actor_id) DO UPDATE SET
                    actor_kind = excluded.actor_kind,
                    display_name = excluded.display_name,
                    declaration_digest = excluded.declaration_digest",
                params![
                    actor.declared_actor_id.to_canonical_string(),
                    format!("{:?}", actor.actor_kind).to_lowercase(),
                    actor.display_name,
                    digest
                ],
            )?;
        }
        OpPayload::CreateNode(node) => {
            conn.execute(
                "INSERT INTO aideon_nodes(partition_id, node_id, type_id, tombstoned)
                 VALUES (?1, ?2, ?3, 0)
                 ON CONFLICT(partition_id, node_id) DO UPDATE SET
                    type_id = excluded.type_id",
                params![
                    node.partition.to_canonical_string(),
                    node.node_id.to_canonical_string(),
                    node.type_id.map(|t| t.to_canonical_string()),
                ],
            )?;
        }
        OpPayload::TombstoneEntity(tomb) => {
            // A no-op when the entity is not a node (e.g. an edge).
            conn.execute(
                "UPDATE aideon_nodes SET tombstoned = 1
                 WHERE partition_id = ?1 AND node_id = ?2",
                params![
                    tomb.partition.to_canonical_string(),
                    tomb.entity_id.to_canonical_string(),
                ],
            )?;
        }
        OpPayload::SetPropertyInterval(spi) => {
            let layer = match spi.layer {
                mneme_core::ops::Layer::Plan => "plan",
                mneme_core::ops::Layer::Actual => "actual",
            };
            let value_json = serde_json::to_string(&spi.value)?;
            conn.execute(
                "INSERT INTO aideon_facts(
                    partition_id, entity_id, field_id, layer,
                    valid_from, valid_to, asserted_at, value_json)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    spi.partition.to_canonical_string(),
                    spi.entity_id.to_canonical_string(),
                    spi.field_id.to_canonical_string(),
                    layer,
                    spi.valid_from.0,
                    spi.valid_to.map(|v| v.0),
                    spi.asserted_at.0,
                    value_json,
                ],
            )?;
        }
        _ => {}
    }
    Ok(())
}

/// One effective slot value resolved at a viewpoint — the winning fact after
/// interval, layer-priority, and asserted-time selection.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ResolvedFact {
    /// The entity the slot belongs to.
    pub entity_id: String,
    /// The attribute symbol UUID.
    pub field_id: String,
    /// The layer the winning fact was asserted on.
    pub layer: String,
    /// The winning value, as its canonical-JSON encoding.
    pub value_json: String,
}

/// Resolve every slot's effective value at a viewpoint: an `as_of` valid time
/// and an ordered layer preference (highest priority first). For each
/// `(entity, field)` the winner is the fact whose valid interval contains
/// `as_of` on the highest-priority layer that has any covering fact, breaking
/// ties by latest `asserted_at` then latest apply order ([resolution-rules]).
///
/// This is the thin M2 core over the canonical op log: single-valued selection
/// across valid time + layer + asserted time, base scenario only.
pub fn resolve_at(
    conn: &Connection,
    as_of: i64,
    layer_priority: &[&str],
) -> Result<Vec<ResolvedFact>> {
    let mut stmt = conn.prepare(
        "SELECT entity_id, field_id, layer, value_json, asserted_at, apply_seq
         FROM aideon_facts
         WHERE valid_from <= ?1 AND (valid_to IS NULL OR ?1 < valid_to)
         ORDER BY entity_id, field_id",
    )?;
    struct Candidate {
        layer: String,
        value_json: String,
        asserted_at: i64,
        apply_seq: i64,
    }
    let rows = stmt.query_map(params![as_of], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            Candidate {
                layer: row.get(2)?,
                value_json: row.get(3)?,
                asserted_at: row.get(4)?,
                apply_seq: row.get(5)?,
            },
        ))
    })?;

    // Rank per (entity, field): prefer the earliest layer in `layer_priority`,
    // then latest asserted_at, then latest apply order.
    use std::collections::BTreeMap;
    let mut best: BTreeMap<(String, String), Candidate> = BTreeMap::new();
    let rank = |layer: &str| {
        layer_priority
            .iter()
            .position(|l| *l == layer)
            .unwrap_or(usize::MAX)
    };
    for row in rows {
        let (entity_id, field_id, cand) = row?;
        let key = (entity_id, field_id);
        let take = match best.get(&key) {
            None => true,
            Some(current) => {
                let (a, b) = (rank(&cand.layer), rank(&current.layer));
                a < b
                    || (a == b && cand.asserted_at > current.asserted_at)
                    || (a == b
                        && cand.asserted_at == current.asserted_at
                        && cand.apply_seq > current.apply_seq)
            }
        };
        if take {
            best.insert(key, cand);
        }
    }

    Ok(best
        .into_iter()
        .filter(|((_, _), c)| rank(&c.layer) != usize::MAX)
        .map(|((entity_id, field_id), c)| ResolvedFact {
            entity_id,
            field_id,
            layer: c.layer,
            value_json: c.value_json,
        })
        .collect())
}

/// One projected node row: the derived twin listing of `create-node` /
/// `tombstone-entity` effects, re-derived on every rebuild.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NodeRow {
    /// The node id.
    pub node_id: String,
    /// The declared node type, if any.
    pub type_id: Option<String>,
    /// Whether a tombstone has retired the node.
    pub tombstoned: bool,
}

/// One projected actor-registry row.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ActorRow {
    /// The actor id.
    pub actor_id: String,
    /// The declared display name.
    pub display_name: String,
}

/// List every projected node, ordered by node id.
pub fn list_nodes(conn: &Connection) -> Result<Vec<NodeRow>> {
    let mut stmt =
        conn.prepare("SELECT node_id, type_id, tombstoned FROM aideon_nodes ORDER BY node_id")?;
    let rows = stmt.query_map([], |row| {
        Ok(NodeRow {
            node_id: row.get(0)?,
            type_id: row.get(1)?,
            tombstoned: row.get::<_, i64>(2)? != 0,
        })
    })?;
    Ok(rows.collect::<std::result::Result<Vec<_>, _>>()?)
}

/// List every declared actor, ordered by actor id.
pub fn list_actors(conn: &Connection) -> Result<Vec<ActorRow>> {
    let mut stmt =
        conn.prepare("SELECT actor_id, display_name FROM aideon_actors ORDER BY actor_id")?;
    let rows = stmt.query_map([], |row| {
        Ok(ActorRow {
            actor_id: row.get(0)?,
            display_name: row.get(1)?,
        })
    })?;
    Ok(rows.collect::<std::result::Result<Vec<_>, _>>()?)
}

/// Record (or update) an authored schema-document registry row.
pub fn set_schema_doc(
    conn: &Connection,
    package_id: &str,
    version: &str,
    relative_path: &str,
    canonical_digest: &str,
) -> Result<()> {
    conn.execute(
        "INSERT INTO aideon_schema_docs(package_id, version, relative_path, canonical_digest)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(package_id, version) DO UPDATE SET
            relative_path = excluded.relative_path,
            canonical_digest = excluded.canonical_digest",
        params![package_id, version, relative_path, canonical_digest],
    )?;
    Ok(())
}

/// Record an object-index row.
pub fn set_object(conn: &Connection, sha256: &str, byte_length: u64) -> Result<()> {
    conn.execute(
        "INSERT INTO aideon_objects(sha256, byte_length) VALUES (?1, ?2)
         ON CONFLICT(sha256) DO UPDATE SET byte_length = excluded.byte_length",
        params![sha256, byte_length as i64],
    )?;
    Ok(())
}

/// Persist the replay frontier for a partition.
pub fn set_replay_head(conn: &Connection, partition_id: Id, head: &ReplayHead) -> Result<()> {
    conn.execute(
        "INSERT INTO aideon_replay_head(
            partition_id, segment_seqno, byte_offset, applied_record_count, last_record_digest)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(partition_id) DO UPDATE SET
            segment_seqno = excluded.segment_seqno,
            byte_offset = excluded.byte_offset,
            applied_record_count = excluded.applied_record_count,
            last_record_digest = excluded.last_record_digest",
        params![
            partition_id.to_canonical_string(),
            head.segment_seqno,
            head.byte_offset as i64,
            head.applied_record_count as i64,
            head.last_record_digest
        ],
    )?;
    Ok(())
}

/// Read the persisted replay frontier for a partition, if any.
pub fn replay_head(conn: &Connection, partition_id: Id) -> Result<Option<ReplayHead>> {
    Ok(conn
        .query_row(
            "SELECT segment_seqno, byte_offset, applied_record_count, last_record_digest
             FROM aideon_replay_head WHERE partition_id = ?1",
            params![partition_id.to_canonical_string()],
            |row| {
                Ok(ReplayHead {
                    segment_seqno: row.get(0)?,
                    // SQLite stores integers as i64; rusqlite 0.40 dropped the
                    // u64 ToSql/FromSql impls, so cross the boundary as i64.
                    byte_offset: row.get::<_, i64>(1)? as u64,
                    applied_record_count: row.get::<_, i64>(2)? as u64,
                    last_record_digest: row.get(3)?,
                })
            },
        )
        .optional()?)
}

/// Persist the HLC watermark for a partition.
pub fn set_hlc_watermark(conn: &Connection, partition_id: Id, last_hlc: i64) -> Result<()> {
    conn.execute(
        "INSERT INTO aideon_hlc_state(partition_id, last_hlc) VALUES (?1, ?2)
         ON CONFLICT(partition_id) DO UPDATE SET last_hlc = excluded.last_hlc",
        params![partition_id.to_canonical_string(), last_hlc],
    )?;
    Ok(())
}

/// Read the persisted HLC watermark for a partition, if any.
pub fn hlc_watermark(conn: &Connection, partition_id: Id) -> Result<Option<i64>> {
    Ok(conn
        .query_row(
            "SELECT last_hlc FROM aideon_hlc_state WHERE partition_id = ?1",
            params![partition_id.to_canonical_string()],
            |row| row.get(0),
        )
        .optional()?)
}

/// The count of applied operations across all partitions.
pub fn applied_op_count(conn: &Connection) -> Result<u64> {
    Ok(
        conn.query_row("SELECT COUNT(*) FROM aideon_applied_ops", [], |row| {
            row.get::<_, i64>(0)
        })? as u64,
    )
}

#[cfg(test)]
mod resolve_tests {
    use super::*;

    /// Insert one fact row directly (bypassing the op layer) for resolver tests.
    #[allow(clippy::too_many_arguments)]
    fn insert_fact(
        conn: &Connection,
        entity: &str,
        field: &str,
        layer: &str,
        valid_from: i64,
        valid_to: Option<i64>,
        asserted_at: i64,
        value: &str,
    ) {
        conn.execute(
            "INSERT INTO aideon_facts(
                partition_id, entity_id, field_id, layer,
                valid_from, valid_to, asserted_at, value_json)
             VALUES ('p', ?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                entity,
                field,
                layer,
                valid_from,
                valid_to,
                asserted_at,
                value
            ],
        )
        .unwrap();
    }

    #[test]
    fn resolve_picks_by_interval_then_layer_then_asserted_time() {
        let conn = Connection::open_in_memory().unwrap();
        init_schema(&conn).unwrap();

        // A plan claim over [0,10); an actual claim over [5, open).
        insert_fact(&conn, "e1", "f1", "plan", 0, Some(10), 1, "\"planned\"");
        insert_fact(&conn, "e1", "f1", "actual", 5, None, 2, "\"realised\"");

        let policy = ["actual", "plan"];

        // as_of=2: only the plan interval covers it.
        let at2 = resolve_at(&conn, 2, &policy).unwrap();
        assert_eq!(at2.len(), 1);
        assert_eq!(at2[0].layer, "plan");
        assert_eq!(at2[0].value_json, "\"planned\"");

        // as_of=7: both cover; actual wins on layer priority.
        let at7 = resolve_at(&conn, 7, &policy).unwrap();
        assert_eq!(at7[0].layer, "actual");
        assert_eq!(at7[0].value_json, "\"realised\"");

        // Plan-only policy at as_of=7 ignores the actual layer entirely.
        let plan_only = resolve_at(&conn, 7, &["plan"]).unwrap();
        assert_eq!(plan_only[0].layer, "plan");
        assert_eq!(plan_only[0].value_json, "\"planned\"");

        // as_of=20: plan's [0,10) has lapsed; the open-ended actual still covers.
        let at20 = resolve_at(&conn, 20, &policy).unwrap();
        assert_eq!(at20[0].layer, "actual");

        // Before any interval starts, nothing resolves.
        assert!(resolve_at(&conn, -1, &policy).unwrap().is_empty());
    }

    #[test]
    fn later_assertion_on_same_layer_supersedes() {
        let conn = Connection::open_in_memory().unwrap();
        init_schema(&conn).unwrap();
        insert_fact(&conn, "e1", "f1", "plan", 0, None, 1, "\"first\"");
        insert_fact(&conn, "e1", "f1", "plan", 0, None, 5, "\"second\"");
        let out = resolve_at(&conn, 3, &["plan"]).unwrap();
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].value_json, "\"second\"", "latest asserted_at wins");
    }
}
