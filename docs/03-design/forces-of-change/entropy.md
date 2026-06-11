# Entropy — the force that needs no decision

The first force of change. Entropy is the tendency of a modelled organisation to lose fitness over time without anyone deciding it should. Applications fall out of support, technology reaches end of life, data sensitivity outgrows its controls, capabilities marked _Target_ never acquire a realising application, and the gap between _Plan_ and _Actual_ widens. None of this requires an event. It is the baseline against which all investment is measured.

Aideon treats entropy as something to be **detected and surfaced**, never silently corrected. Detection is the [Kairos](../../05-modules/kairos/README.md) module's first job; correction is always deliberate [action](./action.md) — an [investment](./investment.md) once it is resourced and funded.

## What entropy looks like in the twin

Entropy is observable as facts and their absence, resolved at a viewpoint. The detectable signals, expressed in seed-metamodel terms ([entity types](../metamodel/entity-types.md)):

| Entropy signal              | How it is observed                                                                                                                             | Severity driver                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Lifecycle decay**         | An `Application` with `lifecycle = Retire`, or a `Capability` with `lifecycle = Retire`, especially with a future-dated `PlanEvent` setting it | Time remaining to the change date; criticality of what depends on it |
| **Disposition pressure**    | An `Application` with `disposition = Migrate` or `Eliminate` and no realising replacement                                                      | Breadth of `realises` / `accesses` dependencies that must move       |
| **Technology obsolescence** | A `TechnologyComponent` past or approaching end of support; `Application`s `hosts`-linked to it inherit the risk                               | Number and criticality of hosted applications                        |
| **Orphaned intent**         | A `Capability` with `tier = Strategic` and `lifecycle = Target` that no `Application`/`TechnologyComponent` `realises`                         | Strategic weight; time since declared                                |
| **Control drift**           | A `DataEntity` with `sensitivity = Confidential` `accesses`-linked by applications whose disposition is _Eliminate_/_Migrate_                  | Sensitivity; number of unmanaged access paths                        |
| **Plan/Actual divergence**  | A persistent variance between the `plan` and `actual` layers for the same slot, widening over valid time                                       | Magnitude and duration of the variance                               |
| **Falling integrity**       | A declining [integrity score](../../02-standards/DOCUMENTATION-STANDARD.md#81-integrity-score) for an entity or subgraph over time             | Rate of decline; criticality                                         |

Each is **Inferred** content (derived, traceable, recomputed when inputs change) — never asserted on the user's behalf. A signal is a prompt for judgement, surfaced through [Signal Surfaces](../signal-surfaces/README.md), not a change to the model.

## Entropy is time-relative

Because every read carries a viewpoint, entropy is always assessed _as of_ a valid time. An application that is healthy today and retires in two years carries low entropy now and rising entropy as the change date approaches. Kairos reads entropy along the valid-time axis precisely so it can answer the question that matters: **not "is this broken?" but "when does this become a problem, and how long do we have to act?"** That horizon is what makes an entropy signal an [investment opportunity](./investment.md) rather than an incident.

## Why detection, not correction

Automatically "fixing" entropy would mean automation rewriting the controlled truth of the model. That is forbidden ([artefacts intelligence rules](../artefacts/intelligence-and-automation.md)): the model remains the authority, and entropy detection creates _work_ — a flagged opportunity, a steward task — rather than a silent edit. The trade-off is deliberate: the product will sometimes show an entropy signal the user already knows about, in exchange for never having quietly changed an accepted fact.

## References & standards

- ArchiMate 3.2 — lifecycle and the Implementation & Migration layer (a retiring element is the start of a Gap). Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                 | What it covers                                            |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [action.md](./action.md)                                                                 | The deliberate force that answers an entropy signal.      |
| [investment.md](./investment.md)                                                         | Resourced, funded action — what Kairos plans.             |
| [change-magnitude-and-investment-sizing.md](./change-magnitude-and-investment-sizing.md) | How the severity of an entropy signal sizes the response. |
| [05-modules/kairos](../../05-modules/kairos/README.md)                                   | The detectors that compute these signals.                 |
