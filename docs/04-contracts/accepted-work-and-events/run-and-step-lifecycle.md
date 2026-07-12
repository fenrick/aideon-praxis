# Run and step lifecycle

How a run and its steps move through their states, including the step dependency DAG, leases and heartbeats, retry
budgets, and timeouts. The orchestration model is owned by
[Continuum](../../05-modules/continuum/run-and-step-lifecycle.md); this file is the contract a caller and a status
surface depend on.

---

## Run status

A run moves through a set of statuses; terminal statuses are final.

| Status      | Terminal | Meaning                                                 |
| ----------- | -------- | ------------------------------------------------------- |
| `accepted`  | No       | Job queued; executor has not yet started it.            |
| `running`   | No       | Executor is actively processing.                        |
| `succeeded` | Yes      | All steps completed without error.                      |
| `failed`    | Yes      | One or more steps failed beyond retry limits.           |
| `cancelled` | Yes      | Cancelled by operator or system policy.                 |
| `partial`   | Yes      | Completed with some skipped or degraded steps.          |
| `blocked`   | No       | Waiting on a dependency or lock before it can continue. |

## Step status

| Status      | Terminal | Meaning                                     |
| ----------- | -------- | ------------------------------------------- |
| `pending`   | No       | Step is queued within the run.              |
| `running`   | No       | Step is executing.                          |
| `retrying`  | No       | Step failed a non-terminal attempt.         |
| `succeeded` | Yes      | Step completed successfully.                |
| `failed`    | Yes      | Step exhausted its retry budget.            |
| `skipped`   | Yes      | Step was bypassed by run policy.            |
| `cancelled` | Yes      | Step was cancelled before it could execute. |

## Normal, retry, and failure flows

```text
accepted → running → [step.pending → step.running → step.succeeded]+ → succeeded
step.running → step.retrying → step.running → ... → step.succeeded | step.failed
running → step.failed → failed
```

## Step dependency DAG

A run's steps form a directed acyclic graph: each step declares the steps it depends on, and the executor runs a step
only once all its dependencies are terminal-successful. A step whose dependency `failed` is `skipped` (cascading to its
own dependents), unless run policy marks the dependency optional. The DAG is the unit of partial completion — a run is
`partial` when some independent branch succeeded while another was skipped. Acyclicity is required: a dependency cycle
is rejected at submission, mirroring the acyclic engine graph rule
([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). The DAG-dependency surface is design intent
where not yet realised in code; the [Continuum workflow-composition](../../05-modules/continuum/workflow-composition.md)
document is authoritative on the realised subset.

## Lease and heartbeat

A running step holds a **lease** — a time-bounded claim that the executor owns it. The executor renews the lease with a
periodic **heartbeat**. If a heartbeat is missed beyond the lease duration (a crash, a hang), the lease expires and the
step becomes eligible for re-execution under its [retry budget](#retry-budget-and-timeout) — the mechanism that stops a
dead executor from stranding a run as permanently `running`. Lease and heartbeat are owned by
[Continuum: durable executor model](../../05-modules/continuum/durable-executor-model.md) and are design intent where
not yet realised.

## Retry budget and timeout

Each step carries:

- a **max-retry** count — the number of non-terminal attempts before the step is `failed` and the budget is exhausted;
- a **timeout** — the wall-clock bound on a single attempt, after which the attempt is abandoned and counts against the
  retry budget.

Retries back off (exponential with jitter,
[Continuum: retry and backoff](../../05-modules/continuum/retry-and-backoff.md)). A step that exhausts its retry budget
is `failed`; the run then `failed` unless an independent DAG branch lets it complete `partial`. These bounds are part of
the run contract so a status surface can show "attempt 2 of 3" honestly.

## Worked example: rebuild run

The seed rebuild (`run_abc`) has one step, `rebuild.workspace_projection`, with `maxRetry = 3` and a per-attempt
`timeout`. It runs: `accepted → running`, step `pending → running`, emits `step.progress` events, then
`step.succeeded → run.succeeded`. Had the attempt hung past its timeout, the lease would expire, the step would re-enter
`retrying`, and a fresh attempt would start — up to three attempts before `failed`. The event sequence is in
[event-model.md](./event-model.md).

## References & standards

- Garcia-Molina & Salem — **Sagas**, 1987 _(normative: multi-step compensation)_.
- Temporal.io — **durable execution model** _(informative: leases, heartbeats, activity retries)_.
- van der Aalst et al. — **Workflow Patterns** _(informative: DAG control-flow composition)_.

## Related documents

| Document                                                                                  | What it covers                            |
| ----------------------------------------------------------------------------------------- | ----------------------------------------- |
| [event-model.md](./event-model.md)                                                        | The events emitted at each transition.    |
| [control-operations.md](./control-operations.md)                                          | Cancel and retry against this lifecycle.  |
| [Continuum: durable executor model](../../05-modules/continuum/durable-executor-model.md) | The lease/heartbeat/retry implementation. |
| [Continuum: workflow composition](../../05-modules/continuum/workflow-composition.md)     | The DAG composition model.                |
