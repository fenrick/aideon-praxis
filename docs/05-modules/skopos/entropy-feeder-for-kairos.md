# Entropy feeder for Kairos

How a fresh `actual` layer makes entropy detectable, and why Skopos is the feeder Kairos reads. For practitioners reasoning about how observed drift becomes an investment signal.

> **PLANNED.** No `skopos` crate exists; this is design intent per [ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md).

## Freshness is what makes entropy visible

**Entropy** — systems age, support ends, fitness drifts, debt accrues — is the force that needs no decision ([forces of change: entropy](../../03-design/forces-of-change/entropy.md)). It is invisible until something reveals it. A fresh `actual` layer is what makes **plan/actual divergence, lifecycle decay, and orphaned intent detectable** ([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)). If `actual` is only ever updated by manual import, entropy is invisible until someone notices by hand; Skopos keeps `actual` current so the divergence shows up continuously.

The division of labour is precise ([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)):

- **Skopos keeps reality current** — it writes the observed `actual` facts.
- **Kairos reads what changed** — it consumes the divergence between `plan` and `actual`, and between modelled lifecycle and observed lifecycle, as an **entropy signal driving investment** ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)).

Skopos does not detect entropy or plan a response; it supplies the fresh `actual` layer that makes detection possible. Kairos's detectors read it ([Kairos change detection and entropy signals](../kairos/change-detection-and-entropy-signals.md)).

## How a divergence becomes a signal (via the host)

Skopos and Kairos do not call each other — that would breach the acyclic engine graph ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). Skopos writes Asserted `actual`-layer facts through Mneme; Kairos resolves `plan` against `actual` through a viewpoint and detects the divergence. The host composes them. How exactly a Skopos-detected divergence becomes a Kairos entropy signal is an **open question** ([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)); what is fixed is the direction — Skopos feeds, Kairos consumes — and that the link is the freshness of the `actual` layer, not a direct call.

## Worked example

The `plan` layer holds the intent that the seed `Application` `n:application:automation-orchestrator` (`disposition = Migrate`) will be migrated off its current platform by a target date. Skopos's cloud connector observes that the platform is still running and now end-of-support, and writes that to the `actual` layer. Resolving `plan` against `actual` at a viewpoint now shows a **divergence**: the plan said the migration would have progressed, the observed reality says the at-risk platform is still in place. Kairos's detectors read that divergence as an entropy signal — the migration is overdue and the risk is accruing — and surface it as a reviewable investment opportunity to size and schedule ([Kairos backward planning](../kairos/backward-planning-engine.md)). Skopos supplied the fresh `actual` fact; Kairos read the divergence.

## References & standards

_Informative:_

- Snodgrass — _Developing Time-Oriented Database Applications in SQL_, 1999. The bitemporal `plan`-vs-`actual` resolution divergence detection rests on.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                         | What it covers                                         |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| [Skopos README](./README.md)                                                                     | The module index and invariants.                       |
| [Continuous ingestion](./continuous-ingestion.md)                                                | How the fresh `actual` facts are written.              |
| [Kairos change detection and entropy signals](../kairos/change-detection-and-entropy-signals.md) | The detectors that read the divergence Skopos exposes. |
| [Forces of change: entropy](../../03-design/forces-of-change/entropy.md)                         | The entropy thesis Skopos serves.                      |
