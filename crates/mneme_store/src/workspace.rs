//! The workspace orchestrator: create, open (with the four-case rebuild
//! decision), the canonical write path, and authored-schema materialisation.
//!
//! The canonical append is the commit point and the SQLite projection is
//! downstream of it; the replay head advances in the same transaction as the
//! projection apply, so a crash leaves both committed or neither
//! ([workspace-integrity-and-recovery], [ADR-0038]).

use std::collections::HashSet;
use std::fs;
use std::path::Path;

use rusqlite::Connection;
use uuid::Uuid;

use mneme_core::canonical::{blake3_hex, canonical_json_document};
use mneme_core::ops::{OpEnvelope, OpPayload, Origin};
use mneme_core::schema::AuthoredMetamodelBatch;
use mneme_core::value::BlobRef;
use mneme_core::{Hlc, HlcClock, Id};

use crate::atomic::atomic_write;
use crate::blob;
use crate::error::{Result, StoreError};
use crate::lock::WriterLock;
use crate::manifest::Manifest;
use crate::paths::Paths;
use crate::projection::{
    self, ApplyOutcome, RUNTIME_SCHEMA_VERSION, ReplayHead, open_runtime, set_hlc_watermark,
    set_replay_head,
};
use crate::rebuild::{self, FoundationProjectionSnapshot};
use crate::segment::{self, SegmentWriter};

/// One parsed canonical record with its contract digest.
struct LogRecord {
    env: OpEnvelope,
    digest: String,
}

/// The open-time rebuild decision ([workspace-integrity-and-recovery],
/// "The four-case open decision").
#[derive(Debug, PartialEq, Eq)]
enum OpenDecision {
    /// Runtime absent/unusable/inconsistent — discard and full replay.
    FullRebuild,
    /// Runtime is at the canonical tail — no replay.
    Current,
    /// Runtime is a strict prefix — replay only `(head, tail]`.
    Incremental { from_count: u64 },
}

/// An open canonical workspace held under the writer lock.
pub struct Workspace {
    paths: Paths,
    manifest: Manifest,
    conn: Connection,
    writer: SegmentWriter,
    clock: HlcClock,
    head: ReplayHead,
    // Held for the lifetime of the writable session; released on drop.
    _lock: WriterLock,
}

impl Workspace {
    /// Create a brand-new workspace at `root`, mint its identities, write the
    /// manifest, and open it for writing.
    pub fn create(root: impl AsRef<Path>, created_by_actor_id: Option<Id>) -> Result<Self> {
        let paths = Paths::new(root.as_ref());
        if paths.manifest().exists() {
            return Err(StoreError::Corruption(
                "a workspace already exists at this path".to_string(),
            ));
        }
        fs::create_dir_all(paths.ops_dir())?;
        fs::create_dir_all(paths.schema_authored_dir())?;
        fs::create_dir_all(paths.objects_dir())?;

        let workspace_id = Id::new_v4();
        // A separate mint — never derived from workspace_id.
        let partition_id = Id::new_v4();
        let manifest = Manifest::new(workspace_id, partition_id, created_by_actor_id);
        manifest.write(&paths)?;
        // An empty loose segment is a zero-byte file.
        atomic_write(&paths.current_segment(), b"")?;

        Self::open(root)
    }

    /// Open an existing workspace for writing, recovering the canonical tail and
    /// rebuilding/replaying the derived runtime as needed.
    pub fn open(root: impl AsRef<Path>) -> Result<Self> {
        let paths = Paths::new(root.as_ref());
        let lock = WriterLock::acquire(&paths)?;
        let manifest = Manifest::read(&paths)?;
        manifest.check_supported_for_write()?;
        let partition = manifest.partition_id;

        // Read and validate the canonical log; compute the tail cursor.
        let (records, tail) = read_canonical_log(&paths, &manifest)?;

        let mut conn = open_runtime(&paths)?;
        let decision = decide_open(&conn, &manifest, &tail, &records)?;
        match decision {
            OpenDecision::FullRebuild => {
                reset_runtime(&conn)?;
                projection::set_identity(&conn, manifest.workspace_id, partition)?;
                replay_into(&mut conn, &paths, &manifest, &records, 0, &tail)?;
            }
            OpenDecision::Incremental { from_count } => {
                replay_into(&mut conn, &paths, &manifest, &records, from_count, &tail)?;
            }
            OpenDecision::Current => {}
        }

        // The op log always wins for authored schema docs; rebuild any that are
        // stale or hand-edited, and keep the object index in step with disk.
        materialize_authored(&conn, &paths, &records)?;
        sync_object_index(&conn, &paths)?;

        // Restore the HLC watermark from the complete canonical set.
        let watermark = records.iter().map(|r| r.env.asserted_at).max();
        if let Some(hlc) = watermark {
            set_hlc_watermark(&conn, partition, hlc.0)?;
        }
        let clock = match watermark {
            Some(hlc) => HlcClock::restored_from(hlc),
            None => HlcClock::new(),
        };

        let writer = SegmentWriter::open(&paths)?;
        Ok(Self {
            paths,
            manifest,
            conn,
            writer,
            clock,
            head: tail,
            _lock: lock,
        })
    }

