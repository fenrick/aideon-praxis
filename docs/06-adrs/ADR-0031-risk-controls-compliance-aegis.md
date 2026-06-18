# ADR-0031: Risk, Controls, and Compliance — Aegis

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0011 (module taxonomy)
- Relates-To: ADR-0020 (integrity scoring), ADR-0028 (investment and portfolio planning — Kairos)

## Context

An enterprise twin that models capabilities, applications, data, and processes but cannot say _what could go wrong, what guards against it, and what the regulator requires_ is incomplete for the audiences the product serves — risk officers, control owners, compliance leads, and the architects who must answer to them. Today the twin can express that a `DataEntity` is sensitive or that a `BusinessProcess` is critical, but it cannot model a risk against a capability, the control that mitigates it, or the regulatory obligation a data class is subject to.

Risk and control are a distinct concern with their own model (a risk register, a control library, obligation tracking) and their own method (risks scored, controls mapped, obligations evidenced). Per the "earns its own module" rule in [ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md), this owns a distinct invariant (a risk, control, or obligation is always related to something modelled — it never floats free), a distinct failure mode (an unmitigated risk, an unevidenced obligation, a control with nothing behind it), and a distinct seam (the register/library over the twin). It is therefore a module, not a feature inside Praxis.

Risk is also one of the two forces of change. Where Kairos ([ADR-0028](./ADR-0028-investment-and-portfolio-planning-kairos.md)) treats **entropy** and **action** as what drives investment, an unmitigated risk is an entropy and opportunity driver: it is a reason a change becomes necessary. Aegis supplies that driver; Kairos sizes and plans the response.

## Governance Framing

- **Decision type:** Stable seam (a new engine behind a typed trait, composed via the Host) + provisional (the metamodel extension is design intent) + deferred (no crate exists yet).
- **Known future pressure:** richer risk scoring (likelihood × impact, inherent vs residual); control-effectiveness testing over time; mapping obligations to named regulatory frameworks; quantitative risk aggregation across a portfolio.
- **What stays stable:** a risk, control, or obligation is always a typed entity related to twin content (Capability/Application/DataEntity/BusinessProcess) — never a free-floating annotation; risk and control state are authored as facts and operations through Mneme; Aegis reads impact from Metis and never reimplements traversal.
- **What is provisional:** the proposed Risk/Control/Obligation metamodel extension; the scoring model; the relationship set that ties risks and controls to the spine.
- **What is deferred:** control-effectiveness testing workflows; mapping to specific external regulatory catalogues; quantitative/Monte-Carlo risk aggregation.
- **Why hard to reverse:** Risk, Control, and Obligation become metamodel types and appear in artefact families and exports; once a risk register is modelled against them, their shape is a public contract governed like any metamodel change ([ADR-0017](./ADR-0017-contract-and-dto-versioning.md)).

## Decision

Introduce **Aegis** (the shield of Athena — protection and oversight) as a planned engine module owning a **risk register, a control library, and regulatory-obligation tracking, mapped onto the twin**.

1. **Risk, Control, and Obligation are entities related to twin content.** A risk relates to the Capability, Application, DataEntity, or BusinessProcess it threatens; a control relates to the risk it mitigates and the content it applies to; an obligation relates to the capabilities and data it governs. The discipline is that none of these is representable without a relationship to something modelled — a risk with no subject is not a register entry, it is a note. This is the invariant that makes the register defensible.

2. **A proposed metamodel extension carries the vocabulary.** A proposed risk-and-control metamodel extension package adds the entity types **Risk**, **Control**, and **Obligation**, plus the relationships that tie them to the existing spine, with UUID minting deferred to the metamodel compiler — the same pattern Kairos's planning extension uses ([ADR-0028](./ADR-0028-investment-and-portfolio-planning-kairos.md)). This is referenced as design intent; the extension is authored and versioned like any metamodel change ([ADR-0017](./ADR-0017-contract-and-dto-versioning.md)), not invented per artefact.

