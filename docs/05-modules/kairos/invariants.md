# Invariants

The non-negotiable rules Kairos upholds. For practitioners and reviewers checking that a planning behaviour stays within the boundary the module owns.

> **PLANNED.** No `aideon_kairos` crate exists; this is design intent per [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md). The invariants are normative now and constrain the implementation when it lands.

## 1. Every investment attaches to a modelled change

Every Kairos investment **points at a modelled change** — a `PlanEvent`/Change Event on a non-actual layer in a scenario ([`CONTEXT.md`](../../../CONTEXT.md)). **A budget with no change behind it is not representable** ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)). This is the discipline that makes a portfolio defensible: every figure traces to the change it funds, and an executive briefing can drill from a budget number to the work, to the change, to the entropy signal that forced it. In the [proposed investment extension](../../03-design/metamodel/proposed-investment-extension.md) this is the mandatory `answers` relationship from an `Investment` to a `PlanEvent`.

## 2. Plans are facts in scenarios

Worked-back schedules are authored as **`plan`-layer facts within a scenario**, compared against baseline as a [diff](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md), and committed by **scenario promotion** ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)). Kairos **writes only through Mneme** and holds **no separate durable store**; it adds no new canonical storage primitive ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)). Re-planning closes one fact's valid-time interval and opens another rather than mutating in place ([proposed investment extension](../../03-design/metamodel/proposed-investment-extension.md)).

## 3. Kairos reads impact from Metis; it never reimplements traversal

Kairos consumes the change-magnitude vector Metis computes and **never reimplements graph traversal** ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md); [ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). Impact and blast radius are a Metis concern; Kairos sizes and tiers from what Metis returns ([integration](./integration.md)).

## 4. Sizing is honest about uncertainty

An investment can be **large, strategic, and Low-confidence at the same time** ([ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md); [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)). An indicative size is **Inferred** content carrying a confidence label, never an asserted figure, and never claims false precision ([change magnitude and investment sizing](../../03-design/forces-of-change/change-magnitude-and-investment-sizing.md)). **Infeasible runways are surfaced, not hidden**: a plan whose earliest start lands in the past is reported as infeasible at the target date, with the earliest feasible date shown ([backward-planning engine](./backward-planning-engine.md)).

## 5. Detection is a reviewable signal, never a silent edit

Kairos presents each detected entropy/change as a reviewable **signal** on a Signal Surface, never a silent edit ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md); [change detection and entropy signals](./change-detection-and-entropy-signals.md)). A human decides whether to model a change as an investment; Kairos never authors a plan unbidden.

## 6. Boundaries — detect and plan, nothing else

Kairos **detects and plans**; it does **not** execute (Continuum), traverse (Metis), render time (Chrona), or define meaning (Praxis) ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)). It composes with them through the host, with no engine-to-engine cycle ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). It owns capex/investment cost; ongoing run-cost is the folded **Oikos** concern ([resource, rate, duration, cost model](./resource-rate-duration-cost-model.md)).

## How these compose

These invariants reinforce one another. Because every investment attaches to a change (1) and plans are facts in scenarios (2), the whole portfolio is auditable and rebuildable from the canonical workspace ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)). Because Kairos reads Metis (3) and sizes honestly (4), a defensible portfolio carries its uncertainty rather than hiding it. Because detection is a reviewable signal (5) and the boundary is narrow (6), planning stays a human-directed activity composed cleanly with the rest of the engine graph.

## References & standards

_Normative:_

- The Open Group — **TOGAF Standard, 10th Edition** and **ArchiMate 3.2 Specification**. The planning method and vocabulary the invariants protect.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                       | What it covers                                      |
| ------------------------------------------------------------------------------ | --------------------------------------------------- |
| [Kairos README](./README.md)                                                   | The module index.                                   |
| [Integration](./integration.md)                                                | How the boundaries in invariant 6 are composed.     |
| [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md) | The decision that fixes these invariants.           |
| [ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)           | The acyclic engine graph invariant 3 and 6 rely on. |
