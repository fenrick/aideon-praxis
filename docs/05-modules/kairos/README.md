# Kairos — investment and portfolio planning

Kairos is the planned investment-and-planning engine of the Aideon twin: it detects where change is due, sizes it, and
plans the portfolio, programme, and project work to deliver it — driven by the two forces of change, entropy and action.
Kairos pairs with Chrona: _chronos_ is sequential time, _kairos_ is the opportune moment to act.

> **Implementation status: PLANNED.** No `aideon_kairos` crate exists. Everything in this folder is **design intent** —
> framed in the present tense as the standard requires, but describing behaviour not yet in code. The boundary, the
> investment-attaches-to-change invariant, and the plans-are-facts rule are normative now and constrain the
> implementation when it lands. The governing decision is
> [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md).

The product thesis behind Kairos — why a twin is never still, and how entropy and action drive investment — is the
**Forces of Change** explanation. **This folder does not duplicate it; it links it:**
[Forces of Change](../../03-design/forces-of-change/README.md). This README is the module index and the engine seam; the
topic files below decompose the engine's concerns.

---

## Contents

1. [Change detection and entropy signals](./change-detection-and-entropy-signals.md) — the detectors that feed signals;
   Skopos supplies actual-layer freshness.
2. [Backward-planning engine](./backward-planning-engine.md) — the retrograde scheduler.
3. [Resource, rate, duration, and cost model](./resource-rate-duration-cost-model.md) — the cost model and the
   Oikos/FinOps split (Kairos = capex; Metis + Oikos = opex).
4. [Project-type patterns](./project-type-patterns.md) — reusable work-breakdown templates.
5. [Integration](./integration.md) — Metis, Chrona, Continuum, Praxis, Signal Surfaces, and the proposed investment
   metamodel extension.
6. [Invariants](./invariants.md) — the non-negotiable rules Kairos upholds.

---

## One-line role

Kairos turns a detected change in the twin into a sized, scheduled investment — attaching every investment to a modelled
change, working backwards from a target date to a chain of resourced work packages, and authoring the result as
`plan`-layer facts in a scenario the user can compare and promote.

## The boundary it occupies

Kairos occupies the **investment and portfolio/programme/project planning** boundary. A twin that only records the
current architecture is a register; the value an architect or planner needs is the bridge from "this is changing" to
"this is what it costs to change it well, and when we must start"
([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)). Kairos **detects and plans**; it does
not execute (Continuum), traverse (Metis), render time (Chrona), or define meaning (Praxis)
([integration](./integration.md)).

## Invariants

The full set is in [invariants](./invariants.md). In brief:

- **Every investment attaches to a modelled change.** A Kairos investment points at a `PlanEvent`/Change Event on a
  non-actual layer in a scenario; a budget with no change behind it is not representable
  ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)).
- **Plans are facts in scenarios.** Worked-back schedules are authored as `plan`-layer facts in a scenario, compared
  against baseline as a [diff](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md), and committed by scenario
  promotion. Kairos writes only through Mneme and holds no separate durable store
  ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)).
- **Sizing is honest about uncertainty.** An investment can be large, strategic, and Low-confidence at once
  ([ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)); infeasible runways are surfaced, not hidden
  ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)).
- **Kairos reads impact from Metis; it never reimplements traversal**
  ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md);
  [ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)).

## What it owns / what it does not own

**Owns:** entropy/change detection and the classification of a change as an investment opportunity; the
backward-planning (retrograde) scheduler; the resource/rate/duration/cost model (capex side); the project-type pattern
catalogue; the authoring of plans as `plan`-layer facts in a scenario.

**Does not own:** graph traversal and impact (Metis); viewpoint resolution and timeline rendering (Chrona); execution of
committed work (Continuum); the metamodel and meaning (Praxis); the op log (Mneme); the `actual`-layer freshness that
feeds entropy ([Skopos](../skopos/README.md)); run-cost/opex modelling beyond what the **Oikos** folded concern carries
here (see [resource, rate, duration, cost model](./resource-rate-duration-cost-model.md)). The cost-model depth, the
pattern catalogue, and the scheduling algorithm are all **provisional**
([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)).

## Public trait seam (design intent)

Kairos is reached only through the host. The planned seam detects opportunities, sizes them, and plans backwards from a
target date:

```rust
// design intent — not yet a crate
pub trait Kairos {
    fn detect(&self, viewpoint: &Viewpoint, scope: &Scope)
        -> Result<Vec<InvestmentOpportunity>, ProblemDetails>; // entropy/action signals
    fn size(&self, opportunity: &InvestmentOpportunity, magnitude: &MagnitudeVector)
        -> Result<InvestmentSizing, ProblemDetails>; // tier + indicative size, confidence-labelled
    fn plan(&self, opportunity: &InvestmentOpportunity, target: TargetDate, pattern: &ProjectTypePattern)
        -> Result<PlanScenario, ProblemDetails>; // plan-layer facts in a scenario; infeasibility surfaced
}
```

`PlanScenario` is authored as `plan`-layer facts in a scenario, not a separate store. Errors follow RFC 9457
([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)). The shapes are provisional until a crate exists.

## Integration with other modules (via the host)

Kairos is an engine and **depends on no other engine**
([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). See [integration](./integration.md) for the full
picture: Metis (impact sizing), Chrona (timeline), Continuum (execution), Praxis (the semantic spine), Signal Surfaces
(presenting opportunities), and the
[proposed investment extension](../../03-design/metamodel/proposed-investment-extension.md) metamodel. Aegis supplies
risk as a driver Kairos sizes and plans ([Aegis integration](../aegis/integration.md)).

The planned crate name is `aideon_kairos`.

## References & standards

_Normative:_

- The Open Group — **TOGAF Standard, 10th Edition** (Phases E/F: Opportunities & Solutions, Migration Planning;
  Transition Architectures). The planning method.
- The Open Group — **ArchiMate 3.2 Specification** (Implementation & Migration and Strategy layers: Plateau, Gap, Work
  Package, Deliverable, Implementation Event, Resource). The element vocabulary.

Full bibliography: [STANDARDS-REGISTER.md](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                    | What it covers                                                                        |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [Forces of Change](../../03-design/forces-of-change/README.md)                              | The product thesis behind Kairos — entropy, action, investment (not duplicated here). |
| [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)              | The decision that introduces Kairos and the planning model.                           |
| [proposed investment extension](../../03-design/metamodel/proposed-investment-extension.md) | The Plateau/Gap/Work Package/Resource/Investment metamodel types.                     |
| [Metis module](../metis/README.md)                                                          | The analytics engine Kairos sizes from.                                               |
| [Module dependency map](../../01-architecture/module-dependency-map.md)                     | The crate dependency graph and the acyclic invariant.                                 |