    /// The workspace manifest.
    #[must_use]
    pub fn manifest(&self) -> &Manifest {
        &self.manifest
    }

    /// The workspace's sole partition id.
    #[must_use]
    pub fn partition_id(&self) -> Id {
        self.manifest.partition_id
    }

    /// Write a blob into the content-addressed store (durably, before any
    /// referencing op) and index it. Returns the typed [`BlobRef`].
    pub fn write_blob(&self, bytes: &[u8], media_type: Option<String>) -> Result<BlobRef> {
        let blob = blob::write_blob(&self.paths, bytes, media_type)?;
        projection::set_object(&self.conn, &blob.digest, blob.length.0)?;
        Ok(blob)
    }

    /// Read and verify a blob.
    pub fn read_blob(&self, blob: &BlobRef) -> Result<Vec<u8>> {
        blob::read_blob(&self.paths, blob)
    }

    /// Author a new operation: mint its identity and asserted time, stamp the
    /// payload's authoritative coordinates, append it canonically (the commit),
    /// then apply the projection and advance the replay head in one transaction.
    pub fn author(
        &mut self,
        actor_id: Id,
        origin: Origin,
        mut payload: OpPayload,
    ) -> Result<OpEnvelope> {
        let hlc = self.clock.mint()?;
        let op_id = Id::new_v4();
        stamp_payload(&mut payload, self.manifest.partition_id, actor_id, hlc)?;
        let env = OpEnvelope::new(op_id, actor_id, hlc, origin, Vec::new(), payload);

        // 1. Durably append the canonical record — this is the commit point.
        let record = env.canonical_record_bytes()?;
        let new_len = self.writer.append(&record)?;
        let digest = blake3_hex(&record);

        // 2/3. Apply the projection and advance the head in one transaction.
        let partition = self.manifest.partition_id;
        let tx = self.conn.transaction()?;
        projection::record_applied_op(&tx, partition, op_id, &digest, hlc.0)?;
        projection::apply_kind_effect(&tx, &env)?;
        if let OpPayload::UpsertMetamodelBatch(batch) = &env.payload {
            materialize_one(&tx, &self.paths, batch)?;
        }
        let head = ReplayHead {
            segment_seqno: self.head.segment_seqno,
            byte_offset: new_len,
            applied_record_count: self.head.applied_record_count + 1,
            last_record_digest: Some(digest),
        };
        set_replay_head(&tx, partition, &head)?;
        set_hlc_watermark(&tx, partition, hlc.0)?;
        tx.commit()?;
        self.head = head;
        // Keep the deterministic schema inventory in step after a schema change.
        if matches!(env.payload, OpPayload::UpsertMetamodelBatch(_)) {
            write_schema_index(&self.conn, &self.paths)?;
        }
        Ok(env)
    }

    /// The test-only foundation-state snapshot.
    pub fn snapshot(&self) -> Result<FoundationProjectionSnapshot> {
        rebuild::read_snapshot(&self.conn)
    }

    /// The `foundation_rebuild_hash` over the current foundation state.
    pub fn foundation_rebuild_hash(&self) -> Result<String> {
        self.snapshot()?.foundation_rebuild_hash()
    }

    /// A conservative dry-run orphan-blob report.
    pub fn orphan_blob_report(&self) -> Result<Vec<String>> {
        let referenced = referenced_blob_digests(&self.read_all_records()?);
        blob::orphan_report(&self.paths, &referenced)
    }

    fn read_all_records(&self) -> Result<Vec<LogRecord>> {
        Ok(read_canonical_log(&self.paths, &self.manifest)?.0)
    }
}

/// Read every canonical record in order (verifying sealed segments and
/// recovering the loose tail), validate each against the manifest partition and
/// the M0 scenario rule, and compute the canonical tail cursor.
fn read_canonical_log(paths: &Paths, manifest: &Manifest) -> Result<(Vec<LogRecord>, ReplayHead)> {
    let sealed = segment::list_sealed_segments(paths)?;
    let mut records = Vec::new();
    for seqno in &sealed {
        for line in segment::verify_sealed_segment(&paths.sealed_segment(*seqno))? {
            records.push(parse_and_validate(&line, manifest)?);
        }
    }
    let loose = segment::recover_loose_tail(paths)?;
    for line in &loose.records {
        records.push(parse_and_validate(line, manifest)?);
    }

    let max_sealed = sealed.last().copied().unwrap_or(0);
    let tail = ReplayHead {
        segment_seqno: max_sealed + 1,
        byte_offset: loose.valid_len,
        applied_record_count: records.len() as u64,
        last_record_digest: records.last().map(|r| r.digest.clone()),
    };
    Ok((records, tail))
}

