# Accepted job shape

Every Tauri command that initiates long-running work returns an `AcceptedJob` immediately. The renderer stores it and subscribes to [events](./event-model.md) filtered by `runId`.

---

## The shape

```typescript
// TypeScript — src/dtos/accepted-job.ts
interface AcceptedJob {
  /** Stable identifier for this run; correlates all progress events. */
  runId: string;
  /** Machine-readable class of work. */
  queueClass: WorkQueueClass;
  /**
   * Idempotency key submitted by the caller.
   * Duplicate submissions with the same key return the same AcceptedJob.
   */
  idempotencyKey: string;
  /** Workspace-relative path to the run-ledger entry for this job. */
  ledgerRef: string;
  /** ISO-8601 timestamp when the job was accepted. */
  acceptedAt: string;
}
```

```rust
// Rust — src-tauri/src/jobs.rs (canonical shape)
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AcceptedJob {
    pub run_id: RunId,
    pub queue_class: WorkQueueClass,
    pub idempotency_key: String,
    pub ledger_ref: String,
    pub accepted_at: HlcTimestamp,
}
```

The `idempotencyKey` is the caller-supplied key that makes the submission safe to retry ([idempotency-rules.md](./idempotency-rules.md)); `ledgerRef` points to the [run ledger](./run-ledger.md) entry (e.g. `ops/runs/run_abc/run.json`); `acceptedAt` is an [HLC timestamp](../temporal-and-scenario/hlc-encoding.md).

## Work queue classes

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum WorkQueueClass {
    Rebuild,
    Import,
    Export,
    BlobIngestion,
    AnalyticsRefresh,
    Reindex,
    ConnectorIngest,
    Retention,
    Compaction,
    SyncApply,
}
```

The class determines the [phase](./event-model.md) vocabulary the run emits and the [queue](./backpressure.md) it competes for. New variants are additive ([versioning-and-compatibility.md](../ipc/versioning-and-compatibility.md)).

## Worked example: an accepted rebuild job

The renderer triggers a schema rebuild for the seed workspace. The command returns:

```json
{
  "runId": "run_abc",
  "queueClass": "rebuild",
  "idempotencyKey": "idem_xyz",
  "ledgerRef": "ops/runs/run_abc/run.json",
  "acceptedAt": "2026-06-10T09:00:00.000Z"
}
```

The renderer subscribes to the [event channel](./event-model.md) filtered by `runId = run_abc` and shows a queued indicator until the first `run.started` event. The full event sequence for this run is in [event-model.md](./event-model.md).

## References & standards

- (System contract) [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) — the command boundary that returns this envelope.

## Related documents

| Document                                                                                  | What it covers                                      |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [run-and-step-lifecycle.md](./run-and-step-lifecycle.md)                                  | The states the accepted run moves through.          |
| [event-model.md](./event-model.md)                                                        | The events the renderer subscribes to by `runId`.   |
| [idempotency-rules.md](./idempotency-rules.md)                                            | How the `idempotencyKey` makes the submission safe. |
| [Continuum: run-and-step lifecycle](../../05-modules/continuum/run-and-step-lifecycle.md) | The engine that schedules the run.                  |
