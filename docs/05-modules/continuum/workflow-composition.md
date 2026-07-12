# Workflow composition

How Continuum composes engine and connector capabilities into governed, multi-step workflows — and how a cross-engine
workflow undoes its partial effects when a later step fails, using the saga compensation model. The control-flow
vocabulary is van der Aalst's workflow patterns; cross-step recovery is the saga pattern _(Garcia-Molina & Salem,
Sagas, 1987)_.

---

## A workflow is a composition of steps

A multi-step workflow may span several engines and connectors. A typical shape:

1. **Connector pull** — fetch from an external system ([connector-orchestration](./connector-orchestration.md)).
2. **Semantic validation or shaping** — a Praxis-facing step that maps the pulled data onto the metamodel.
3. **Persistence write** — a Mneme boundary write of the resulting facts.
4. **Downstream refresh** — a recompute trigger (Chrona re-resolution, Metis analytics).
5. **Run event emission and terminal status.**

Each step is explicit, with a recorded status, and the steps form a DAG of dependencies
([run-and-step-lifecycle](./run-and-step-lifecycle.md)). Continuum composes the engines' and connectors' capabilities;
it does not own those engines — it dispatches into them through their capability traits
([dependency-rules](../../01-architecture/boundary/dependency-rules.md)).

---

## Compensation: the saga model

A cross-engine workflow cannot be a single atomic transaction — its steps span a connector, Praxis, and Mneme, which do
not share one transaction boundary. When a late step fails after earlier steps have already committed effects, the
workflow must **compensate**: run, in reverse, the actions that undo the committed steps' effects _(Garcia-Molina &
Salem, Sagas, 1987)_. This is the saga pattern — a long-running transaction expressed as a sequence of local steps, each
with a compensating action, so a failure is recovered by compensation rather than by a global rollback that does not
exist.

Two points specific to Aideon:

- **Compensation is append-only.** Because the op log is append-only
  ([Mneme op-fact-schema-model](../mneme/op-fact-schema-model.md)), a compensating action does not erase a committed
  write — it appends a _superseding_ operation that undoes the effect (e.g. a tombstone, or a correcting fact). The
  original write remains visible to a belief-pinned read ([Mneme bitemporal-and-hlc](../mneme/bitemporal-and-hlc.md));
  compensation is a forward correction, recorded in history, not an erasure.
- **Compensation is idempotent.** A compensating step, like any step, carries an idempotency key, so a retried or
  resumed compensation lands once ([idempotency-and-dedup](./idempotency-and-dedup.md)).

The trade-off named: sagas give cross-engine recovery without a distributed transaction coordinator, at the cost that
compensation is _semantic_, not automatic — each step that commits an effect must define how to undo it, and there is a
window between the failing step and the completed compensation where the partial effect is visible. The product accepts
this because a distributed two-phase commit across a connector, Praxis, and Mneme is not available, and append-only
compensation keeps the recovery honest and auditable.

---

## Governed, not free-form

A workflow is _governed_: every step is recorded in the run ledger, bounded by retry and timeout, and emits the shared
accepted-work statuses ([ACCEPTED-WORK-AND-EVENTS](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)). There is no path
for a workflow to run an unobserved, uncancellable, unbounded step — that is precisely what the executor model forbids
([durable-executor-model](./durable-executor-model.md)). This is what lets the host present a truthful status surface
for any workflow without knowing the workflow's internals.

---

## Worked example — a failed persist compensated

A workflow ingests a CMDB delta and a downstream step fails:

1. **Pull** and **shape** complete: the CMDB delta is mapped, including a new `accesses` relationship from
   `Automation Orchestrator` to the `Engagement Event` data entity.
2. **Persist** commits the new relationship to the actual layer through Mneme — an effect now visible in the twin.
3. **Validate-cross-references** (a later Praxis-facing step) fails permanently: the relationship violates a cardinality
   rule the delta did not account for. This is a permanent failure, not retried
   ([retry-and-backoff](./retry-and-backoff.md)).
4. The workflow runs the **compensation** for the persist step: it appends a tombstone superseding the just-written
   `accesses` relationship. The relationship is no longer effective at the latest belief, but its brief history remains
   auditable.
5. The run reaches a terminal `failed` with the compensation recorded; the ledger shows the persist committed, the
   validation failed, and the compensation undid the persist
   ([snapshot-store-and-ledger](./snapshot-store-and-ledger.md)).

The twin is left consistent — no orphaned relationship — and the whole sequence is inspectable, because compensation is
an append-only, recorded correction.

---

## References & standards

_Normative:_

- Garcia-Molina & Salem — _Sagas_, 1987. Compensation for multi-step cross-engine work.

_Informative:_

- van der Aalst et al. — Workflow Patterns. The control-flow vocabulary for composition.
- Temporal.io — durable execution model. Saga-style compensation in a durable workflow.

## Related documents

| Document                                                           | What it covers                                           |
| ------------------------------------------------------------------ | -------------------------------------------------------- |
| [Run and step lifecycle](./run-and-step-lifecycle.md)              | The step DAG composition builds on.                      |
| [Connector orchestration](./connector-orchestration.md)            | The connector steps in a workflow.                       |
| [Retry and backoff](./retry-and-backoff.md)                        | When a step fails permanently and triggers compensation. |
| [Mneme op / fact / schema model](../mneme/op-fact-schema-model.md) | Why compensation is append-only.                         |
| [Continuum README](./README.md)                                    | The module index.                                        |
