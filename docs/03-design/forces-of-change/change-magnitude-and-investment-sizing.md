# Change magnitude and investment sizing

How Aideon turns the size of a change into the size and governance tier of the [investment](./investment.md) that delivers it. The principle the user can rely on: **the larger the change, the more strategic the investment, and the larger it is.** This document makes "larger" measurable rather than intuitive.

Magnitude is computed by [Metis](../../05-modules/metis/README.md) (the analytics engine) from the resolved [effective graph](../../../CONTEXT.md) at the change's viewpoint, and consumed by [Kairos](../../05-modules/kairos/README.md) to size and tier the investment. It is **Inferred** content — derived, bounded, and explainable — never an asserted figure.

## What "magnitude" is made of

Magnitude is not one number; it is a small, explainable vector. Each component is read from the twin using the seed [relationship types](../metamodel/relationship-types.md) (`serves`, `realises`, `accesses`, `hosts`, `plan_effect`):

| Component              | What it measures                              | How it is read                                                                                                                                                           |
| ---------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Blast radius**       | How much of the twin the change touches       | The impact set along the spine: entities reachable from the changing element via `realises`/`accesses`/`hosts`, bounded by depth and fanout (a Metis impact computation) |
| **Criticality**        | How important the touched entities are        | `BusinessProcess.criticality`, `Capability.tier`, and how many strategic capabilities sit upstream via `realises` → `serves`                                             |
| **Sensitivity**        | The data exposure the change creates or moves | `DataEntity.sensitivity` on entities reached by `accesses` from the changing element                                                                                     |
| **Dependency breadth** | How coupled the element is                    | In-degree and out-degree across `realises`/`accesses`/`hosts`; a widely depended-on element is costlier to change                                                        |
| **Lifecycle distance** | How far the asset must travel                 | The number of `lifecycle`/`disposition` transitions implied (e.g. `Run → Retire` plus a replacement's `Plan → Build → Run`)                                              |
| **Time pressure**      | How little runway remains                     | Valid-time distance from now to the change date; a near date compresses schedules and raises cost and risk                                                               |

Each component is bounded and carries its [honest-state](../../02-standards/DOCUMENTATION-STANDARD.md#9-honest-state-vocabulary) flags: if the impact set was truncated by a fanout limit, the blast radius is **Partial** and the magnitude says so.

## From magnitude to size and tier

Kairos composes the vector into two outputs:

1. **Governance tier** — _operational_, _tactical_, or _strategic_. Tier rises with blast radius, criticality, and sensitivity. The tier sets the approval path and the level of scrutiny an investment receives, not its cost.
2. **Indicative size** — an order-of-magnitude cost band, derived from the [project-type pattern](../../05-modules/kairos/README.md) the opportunity matches and the resources that pattern consumes over its worked-back schedule (see [backward planning](./backward-planning.md)). It carries a [confidence](../../02-standards/DOCUMENTATION-STANDARD.md#82-confidence) label, because an indicative size computed from a pattern before any estimating is, by definition, _Low_ or _Indicative_ confidence.

Sizing never claims false precision. A strategic, wide-blast-radius change with a near date is flagged as a large, high-scrutiny investment with low-confidence cost — which is the honest state of a plan that has been sized but not yet estimated.

## Worked example — Automation Orchestrator

From the seed dataset, the `Application` **Automation Orchestrator** carries `disposition = Migrate` and `lifecycle = Plan`. Reading its neighbourhood at today's viewpoint:

- It `realises` the **Automation Fabric** capability (`tier = Supporting`).
- It `accesses` the **Engagement Event** `DataEntity` (`sensitivity = Confidential`).
- It is `hosts`-linked from the **Stream Processor** `TechnologyComponent`.
- A `PlanEvent`, **FY26 Q2 Channel Cutover** (`effective_at = 2026-05-01`), sets the migration date.

Magnitude reads as: **moderate blast radius** (one capability, one data entity, one technology component); **elevated sensitivity** (Confidential data moves); **supporting criticality** (not a strategic capability); **near time pressure** (a dated cutover). Kairos tiers this **tactical** (sensitivity raises it above operational, but it is not strategic), and the matched pattern is _application migration_, generating a worked-back plan with **Low-confidence** indicative size until estimating refines it.

Had Automation Orchestrator instead realised a _Strategic_ capability that several value-stream stages `serves`, the same migration would tier **strategic** and size materially larger — the change is bigger because what depends on it is bigger. That is the principle, made computable.

## References & standards

- ArchiMate 3.2 — impact and dependency analysis over the layered model. _(informative)_
- Newman, _Networks_, 2018; Metis centrality/impact definitions — the blast-radius computation. _(normative for the measure)_
- Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                      | What it covers                                                       |
| ------------------------------------------------------------- | -------------------------------------------------------------------- |
| [backward-planning.md](./backward-planning.md)                | How the sized investment is scheduled from the change date.          |
| [05-modules/metis](../../05-modules/metis/README.md)          | The engine that computes blast radius and impact.                    |
| [05-modules/kairos](../../05-modules/kairos/README.md)        | The engine that tiers and sizes the investment.                      |
| [ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md) | The integrity score, a related Inferred measure over the same graph. |
