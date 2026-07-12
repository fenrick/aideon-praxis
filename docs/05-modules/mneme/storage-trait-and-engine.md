# The storage trait and engine

The narrow seam every consumer depends on, the single-writer queue that serialises writes, and the read-isolation model
that lets reads proceed without blocking. This is the file that explains why the storage engine is replaceable and what
guarantee a reader gets. The decision is fixed by [ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md); the
keyspace and engine candidates are in [runtime-and-engine](./RUNTIME-AND-ENGINE.md); the SQLite default is in
[sqlite](./SQLITE.md).

---

## The seam: one supertrait, no SQL outside Mneme

No consumer module generates SQL or opens the runtime database. All access is through Mneme's published trait surface
([dependency-rules](../../01-architecture/boundary/dependency-rules.md)). `mneme_core::api` composes the surface from
focused async traits; `MnemeStore` is the blanket bound a concrete implementation must satisfy:

```text
MnemeStore = MetamodelApi + GraphWriteApi + PropertyWriteApi + GraphReadApi
           + AnalyticsApi + AnalyticsResultsApi + SyncApi + ScenarioApi
           + MnemeProcessingApi + ChangeFeedApi + ValidationRulesApi
           + ComputedRulesApi + ComputedCacheApi + DiagnosticsApi
           + MnemeExportApi + MnemeImportApi + MnemeSnapshotApi
           + Send + Sync
```

Decomposing the surface into focused traits, rather than one fat interface, is deliberate: a caller depends only on the
traits it uses, and a new implementation can be tested trait by trait. The seam is semantic, not engine-specific — it
names _what_ a read or write means, never _how_ a particular engine stores it.

| Surface         | Representative traits                                              | Responsibility                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Write**       | `GraphWriteApi`, `PropertyWriteApi`, `MetamodelApi`, `ScenarioApi` | Create entities/relationships, set existence intervals, tombstone; set/clear typed property intervals and CRDT updates; upsert metamodel batches; scenario lifecycle. |
| **Read**        | `GraphReadApi`, `AnalyticsApi`, `ChangeFeedApi`                    | Read an entity at a viewpoint, traverse, list with field filters; directed projection edges and degree stats; poll/subscribe to the change feed.                      |
| **Processing**  | `MnemeProcessingApi`                                               | Trigger schema recompile, integrity refresh, projection refresh, retention, compaction; drive the embedded worker.                                                    |
| **Diagnostics** | `DiagnosticsApi`                                                   | `explain_resolution` and `explain_traversal` return the full candidate set with precedence scores — the basis for trusting time-travel queries.                       |

All reads accept `scenario_id` and `as_of_asserted_at`, so any read can be a belief-pinned, scenario-scoped read.

---

## The single-writer queue

Every open workspace runs **one writer actor**. UI commands post messages to it; it batches small writes, writes blobs
via atomic temp-file-plus-rename, appends operations, updates primary indexes and projection rows inside one
transaction, then queues longer-running projection and analytics work. Reads are served from engine snapshots and never
block on the writer. This formalises the serialised-write constraint every candidate embedded engine shares, fixed by
[ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md).

```rust
pub enum WriteMsg {
    AppendOps  { req: AppendOpsReq,  reply: oneshot::Sender<Result<CommitReceipt>> },
    AttachBlob { req: AttachBlobReq, reply: oneshot::Sender<Result<BlobReceipt>> },
    Flush      { reply: oneshot::Sender<Result<()>> },
}
```

The commit path is an explicit state machine, not a loose bundle of async filesystem calls — so a crash mid-commit
leaves the workspace in a recoverable state, never a half-applied one ([failure-modes](./failure-modes.md)).

### Backpressure is explicit

