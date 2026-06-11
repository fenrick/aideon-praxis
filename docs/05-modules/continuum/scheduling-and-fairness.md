# Scheduling and fairness

How Continuum decides what runs when: timed and triggered work, queue classes, and the fairness that stops one heavy workflow from starving the rest. The scheduler is Tokio-driven and in-process ([durable-executor-model](./durable-executor-model.md)).

---

## What initiates work

| Initiator    | Description                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| **Schedule** | Timed and recurring work — refresh policies, periodic recompute — fired on a Tokio timer, bounded by retry windows. |
| **Trigger**  | Event-driven invocation from a host or connector event.                                                             |
| **Manual**   | A user-initiated run, dispatched as accepted work through the host.                                                 |

Every initiated unit becomes a run in the ledger with its trigger type recorded ([run-and-step-lifecycle](./run-and-step-lifecycle.md)), so the _why_ of a run is always inspectable. Scheduling is deliberate: a recurring refresh is a recorded schedule, not an implicit background loop that no one can see or stop.

---

## Queue classes

Work is classified into **queue classes** (e.g. `connector_ingest`, `recompute`, `export`) carried on the run ([ACCEPTED-WORK-AND-EVENTS](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)). Queue classes serve two purposes:

- **Isolation.** A slow connector ingest in one class does not block a quick recompute in another — classes are scheduled independently.
- **Policy.** Different classes can carry different concurrency limits, priorities, and retry policies, so heavy ingest work does not crowd out interactive recompute.

---

## Fairness

Fairness is the property that no single workflow, queue class, or retry storm monopolises the executor _(van der Aalst et al., Workflow Patterns — the resource and scheduling perspective)_. Continuum's mechanisms:

- **Bounded concurrency per class.** Each queue class admits a bounded number of concurrent runs, so a flood of one class cannot consume all executor capacity.
- **Jittered backoff spreads retries.** A burst of transient failures (a connector outage) retries on jittered exponential backoff, so the retries spread across the backoff window instead of re-issuing in lock-step ([retry-and-backoff](./retry-and-backoff.md)). This is the executor-level defence against a retry storm.
- **Priority within ready work.** Among runs ready to execute, priority and creation order break ties — the same `(status, priority, created)` and `(status, next_run_after, priority)` ordering Mneme's job queue uses ([Mneme SQLITE](../mneme/SQLITE.md)), so the scheduling discipline is consistent across both.
- **Leases prevent stuck monopoly.** A step that dies holding capacity has its lease expire, freeing the slot for other work rather than leaving it occupied by a dead step ([run-and-step-lifecycle](./run-and-step-lifecycle.md)).

The trade-off named: bounded per-class concurrency means a genuinely urgent single workflow cannot commandeer the whole machine even when nothing else is running — capacity is reserved by class. The product accepts a modest under-utilisation in the single-workflow case in exchange for predictable, fair behaviour when many workflows contend, which is the case that actually hurts a user.

---

## Worked example — a refresh that does not starve a user edit

A scheduled hourly CMDB refresh of the seed workspace coincides with a user editing `Automation Orchestrator`:

1. The hourly schedule fires a `connector_ingest` run; it pulls and begins persisting, occupying the `connector_ingest` class's concurrency budget.
2. The user's edit dispatches a quick write; its recompute lands in the `recompute` class, which has its own budget — so the recompute is not queued behind the long ingest.
3. The ingest hits a transient rate limit; its retries are jittered, so even if other `connector_ingest` runs were queued, they would not all retry at the same instant ([retry-and-backoff](./retry-and-backoff.md)).
4. The user's recompute completes promptly; the ingest completes a little later. Neither starved the other, because the two queue classes are scheduled independently.

The user does not perceive the background refresh as a freeze, because fairness reserved capacity for interactive recompute.

---

## Bounds

- Concurrency per queue class is bounded by configuration; total executor concurrency is the sum across classes.
- Retry spread is bounded by the jitter window ([retry-and-backoff](./retry-and-backoff.md)).
- A scheduled job's next firing is a recorded `next_run_after`, not an unbounded timer.

---

## References & standards

_Informative:_

- van der Aalst et al. — Workflow Patterns. The resource and scheduling perspective on fairness.
- Temporal.io — durable execution model. Task-queue isolation and worker concurrency.

## Related documents

| Document                                                                   | What it covers                               |
| -------------------------------------------------------------------------- | -------------------------------------------- |
| [Retry and backoff](./retry-and-backoff.md)                                | Jittered backoff as the retry-storm defence. |
| [Run and step lifecycle](./run-and-step-lifecycle.md)                      | Leases and the ready-work ordering.          |
| [The durable executor model](./durable-executor-model.md)                  | The Tokio-driven in-process scheduler.       |
| [ACCEPTED-WORK-AND-EVENTS](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) | Queue classes on the accepted-work envelope. |
| [Continuum README](./README.md)                                            | The module index.                            |
