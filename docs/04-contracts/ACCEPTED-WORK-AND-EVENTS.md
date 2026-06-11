# Accepted Work and Events

The contract for long-running work on Aideon Desktop: the `AcceptedJob` shape, the run and step lifecycle, the typed Tauri event model, the local durable run ledger, and the backpressure contract.

---

## Why This Contract Exists

Long-running work — schema rebuilds, blob ingestion, analytics refresh, import pipelines, re-indexing, and connector-driven ingest — must not block the renderer thread and must not disappear silently into a background process the user cannot inspect. The pattern is:

1. A Tauri command returns an `AcceptedJob` immediately.
2. Progress arrives as a stream of typed Tauri events.
3. A durable run ledger in the workspace records the full lifecycle so runs are auditable after the fact.
4. When the write queue is saturated, the command returns a `BACKPRESSURE` error and the UI shows a queued state.

This is the desktop translation of the platform's "202 Accepted" semantics. The lifecycle is identical; there is no HTTP — only Tauri commands and events.

The authoritative boundary rules are in [ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md). The UX obligations for status surfaces are in [UX-DESIGN.md](../03-design/UX-DESIGN.md).

---

## Accepted Job Shape

Every Tauri command that initiates long-running work returns an `AcceptedJob`. The renderer stores this immediately and subscribes to events filtered by `runId`.

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

### Work Queue Classes

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

---

## Run Lifecycle

A run moves through a linear set of statuses. Terminal statuses are final.

### Run Status Enum

| Status      | Terminal | Meaning                                                 |
| ----------- | -------- | ------------------------------------------------------- |
| `accepted`  | No       | Job queued; executor has not yet started it.            |
| `running`   | No       | Executor is actively processing.                        |
| `succeeded` | Yes      | All steps completed without error.                      |
| `failed`    | Yes      | One or more steps failed beyond retry limits.           |
| `cancelled` | Yes      | Cancelled by operator or system policy.                 |
| `partial`   | Yes      | Completed with some skipped or degraded steps.          |
| `blocked`   | No       | Waiting on a dependency or lock before it can continue. |

### Step Status Enum

| Status      | Terminal | Meaning                                     |
| ----------- | -------- | ------------------------------------------- |
| `pending`   | No       | Step is queued within the run.              |
| `running`   | No       | Step is executing.                          |
| `retrying`  | No       | Step failed a non-terminal attempt.         |
| `succeeded` | Yes      | Step completed successfully.                |
| `failed`    | Yes      | Step exhausted its retry budget.            |
| `skipped`   | Yes      | Step was bypassed by run policy.            |
| `cancelled` | Yes      | Step was cancelled before it could execute. |

### Normal Flow

```
accepted → running → [step.pending → step.running → step.succeeded]+ → succeeded
```

### Retry Flow

```
step.running → step.retrying → step.running → ... → step.succeeded | step.failed
```

### Failure Flow

```
running → step.failed → failed
```

---

## Typed Event Model

All run progress arrives via Tauri events, not by polling. Events are emitted on the `run:progress` channel. The renderer subscribes once and filters by `runId`.

### Event Envelope

```typescript
// TypeScript — src/dtos/run-event.ts
interface RunEvent {
  /** Stable unique event identifier. */
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

### Event Taxonomy

| Event Type             | Emitted When                                                   |
| ---------------------- | -------------------------------------------------------------- |
| `run.created`          | Ledger entry written; job is in `accepted` state.              |
| `run.started`          | Executor begins processing the run.                            |
| `run.progress`         | Periodic progress snapshot for the overall run.                |
| `run.warning`          | Non-fatal warning during execution.                            |
| `run.succeeded`        | Run terminal: all steps complete without error.                |
| `run.failed`           | Run terminal: one or more steps exhausted retries.             |
| `run.cancelled`        | Run terminal: cancelled by operator or policy.                 |
| `step.started`         | A named step inside the run begins executing.                  |
| `step.progress`        | Progress within a step (units completed / total).              |
| `step.retrying`        | Step attempt failed; executor will retry.                      |
| `step.succeeded`       | Step terminal: completed successfully.                         |
| `step.failed`          | Step terminal: exhausted retry budget.                         |
| `artefact.recorded`    | An output artefact or lineage reference was recorded.          |
| `projection.refreshed` | A downstream projection was refreshed as a run side-effect.    |
| `invalidation.emitted` | A cache or projection invalidation was emitted during the run. |

### Progress Payload

`run.progress` and `step.progress` carry a structured progress snapshot:

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

`phase` values are stable per `WorkQueueClass` family and must not change between runs without a contract version bump.

### Example: schema rebuild event sequence

```jsonc
// 1. run.created
{
  "eventId": "evt_01",
  "runId": "run_abc",
  "correlationId": "idem_xyz",
  "eventType": "run.created",
  "occurredAt": "2026-06-10T09:00:00.000Z",
  "message": "Rebuild queued",
  "severity": "info",
  "payload": { "queueClass": "rebuild" }
}