fn parse_and_validate(line: &str, manifest: &Manifest) -> Result<LogRecord> {
    let env = mneme_core::ops::parse_record_line(line)?;
    if let Some(partition) = env.payload_partition()
        && partition != manifest.partition_id
    {
        return Err(StoreError::ForeignPartition {
            found: partition.to_canonical_string(),
            expected: manifest.partition_id.to_canonical_string(),
        });
    }
    if payload_scenario_is_set(&env) {
        return Err(StoreError::ScenarioUnsupported);
    }
    let digest = env.canonical_record_digest()?;
    Ok(LogRecord { env, digest })
}

fn payload_scenario_is_set(env: &OpEnvelope) -> bool {
    match &env.payload {
        OpPayload::CreateNode(p) => p.scenario_id.is_some(),
        OpPayload::CreateEdge(p) => p.scenario_id.is_some(),
        OpPayload::TombstoneEntity(p) => p.scenario_id.is_some(),
        OpPayload::SetPropertyInterval(p) => p.scenario_id.is_some(),
        OpPayload::ClearPropertyInterval(p) => p.scenario_id.is_some(),
        OpPayload::SetEdgeExistenceInterval(p) => p.scenario_id.is_some(),
        OpPayload::UpsertMetamodelBatch(_) | OpPayload::ActorDeclare(_) => false,
    }
}

fn decide_open(
    conn: &Connection,
    manifest: &Manifest,
    tail: &ReplayHead,
    records: &[LogRecord],
) -> Result<OpenDecision> {
    let identity = projection::identity(conn)?;
    let schema_version = projection::get_meta(conn, "runtime_schema_version")?;
    let runtime_ok = identity
        == Some((
            manifest.workspace_id.to_canonical_string(),
            manifest.partition_id.to_canonical_string(),
        ))
        && schema_version.as_deref() == Some(&RUNTIME_SCHEMA_VERSION.to_string());
    if !runtime_ok {
        return Ok(OpenDecision::FullRebuild);
    }
    let Some(head) = projection::replay_head(conn, manifest.partition_id)? else {
        return Ok(OpenDecision::FullRebuild);
    };
    if &head == tail {
        return Ok(OpenDecision::Current);
    }
    // A valid strict prefix => incremental; anything else => discard + rebuild.
    if head.applied_record_count < tail.applied_record_count && prefix_matches(records, &head) {
        return Ok(OpenDecision::Incremental {
            from_count: head.applied_record_count,
        });
    }
    Ok(OpenDecision::FullRebuild)
}

fn prefix_matches(records: &[LogRecord], head: &ReplayHead) -> bool {
    let count = head.applied_record_count as usize;
    if count > records.len() {
        return false;
    }
    match (count, &head.last_record_digest) {
        (0, None) => true,
        (0, Some(_)) => false,
        (n, Some(digest)) => records[n - 1].digest == *digest,
        (_, None) => false,
    }
}

fn reset_runtime(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "DELETE FROM aideon_applied_ops;
         DELETE FROM aideon_actors;
         DELETE FROM aideon_schema_docs;
         DELETE FROM aideon_objects;
         DELETE FROM aideon_replay_head;
         DELETE FROM aideon_hlc_state;
         DELETE FROM aideon_partitions;
         DELETE FROM aideon_meta WHERE key IN ('workspace_id','partition_id');",
    )?;
    Ok(())
}

/// Replay `records[from_count..]` into the projection in one transaction,
/// advancing the head to the tail.
fn replay_into(
    conn: &mut Connection,
    paths: &Paths,
    manifest: &Manifest,
    records: &[LogRecord],
    from_count: u64,
    tail: &ReplayHead,
) -> Result<()> {
    let partition = manifest.partition_id;
    let tx = conn.transaction()?;
    for record in &records[from_count as usize..] {
        let outcome = projection::record_applied_op(
            &tx,
            partition,
            record.env.op_id,
            &record.digest,
            record.env.asserted_at.0,
        )?;
        if outcome == ApplyOutcome::DuplicateNoop {
            continue;
        }
        projection::apply_kind_effect(&tx, &record.env)?;
        if let OpPayload::UpsertMetamodelBatch(batch) = &record.env.payload {
            materialize_one(&tx, paths, batch)?;
        }
    }
    set_replay_head(&tx, partition, tail)?;
    tx.commit()?;
    Ok(())
}