The write queue is **bounded**. When writes arrive faster than the writer drains, the queue saturates and the host
returns an explicit `BACKPRESSURE` result; the renderer shows a queued state
([layers-and-responsibilities](../../01-architecture/boundary/layers-and-responsibilities.md)). Writes are never
silently dropped and never auto-retried without the caller's awareness. A retry under backpressure is safe because
mutating commands carry an idempotency key — the same key lands the mutation at most once
([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).

`WriteOptions { bulk_mode: bool }` is a **performance and scheduling hint**. It may coalesce derived work —
schema-compile and integrity jobs are deferred to the worker instead of running inline per op
([derived-runtime-and-projections](./derived-runtime-and-projections.md)) — and it may group canonical `fsync`s behind
durable barriers. It **never** permits an operation, checkpoint, or job outcome to be reported as _committed_ before the
corresponding canonical bytes and required object references are durably synchronised. It changes the canonical commit
rule in no other way: validation, record format, operation identity, write-before-reference ordering for blobs,
append-before-projection authority, final durability before successful completion, and the collision/replay rules are
all unchanged.

**Interactive write vs bulk job.** A normal synchronous write is per-op: validate → durably prepare any blob objects →
append the canonical operation → `fsync` the segment → apply required synchronous projections → acknowledge committed.
The operation-level response means that operation is durable. A bulk write is an
[accepted job](../../04-contracts/accepted-work-and-events/README.md): accept → stage and append the batch in order →
cross durable barriers periodically → update projections for committed operations → final `fsync` barrier → report
completion. **Acceptance is not durability** — a bulk command is accepted before any operation is durable, and
operations between barriers may be reported _appended/staged_ but not _committed_. After a crash, operations before the
latest completed barrier are durable; complete-looking records after it are not assumed durable merely because the
filesystem returned the writes; recovery validates the loose tail and a retry preserves `op_id` (committed ops no-op).
The invariant holds at barrier granularity: **every unit reported as committed is durably present in canonical
storage.**

**Projection frontier never leads the durable frontier.** SQLite may prepare or stage projection work before a barrier,
but no derived transaction may become the _only_ durable representation of an operation:
`visible projected frontier ≤ canonical durable frontier`. After a barrier, projection application catches up
idempotently; if it fails, the canonical operations remain committed and rebuildable. A checkpoint that must satisfy
read-your-writes is not reported complete until its synchronous projections have caught up.

**Barrier policy.** A durable barrier (`fsync` per the [atomic-write sequence](./workspace-integrity-and-recovery.md))
is **mandatory** before sealing a segment, at job end, before reporting a checkpoint as committed, before a clean
pause/cancellation is reported complete, before any external action relies on the imported state, and before rotating
away from the loose segment. Intra-segment barrier cadence is **implementation-tunable within configured bounds** —
`max_uncommitted_bytes` and/or `max_uncommitted_duration` (defaults performance-tested, not pinned here) — rather than a
fixed per-`N`-ops rule, because operation sizes vary too widely for a count to bound replay work or throughput. A bulk
job is **checkpointed partial commitment, not atomic across its whole input** unless a contract explicitly requires it:
each barrier commits a prefix, failure preserves committed operations, and the outcome records which source items
committed, failed, or remain pending (so "bulk job failed" never implies "nothing was imported"). Whole-job rollback
would need a separate staging-and-publish protocol.

---

## Read isolation: snapshots and the writer's own reads

Reads run against a consistent engine snapshot, so a long read never sees a half-applied write and never blocks the
writer. This is snapshot-isolation / MVCC read semantics _(Berenson et al., A Critique of ANSI SQL Isolation
Levels, 1995)_: a reader observes a committed point-in-time view of the store, isolated from concurrent writes.

The single writer gives a stronger guarantee to the _writer's own session_: because the writer's commit and the
immediate delta-apply of an `incremental` projection run on the same queue, the writer reads its own effect — **causal
read-your-writes** within the session. A reader who did not perform the write converges after the projection refreshes
and, until then, sees a `stale` or `rebuilding` freshness state rather than a silently stale value. This consistency
model is fixed by [ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md).

The trade-off named: snapshot isolation rules out write-write conflicts by construction (there is one writer), at the
cost of no concurrent-write parallelism within a workspace. The product accepts a serial write path — desktop write
volume is modest and the determinism is worth more than write throughput — and pushes parallelism into the read path and
the background worker.

---

## Engine pluggability

The runtime engine sits behind this trait, so it is replaceable without touching the workspace format or any caller.
**SQLite is the current default and the correctness oracle** ([sqlite](./SQLITE.md)). The trait keeps the door open to a
Rust-native engine (redb), a high-write LSM engine (RocksDB), or a read-optimised engine (LMDB/MDBX) — the bake-off and
its complexity trade-offs are in [runtime-and-engine](./RUNTIME-AND-ENGINE.md). Whichever engine is active, the
canonical workspace semantics, the trait, and the rebuild guarantee are identical.

Hosted PostgreSQL is an _optional adapter_ behind the same persistence interface. It materialises workspace semantics
into a service store; it is never the source of truth — the workspace folder and its op segments are always canonical
([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md),
[dependency-rules](../../01-architecture/boundary/dependency-rules.md)).

---

## Worked example — a write under backpressure

The renderer submits `append_ops` to assert a new `accesses` relationship from `Automation Orchestrator` to the
`Engagement Event` data entity, with idempotency key `k1`:

1. The host posts `WriteMsg::AppendOps` to the workspace's writer; the queue is saturated, so the host returns
   `BACKPRESSURE`.
2. The renderer shows a queued state and retries with the **same** key `k1`.
3. The writer now has capacity: it appends the operation once, updates the projection edge row and the change feed
   inside the transaction, and queues the integrity recompute for the affected subgraph.
4. A second retry with `k1` after success returns the recorded outcome — the operation lands exactly once despite three
   deliveries ([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).
5. The writer's next read shows the new relationship (read-your-writes); a second window sees a `stale` badge until its
   projection refreshes, then converges ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)).

---

## References & standards

_Normative:_

- SQLite official documentation (WAL mode, pragmas) — the default derived-runtime engine configuration.

_Informative:_

- Berenson et al. — _A Critique of ANSI SQL Isolation Levels_, 1995. Snapshot isolation / MVCC read semantics for the
  single-writer queue.

## Related documents

| Document                                                                | What it covers                                                    |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)        | The storage-engine abstraction and single-writer constraint.      |
| [ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)      | The read-your-writes / eventual-with-staleness consistency model. |
| [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)     | Why a backpressure retry is safe.                                 |
| [Runtime and engine layout](./RUNTIME-AND-ENGINE.md)                    | Keyspace, query path, and the engine bake-off.                    |
| [Derived runtime and projections](./derived-runtime-and-projections.md) | What the queued background work maintains.                        |
| [Dependency rules](../../01-architecture/boundary/dependency-rules.md)  | Why no consumer touches storage directly.                         |