3. **Aegis composes with Kairos: risk is an entropy and opportunity driver.** An unmitigated or under-controlled risk is a reason a change becomes necessary. Aegis surfaces such risks as drivers that Kairos can classify as an investment opportunity and plan a response to ([ADR-0028](./ADR-0028-investment-and-portfolio-planning-kairos.md)). Aegis owns the risk; Kairos owns the plan; neither reimplements the other.

4. **Aegis composes with Metis for scoring.** Risk scoring consumes deterministic, bounded graph computation from Metis — blast radius, criticality, dependency breadth — rather than reimplementing traversal. A risk's exposure is derived from where its subject sits in the twin. Scores carry an honest confidence label ([ADR-0021](./ADR-0021-confidence-and-trust-scale.md)), and the integrity of the underlying content bounds them ([ADR-0020](./ADR-0020-integrity-scoring-model.md)): a low-integrity subgraph yields a bounded risk score, stated as such.

5. **State is facts in the twin.** Risk status, control state, and obligation evidence are authored as facts through Mneme and resolved through a viewpoint like any other content — so a risk register is bitemporal: what the risk was believed to be, as of when, in which scenario. Aegis holds no separate durable store.

6. **Boundaries.** Aegis models risk, control, and compliance; it does not traverse (Metis), does not plan investment (Kairos), does not store (Mneme), and does not enforce access policy (Themis, [ADR-0030](./ADR-0030-governance-themis.md)). It composes through the Host with no engine-to-engine cycle ([ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md)).

## Consequences

- The twin becomes a risk-and-compliance instrument: a control owner can drill from an obligation to the data it governs, to the risks against it, to the controls that mitigate them, all bitemporal.
- A new module, crate (`aegis`), trait, frontend workspace (`src/workspaces/aegis`), and a proposed metamodel extension join the roadmap; the C4 model and module dependency map include Aegis as a planned component.
- The Risk/Control/Obligation types must be governed as a metamodel change — SemVer, forward-only ([ADR-0017](./ADR-0017-contract-and-dto-versioning.md)) — and reconciled with the seed metamodel ([`core-v1.json`](../data/meta/core-v1.json)) before they are treated as implemented.
- Aegis adds no new canonical storage primitive; it reuses facts, viewpoints, Metis analytics, and Kairos planning.
- The Aegis↔Kairos seam closes the forces-of-change loop: risk feeds entropy, entropy feeds investment, investment plans the mitigating change ([forces of change](../03-design/forces-of-change/README.md)).

## Follow-ups / Open Questions

- Confirm the module name **Aegis** against alternatives, and the exact relationship names tying Risk/Control/Obligation to the spine (extension rule, [ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md)).
- Define the first-version risk-scoring model (likelihood × impact; inherent vs residual) and how it consumes Metis magnitude.
- Decide whether obligations map to named external regulatory catalogues now or later, and how that mapping is versioned.
- Specify which artefact families Aegis introduces (risk register, control matrix, obligation/coverage view) and their forms.
- Resolve how a control's effectiveness is tested and evidenced over time, deferred for the first version.

## References & standards

- The Open Group — **ArchiMate 3.2 Specification** (Motivation layer: Driver, Assessment) _(informative: framing risks/obligations as motivation drivers over the twin)_.
- The Open Group — **TOGAF Standard, 10th Edition** _(informative: risk management within the ADM)_.

## Related documents

| Document                                                           | What it covers                                                    |
| ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| [ADR-0028](./ADR-0028-investment-and-portfolio-planning-kairos.md) | Kairos, which sizes and plans the response to risk-driven change. |
| [ADR-0020](./ADR-0020-integrity-scoring-model.md)                  | The integrity scale that bounds a risk score.                     |
| [ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md)           | The module taxonomy and the metamodel-extension rule.             |
