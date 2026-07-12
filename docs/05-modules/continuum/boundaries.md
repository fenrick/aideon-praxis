# Boundaries

What Continuum owns, what it does not, and how it composes with the other engines without forming a cycle. The forbidden
list is the load-bearing half ([dependency-rules](../../01-architecture/boundary/dependency-rules.md),
[ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)).

---

## What Continuum owns

- Scheduling and triggers — timed, recurring, and event-driven work
  ([scheduling-and-fairness](./scheduling-and-fairness.md)).
- Connector orchestration behind typed adapter contracts ([connector-orchestration](./connector-orchestration.md)).
- Multi-step, cross-engine workflow execution with step-level progress and saga compensation
  ([workflow-composition](./workflow-composition.md)).
- The durable run ledger — the source of truth for automation history
  ([snapshot-store-and-ledger](./snapshot-store-and-ledger.md)).
- The bounded retry model and exactly-once-effect guarantee ([retry-and-backoff](./retry-and-backoff.md),
  [idempotency-and-dedup](./idempotency-and-dedup.md)).

---

## What Continuum does not own

| Not Continuum's                                    | Owned by                      | The seam                                                                                                                                                                                            |
| -------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Semantic modelling rules and the metamodel         | [Praxis](../praxis/README.md) | Continuum dispatches semantic steps through Praxis capability traits; it does not decide what the model means.                                                                                      |
| Raw persistence internals and the op log           | [Mneme](../mneme/README.md)   | Continuum writes facts through Mneme traits; it does not touch the runtime database or generate SQL.                                                                                                |
| User-facing accepted-work APIs and status surfaces | [Host](../host/README.md)     | The host owns the IPC commands and progress subscriptions; Continuum owns what the workflow _does_.                                                                                                 |
| UI shell behaviour                                 | Renderer                      | —                                                                                                                                                                                                   |
| Time and scenario interpretation                   | [Chrona](../chrona/README.md) | A workflow may _trigger_ a Chrona re-resolution as a step; it does not interpret time itself.                                                                                                       |
| Analytics meaning                                  | [Metis](../metis/README.md)   | A workflow may _trigger_ a Metis recompute; it does not define the analytics.                                                                                                                       |
| Investment **planning**                            | Kairos _(planned)_            | Continuum **executes** the work a committed Kairos plan implies; Kairos decides the work, resources, and schedule ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)). |
| Discovery **scheduling policy**                    | Skopos _(planned)_            | Continuum **executes** the ingestion; Skopos decides when and what to discover to keep the actual layer fresh ([DOCUMENTATION-STANDARD §10](../../02-standards/DOCUMENTATION-STANDARD.md)).         |

---

## Continuum executes; others decide

The cleanest way to state Continuum's place: it is the _doing_ engine, not a _deciding_ engine. Two planned modules make
this explicit:

- **Kairos plans, Continuum executes.** Kairos works backwards from a target date to a schedule of work packages
  ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md),
  [backward-planning](../../03-design/forces-of-change/backward-planning.md)). When a plan is committed by scenario
  promotion, the work it implies is executed as Continuum runs — Kairos never executes its own plan, and Continuum never
  plans the work it runs. The hand-off (how a committed Kairos plan dispatches to Continuum, and how actuals reconcile
  back against the plan layer) is an open question in
  [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md).
- **Skopos schedules discovery, Continuum runs it.** Skopos will own the _policy_ of continuous discovery — the entropy
  feeder that keeps the actual layer fresh for Kairos. The ingestion itself runs through Continuum's connector
  orchestration ([connector-orchestration](./connector-orchestration.md)). Skopos decides the cadence and scope;
  Continuum performs the pull, shape, persist, recompute.

This division keeps each module's responsibility singular and the graph acyclic: planning, discovery policy, and
execution are three concerns, three modules, no cycle.

---

## The acyclic invariant

Continuum dispatches _into_ the engines through their capability traits and is dispatched _into_ by other modules' work
through Continuum's capability traits ([dependency-rules](../../01-architecture/boundary/dependency-rules.md)):

| Direction                 | Notes                                                                  |
| ------------------------- | ---------------------------------------------------------------------- |
| Continuum → Host          | Receives the `SnapshotStore` and accepted-work wiring at startup.      |
| Continuum → Praxis        | Dispatches semantic steps through Praxis capability traits.            |
| Continuum → Mneme         | Writes ops and facts through Mneme persistence traits.                 |
| Other modules → Continuum | Dispatch scheduled/triggered work through Continuum capability traits. |

No engine depends on Continuum's implementation and back — there is no engine-to-engine cycle. Shared types sit in a
lower neutral contract crate rather than forming a lateral import
([dependency-rules](../../01-architecture/boundary/dependency-rules.md)). The full graph is the
[module dependency map](../../01-architecture/module-dependency-map.md).

---

## Related documents

| Document                                                                       | What it covers                                           |
| ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| [Dependency rules](../../01-architecture/boundary/dependency-rules.md)         | The directions and the acyclic invariant.                |
| [ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)           | The module taxonomy and the "earns its own module" test. |
| [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md) | Kairos, whose plans Continuum executes.                  |
| [Module dependency map](../../01-architecture/module-dependency-map.md)        | The full engine graph.                                   |
| [Continuum README](./README.md)                                                | The module index.                                        |
