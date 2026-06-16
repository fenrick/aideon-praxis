# Continuum

The local durable executor for Aideon Desktop. Continuum runs the multi-step, cross-engine work the product schedules or triggers — connector ingest, refresh pipelines, scheduled recompute — and keeps every run visible, governed, and replayable through a durable run ledger held in the workspace. There is no external orchestration service; the executor is in-process and workspace-backed, so work survives restarts and every run can answer what it did, why, what it wrote, what failed, and what is safe to retry.

Continuum is named for continuous, durable execution over time. It is where the work that other modules _decide on_ actually _gets done_: it executes the work that the planned **Kairos** plans ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)) and the ingestion that the planned **Skopos** schedules ([DOCUMENTATION-STANDARD §10](../../02-standards/DOCUMENTATION-STANDARD.md)).

---

## Contents

1. [The durable executor model](./durable-executor-model.md) — why execution is in-process, workspace-backed, and durable.
2. [Run and step lifecycle](./run-and-step-lifecycle.md) — the run/step/event records, DAG step dependencies, cancellation, leases.
3. [Retry and backoff](./retry-and-backoff.md) — exponential backoff with jitter; transient vs permanent.
4. [Idempotency and deduplication](./idempotency-and-dedup.md) — exactly-once effect over at-least-once delivery.
5. [The snapshot store and run ledger](./snapshot-store-and-ledger.md) — the `SnapshotStore` seam, the ledger schema, retention and GC.
6. [Connector orchestration](./connector-orchestration.md) — adapter-driven ingest behind typed contracts.
7. [Workflow composition](./workflow-composition.md) — composing engine and connector steps into governed workflows.
8. [Scheduling and fairness](./scheduling-and-fairness.md) — timed and triggered work, queue classes, fairness.
9. [Boundaries](./boundaries.md) — what Continuum owns and does not own.

---

## One-line responsibility

Continuum owns local durable orchestration: scheduling, triggers, connector workflows, multi-step cross-engine composition, retries, and the durable run ledger. It composes the engines' capabilities into governed workflows; it does not own those engines, their semantics, or their storage.

---

## Core invariants

| Invariant                                     | What it means                                                                                                                 | Backed by                                                              |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Durable runs**                              | Run, step, and event state persists in the workspace, so work survives a restart and every run is inspectable after the fact. | [durable-executor-model](./durable-executor-model.md)                  |
| **Bounded, deliberate retries**               | Retries are bounded and backed off, never implicit timer loops; a permanent failure is not retried.                           | [retry-and-backoff](./retry-and-backoff.md)                            |
| **Exactly-once effect**                       | A retried or re-delivered unit of work lands its effect at most once, under an idempotency key, over at-least-once delivery.  | [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)    |
| **Replayability**                             | The exact input set, step events, and lineage of any run are recoverable from the ledger.                                     | [run-and-step-lifecycle](./run-and-step-lifecycle.md)                  |
| **Ledger is the truth of automation history** | Hosted relays and connector services are optional adapters, never the authoritative record.                                   | [snapshot-store-and-ledger](./snapshot-store-and-ledger.md)            |
| **No engine-to-engine cycle**                 | Continuum dispatches into engines through their capability traits; no engine depends on Continuum's implementation and back.  | [dependency-rules](../../01-architecture/boundary/dependency-rules.md) |

---

## What Continuum owns / does not own

Continuum **owns**: scheduling and triggers; connector orchestration; workflow execution with step-level progress; the durable run ledger; the snapshot store seam; provenance and replayability; the bounded retry model.

Continuum **does not own**: semantic modelling rules ([Praxis](../praxis/README.md)); raw persistence internals ([Mneme](../mneme/README.md) — Continuum writes through Mneme's traits); user-facing accepted-work APIs and status surfaces ([Host](../host/README.md)); UI shell behaviour (renderer); investment _planning_ (Kairos, planned); discovery _scheduling policy_ (Skopos, planned — though Continuum executes the ingestion). The full list is in [boundaries](./boundaries.md).

---

## Accepted-work status language

Continuum emits the shared accepted-work statuses for all automated work: `accepted`, `running`, `warning`, `failed`, `cancelled`, `completed`. The host owns the user-facing status surfaces and progress subscriptions; Continuum owns what the workflow _does_, which steps run, and what counts as success, retry, or failure. The full contract is [ACCEPTED-WORK-AND-EVENTS](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md).

---

## Crate shape

| Path                          | Contents                                                              |
| ----------------------------- | --------------------------------------------------------------------- |
| `crates/continuum/src/lib.rs` | The `SnapshotStore` trait and the `FileSnapshotStore` implementation. |
| `crates/continuum/tests/`     | Integration tests.                                                    |

The crate is a library: no Tauri bindings, no direct database coupling beyond Mneme traits. The scheduler is Tokio-driven; bespoke thread pools and external scheduling services are out of scope.

---

## References & standards

_Normative:_

- Garcia-Molina & Salem — _Sagas_, 1987. Compensation for multi-step cross-engine work ([workflow-composition](./workflow-composition.md)).

_Informative:_

- Temporal.io — durable execution model. Deterministic replay, activity retries, workflow versioning ([durable-executor-model](./durable-executor-model.md)).
- van der Aalst et al. — Workflow Patterns. The control-flow vocabulary ([workflow-composition](./workflow-composition.md)).

## Related documents

| Document                                                                       | What it covers                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| [Accepted-work and events](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)     | The accepted-job envelope, event taxonomy, and run ledger contract. |
| [Host module](../host/README.md)                                               | The composition root that wires Continuum and owns status surfaces. |
| [Mneme module](../mneme/README.md)                                             | The storage Continuum writes through.                               |
| [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)            | Idempotency and deduplication.                                      |
| [Module dependency map](../../01-architecture/module-dependency-map.md)        | The full engine graph.                                              |
| [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md) | Kairos, whose committed plans Continuum executes.                   |
