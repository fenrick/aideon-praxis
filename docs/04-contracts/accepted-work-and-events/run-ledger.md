# Local durable run ledger

The run ledger is persisted in the workspace, not in a hosted service. It is the source of truth for run history, step
lineage, and artefact provenance — and the store whose lifetime bounds the [idempotency](./idempotency-rules.md) dedup
window. It is owned by [Continuum](../../05-modules/continuum/snapshot-store-and-ledger.md).

---

## Storage location

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

The `AcceptedJob.ledgerRef` is a workspace-relative path to the `run.json` for that run (e.g.
`ops/runs/run_abc/run.json`).

## RunRecord

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

A retry creates a new `RunRecord` linked to the original via a `retriedFromRunId` field
([control-operations.md](./control-operations.md)); the original record is never mutated.

## StepRecord

```typescript
interface StepRecord {
  stepId: string;
  runId: string;
  name: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  attemptCount: number;
  error?: RunError;
  /** Steps this step depends on (the DAG edges). */
  dependsOn?: string[];
  /** Artefact or lineage references produced by this step. */
  outputs: ArtefactRef[];
}
```

`attemptCount` is the realised count against the step's [max-retry budget](./run-and-step-lifecycle.md); `dependsOn`
records the [DAG edges](./run-and-step-lifecycle.md) (design intent where the DAG is not yet realised).

## RunError

```typescript
interface RunError {
  /** Machine-readable error code. */
  code: string;
  message: string;
  /** Debug detail — never surfaced directly in user-facing UI. */
  details?: Record<string, unknown>;
}
```

`RunError.code` is the same stable code vocabulary as the [IPC error envelope](../ipc/error-envelope.md), so a failed
run's recorded error carries the same category and recovery semantics; `details` must not leak secrets
([LOGGING_FRAMEWORK.md §10](../../LOGGING_FRAMEWORK.md)).

## Retention and garbage collection

The ledger does not grow without bound. A retention policy retires run entries, and retiring a run's entry is also what
closes its [idempotency window](./idempotency-rules.md). Retention is applied by the `mneme_trigger_retention` command
with a `RetentionPolicy`:

```typescript
interface RetentionPolicy {
  keepOpsDays?: number;
  keepFactsDays?: number;
  keepFailedJobsDays?: number;
  keepPagerankRunsDays?: number;
}
```

Garbage collection is the `retention` [work queue class](./accepted-job-shape.md) itself: an accepted run that, in turn,
prunes retired ledger entries, their step files, and their event files. A run is eligible for collection only once it is
terminal and older than its class's retention window; failed runs are kept longer (`keepFailedJobsDays`) so a failure
remains auditable. The exact default windows are provisional
([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md), open questions) and are design intent until
configured. Continuum owns the ledger and its GC
([Continuum: snapshot store and ledger](../../05-modules/continuum/snapshot-store-and-ledger.md)).

## References & standards

- Garcia-Molina & Salem — **Sagas**, 1987 _(normative: durable run record for compensation)_.

## Related documents

| Document                                                                                        | What it covers                               |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------- |
| [idempotency-rules.md](./idempotency-rules.md)                                                  | The dedup window the ledger lifetime bounds. |
| [run-and-step-lifecycle.md](./run-and-step-lifecycle.md)                                        | The statuses and DAG the records capture.    |
| [Continuum: snapshot store and ledger](../../05-modules/continuum/snapshot-store-and-ledger.md) | The engine that owns the ledger.             |
