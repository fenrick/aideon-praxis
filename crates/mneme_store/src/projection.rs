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
pub const RUNTIME_SCHEMA_VERSION: i64 = 2;

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
        _ => {}
    }
    Ok(())
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
            head.byte_offset,
            head.applied_record_count,
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
                    byte_offset: row.get(1)?,
                    applied_record_count: row.get(2)?,
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