// 2. run.started
{
  "eventId": "evt_02",
  "runId": "run_abc",
  "correlationId": "idem_xyz",
  "eventType": "run.started",
  "occurredAt": "2026-06-10T09:00:01.000Z",
  "message": "Rebuild started",
  "severity": "info",
  "payload": {}
}

// 3. step.progress
{
  "eventId": "evt_03",
  "runId": "run_abc",
  "correlationId": "idem_xyz",
  "eventType": "step.progress",
  "occurredAt": "2026-06-10T09:00:05.000Z",
  "message": "Rebuilt 1 200 / 3 000 entities",
  "severity": "info",
  "stepId": "rebuild.workspace_projection",
  "payload": { "phase": "projection_rebuild", "percent": 40, "completed": 1200, "total": 3000 }
}

// 4. run.succeeded
{
  "eventId": "evt_07",
  "runId": "run_abc",
  "correlationId": "idem_xyz",
  "eventType": "run.succeeded",
  "occurredAt": "2026-06-10T09:00:18.000Z",
  "message": "Rebuild complete",
  "severity": "info",
  "payload": { "durationMs": 17000 }
}
```

---

## Local Durable Run Ledger

The run ledger is persisted in the workspace, not in a hosted service. It is the source of truth for run history, step lineage, and artefact provenance.

### Storage Location

```
<workspace>/
└── ops/
    └── runs/
        ├── run_abc/
        │   ├── run.json          ← RunRecord
        │   ├── steps/
        │   │   ├── step_01.json  ← StepRecord
        │   │   └── step_02.json
        │   └── events/
        │       ├── evt_01.json   ← RunEvent
        │       └── ...
        └── run_def/
            └── ...
```

The `AcceptedJob.ledgerRef` is a workspace-relative path pointing to the `run.json` for that run (e.g. `ops/runs/run_abc/run.json`).

### RunRecord Shape

```typescript
interface RunRecord {
  runId: string;
  queueClass: WorkQueueClass;
  idempotencyKey: string;
  status: RunStatus;
  /** ISO-8601 */
  acceptedAt: string;
  startedAt?: string;
  completedAt?: string;
  /** Structured metadata supplied by the initiating command. */
  metadata: Record<string, unknown>;
  /** Final error detail when status is "failed". */
  error?: RunError;
}
```

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunRecord {
    pub run_id: RunId,
    pub queue_class: WorkQueueClass,
    pub idempotency_key: String,
    pub status: RunStatus,
    pub accepted_at: HlcTimestamp,
    pub started_at: Option<HlcTimestamp>,
    pub completed_at: Option<HlcTimestamp>,
    pub metadata: serde_json::Value,
    pub error: Option<RunError>,
}
```

### StepRecord Shape

```typescript
interface StepRecord {
  stepId: string;
  runId: string;
  /** Human-readable label. */
  name: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  attemptCount: number;
  error?: RunError;
  /** Artefact or lineage references produced by this step. */
  outputs: ArtefactRef[];
}
```

### RunError Shape

```typescript
interface RunError {
  /** Machine-readable error code. */
  code: string;
  message: string;
  /** Debug detail — never surfaced directly in user-facing UI. */
  details?: Record<string, unknown>;
}
```

### Idempotency Rules

