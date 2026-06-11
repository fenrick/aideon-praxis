# Change detection and entropy signals

The detectors Kairos runs to surface where change is due, and how Skopos supplies the `actual`-layer freshness those detectors read. For practitioners reasoning about how a twin notices that an investment is needed.

> **PLANNED.** No `aideon_kairos` crate exists; this is design intent per [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md). The thesis behind these detectors is [Forces of Change](../../03-design/forces-of-change/README.md) — linked, not duplicated.

## Two forces, made first-class

Every change to a twin has one of two origins: it **happened** (entropy) or it was **done** (action) ([Forces of Change](../../03-design/forces-of-change/README.md)). Kairos makes both first-class: it **detects entropy** and presents each detection as a reviewable **signal**, never a silent edit ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)). It then **classifies** whether a detected change is an investment opportunity — _new_ (build/acquire) or _existing_ (extend/decommission) — and offers to model it.

## The detectors

Kairos detects entropy across several signal sources ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)):

| Detector                          | What it watches                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Lifecycle / disposition decay** | An `Application` reaching end-of-life, or carrying a `disposition` like `Migrate`/`Retire` with no funded plan behind it. |
| **Technology obsolescence**       | A `TechnologyComponent` whose platform is ageing or out of support.                                                       |
| **Orphaned strategic intent**     | A strategic `Capability` with no execution `realises`-ing it, or intent with no delivery.                                 |
| **Control drift**                 | A control weakening over time (composed with [Aegis](../aegis/README.md) risk-as-driver).                                 |
| **Plan / actual divergence**      | The `plan` layer and the `actual` layer disagreeing — the planned state did not materialise.                              |
| **Falling integrity**             | The integrity score of a subgraph declining ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)).              |

Each detection is surfaced as a reviewable signal on a **Signal Surface** ([SIGNAL-SURFACES.md](../../03-design/SIGNAL-SURFACES.md)), where a human decides whether to model the change as an investment. Kairos never silently authors a plan from a detection.

## Skopos supplies actual-layer freshness

Two of these detectors — **plan/actual divergence** and **lifecycle decay** — depend on the `actual` layer being current. That freshness is supplied by **[Skopos](../skopos/README.md)**, the automated reality-sync engine: Skopos keeps reality current by reconciling live observations onto the `actual` layer ([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)), and Kairos reads what changed ([Skopos entropy feeder for Kairos](../skopos/entropy-feeder-for-kairos.md)). The two do not call each other; the host composes them, and the link is the freshness of the `actual` layer, not a direct call ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). Without Skopos, the `actual` layer is only as fresh as the last manual import, and divergence is invisible until someone notices by hand ([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)).

## Worked example

Skopos observes that the platform hosting the seed `Application` `n:application:automation-orchestrator` (`disposition = Migrate`, `lifecycle = Plan`) is now end-of-support, and writes that to the `actual` layer. The `plan` layer holds the intent to migrate by the cutover `PlanEvent` "FY26 Q2 Channel Cutover" (`effective_at = 2026-05-01`). Kairos's **plan/actual divergence** detector resolves `plan` against the now-fresh `actual` and finds the at-risk platform still in place; its **lifecycle decay** detector sees the migration disposition with the runway shortening. It surfaces a reviewable signal — "Automation Orchestrator migration overdue; platform end-of-support" — on the Signal Surface, classified as an _existing-asset_ investment opportunity (migrate/decommission). A human reviews it and chooses to model it; only then does Kairos size and plan it ([backward-planning engine](./backward-planning-engine.md)).

## References & standards

_Informative:_

- The Open Group — **ArchiMate 3.2 Specification** (Motivation layer). Framing a detected change as a driver.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                   | What it covers                                       |
| -------------------------------------------------------------------------- | ---------------------------------------------------- |
| [Kairos README](./README.md)                                               | The module index and invariants.                     |
| [Backward-planning engine](./backward-planning-engine.md)                  | What happens once an opportunity is accepted.        |
| [Skopos entropy feeder for Kairos](../skopos/entropy-feeder-for-kairos.md) | How Skopos supplies the `actual`-layer freshness.    |
| [Forces of Change](../../03-design/forces-of-change/README.md)             | The entropy/action thesis (not duplicated here).     |
| [SIGNAL-SURFACES.md](../../03-design/SIGNAL-SURFACES.md)                   | How a detection is presented as a reviewable signal. |
