# ADR-0015: Reporting and Publishing — Kerux

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0001, ADR-0011
- Relates-To: ADR-0008, ADR-0009, ADR-0013

## Context

The twin's value to a stakeholder is realised when it produces a briefing, a roadmap, or a packaged deliverable they can
read away from the tool. Two properties make such outputs trustworthy: they are deterministic (the same twin and the
same request produce the same document, so a published artefact can be reproduced and audited), and they are safe to
circulate (sensitive content does not leak by accident). A report is also meaningless without its viewpoint — a roadmap
"as of when, in which layer, in which scenario" — so the executing viewpoint must travel with the output.

This ADR introduces **Kerux**, the planned reporting-and-publishing module
([ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md)). It is design intent until a crate exists. Kerux publishes
_for consumption_; Pylon ([ADR-0013](./ADR-0013-interchange-and-interoperability-pylon.md)) interchanges _for
re-import_.

## Governance Framing

- **Decision type:** Invariant (output is deterministic; PII redaction is deny-by-default; the viewpoint is preserved) +
  stable seam (the report request and the published-artefact envelope).
- **Known future pressure:** more output forms; richer templating; scheduled publishing; larger packages.
- **What stays stable:** determinism; deny-by-default redaction; the executing viewpoint is recorded in every output.
- **What is provisional:** the template engine, the specific output forms, and the redaction-policy grammar.
- **What is deferred:** interactive/live published artefacts; collaborative review of drafts.
- **Why hard to reverse:** determinism and the recorded viewpoint are reproducibility commitments auditors rely on; the
  deny-by-default rule is a safety commitment. The templating implementation is replaceable.

## Decision

- **Kerux generates deterministically.** Given the same twin state, viewpoint, and report definition, Kerux produces the
  same briefing, roadmap, or package. Determinism makes a published artefact reproducible and auditable; a
  non-deterministic report cannot be defended after the fact.

- **PII redaction is deny-by-default.** A published output emits only what the redaction policy explicitly permits;
  personal data and policy-excluded content are removed before rendering, not after. This is the same deny-by-default
  discipline Pylon applies on export ([ADR-0013](./ADR-0013-interchange-and-interoperability-pylon.md)) and the same
  filtered-sharing posture as [ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md). One forgotten flag must not
  leak data.

- **Every output preserves the executing viewpoint.** A Kerux output records the `Viewpoint` it was generated at — as-of
  valid time, as-of asserted time, layer or layer policy, scenario, scope
  ([ADR-0009](./ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)). A roadmap states the scenario and
  layer it projects; a briefing states the as-of valid time it describes. An output without its viewpoint is unsourced
  and is not produced.

- **Outputs carry honest-state and provenance.** Content in a report keeps its classification — Asserted, Inferred,
  Generated — and any result state (`Bounded`, `Stale`) at the moment of generation
  ([DOCUMENTATION-STANDARD.md §9](../02-standards/DOCUMENTATION-STANDARD.md)). A report does not launder a Generated
  suggestion into apparent fact, and a bounded analytic result is labelled bounded in the published document.

- **Kerux is an engine and depends on no other engine** ([ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md)). The
  host composes Kerux with Chrona (viewpoint resolution), Mneme (canonical reads), Metis (analytics for roadmaps and
  impact), and Praxis (artefact definitions).

## Considered Options

- **Best-effort, non-deterministic reports (rejected):** simpler, but a published artefact that cannot be reproduced
  cannot be audited or defended.
- **Opt-in redaction (rejected):** one missed setting leaks personal data; deny-by-default fails safe.
- **Viewpoint-implicit outputs (rejected):** convenient, but a roadmap with no recorded scenario or as-of is ambiguous
  and misleading.

## Consequences

- A worked example: a Kerux roadmap generated at a viewpoint pinned to the `scn_plan_q3` scenario, plan layer, renders
  only entities resolvable there, records that viewpoint in its header, redacts owner names the policy excludes, and
  marks any centrality figure that was depth-bounded as `Bounded`.
- Re-generating a report over an unchanged twin and viewpoint reproduces it byte-for-byte where the form allows, which
  is the determinism guarantee made observable.
- Published artefacts are diff-comparable across viewpoints, reusing the diff model
  ([ADR-0008](./ADR-0008-diff-compares-two-viewpoints.md)).
- Kerux and Pylon share the deny-by-default redaction discipline and may share the policy grammar.

## Follow-ups / Open Questions

- The redaction-policy grammar and whether it is shared verbatim with Pylon.
- The set of output forms (briefing, roadmap, package) and their contracts.
- Determinism of byte-level rendering across template-engine versions.

## References & standards

- The Open Group — **TOGAF Standard, 10th Edition** _(informative: deliverables and views that report forms map to)_.

## Related documents

| Document                                                                       | What it covers                                            |
| ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| [ADR-0013](./ADR-0013-interchange-and-interoperability-pylon.md)               | Pylon interchange, which shares the redaction discipline. |
| [ADR-0009](./ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md) | The viewpoint every output preserves.                     |
| [ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md)                       | The module taxonomy that introduces Kerux.                |