- Every command that initiates long-running work must supply an `idempotencyKey`.
- The executor checks the run ledger before creating a new run record.
- A duplicate submission with the same `idempotencyKey` returns the existing `AcceptedJob` without creating a second run.
- The idempotency window is the lifetime of the workspace run ledger.

---

## Control Operations

### Cancel

The renderer emits a cancel intent via the `run_cancel` Tauri command:

```typescript
// Command payload
interface RunCancelRequest {
  runId: string;
  reason: 'operator_requested' | 'workspace_closing' | 'policy_timeout';
}
```

The executor marks the run `cancelled` and emits a `run.cancelled` event. Steps that are already terminal are not re-opened.

### Retry

The renderer emits a retry intent via the `run_retry` Tauri command:

```typescript
interface RunRetryRequest {
  runId: string;
  /** If provided, retry from this step. Otherwise, retry the whole run. */
  fromStepId?: string;
  reason: string;
}
```

Retry creates a new `RunRecord` linked to the original `runId` via a `retriedFromRunId` field. The original record is not mutated.

---

## Backpressure Contract

When the internal write queue reaches its capacity threshold the executor returns a structured error instead of accepting new work:

```typescript
// IpcResponse.error
{
  "code": "BACKPRESSURE",
  "message": "Write queue is saturated. Retry after active jobs complete.",
  "details": { "queueClass": "rebuild", "activeCount": 3, "queueDepth": 16 }
}
```

The renderer treats `BACKPRESSURE` as a distinct UI state: the initiating action shows a _queued_ badge, not a failure. The caller may retry the command once queue depth drops. `BACKPRESSURE` is not retried automatically by the host — retry is a renderer responsibility.

Saturated-queue behaviour is distinct from a normal `BACKPRESSURE` on an individual write operation (e.g. `append_ops`); both use the same error code but the `queueClass` field in `details` disambiguates the source.

---

## Trigger Commands (Mneme Processing)

The processing triggers listed below are the primary sources of accepted work from the Mneme engine. Each trigger command enqueues background work and returns `AcceptedJob` or `()` on synchronous scheduling.

| Tauri Command | Queue Class | Trigger Shape |
| --- | --- | --- |
| `mneme_trigger_rebuild_effective_schema` | `rebuild` | `{ partitionId, scenarioId?, reason }` |
| `mneme_trigger_refresh_integrity` | `rebuild` | `{ partitionId, scenarioId?, reason }` |
| `mneme_trigger_refresh_analytics_projections` | `analytics_refresh` | `{ partitionId, scenarioId?, reason }` |
| `mneme_trigger_retention` | `retention` | `{ partitionId, scenarioId?, policy: RetentionPolicy, reason }` |
| `mneme_trigger_compaction` | `compaction` | `{ partitionId, scenarioId?, reason }` |

`RetentionPolicy`:

```typescript
interface RetentionPolicy {
  keepOpsDays?: number;
  keepFactsDays?: number;
  keepFailedJobsDays?: number;
  keepPagerankRunsDays?: number;
}
```

These are test-gated commands today (`#[cfg(test)]` in `src-tauri/src/mneme/commands_processing.rs`). The shape is stable; the production command surface will expose a subset through the capability system described in ADR-0006.

---

## Error Codes

| Code                   | Meaning                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `BACKPRESSURE`         | Write queue saturated; caller should retry later.          |
| `RUN_NOT_FOUND`        | No run with the given `runId` in the ledger.               |
| `RUN_ALREADY_TERMINAL` | Attempted to cancel or retry a terminal run.               |
| `IDEMPOTENCY_CONFLICT` | A run with the given key exists in an incompatible state.  |
| `STEP_NOT_FOUND`       | `fromStepId` in a retry request does not exist in the run. |

---

## References

- [Contracts and Schemas](./CONTRACTS-AND-SCHEMAS.md)
- [Projection and Invalidation](./PROJECTION-AND-INVALIDATION.md)
- [Continuum module](../05-modules/continuum/README.md)
- [Host module](../05-modules/host/README.md)
- [ADR-0006 — Tauri Trust Boundary and Typed IPC](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)
- [UX Design — accepted-work and backpressure UX](../03-design/UX-DESIGN.md)
