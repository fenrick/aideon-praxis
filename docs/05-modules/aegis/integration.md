# Integration

How Aegis composes with Kairos (risk as a driver) and Metis (scoring), via the host, with no engine-to-engine cycle. For
practitioners reasoning about how risk feeds investment and how a risk score is computed.

> **PLANNED.** No `aegis` crate exists; this is design intent per
> [ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md).

## Aegis composes through the host

Aegis is an engine and **depends on no other engine**
([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). Every interaction below is composed by the host;
there is no Aegis→Metis or Aegis→Kairos import. This keeps the engine graph acyclic and each engine independently
testable ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)).

## Aegis ↔ Kairos: risk as a driver

Risk is one of the two forces of change. Where [Kairos](../kairos/README.md) treats **entropy** and **action** as what
drives investment ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)), an unmitigated or
under-controlled risk is an **entropy and opportunity driver** — a reason a change becomes necessary
([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)). The division of labour is clean:

- **Aegis owns the risk** — it models the risk, control, and obligation, and surfaces an unmitigated risk as a driver.
- **Kairos owns the plan** — it classifies the driver as an investment opportunity, sizes it, and schedules the
  mitigating change ([Kairos change detection](../kairos/change-detection-and-entropy-signals.md)).

Neither reimplements the other ([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)). This closes the
forces-of-change loop: **risk feeds entropy, entropy feeds investment, investment plans the mitigating change**
([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md);
[forces of change](../../03-design/forces-of-change/README.md)).

## Aegis ↔ Metis: scoring

Risk scoring consumes **deterministic, bounded graph computation from Metis** — blast radius, criticality, dependency
breadth — rather than reimplementing traversal ([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)). A
risk's exposure is derived from where its subject sits in the twin: a risk against a highly-connected, critical
application is more exposed than one against an isolated, low-criticality one, and Metis computes that connectedness.
Two honesty properties bound the score ([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)):

- The score carries an honest **confidence** label ([ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)).
- The **integrity** of the underlying content bounds it ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)):
  a low-integrity subgraph yields a bounded risk score, stated as such.

So a risk can be serious and **Low-confidence** at once, when the architecture it sits in is sparsely modelled — and the
score says so rather than projecting false precision. The same magnitude vector Metis computes for Kairos investment
sizing ([Metis impact and change magnitude](../metis/impact-and-change-magnitude.md)) is the input Aegis scores a risk
from, which is why risk-driven and entropy-driven investment are sized on one consistent basis.

## Worked example

Aegis holds a risk against the seed `Application` `n:application:automation-orchestrator`: "Platform end-of-support." To
score it, the host asks Metis for the magnitude vector at the relevant viewpoint — blast radius along
`realises`/`hosts`/`accesses`, the criticality of the `Capability` `n:capability:automation-fabric` it serves, and
dependency breadth. Metis returns a bounded result; Aegis derives a risk score carrying a confidence band, bounded by
the integrity of that subgraph. Aegis then surfaces the under-mitigated risk as a driver. Kairos reads the driver,
classifies it as an investment opportunity to replace the platform, sizes it from the _same_ magnitude vector, and
schedules the work backwards from the end-of-support date
([Kairos backward planning](../kairos/backward-planning-engine.md)). Aegis owned the risk; Kairos owned the plan; Metis
computed the shared magnitude; the host composed all three.

## References & standards

_Informative:_

- The Open Group — **ArchiMate 3.2 Specification** (Motivation layer). Risk as a driver in the motivation model.
- Newman — _Networks_, 2nd ed., 2018. The centrality basis of the Metis magnitude Aegis consumes.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                     | What it covers                                                  |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [Aegis README](./README.md)                                                  | The module index and invariants.                                |
| [Kairos module](../kairos/README.md)                                         | The investment planner that sizes the response to a risk.       |
| [Metis impact and change magnitude](../metis/impact-and-change-magnitude.md) | The magnitude vector Aegis scores a risk from.                  |
| [ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)         | The decision that fixes the Aegis↔Kairos and Aegis↔Metis seams. |
