# Typed event model

All run progress arrives via typed Tauri events on the `run:progress` channel, not by polling. Run/job events are
**window-scoped by default** — emitted to the owning workspace window, not broadcast
([host event-bus](../../05-modules/host/event-bus.md)). The renderer subscribes once and filters by `runId` **within its
own window's scoped event stream**; a window does not receive another window's job progress by default. Events are
ordered and deduplicated by `eventId` ([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).

---

## Event envelope

```typescript
// TypeScript — src/dtos/run-event.ts
interface RunEvent {
  /** Stable unique event identifier; the dedup key. */
  eventId: string;
  /** Run this event belongs to. */
  runId: string;
  /** Correlation id supplied by the initiating command (echoes AcceptedJob.idempotencyKey). */
  correlationId: string;
  /** Structured event type (see taxonomy below). */
  eventType: RunEventType;
  /** ISO-8601 timestamp when the event occurred inside the executor. */
  occurredAt: string;
  /** Human-readable description suitable for a status surface. */
  message: string;
  /** Severity level. */
  severity: 'info' | 'warning' | 'error';
  /** Step-scoped events carry the step identifier. */
  stepId?: string;
  /** Structured payload — shape is event-type specific. */
  payload: RunEventPayload;
}
```

```rust
// Rust — src-tauri/src/jobs.rs
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunEvent {
    pub event_id: EventId,
    pub run_id: RunId,
    pub correlation_id: String,
    pub event_type: RunEventType,
    pub occurred_at: HlcTimestamp,
    pub message: String,
    pub severity: EventSeverity,
    pub step_id: Option<StepId>,
    pub payload: serde_json::Value,
}
```

The `correlationId` joins the event to the originating command's trace
([ipc/correlation-and-tracing.md](../ipc/correlation-and-tracing.md)); `occurredAt` is an
[HLC timestamp](../temporal-and-scenario/hlc-encoding.md) inside the executor.

## Ordering and dedup

The Tauri event channel guarantees at-least-once delivery, not exactly-once and not strict order. The contract therefore
makes the renderer robust to both:

- **Dedup by `eventId`.** Every event carries a stable `eventId`. A consumer that has already processed an `eventId`
  ignores a re-delivery ([ipc/idempotency.md](../ipc/idempotency.md)). Handlers must be safe to invoke twice and
  converge.
- **Order by `occurredAt` per run.** Within one `runId`, the `occurredAt` HLC gives a total order
  ([hlc-encoding.md](../temporal-and-scenario/hlc-encoding.md)), so a renderer that receives events out of delivery
  order reconstructs the true sequence. Terminal events (`run.succeeded`/`run.failed`/`run.cancelled`) are final; an
  event with an earlier `occurredAt` arriving after a terminal event is applied to history, never to the live status.

## Event taxonomy

| Event Type             | Emitted When                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `run.created`          | Ledger entry written; job is in `accepted` state.                                                                                                |
| `run.started`          | Executor begins processing the run.                                                                                                              |
| `run.progress`         | Periodic progress snapshot for the overall run.                                                                                                  |
| `run.warning`          | Non-fatal warning during execution.                                                                                                              |
| `run.succeeded`        | Run terminal: all steps complete without error.                                                                                                  |
| `run.failed`           | Run terminal: one or more steps exhausted retries.                                                                                               |
| `run.cancelled`        | Run terminal: cancelled by operator or policy.                                                                                                   |
| `step.started`         | A named step inside the run begins executing.                                                                                                    |
| `step.progress`        | Progress within a step (units completed / total).                                                                                                |
| `step.retrying`        | Step attempt failed; executor will retry.                                                                                                        |
| `step.succeeded`       | Step terminal: completed successfully.                                                                                                           |
| `step.failed`          | Step terminal: exhausted retry budget.                                                                                                           |
| `artefact.recorded`    | An output artefact or lineage reference was recorded.                                                                                            |
| `projection.refreshed` | A downstream projection was refreshed as a run side-effect.                                                                                      |
| `invalidation.emitted` | A cache or projection invalidation was emitted during the run ([invalidation-events.md](../projection-and-invalidation/invalidation-events.md)). |

## Progress payload

`run.progress` and `step.progress` carry a structured snapshot:

```typescript
interface ProgressPayload {
  /** Integer 0..100 when determinable; absent when indeterminate. */
  percent?: number;
  /** Stable phase identifier per queue class (e.g. "projection_rebuild"). */
  phase: string;
  /** Step identifier currently executing, if applicable. */
  currentStep?: string;
  /** Units completed (e.g. entities rebuilt). */
  completed?: number;
  /** Total units when determinable. */
  total?: number;
}
```

`phase` values are stable per [`WorkQueueClass`](./accepted-job-shape.md) family and must not change between runs
without a contract version bump ([versioning-and-compatibility.md](../ipc/versioning-and-compatibility.md)).

### Acceptance is not durability

The initial `AcceptedJob` response acknowledges **receipt only** — a bulk command is accepted before any operation is
durable. The durability acknowledgement is a **committed-barrier event** or the **terminal successful completion**
event, never `accepted` and never a mere `progress` snapshot
([storage-trait-and-engine](../../05-modules/mneme/storage-trait-and-engine.md),
[ADR-0038](../../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)). A bulk import's progress
therefore must **not** expose a single ambiguous `processed_count`; it distinguishes the stages, and **only
`durably_committed` survives a host crash by contract**:

```typescript
interface BulkImportProgress {
  received: number; // accepted into the batch
  validated: number; // passed canonical + schema validation
  appended: number; // written to the loose segment (not yet necessarily fsync'd)
  durablyCommitted: number; // past a durable barrier — the only crash-surviving count
  projected: number; // applied to required synchronous projections (≤ durablyCommitted)
  rejected: number; // failed validation, with reasons in the outcome
}
```

The renderer may show `appended` work as _in progress_, but must not describe it as **saved/committed** until it is
`durablyCommitted`. `JobCompleted` for a bulk import means every accepted canonical operation is durably committed, the
final segment state is valid, required synchronous projections have incorporated the committed operations, and the batch
outcome (including the rejection report) is itself durable — nothing the outcome claims remains only in memory or page
cache. Deferred derived work (integrity rebuild, schema-dependent artefacts) may still be outstanding **provided it is
explicitly surfaced as `stale`/`rebuilding`**
([DOCUMENTATION-STANDARD §9](../../02-standards/DOCUMENTATION-STANDARD.md)); completion is not held open for it, and the
workspace is not reported fully fresh while it runs. A bulk import is **checkpointed partial commitment, not atomic**
([run-and-step-lifecycle](./run-and-step-lifecycle.md), `partial`): a failure preserves the operations committed before
the last barrier, so a failed bulk job never implies "nothing was imported".

## Worked example: rebuild job progress events

The accepted rebuild `run_abc` from [accepted-job-shape.md](./accepted-job-shape.md) emits:

```jsonc
// 1. run.created
{ "eventId": "evt_01", "runId": "run_abc", "correlationId": "idem_xyz",
  "eventType": "run.created", "occurredAt": "2026-06-10T09:00:00.000Z",
  "message": "Rebuild queued", "severity": "info", "payload": { "queueClass": "rebuild" } }

// 2. run.started
{ "eventId": "evt_02", "runId": "run_abc", "correlationId": "idem_xyz",
  "eventType": "run.started", "occurredAt": "2026-06-10T09:00:01.000Z",
  "message": "Rebuild started", "severity": "info", "payload": {} }

// 3. step.progress
{ "eventId": "evt_03", "runId": "run_abc", "correlationId": "idem_xyz",
  "eventType": "step.progress", "occurredAt": "2026-06-10T09:00:05.000Z",
  "message": "Rebuilt 1 200 / 3 000 entities", "severity": "info",
  "stepId": "rebuild.workspace_projection",
  "payload": { "phase": "projection_rebuild", "percent": 40, "completed": 1200, "total": 3000 } }

// 4. run.succeeded
{ "eventId": "evt_07", "runId": "run_abc", "correlationId": "idem_xyz",
  "eventType": "run.succeeded", "occurredAt": "2026-06-10T09:00:18.000Z",
  "message": "Rebuild complete", "severity": "info", "payload": { "durationMs": 17000 } }
```

If `evt_03` is delivered twice, the renderer's dedup by `eventId` applies it once; if `evt_03` arrives after `evt_07` by
delivery race, the `occurredAt` order places it before the terminal event in history and the live status remains
`succeeded`.

## References & standards

- IETF — **The Idempotency-Key HTTP Header Field** (draft) _(normative: dedup by `eventId`)_.

## Related documents

| Document                                                            | What it covers                          |
| ------------------------------------------------------------------- | --------------------------------------- |
| [run-and-step-lifecycle.md](./run-and-step-lifecycle.md)            | The transitions these events report.    |
| [ipc/idempotency.md](../ipc/idempotency.md)                         | The `eventId` dedup rule.               |
| [ipc/correlation-and-tracing.md](../ipc/correlation-and-tracing.md) | The `correlationId` these events carry. |
| [Host: event bus](../../05-modules/host/event-bus.md)               | The channel that delivers events.       |
