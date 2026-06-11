# Resource, rate, duration, and cost model

How Kairos costs a plan from resources, rates, and durations — and where the line falls between Kairos (capex/investment) and the folded **Oikos** concern (opex/run-cost). For practitioners reasoning about what Kairos costs and what it deliberately does not.

> **PLANNED.** No `aideon_kairos` crate exists; this is design intent per [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md).

## What a work package consumes

Each work package in a backward-planned schedule **consumes resources at a rate over a duration** ([backward-planning engine](./backward-planning-engine.md)). The vocabulary comes from the [proposed investment extension](../../03-design/metamodel/proposed-investment-extension.md): a **Resource** carries a `role`, a `day_rate`, a `currency`, and an `availability` (FTE); a work package `consumes` a resource with an `allocation` (FTE) over its `duration_days`. The first-version cost model is therefore `day_rate × allocation × duration_days` plus a non-labour line, single currency, no capitalisation ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md); [proposed investment extension](../../03-design/metamodel/proposed-investment-extension.md)).

The cost-model depth is **provisional** ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)): multi-currency, capitalisation, and depreciation are known future pressures, and the first-version depth and the currency/capitalisation roadmap are open questions.

## The Oikos / FinOps split: capex versus opex

There are two kinds of cost in an estate, and Kairos owns only one of them. The split is recorded as the folded concern **Oikos** (run-cost / FinOps) in [ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md) and [Documentation Standard §10](../../02-standards/DOCUMENTATION-STANDARD.md):

| Cost kind                   | Owner                                            | What it covers                                                                                                                     |
| --------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Capex / investment cost** | **Kairos**                                       | The funded cost of _changing_ the estate — the resources, rates, and durations of the work packages that deliver a planned change. |
| **Opex / run-cost (Oikos)** | **Metis** (cost computation) + the Oikos concern | The ongoing cost of _running_ the estate — TCO/run-cost of the assets as they stand, not the cost of changing them.                |

So Kairos costs the **investment** (the spend to change something); the ongoing **run-cost** of the estate is the **Oikos** concern, folded into Metis cost computation and into Kairos investment cost where the two meet ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). Oikos is **not yet its own module**: it is a folded concern with a recorded split-out trigger — it **splits out when opex/actuals cost modelling grows its own model and method beyond what Metis computation and Kairos investment cost carry** ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md), folded-concern table). Until then, naming Oikos keeps the boundary checkable: a request to model ongoing run-cost is an Oikos/Metis concern, not a Kairos investment.

## Indicative size carries confidence

A cost computed from a pattern before any estimating is, by definition, low-precision. So an **indicative size** carries a [confidence](../../02-standards/DOCUMENTATION-STANDARD.md) label — typically **Low** or **Indicative** at the sizing stage ([change magnitude and investment sizing](../../03-design/forces-of-change/change-magnitude-and-investment-sizing.md); [ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)). The cost is **Inferred** content — derived from the pattern and resources, never an asserted figure. Sizing never claims false precision: a large, strategic investment can be Low-confidence at the same time, which is the honest state of a plan that has been sized but not yet estimated ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)).

## Worked example

The _application migration_ plan for the seed `Application` `n:application:automation-orchestrator` ([backward-planning engine](./backward-planning-engine.md)) has a _build/acquire replacement_ work package consuming, say, a "Solution Architect" Resource at a `day_rate` and 0.5 FTE `allocation` over a `duration_days`, plus a "Migration Engineer" over the migration package. Kairos computes the **capex** as `day_rate × allocation × duration_days` summed across packages plus a non-labour line, and presents it as a Low-confidence indicative size — this is the cost to _change_ the estate. The **ongoing run-cost** of the new replacement application once it reaches `Run` — its hosting, licences, support — is **not** a Kairos figure; that is the **Oikos** concern, computed by Metis as run-cost/TCO over the asset as it stands. Kairos sizes the investment; Oikos sizes the run.

## References & standards

_Normative:_

- The Open Group — **ArchiMate 3.2 Specification** (Strategy layer: Resource). The Resource vocabulary the cost model uses.
- The Open Group — **TOGAF Standard, 10th Edition** (Phase E/F). The planning method the cost model serves.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                                             | What it covers                                                  |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [Kairos README](./README.md)                                                                                         | The module index and invariants.                                |
| [Backward-planning engine](./backward-planning-engine.md)                                                            | The schedule whose packages this costs.                         |
| [change magnitude and investment sizing](../../03-design/forces-of-change/change-magnitude-and-investment-sizing.md) | How tier and indicative size are set.                           |
| [Metis cost and TCO](../metis/cost-and-tco.md)                                                                       | The Metis cost computation where Oikos run-cost folds in.       |
| [ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)                                                 | The folded-concern table recording the Oikos split-out trigger. |
