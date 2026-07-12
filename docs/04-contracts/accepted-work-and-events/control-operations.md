# Control operations

How a caller cancels or retries a run. Both act against the [run-and-step lifecycle](./run-and-step-lifecycle.md) and
are recorded in the [run ledger](./run-ledger.md).

---

## Cancel

The renderer emits a cancel intent via the `run_cancel` Tauri command:

```typescript
interface RunCancelRequest {
  runId: string;
  reason: 'operator_requested' | 'workspace_closing' | 'policy_timeout';
}
```

The executor marks the run `cancelled` and emits a `run.cancelled` [event](./event-model.md). Steps that are already
terminal are not re-opened. Cancellation is cooperative: a running step is signalled and unwinds at its next checkpoint
rather than being killed mid-write, so the op log is never left half-applied. `policy_timeout` is the system-initiated
reason when a run exceeds its overall [timeout budget](./run-and-step-lifecycle.md).

## Retry

The renderer emits a retry intent via the `run_retry` Tauri command:

```typescript
interface RunRetryRequest {
  runId: string;
  /** If provided, retry from this step. Otherwise, retry the whole run. */
  fromStepId?: string;
  reason: string;
}
```

A retry creates a **new** `RunRecord` linked to the original `runId` via a `retriedFromRunId` field
([run-ledger.md](./run-ledger.md)); the original record is not mutated, so the failure history is preserved. A
`fromStepId` retry resumes from that step, honouring the [step DAG](./run-and-step-lifecycle.md): steps that already
succeeded are not re-run, and the retried step's dependents are re-evaluated. A `fromStepId` that does not exist in the
run is a `STEP_NOT_FOUND` error ([error-codes.md](./error-codes.md)); retrying a terminal run that cannot be retried is
`RUN_ALREADY_TERMINAL`.

The retry's submission carries a fresh [idempotency key](./idempotency-rules.md), because it is a genuine re-execution
of the operation, not a duplicate of the original.

## Related documents

| Document                                                                                  | What it covers                               |
| ----------------------------------------------------------------------------------------- | -------------------------------------------- |
| [run-and-step-lifecycle.md](./run-and-step-lifecycle.md)                                  | The states and DAG cancel/retry act on.      |
| [run-ledger.md](./run-ledger.md)                                                          | The `retriedFromRunId` linkage.              |
| [error-codes.md](./error-codes.md)                                                        | `RUN_ALREADY_TERMINAL` and `STEP_NOT_FOUND`. |
| [Continuum: run-and-step lifecycle](../../05-modules/continuum/run-and-step-lifecycle.md) | The executor that honours cancel and retry.  |
