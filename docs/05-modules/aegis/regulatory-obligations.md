# Regulatory obligations

How Aegis tracks regulatory obligations over capabilities and data, and evidences them, as bitemporal facts on the twin.
For practitioners reasoning about compliance coverage.

> **PLANNED.** No `aegis` crate exists; this is design intent per
> [ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md).

## Obligations relate to what they govern

An **Obligation** relates to the capabilities and data it governs
([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)). Like a risk or control, it never floats free
([risk register and controls](./risk-register-and-controls.md)): an obligation that is not related to the modelled
content it constrains is not trackable coverage, it is a citation. Anchoring an obligation to the `Capability` and
`DataEntity` it governs is what lets the product answer "is this obligation covered, and over what?" by traversing from
the obligation to its subjects and the controls applied to them.

## Obligations are evidenced as facts

Obligation **evidence** is authored as facts through Mneme and resolved through a viewpoint
([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)). Evidence is therefore bitemporal: what the
obligation was evidenced as satisfied by, as of when, in which scenario. A compliance position is not a static flag but
a resolvable claim — so a reviewer can ask what the compliance state _was believed to be_ at a past asserted time, which
is exactly what an audit of a historical position requires.

## Mapping to external catalogues is deferred

Whether obligations **map to named external regulatory catalogues** now or later, and how that mapping is versioned, is
an **open question** ([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)); mapping to specific
external regulatory catalogues is **deferred** in the first version. The design intent is that an obligation can later
carry a reference to an external framework's clause, versioned like any metamodel change
([ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md)), without changing the invariant that the obligation
is anchored to twin content. Naming a catalogue is an enrichment of an obligation, not a precondition for tracking it.

## The trade-off, stated

Modelling obligations as anchored, evidenced facts rather than a free-standing compliance checklist costs more up front:
each obligation must be related to the capabilities and data it governs, and evidence must be authored as facts. It buys
traceable coverage — every obligation drills to what it governs and the controls behind it — and a bitemporal audit
position, which a flat checklist cannot give.

## Worked example

A compliance lead records an obligation governing the handling of the seed `DataEntity` `n:data-entity:engagement-event`
(`sensitivity = Confidential`): "Confidential engagement data must be access-controlled and retained per policy." The
**Obligation** relates to that `DataEntity` and to the `Capability` `n:capability:customer-insight` that depends on the
data. A **Control** evidencing the access-control requirement relates to the obligation and the data. The obligation's
evidence — that the control is in place — is authored as a fact, resolvable at any viewpoint, so an auditor can ask
whether the obligation was evidenced as satisfied as of a past asserted time. If a named external catalogue is later
mapped, the obligation gains a versioned reference to its clause without losing its anchor to the `DataEntity`.

## References & standards

_Informative:_

- The Open Group — **ArchiMate 3.2 Specification** (Motivation layer: Driver, Assessment). Obligations as motivation
  drivers over the twin.
- The Open Group — **TOGAF Standard, 10th Edition**. Compliance within the ADM.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                             | What it covers                                                    |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [Aegis README](./README.md)                                          | The module index and invariants.                                  |
| [Risk register and controls](./risk-register-and-controls.md)        | The risk and control sides of the register.                       |
| [Themis retention and audit](../themis/retention-and-audit.md)       | The retention an obligation may reference.                        |
| [ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md) | The decision that fixes obligations as anchored, evidenced facts. |
