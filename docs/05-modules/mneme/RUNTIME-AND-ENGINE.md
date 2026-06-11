# Mneme Runtime and Engine

Design of Mneme's **derived** local runtime — the index engine that turns the canonical workspace into fast reads. The decision behind it is fixed in [ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md); the canonical embedded schema is in [SQLITE.md](./SQLITE.md).

## What the runtime is for

Mneme's local runtime is a derived index engine. It ingests new operation segments, validates them, resolves facts at a time slice, maintains ordered tuple indexes and graph projections, feeds search/vector sidecars, exposes a narrow API to the host, survives crashes, and rebuilds itself from the canonical files on demand.

A key-value engine is not inherently good at tuple-space questions; it becomes good when the application writes the access paths it needs. The model lives in the key design and the write discipline, not in the bare existence of a key-value API.

## Keyspace and index layout

```text
op/{ws}/{segment}/{offset}
op_dep/{ws}/{op_id}/{parent_op_id}

entity/{ws}/{entity_id}
edge/{ws}/{edge_id}

fact/spo/{ws}/{scenario}/{subject}/{predicate}/{object}/{valid_from}/{op_id}
fact/pos/{ws}/{scenario}/{predicate}/{object}/{subject}/{valid_from}/{op_id}
fact/osp/{ws}/{scenario}/{object}/{subject}/{predicate}/{valid_from}/{op_id}

prop/{ws}/{entity_id}/{field_id}/{valid_from}/{op_id}
schema/type/{ws}/{type_id}   schema/field/{ws}/{field_id}   schema/rule/{ws}/{rule_id}

blob/ref/{ws}/{entity_id}/{blob_hash}

proj/adj/out/{ws}/{scenario}/{entity_id}/{edge_type}/{to_id}
proj/adj/in/{ws}/{scenario}/{entity_id}/{edge_type}/{from_id}
proj/status/{ws}/{projection_name}

search/doc/{ws}/{doc_id}     vector/doc/{ws}/{doc_id}
```

The `spo / pos / osp` families are the access paths for tuple-space reads: "all facts for subject X", "all subjects satisfying predicate P and object O", and reverse-traversal reads without full scans. The `scenario` segment lets overlays be read without rewriting base facts.

## Mneme API surface (stable seam)

The host talks to a stable _semantic_ seam, never to a specific engine:

```rust
pub trait Mneme: Send + Sync {
    fn open_workspace(&self, req: OpenWorkspaceReq) -> Result<WorkspaceSummary>;
    fn validate_workspace(&self, ws: WorkspaceId) -> Result<ValidationReport>;
    fn append_ops(&self, req: AppendOpsReq) -> Result<CommitReceipt>;
    fn ingest_external_changes(&self, ws: WorkspaceId) -> Result<RescanReport>;
    fn resolve_facts(&self, req: ResolveFactsReq) -> Result<Vec<ResolvedFact>>;
    fn graph_slice(&self, req: GraphSliceReq) -> Result<GraphSlice>;
    fn rebuild(&self, req: RebuildReq) -> Result<AcceptedJob>;
    fn export_package(&self, req: ExportReq) -> Result<AcceptedJob>;
    fn import_package(&self, req: ImportReq) -> Result<WorkspaceSummary>;
    fn sync_plan(&self, req: SyncPlanReq) -> Result<SyncPlan>;
    fn sync_apply(&self, req: SyncApplyReq) -> Result<SyncReceipt>;
}
```

## The single-writer queue

Embedded engines serialise writes, so Mneme formalises it. Each open workspace has one writer actor. Commands post work to it; it batches small writes, writes blobs via temp-file-plus-rename, appends operations, updates primary indexes atomically, then queues longer-running projection work. Reads come from snapshots, so they never block on the writer.

```rust
pub enum WriteMsg {
    AppendOps  { req: AppendOpsReq,  reply: oneshot::Sender<Result<CommitReceipt>> },
    AttachBlob { req: AttachBlobReq, reply: oneshot::Sender<Result<BlobReceipt>> },
    Flush      { reply: oneshot::Sender<Result<()>> },
}
```

The commit path is a small explicit state machine, not a loose bundle of async filesystem calls. Write-queue saturation surfaces as an explicit `BACKPRESSURE` result rather than an unbounded queue.

## The storage engine

The runtime engine sits behind the storage trait, so it is replaceable without touching the workspace format or any caller. **SQLite is the engine** (see [SQLITE.md](./SQLITE.md)): it is embedded, single-file, ordered, transactional, and easy to inspect, which also makes it the correctness oracle for the rebuild-from-workspace property. The trait keeps the door open to a Rust-native engine (redb), a high-write LSM engine (RocksDB), or a read-optimised engine (LMDB/MDBX) without changing the canonical data or the API.

| Engine      | Properties                                                      | Fit                                             |
| ----------- | --------------------------------------------------------------- | ----------------------------------------------- |
| SQLite      | Embedded, single-file, ordered, transactional, WAL, inspectable | The engine + correctness oracle                 |
| redb        | Pure-Rust, ACID, MVCC, crash-safe, low packaging friction       | Rust-native alternative behind the same trait   |
| RocksDB     | Ordered LSM KV, transactions, multithreaded compaction          | Alternative for write-heavy projection rebuilds |
| LMDB / MDBX | Memory-mapped, cheap range scans, many readers + one writer     | Alternative for read-heavy traversal profiles   |

Whichever engine backs the runtime, the canonical workspace semantics are identical, the trait is identical, and the rebuild guarantee holds.

## Invariants

- The runtime holds nothing that is not reconstructible from canonical files.
- Deleting `.aideon/runtime/` and rebuilding produces the same effective graph — a tested correctness property (see [TESTING-STRATEGY](../../02-standards/TESTING-STRATEGY.md)).
- One writer per workspace; reads from snapshots; explicit backpressure on saturation.

## See also

- [SQLITE.md](./SQLITE.md) — the embedded-store table families and encodings.
- [README.md](./README.md) — the Mneme module overview.
- [`../../04-contracts/PROJECTION-AND-INVALIDATION.md`](../../04-contracts/PROJECTION-AND-INVALIDATION.md) — projection freshness and invalidation.
