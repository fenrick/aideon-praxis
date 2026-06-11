# Cost and TCO

The cost family — total-cost-of-ownership rollups and scenario-sensitive cost comparisons — and how the run-cost / FinOps concern (Oikos) folds into Metis. For a reader who needs to know where ongoing operating cost lives and how it differs from investment cost.

This describes **design intent** ([README](./README.md)).

---

## The cost family

Metis computes cost as a derived rollup over the twin: it aggregates per-entity cost attributes up the canonical relationships to give the cost of running a capability, an application landscape, or a scenario. Like every Metis family it is bounded, deterministic, and Inferred ([determinism and bounds](./determinism-and-bounds.md)) — a cost rollup is a view computed at a viewpoint, not an asserted budget. Two scenarios can be compared by computing each at its viewpoint and diffing the rollups, which is how a "what does option A cost versus option B to run" question is answered.

---

## Oikos — the folded FinOps concern

Run-cost and FinOps — the ongoing operating cost / total-cost-of-ownership concern — is the **Oikos** concern ([Documentation Standard §10](../../02-standards/DOCUMENTATION-STANDARD.md)). It does not yet earn its own module; it is a capability _within_ Metis (and Kairos), with an explicit split-out trigger recorded in [ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md): it splits out when continuous cost ingestion and reconciliation earn a distinct invariant and seam. Until then, the cost family in Metis is where ongoing opex/TCO is computed.

---

## Opex versus capex — the division with Kairos

The division of labour with [Kairos](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md) (planned) is along the opex/capex line, and it is deliberate:

| Concern                                 | Owner         | What it answers                                                              |
| --------------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| **Ongoing operating cost (opex / TCO)** | Metis (Oikos) | What does it cost to _run_ this part of the twin as it stands?               |
| **Investment cost (capex)**             | Kairos        | What does it cost to _change_ this part of the twin, and over what schedule? |

Metis answers the steady-state question from the resolved graph; Kairos answers the change question by sizing an investment from the change-magnitude vector Metis computes ([impact and change magnitude](./impact-and-change-magnitude.md)). The two meet at a planned change: Metis says what the current and target states cost to run, Kairos says what the transition between them costs to deliver. Keeping them separate prevents conflating the recurring cost of operating a system with the one-off cost of replacing it — a conflation that makes a portfolio undefendable.

---

## Worked example — running cost of the Customer Insight capability

A TCO rollup seeded at `n:capability:customer-insight` ([baseline](../../data/base/baseline.yaml)) aggregates the run cost of what realises and hosts it: `Insight Hub` (the realising `Application`) and `Stream Processor` (the `TechnologyComponent` that `hosts` it). The rollup walks down `realises` and `hosts`, sums the per-entity cost attributes, and returns the capability's total run cost with the contributing entities as evidence. This is **opex** — the cost of running the capability as it stands. A separate Kairos investment to migrate `Insight Hub` would carry its own **capex** cost over a worked-back schedule; the two figures answer different questions and are not added together as if they were the same kind of money.

---

## Related documents

| Document                                                                                                             | What it covers                                                    |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [Impact and change magnitude](./impact-and-change-magnitude.md)                                                      | The magnitude vector Kairos sizes capex from.                     |
| [Change magnitude and investment sizing](../../03-design/forces-of-change/change-magnitude-and-investment-sizing.md) | How a change is sized into an investment.                         |
| [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)                                       | Kairos — the capex/investment owner.                              |
| [ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)                                                 | The Oikos folded-concern split-out trigger.                       |
| [Determinism and bounds](./determinism-and-bounds.md)                                                                | Why a cost rollup is a reproducible view, not an asserted budget. |
| [`baseline.yaml`](../../data/base/baseline.yaml)                                                                     | The seed dataset the example uses.                                |
