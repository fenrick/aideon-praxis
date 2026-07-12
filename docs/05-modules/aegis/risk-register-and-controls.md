# Risk register and controls

How Risk, Control, and Obligation are modelled as typed entities mapped onto the twin, via a proposed metamodel
extension. For practitioners reasoning about a defensible risk register that never floats free of the architecture it
concerns.

> **PLANNED.** No `aegis` crate exists, and the metamodel extension below is **design intent**, not wired into the seed
> [`core-v1.json`](../../data/meta/core-v1.json). UUIDs are deferred to the metamodel compiler; none are invented here.
> Per [ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md).

## Nothing floats free

The load-bearing invariant is that a **risk, control, or obligation is always related to something modelled**
([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)):

- a **Risk** relates to the Capability, Application, DataEntity, or BusinessProcess it threatens;
- a **Control** relates to the risk it mitigates and the content it applies to;
- an **Obligation** relates to the capabilities and data it governs.

None of these is representable without a relationship to twin content. A risk with no subject is not a register entry,
it is a note ([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)). This is the invariant that makes
the register defensible: every entry is anchored to the architecture, so "what is exposed if this risk materialises?" is
answerable by traversing from the risk's subject.

## A proposed metamodel extension

A proposed risk-and-control metamodel extension package carries the vocabulary
([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)). It adds the entity types **Risk**, **Control**,
and **Obligation**, plus the relationships tying them to the existing spine, with **UUID minting deferred to the
metamodel compiler** — the same pattern Kairos's planning extension uses
([proposed investment extension](../../03-design/metamodel/proposed-investment-extension.md);
[ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)). The extension is **referenced as design
intent**; it is authored and versioned like any metamodel change — SemVer, forward-only
([ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md)) — and reconciled with the seed metamodel before it
is treated as implemented ([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)). It is not invented per
artefact.

The proposed types map onto the ArchiMate Motivation layer (The Open Group, ArchiMate 3.2: Driver, Assessment), framing
risks and obligations as motivation drivers over the twin
([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)). The exact relationship names tying
Risk/Control/Obligation to the spine follow the extension rule of
[ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md) and are an **open question**
([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)) — so this document names the shape, not invented
identifiers or final relationship names.

## State is bitemporal facts

Risk status, control state, and obligation evidence are authored as **facts through Mneme** and resolved through a
viewpoint like any other content ([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)). So the register
is bitemporal: it answers what a risk was _believed_ to be, as of _when_, in _which_ scenario. A risk re-scored after
new evidence closes one fact's valid-time interval and opens another, exactly as any slot value changes over time; the
prior belief remains in asserted-time history. Aegis holds no separate durable store — it reuses the twin's storage and
resolution machinery.

The first-version risk-scoring model — likelihood × impact, inherent vs residual, and how it consumes Metis magnitude —
is an **open question** ([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)); see
[integration](./integration.md). Control-effectiveness testing over time is deferred for the first version.

## Worked example

A risk officer records a risk against the seed `Application` `n:application:automation-orchestrator`
(`disposition = Migrate`): "Platform end-of-support exposes the orchestration capability." The proposed **Risk** entity
relates to that `Application` and, through it, to the `Capability` `n:capability:automation-fabric` the application
`realises`. A **Control** — "Migration funded and scheduled" — relates to the risk it mitigates and to the same
application. The risk's exposure is derived from where its subject sits in the twin ([integration](./integration.md)),
not asserted by hand. All of this is stored as facts: the risk's status as of today, believed under the base case,
resolvable at any viewpoint. No risk exists without its subject relationship — an attempt to record a risk with no
subject is rejected as a note, not a register entry.

## References & standards

_Informative:_

- The Open Group — **ArchiMate 3.2 Specification** (Motivation layer: Driver, Assessment). The framing for risks and
  obligations over the twin.
- The Open Group — **TOGAF Standard, 10th Edition**. Risk management within the ADM.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                    | What it covers                                                   |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [Aegis README](./README.md)                                                                 | The module index and invariants.                                 |
| [Regulatory obligations](./regulatory-obligations.md)                                       | The obligation side of the register.                             |
| [Integration](./integration.md)                                                             | How Metis scores a risk and Kairos plans the response.           |
| [proposed investment extension](../../03-design/metamodel/proposed-investment-extension.md) | The sibling extension whose UUID-deferral pattern Aegis follows. |
| [ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)                        | The decision that fixes the never-floats-free invariant.         |
