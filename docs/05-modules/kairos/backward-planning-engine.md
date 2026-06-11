# Backward-planning engine

The retrograde scheduler at the heart of Kairos: anchoring a target plateau, computing the gap, matching a pattern, and scheduling work packages backwards from the target date. For practitioners reasoning about how a target date becomes a resourced schedule.

> **PLANNED.** No `aideon_kairos` crate exists; this is design intent per [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md). The method is described in full in [backward planning](../../03-design/forces-of-change/backward-planning.md) — this file is the engine view and **links** the method rather than restating it.

## The method, in brief

Backward planning is **retrograde scheduling** against the valid-time axis ([backward planning](../../03-design/forces-of-change/backward-planning.md)). Given a change with a target date `T`, Kairos ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)):

1. **Anchors a Target Plateau at `T`** — the architecture state that must hold at `T`.
2. **Computes the Gap from baseline** — via [Metis](../metis/README.md), the difference between today's effective graph and the Target Plateau.
3. **Matches a project-type pattern** — the [pattern](./project-type-patterns.md) whose shape fits the Gap supplies an ordered set of work packages with default roles, durations, and dependencies.
4. **Schedules its work packages backwards (latest-finish first)** — replacement build/acquire, migration/handover, rollout, hypercare, run handover, decommission — each consuming resources at a rate over a duration ([resource, rate, duration, cost model](./resource-rate-duration-cost-model.md)).

The full walk-through, the default replacement work chain, and the diagram live in [backward planning](../../03-design/forces-of-change/backward-planning.md); this engine view does not duplicate them.

## Infeasible runways are surfaced, not hidden

The earliest work package's start date falls out of the subtraction. If it lands in the past, the plan is **infeasible at `T`** — the runway is too short — and Kairos surfaces this honestly rather than producing a plan that cannot be met ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md); [backward planning](../../03-design/forces-of-change/backward-planning.md)). It shows the earliest feasible `T` instead. This is the planning analogue of the product's honest-state discipline ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)): a plan that cannot be met is stated as such, not dressed up as achievable.

## Plans are facts in scenarios

Each scheduled work package and its effects are authored as **`plan`-layer facts** within a **scenario**, their `effective_at` set to the worked-back dates ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)). The plan is a scenario the user can compare against baseline as a [diff](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md) and **promote** to commit ([`CONTEXT.md`](../../../CONTEXT.md)). Kairos writes only through Mneme; it holds no separate durable store ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)). Re-planning closes one fact's valid-time interval and opens another rather than mutating in place ([proposed investment extension](../../03-design/metamodel/proposed-investment-extension.md)).

The initial scheduling algorithm is **latest-finish-first, single-resource** ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)); resource levelling and optimisation are deferred, and whether levelling is in the first version is an open question. The trade-off named: a single-resource latest-finish scheduler is simple and explainable but cannot resolve contention across a portfolio — that is the cost of the first version, stated plainly.

## Worked example

The seed `Application` `n:application:automation-orchestrator` (`disposition = Migrate`) has a cutover `PlanEvent` "FY26 Q2 Channel Cutover" at `effective_at = 2026-05-01`. Treating that as `T`, Kairos anchors a Target Plateau at `2026-05-01` (the orchestrator retired, a replacement realising `n:capability:automation-fabric` in `Run`, the `Confidential` `n:data-entity:engagement-event` migrated). Metis computes the Gap. The matched pattern is _application migration_. Scheduling backwards from `2026-05-01`: hypercare ends ~4 weeks after cutover, rollout precedes cutover, migration and build precede rollout, selection/procurement precedes build. If the build duration pushes the earliest start before today (2026-06-11), Kairos flags the `2026-05-01` cutover as **at risk** and shows the earliest feasible date. The output is a `plan`-layer scenario of Plan Events with worked-back dates and a Low-confidence indicative size ([resource, rate, duration, cost model](./resource-rate-duration-cost-model.md)). (Note: a `T` already in the past relative to today is itself an infeasibility the engine reports rather than hides.)

## References & standards

_Normative:_

- The Open Group — **TOGAF Standard, 10th Edition** (Phase F: Migration Planning; Transition Architectures). The method.
- The Open Group — **ArchiMate 3.2 Specification** (Plateau, Gap, Work Package, Deliverable, Implementation Event). The vocabulary.

_Informative:_

- Critical-path and latest-finish scheduling (project-management body of knowledge). The scheduling approach.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                       | What it covers                                                  |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| [Kairos README](./README.md)                                                   | The module index and invariants.                                |
| [backward planning](../../03-design/forces-of-change/backward-planning.md)     | The full method, work chain, and diagram (not duplicated here). |
| [Project-type patterns](./project-type-patterns.md)                            | The templates the matcher selects from.                         |
| [Resource, rate, duration, cost model](./resource-rate-duration-cost-model.md) | What each work package consumes.                                |
| [Continuum module](../continuum/README.md)                                     | Where the committed work runs.                                  |
