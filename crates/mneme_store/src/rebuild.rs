//! The rebuild-equivalence oracle: the test-only `FoundationProjectionSnapshot`
//! and the `foundation_rebuild_hash` over it ([rebuild oracle], [ADR-0027]).
//!
//! The snapshot is a stable **logical** view of the M0-owned foundation state —
//! never a dump of SQLite tables — so the derived store's schema, indexes, and
//! ordering may change without breaking the equivalence test. The hash is
//! `blake3-256` over the canonical-JSON serialisation of the snapshot.

use rusqlite::Connection;
use serde::Serialize;

use uuid::Uuid;

use mneme_core::Id;
use mneme_core::canonical::{blake3_hex, canonical_json_bytes};
use mneme_core::value::U64Str;

use crate::error::Result;
use crate::projection::{ReplayHead, replay_head};

/// One applied operation, by contract identity and canonical digest.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct AppliedOp {
    /// The operation id.
    pub op_id: String,
    /// The canonical record digest.
    pub canonical_record_digest: String,
}

/// The replay frontier as it appears in the snapshot.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct ReplayHeadSnapshot {
    /// Logical segment sequence.
    pub segment_seqno: u32,
    /// Next unread byte offset.
    pub byte_offset: u64,
    /// Applied record count.
    pub applied_record_count: u64,
    /// Digest of the record before the cursor.
    pub last_record_digest: Option<String>,
}

impl From<ReplayHead> for ReplayHeadSnapshot {
    fn from(head: ReplayHead) -> Self {
        Self {
            segment_seqno: head.segment_seqno,
            byte_offset: head.byte_offset,
            applied_record_count: head.applied_record_count,
            last_record_digest: head.last_record_digest,
        }
    }
}

/// The per-partition foundation state.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct PartitionSnapshot {
    /// The partition id.
    pub partition_id: String,
    /// Applied operations, sorted by the contract key.
    pub applied_ops: Vec<AppliedOp>,
    /// The replay frontier.
    pub replay_head: Option<ReplayHeadSnapshot>,
}

/// An authored schema-document registry entry.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct SchemaDoc {
    /// Package identity.
    pub package_id: String,
    /// Package version.
    pub version: String,
    /// Path relative to `model/schema/`.
    pub relative_path: String,
    /// Canonical digest of the authored document.
    pub canonical_digest: String,
}

/// An actor registry entry.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct ActorSnapshot {
    /// The actor id.
    pub actor_id: String,
    /// The digest of the actor's `actor-declare` record.
    pub declaration_digest: String,
}

/// An object-index entry.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct ObjectSnapshot {
    /// The SHA-256 content address.
    pub sha256: String,
    /// The object byte length (full-range decimal string).
    pub byte_length: U64Str,
}

/// The stable logical foundation-state snapshot hashed by the M0 oracle.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct FoundationProjectionSnapshot {
    /// The workspace identity.
    pub workspace_id: String,
    /// Per-partition foundation state.
    pub partitions: Vec<PartitionSnapshot>,
    /// Authored schema documents.
    pub schema_documents: Vec<SchemaDoc>,
    /// Declared actors.
    pub actors: Vec<ActorSnapshot>,
    /// Content-addressed objects.
    pub objects: Vec<ObjectSnapshot>,
}

impl FoundationProjectionSnapshot {
    /// `foundation_rebuild_hash = blake3-256(canonical_serialisation(snapshot))`.
    pub fn foundation_rebuild_hash(&self) -> Result<String> {
        let value = serde_json::to_value(self)?;
        Ok(blake3_hex(&canonical_json_bytes(&value)?))
    }
}

/// Read the foundation snapshot from the derived runtime, sorting every
/// collection by its contract key so the serialisation is order-independent.
pub fn read_snapshot(conn: &Connection) -> Result<FoundationProjectionSnapshot> {
    let workspace_id = crate::projection::get_meta(conn, "workspace_id")?.unwrap_or_default();

    let mut partition_ids = conn
        .prepare("SELECT partition_id FROM aideon_partitions")?
        .query_map([], |row| row.get::<_, String>(0))?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    partition_ids.sort();

    let mut partitions = Vec::new();
    for partition_id in partition_ids {
        let applied_ops = conn
            .prepare(
                "SELECT op_id, canonical_record_digest FROM aideon_applied_ops
                 WHERE partition_id = ?1 ORDER BY op_id",
            )?
            .query_map([&partition_id], |row| {
                Ok(AppliedOp {
                    op_id: row.get(0)?,
                    canonical_record_digest: row.get(1)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        let pid = Id::from_uuid(Uuid::parse_str(&partition_id).unwrap_or_default());
        partitions.push(PartitionSnapshot {
            partition_id,
            applied_ops,
            replay_head: replay_head(conn, pid)?.map(ReplayHeadSnapshot::from),
        });
    }

    let schema_documents = conn
        .prepare(
            "SELECT package_id, version, relative_path, canonical_digest
             FROM aideon_schema_docs ORDER BY package_id, version",
        )?
        .query_map([], |row| {
            Ok(SchemaDoc {
                package_id: row.get(0)?,
                version: row.get(1)?,
                relative_path: row.get(2)?,
                canonical_digest: row.get(3)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    let actors = conn
        .prepare("SELECT actor_id, declaration_digest FROM aideon_actors ORDER BY actor_id")?
        .query_map([], |row| {
            Ok(ActorSnapshot {
                actor_id: row.get(0)?,
                declaration_digest: row.get(1)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    let objects = conn
        .prepare("SELECT sha256, byte_length FROM aideon_objects ORDER BY sha256")?
        .query_map([], |row| {
            Ok(ObjectSnapshot {
                sha256: row.get(0)?,
                byte_length: U64Str(row.get::<_, i64>(1)? as u64),
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(FoundationProjectionSnapshot {
        workspace_id,
        partitions,
        schema_documents,
        actors,
        objects,
    })
}
