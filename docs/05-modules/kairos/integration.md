# Integration

How Kairos composes with the other engines through the host, and the metamodel extension it authors against. For
practitioners reasoning about Kairos's place in the engine graph.

> **PLANNED.** No `aideon_kairos` crate exists; this is design intent per
> [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md).

## Kairos composes through the host, never engine-to-engine

Kairos is an engine and **depends on no other engine**
([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). It detects and plans; it does not execute,
traverse, render time, or define meaning
([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)). Every interaction below is composed by
the host, keeping the engine graph acyclic.

## Metis — impact sizing

Kairos consumes the **change-magnitude vector** Metis computes — blast radius along the spine, criticality, sensitivity,
dependency breadth, lifecycle distance, time pressure — to set a **governance tier** (operational / tactical /
strategic) and an **indicative size** carrying a confidence label
([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md);
[Metis impact and change magnitude](../metis/impact-and-change-magnitude.md)). Kairos **never reimplements traversal**;
it reads what Metis computes ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). The same magnitude
vector also sizes the Gap for backward planning ([backward-planning engine](./backward-planning-engine.md)) and scores a
risk for [Aegis](../aegis/integration.md), so risk-driven and entropy-driven investment are sized on one consistent
basis.

## Chrona — timeline

**Chrona** resolves viewpoints and renders the plateaus and transitions on the timeline
([backward planning](../../03-design/forces-of-change/backward-planning.md)). Kairos authors plans on the valid-time
axis as `plan`-layer facts in a scenario; Chrona is what places those Target and Transition Plateaus, and the
`effective_at` dates, on a timeline a user can read and compare as a
[diff](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md). Kairos plans the _when_; Chrona renders it.

## Continuum — execution

Backward planning produces a **plan**, not execution. Executing the committed work — triggering, tracking, and
reconciling it — is orchestration owned by **Continuum**
([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md);
[backward planning](../../03-design/forces-of-change/backward-planning.md)). Once a planning scenario is promoted, the
committed work hands off to Continuum durable jobs. How exactly a committed Kairos plan hands off to Continuum, and how
actuals reconcile back against the `plan` layer, is an open question
([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)). Kairos plans; Continuum runs.

## Praxis — the semantic spine

The change events Kairos plans sit at the end of the **semantic spine** — the Intent → Value → Capability → Execution →
Technology → **Change** lineage ([semantic spine](../../03-design/semantic-spine/README.md)). Praxis defines the
metamodel and the spine that integrity and explainability reason along; Kairos authors planning facts against types
Praxis governs, and never defines meaning itself
([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)).

## Signal Surfaces — presenting opportunities

A detected investment opportunity is presented as a reviewable **signal** on a **Signal Surface**
([SIGNAL-SURFACES.md](../../03-design/SIGNAL-SURFACES.md);
[change detection and entropy signals](./change-detection-and-entropy-signals.md)), never a silent edit
([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)). The human decides whether to model the
change.

## The proposed investment metamodel extension

Kairos authors against the
[**proposed investment extension**](../../03-design/metamodel/proposed-investment-extension.md), which adds the
ArchiMate-aligned planning types — Plateau, Gap, Work Package, Deliverable, Implementation Event, Resource — plus
Kairos's economic types (Investment, Project-Type Pattern, Programme, Portfolio), **with UUID minting deferred to the
metamodel compiler** ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)). It extends —
never edits — the seed types, and is governed like any metamodel change (SemVer, forward-only,
[ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md)). The mandatory attachment from
[ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md) — every investment attaches to a change —
is the `answers` relationship from an `Investment` to a `PlanEvent` in that extension.

## Worked example

For the seed `Application` `n:application:automation-orchestrator` migration: the host asks **Metis** for the magnitude
vector; Kairos tiers the investment _tactical_ and sizes it Low-confidence
([change magnitude and investment sizing](../../03-design/forces-of-change/change-magnitude-and-investment-sizing.md)).
Kairos authors the worked-back schedule as `plan`-layer facts against the **proposed investment extension** types — an
`Investment` that `answers` the "FY26 Q2 Channel Cutover" `PlanEvent`, with `WorkPackage`s that `delivers_change` to the
application. **Chrona** renders the plateaus on the timeline; the user reviews the opportunity on a **Signal Surface**
and compares the scenario as a diff. On promotion, the committed work hands off to **Continuum**. No engine called
another; the host composed all of it.

## References & standards

_Normative:_

- The Open Group — **TOGAF Standard, 10th Edition** and **ArchiMate 3.2 Specification**. The planning method and
  vocabulary.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                    | What it covers                                 |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [Kairos README](./README.md)                                                                | The module index and invariants.               |
| [Invariants](./invariants.md)                                                               | The rules these integrations preserve.         |
| [Metis impact and change magnitude](../metis/impact-and-change-magnitude.md)                | The magnitude vector Kairos sizes from.        |
| [proposed investment extension](../../03-design/metamodel/proposed-investment-extension.md) | The metamodel types Kairos authors against.    |
| [Aegis integration](../aegis/integration.md)                                                | Risk as a driver Kairos plans the response to. |
