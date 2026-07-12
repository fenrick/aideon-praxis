# Kerux — reporting and publishing

Kerux is the planned reporting-and-publishing engine of the Aideon twin: deterministic briefings, roadmaps, and packaged
outputs, generated with redaction by default and the executing viewpoint preserved. Kerux publishes _for consumption_;
it is where the twin becomes a deliverable a stakeholder can read away from the tool.

> **Implementation status: PLANNED.** No `aideon_kerux` crate exists. Everything in this folder is **design intent** —
> framed in the present tense as the standard requires, but describing behaviour not yet in code. The boundary,
> determinism, deny-by-default redaction, and the viewpoint-preservation invariant are normative now and constrain the
> implementation when it lands. The governing decision is
> [ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md).

This README is the index and the cross-cutting narrative; each focused topic lives in its own file, per the
[Documentation Standard §4](../../02-standards/DOCUMENTATION-STANDARD.md) granularity rule.

---

## Contents

1. [Deterministic generation](./deterministic-generation.md) — briefings, roadmaps, and packages; preserving the
   executing viewpoint.
2. [Redaction and PII](./redaction-and-pii.md) — deny-by-default, shared with Pylon.
3. [Narrative and rationale (Logos)](./narrative-and-rationale-logos.md) — the folded **Logos** concern: narrative,
   decision rationale, and ADR-like annotations across Kerux and Mneme.

---

## One-line role

Kerux turns a twin and a report definition, executed at a stated viewpoint, into a reproducible briefing, roadmap, or
package — with personal data redacted before rendering and the executing viewpoint recorded in the output.

## The boundary it occupies

Kerux occupies the **publishing-for-consumption** boundary: it produces outputs to be _read_, not re-imported. This is
the line against its neighbour: [Pylon](../pylon/README.md) interchanges _for re-import_
([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)); Kerux publishes _for consumption_
([ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md)). The two share the deny-by-default redaction
discipline but face different directions.

## Invariants

- **Deterministic generation.** Given the same twin state, viewpoint, and report definition, Kerux produces the same
  briefing, roadmap, or package. A non-deterministic report cannot be reproduced, audited, or defended
  ([ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md)).
- **PII redaction is deny-by-default.** A published output emits only what the redaction policy explicitly permits;
  personal data and policy-excluded content are removed _before_ rendering, not after
  ([ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md);
  [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).
- **Every output preserves the executing viewpoint.** A Kerux output records the `Viewpoint` it was generated at — as-of
  valid time, as-of asserted time, layer or layer policy, scenario, scope. An output without its viewpoint is unsourced
  and is not produced ([ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md);
  [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)).
- **Outputs carry honest-state and provenance.** Content keeps its classification — Asserted, Inferred, Generated — and
  any result state (`Bounded`, `Stale`) at the moment of generation. A report does not launder a Generated suggestion
  into apparent fact, and a bounded analytic result is labelled bounded in the document
  ([ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md);
  [Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)).

## What it owns / what it does not own

**Owns:** the report request and published-artefact envelope; deterministic rendering of briefings, roadmaps, and
packages; the redaction step on publish; recording the executing viewpoint in every output; carrying content
classification and result state into the rendered document; and (as a folded capability) twin **narrative and decision
rationale** — the **Logos** concern (see [narrative and rationale](./narrative-and-rationale-logos.md)).

**Does not own:** canonical truth (Mneme); viewpoint resolution (Chrona); the analytics it renders (Metis); the artefact
definitions it executes (Praxis); interchange for re-import (Pylon); the authoring of generated content (Sophia).
Annotations as facts are stored by Mneme; Kerux composes the narrative over them.

## Public trait seam (design intent)

Kerux is reached only through the host. The planned seam takes a report definition and a viewpoint and returns a
published artefact that records both:

```rust
// design intent — not yet a crate
pub trait Kerux {
    fn publish(&self, definition: &ReportDefinition, viewpoint: &Viewpoint, policy: &RedactionPolicy)
        -> Result<PublishedArtefact, ProblemDetails>;
}
```

`PublishedArtefact` records the executing viewpoint, the redaction policy applied, and carries each element's content
classification and result state. Errors follow RFC 9457 ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)).
The shapes are provisional until a crate exists.

## Integration with other modules (via the host)

Kerux is an engine and **depends on no other engine**
([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). The host composes it:

- **Chrona** — viewpoint resolution, so the output renders the snapshot at, and records, its executing viewpoint.
- **Mneme** — canonical reads, and the store of annotation facts the Logos narrative draws on.
- **Metis** — analytics for roadmaps and impact figures, carried in with their bounded/stale result state.
- **Praxis** — the artefact definitions Kerux executes ([`CONTEXT.md`](../../../CONTEXT.md): Artefact + Viewpoint →
  Artefact result).
- **[Pylon](../pylon/README.md)** — shares the deny-by-default redaction discipline and may share the policy grammar
  ([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)).

The planned crate name is `aideon_kerux`.

## References & standards

_Informative:_

- The Open Group — **TOGAF Standard, 10th Edition**. The deliverables and views report forms map to.

Full bibliography: [STANDARDS-REGISTER.md](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                | What it covers                                               |
| ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| [ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md)    | The decision that introduces Kerux and fixes its invariants. |
| [ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)      | The diff model published artefacts are comparable across.    |
| [Pylon module](../pylon/README.md)                                      | Interchange for re-import, sharing the redaction discipline. |
| [ARTEFACTS-AND-FAMILIES.md](../../03-design/ARTEFACTS-AND-FAMILIES.md)  | The Artefact/Artefact-result model Kerux renders.            |
| [Module dependency map](../../01-architecture/module-dependency-map.md) | The crate dependency graph and the acyclic invariant.        |
