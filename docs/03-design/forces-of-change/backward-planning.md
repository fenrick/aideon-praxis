# Backward planning from the change date

How Aideon models an [investment](./investment.md) by starting at the date the change must land and working backwards. This is the method the user described: an application set to retire in two years implies a chain of work — decommission, and usually a larger build or acquisition of its replacement, plus migration, rollout, hypercare, and run handover — each with resources, rates, and durations. Backward planning derives that chain instead of asking the user to draw it from a blank page.

The method is **retrograde scheduling** against the valid-time axis, and it maps directly onto established practice: TOGAF's Migration Planning (Phase F) and Transition Architectures, and ArchiMate's **Plateaus** (stable architecture states at points in time) and **Gaps** (the differences between them). The change date is the **Target Plateau**; backward planning fills in the Transition Plateaus and the work that moves the twin between them.

## The method

Given a change with a **target date `T`** (for example, an `Application` reaching `lifecycle = Retire` at `T`):

1. **Anchor the Target Plateau at `T`.** Define the architecture state that must hold at `T`: the old element retired, the replacement in `Run`, data migrated, controls in place.
2. **Identify the Gap.** Compute, via [Metis](../../05-modules/metis/README.md), the difference between the baseline (today's effective graph) and the Target Plateau — what must be created, changed, and removed. The Gap is the work the investment must fund.
3. **Match a project-type pattern.** Select the [pattern](../../05-modules/kairos/README.md) whose shape fits the Gap (e.g. _application replacement_, _SaaS migration_, _decommission only_). The pattern supplies an ordered set of work packages with default roles, durations, and dependencies.
4. **Schedule backwards from `T`.** Place each work package by subtracting its duration and respecting its dependencies, latest-finish first. The replacement must reach `Run` before the old element reaches `Retire`; everything else is scheduled to satisfy that and the inter-package dependencies.
5. **Resolve the start date and feasibility.** The earliest work package's start date falls out of the subtraction. If it is in the past, the plan is **infeasible at `T`** — Kairos surfaces this honestly (the runway is too short) rather than producing a plan that cannot be met.
6. **Write the plan as facts.** Each scheduled package and its effects are authored as [Plan Events](../../../CONTEXT.md) on the `plan` layer within a [scenario](../../../CONTEXT.md), their `effective_at` set to the worked-back dates. The plan is a scenario the user can compare against baseline and [promote](../../../CONTEXT.md) to commit.

## The default work chain for a replacement

When the Gap is "retire an element and stand up its replacement", the matched pattern expands, latest-finish-first, to roughly:

```text
                                                 T (old element → Retire)
   ┌─ procure / select ─┐                          │
   │                    └─ build / acquire / implement ─┐
   │                                                    └─ migrate & data handover ─┐
   │                                                                                 └─ rollout ─┐
   │                                                                                             └─ hypercare ─┐
   │                                                                          run handover ──────────────────┤
   │                                                              decommission old element ──────────────────┘
   ◄──────────────────────────────────────────────────────────────────────────────────────────  scheduled backwards from T
```

Each box is a **work package** consuming **resources** (roles with day-rates) over a **duration**, producing **deliverables**. The replacement build is typically the largest and most strategic package; decommission is the smallest but mandatory; hypercare ("high-care") is the stabilisation window after the replacement reaches `Run` but before run handover completes. These are modelled types, defined in the [proposed investment extension](../metamodel/proposed-investment-extension.md).

## Worked example — migrating Automation Orchestrator

The seed `Application` **Automation Orchestrator** (`disposition = Migrate`) has a cutover `PlanEvent`, **FY26 Q2 Channel Cutover**, at `effective_at = 2026-05-01`. Treat that as `T`.

- **Target Plateau at `2026-05-01`:** Automation Orchestrator retired; a replacement realising **Automation Fabric** in `Run`; **Engagement Event** (Confidential) data migrated with controls intact; **Stream Processor** re-pointed or retired.
- **Gap:** create/onboard the replacement; migrate Confidential data; re-wire the `hosts` and `accesses` relationships; decommission the old application.
- **Pattern:** _application migration_. Scheduling backwards from `2026-05-01`: hypercare ends ~4 weeks after cutover; rollout precedes cutover; migration and build precede rollout; selection/procurement precedes build. If the build duration pushes the start before today, Kairos flags the cutover date as **at risk** and shows the earliest feasible `T`.
- **Output:** a `plan`-layer scenario of Plan Events with worked-back dates, an indicative size at **Low** confidence (per [sizing](./change-magnitude-and-investment-sizing.md)), and the dependency that the replacement reach `Run` **before** `2026-05-01`.

The user can then adjust durations, resources, or `T`, watch the schedule re-derive, compare scenarios as a [diff](../../../CONTEXT.md), and promote the chosen plan.

## Where the work runs

Backward planning produces a _plan_. Executing the committed work — triggering, tracking, and reconciling it — is orchestration, owned by [Continuum](../../05-modules/continuum/README.md). Kairos plans the investment on the valid-time axis; Continuum runs the durable work once the scenario is promoted; [Chrona](../../05-modules/chrona/README.md) renders the plateaus and transitions on the timeline.

## References & standards

- TOGAF Standard, 10th Edition — Phase F (Migration Planning); Transition Architectures. _(normative for the method)_
- ArchiMate 3.2 — Plateau and Gap; Work Package, Deliverable, Implementation Event. _(normative for the vocabulary)_
- Critical-path and latest-finish scheduling (project management body of knowledge). _(informative)_
- Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                 | What it covers                                                   |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [investment.md](./investment.md)                                                         | What an investment is and how it attaches to change.             |
| [change-magnitude-and-investment-sizing.md](./change-magnitude-and-investment-sizing.md) | How the plan's size and tier are set.                            |
| [proposed investment extension](../metamodel/proposed-investment-extension.md)           | The Plateau, Gap, Work Package, Deliverable, and Resource types. |
| [05-modules/kairos](../../05-modules/kairos/README.md)                                   | The engine that runs this method.                                |
