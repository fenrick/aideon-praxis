# Aegis — risk, controls, and compliance

Aegis is the planned risk-and-compliance engine of the Aideon twin: a risk register, a control library, and
regulatory-obligation tracking, all mapped onto the twin. A risk, control, or obligation never floats free of the
modelled content it concerns.

> **Implementation status: PLANNED.** No `aegis` crate exists. Everything in this folder is **design intent** — framed
> in the present tense as the standard requires, but describing behaviour not yet in code. The boundary, the
> never-floats-free invariant, and the state-as-facts rule are normative now and constrain the implementation when it
> lands. The governing decision is [ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md).

This README is the index and the cross-cutting narrative; each focused topic lives in its own file, per the
[Documentation Standard §4](../../02-standards/DOCUMENTATION-STANDARD.md) granularity rule.

---

## Contents

1. [Risk register and controls](./risk-register-and-controls.md) — Risk/Control/Obligation mapped onto the twin, as a
   proposed metamodel extension.
2. [Regulatory obligations](./regulatory-obligations.md) — obligations over capabilities and data, and their evidence.
3. [Integration](./integration.md) — Aegis↔Kairos (risk as a driver) and Aegis↔Metis (scoring).

---

## One-line role

Aegis lets a risk officer or control owner model what could go wrong, what guards against it, and what a regulator
requires — as typed entities related to the capabilities, applications, data, and processes they concern — resolved
bitemporally like any other twin content.

## The boundary it occupies

Aegis occupies the **risk, control, and compliance** boundary: the register and library _over_ the twin. An enterprise
twin that models capabilities, applications, data, and processes but cannot say what could go wrong, what guards against
it, and what the regulator requires is incomplete for the audiences the product serves — risk officers, control owners,
compliance leads ([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)). Aegis is also one half of the
forces-of-change loop: an unmitigated risk is an entropy and opportunity driver, and Aegis supplies that driver for
[Kairos](../kairos/README.md) to size and plan ([forces of change](../../03-design/forces-of-change/README.md);
[integration](./integration.md)).

## Invariants

- **A risk, control, or obligation never floats free.** Each is always a typed entity related to twin content — a
  Capability, Application, DataEntity, or BusinessProcess. A risk with no subject is not a register entry, it is a note
  ([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)).
- **State is facts in the twin.** Risk status, control state, and obligation evidence are authored as facts through
  Mneme and resolved through a viewpoint — so a risk register is bitemporal: what the risk was believed to be, as of
  when, in which scenario. Aegis holds no separate durable store
  ([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)).
- **Aegis reads impact from Metis; it does not reimplement traversal.** Risk scoring consumes deterministic, bounded
  graph computation from Metis — blast radius, criticality, dependency breadth
  ([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md); [integration](./integration.md)).
- **Scores are honest about uncertainty.** A risk score carries a confidence label
  ([ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)) and is bounded by the integrity of the underlying
  content ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)): a low-integrity subgraph yields a bounded
  risk score, stated as such.

## What it owns / what it does not own

**Owns:** the risk register, the control library, and obligation tracking; the proposed Risk/Control/Obligation
metamodel extension (design intent); the relationships tying risks, controls, and obligations to the spine; the
first-version risk-scoring model (consuming Metis magnitude).

**Does not own:** graph traversal (Metis); investment planning and the response to a risk (Kairos); the op log (Mneme);
viewpoint resolution (Chrona); access policy (Themis, [ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). Aegis
adds no new canonical storage primitive — it reuses facts, viewpoints, Metis analytics, and Kairos planning. The
metamodel extension, the scoring model, and the spine-tying relationship set are all **provisional**
([ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)).

## Public trait seam (design intent)

Aegis is reached only through the host. The planned seam reads the register at a viewpoint and scores a risk from Metis
magnitude:

```rust
// design intent — not yet a crate
pub trait Aegis {
    fn register(&self, viewpoint: &Viewpoint, scope: &Scope)
        -> Result<RiskRegister, ProblemDetails>; // risks, controls, obligations resolved bitemporally
    fn score(&self, risk: &RiskRef, magnitude: &MagnitudeVector)
        -> Result<RiskScore, ProblemDetails>; // confidence-labelled, integrity-bounded
}
```

`RiskScore` carries a confidence band ([ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)) and the
integrity bound that shaped it ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)). Errors follow RFC 9457
([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)). The shapes are provisional until a crate exists.

## Integration with other modules (via the host)

Aegis is an engine and **depends on no other engine**
([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). The host composes it (see
[integration](./integration.md)):

- **Metis** — supplies the bounded magnitude/blast-radius computation risk scoring consumes.
- **[Kairos](../kairos/README.md)** — Aegis surfaces a risk as an entropy/opportunity driver; Kairos sizes and plans the
  response. Aegis owns the risk; Kairos owns the plan.
- **Mneme** — authors and resolves risk, control, and obligation facts.
- **Chrona** — resolves the register at a viewpoint so it is bitemporal.

The planned crate name is `aideon_aegis`.

## References & standards

_Informative:_

- The Open Group — **ArchiMate 3.2 Specification** (Motivation layer: Driver, Assessment). Framing risks/obligations as
  motivation drivers over the twin.
- The Open Group — **TOGAF Standard, 10th Edition**. Risk management within the ADM.

Full bibliography: [STANDARDS-REGISTER.md](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                       | What it covers                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| [ADR-0031](../../06-adrs/ADR-0031-risk-controls-compliance-aegis.md)           | The decision that introduces Aegis and fixes its invariants.        |
| [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md) | Kairos, which sizes and plans the response to risk-driven change.   |
| [ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)                  | The integrity scale that bounds a risk score.                       |
| [Forces of change](../../03-design/forces-of-change/README.md)                 | The entropy/action loop Aegis closes by supplying risk as a driver. |
| [Module dependency map](../../01-architecture/module-dependency-map.md)        | The crate dependency graph and the acyclic invariant.               |