/// The authored-document identity derived from a batch: a stable package id
/// (UUIDv5 over the source), a version string, and the relative path.
fn authored_identity(batch: &AuthoredMetamodelBatch) -> (String, String, String) {
    let source = batch.metamodel_source.as_deref().unwrap_or("default");
    let package_id = Uuid::new_v5(&Uuid::NAMESPACE_URL, source.as_bytes())
        .hyphenated()
        .to_string();
    let version = batch
        .metamodel_version
        .clone()
        .unwrap_or_else(|| "0".to_string());
    let relative_path = format!("authored/{package_id}/{version}.json");
    (package_id, version, relative_path)
}

/// Materialise one authored batch to `model/schema/authored/` and register it,
/// detecting an immutable-identity collision.
fn materialize_one(conn: &Connection, paths: &Paths, batch: &AuthoredMetamodelBatch) -> Result<()> {
    let (package_id, version, relative_path) = authored_identity(batch);
    let value = serde_json::to_value(batch)?;
    let bytes = canonical_json_document(&value)?;
    let digest = blake3_hex(&bytes);

    if let Some(existing) = schema_doc_digest(conn, &package_id, &version)?
        && existing != digest
    {
        return Err(StoreError::IdentityCollision {
            op_id: format!("schema {package_id}@{version}"),
        });
    }
    let path = paths
        .root()
        .join("model")
        .join("schema")
        .join(&relative_path);
    let on_disk = fs::read(&path).ok();
    if on_disk.as_deref() != Some(bytes.as_slice()) {
        atomic_write(&path, &bytes)?;
    }
    projection::set_schema_doc(conn, &package_id, &version, &relative_path, &digest)?;
    Ok(())
}

fn schema_doc_digest(conn: &Connection, package_id: &str, version: &str) -> Result<Option<String>> {
    use rusqlite::{OptionalExtension, params};
    Ok(conn
        .query_row(
            "SELECT canonical_digest FROM aideon_schema_docs WHERE package_id = ?1 AND version = ?2",
            params![package_id, version],
            |row| row.get(0),
        )
        .optional()?)
}

/// Re-derive every authored document from the op log (the log always wins),
/// rewriting any stale or hand-edited file, then write the schema `index.json`.
fn materialize_authored(conn: &Connection, paths: &Paths, records: &[LogRecord]) -> Result<()> {
    for record in records {
        if let OpPayload::UpsertMetamodelBatch(batch) = &record.env.payload {
            materialize_one(conn, paths, batch)?;
        }
    }
    write_schema_index(conn, paths)
}

fn write_schema_index(conn: &Connection, paths: &Paths) -> Result<()> {
    let mut stmt = conn.prepare(
        "SELECT package_id, version, relative_path, canonical_digest
         FROM aideon_schema_docs ORDER BY package_id, version",
    )?;
    let entries: Vec<serde_json::Value> = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "package_id": row.get::<_, String>(0)?,
                "version": row.get::<_, String>(1)?,
                "relative_path": row.get::<_, String>(2)?,
                "canonical_digest": row.get::<_, String>(3)?,
            }))
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    let index = serde_json::json!({ "documents": entries });
    let bytes = canonical_json_document(&index)?;
    atomic_write(&paths.schema_index(), &bytes)?;
    Ok(())
}

/// Sync the object index to the objects actually on disk.
fn sync_object_index(conn: &Connection, paths: &Paths) -> Result<()> {
    for (digest, len) in blob::list_objects(paths)? {
        projection::set_object(conn, &digest, len)?;
    }
    Ok(())
}

fn referenced_blob_digests(records: &[LogRecord]) -> HashSet<String> {
    let mut set = HashSet::new();
    for record in records {
        if let OpPayload::SetPropertyInterval(p) = &record.env.payload
            && let mneme_core::Value::Blob(b) = &p.value
        {
            set.insert(b.digest.clone());
        }
    }
    set
}

/// Stamp the authoritative `partition`, `actor`, and `asserted_at` onto a
/// payload, and reject a non-null `scenario_id` (M0 base-case only).
fn stamp_payload(payload: &mut OpPayload, partition: Id, actor: Id, hlc: Hlc) -> Result<()> {
    macro_rules! stamp {
        ($p:expr) => {{
            if $p.scenario_id.is_some() {
                return Err(StoreError::ScenarioUnsupported);
            }
            $p.partition = partition;
            $p.actor = actor;
            $p.asserted_at = hlc;
        }};
    }
    match payload {
        OpPayload::CreateNode(p) => stamp!(p),
        OpPayload::CreateEdge(p) => stamp!(p),
        OpPayload::TombstoneEntity(p) => stamp!(p),
        OpPayload::SetPropertyInterval(p) => stamp!(p),
        OpPayload::ClearPropertyInterval(p) => stamp!(p),
        OpPayload::SetEdgeExistenceInterval(p) => stamp!(p),
        // These payloads carry no partition/actor/asserted_at of their own.
        OpPayload::UpsertMetamodelBatch(_) | OpPayload::ActorDeclare(_) => {}
    }
    Ok(())
}
