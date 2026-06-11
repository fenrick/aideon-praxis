# Run and step lifecycle

The records a run produces, how steps depend on one another as a DAG, and the lifecycle controls — cancellation, leases and heartbeats, max-retry and timeout — that keep a run bounded and recoverable. The accepted-work contract is [ACCEPTED-WORK-AND-EVENTS](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md).

---

## A run is the unit of durable work

Every workflow execution produces a durable record set in the workspace ([snapshot-store-and-ledger](./snapshot-store-and-ledger.md)):

| Record              | Purpose                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `run`               | Identity, trigger type, start/end timestamps, terminal status.                                             |
| `run_step`          | Per-step name, status, start/end, connector or engine target.                                              |
| `run_event`         | Structured progress, warning, and failure events within a step.                                            |
| Artefact references | Input and output lineage references, for provenance.                                                       |
| Idempotency key     | Enables safe retries without duplicate side effects ([idempotency-and-dedup](./idempotency-and-dedup.md)). |

A run moves through the shared accepted-work statuses — `accepted`, `running`, `warning`, `failed`, `cancelled`, `completed` ([ACCEPTED-WORK-AND-EVENTS](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)). The terminal status is recorded so a finished run is auditable without re-execution.

---

## Steps form a DAG

A workflow's steps are a **directed acyclic graph** of dependencies, not merely a sequence. A step runs only when its dependencies have reached a terminal-success status; independent steps may run concurrently _(van der Aalst et al., Workflow Patterns — sequence, parallel split, synchronisation)_. The DAG is acyclic by construction: a step cannot depend on itself transitively, so a workflow always has a valid execution order and always terminates.

The dependency structure is what makes resume-from-failure precise: on resume, Continuum runs the steps whose dependencies are satisfied and that are not already `completed`, skipping the completed ones ([durable-executor-model](./durable-executor-model.md)). A diamond dependency (A → {B, C} → D) resumes correctly whether the interruption fell between A and B, or between C and D, because each step's status is recorded.

---

## Lifecycle controls

A run is bounded by explicit controls, never by hope:

- **Cancellation.** A run may be cancelled; cancellation is cooperative — a step checks for a cancellation signal at safe points and stops, recording `cancelled`. A cancelled run leaves the workspace consistent: completed steps' effects stand (they are durable and idempotent), and no partial step is left half-applied, because Mneme's commit path is transactional ([Mneme storage-trait-and-engine](../mneme/storage-trait-and-engine.md)). Cancellation is not a kill; it is a bounded, recorded stop.
- **Lease and heartbeat.** A running step holds a **lease** with an expiry; it renews the lease by **heartbeat** while it works. If a step dies without releasing its lease (a crash), the lease expires and the step becomes eligible for recovery — Continuum can re-dispatch it rather than leaving it stuck `running` forever. The lease is what distinguishes "still working" from "died mid-step". (The lease and `lease_expires_at` primitive is mirrored in Mneme's job queue, [Mneme SQLITE](../mneme/SQLITE.md).)
- **Max-retry.** A failing step is retried up to `max_attempts`; exhausting them is a terminal `failed`, not an infinite loop ([retry-and-backoff](./retry-and-backoff.md)).
- **Timeout.** A step that exceeds its time budget is treated as a failure of that attempt — it does not block the run indefinitely. A genuinely hung step is bounded by its lease expiry even if it never returns.

---

## Worked example — a connector ingest run with a transient step failure

A connector ingest workflow for the seed workspace has four steps in a DAG: pull → shape → persist → recompute.

1. **Pull** acquires a lease, heartbeats while fetching, records `run_event`s for progress, completes, releases the lease. `run_step` = `completed`.
2. **Shape** (a Praxis-facing validation step) depends on pull; it runs, completes.
3. **Persist** depends on shape; it writes facts through Mneme — including, say, an updated `disposition` on `Automation Orchestrator` — but the write hits `BACKPRESSURE` ([Mneme storage-trait-and-engine](../mneme/storage-trait-and-engine.md)). This is a _transient_ failure: the step records a `warning` event and is retried with backoff under the same idempotency key, so the write lands at most once ([retry-and-backoff](./retry-and-backoff.md), [idempotency-and-dedup](./idempotency-and-dedup.md)).
4. **Recompute** depends on persist; once persist completes on retry, recompute runs.
5. The run reaches `completed`; the ledger holds the full DAG with the persist step's retry recorded.

Had the application crashed after persist, resume would skip pull/shape/persist (all `completed`) and run only recompute — the DAG plus recorded statuses make the resume exact.

---

## Bounds

- A run's step set is a DAG, so execution order is well-defined and termination is guaranteed.
- A step is bounded by `max_attempts`, its timeout, and its lease expiry — no step runs unboundedly or blocks the run forever.
- Resume cost is `O(remaining steps)`, not `O(all steps)` — completed steps are skipped.

---

## References & standards

_Informative:_

- van der Aalst et al. — Workflow Patterns. Sequence, parallel split, synchronisation, and the control-flow vocabulary for a step DAG.
- Temporal.io — durable execution model. Activity leases, heartbeats, and timeouts.

## Related documents

| Document                                                                   | What it covers                          |
| -------------------------------------------------------------------------- | --------------------------------------- |
| [Accepted-work and events](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) | The status language and event taxonomy. |
| [Retry and backoff](./retry-and-backoff.md)                                | How a failed step is retried.           |
| [Idempotency and deduplication](./idempotency-and-dedup.md)                | Why a retried step is exactly-once.     |
| [The durable executor model](./durable-executor-model.md)                  | Resume-from-failure.                    |
| [Continuum README](./README.md)                                            | The module index.                       |
