# Deterministic generation

How Kerux produces briefings, roadmaps, and packages reproducibly, and why the executing viewpoint travels with every output. For practitioners who must reproduce, audit, or defend a published artefact after the fact.

> **PLANNED.** No `aideon_kerux` crate exists; this is design intent per [ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md).

## Determinism is what makes a report defensible

Given the same twin state, viewpoint, and report definition, Kerux produces the **same** briefing, roadmap, or package ([ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md)). Determinism is not a nicety: a published artefact that cannot be reproduced cannot be audited or defended after the fact. The trade-off named: best-effort, non-deterministic reports are simpler to build, but a report no one can reproduce is a report no one can stand behind ([ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md)).

Re-generating a report over an unchanged twin and viewpoint reproduces it byte-for-byte where the form allows — the determinism guarantee made observable. Whether byte-level rendering stays stable across template-engine versions is an open question in [ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md); the template engine itself is replaceable.

## The output forms

Kerux generates **briefings, roadmaps, and packaged outputs** ([ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md)). These map onto TOGAF deliverables and views (The Open Group, TOGAF Standard, 10th Edition) — a briefing is a stakeholder-facing summary, a roadmap projects change over the valid-time axis, a package bundles several outputs. The precise set of output forms and their contracts is an open question in [ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md). Each is rendered from an **Artefact** definition executed at a `Viewpoint` to yield an **Artefact result** ([`CONTEXT.md`](../../../CONTEXT.md): Artefact + Viewpoint → Artefact result); Kerux renders the result into the published form.

## The executing viewpoint travels with the output

Every Kerux output records the `Viewpoint` it was generated at — as-of valid time, as-of asserted time, layer or layer policy, scenario, scope ([ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)). A roadmap states the scenario and layer it projects; a briefing states the as-of valid time it describes. An output **without** its viewpoint is unsourced and is not produced ([ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md)). The trade-off named: viewpoint-implicit outputs are convenient, but a roadmap with no recorded scenario or as-of is ambiguous and misleading. Because the viewpoint travels with the output, published artefacts are diff-comparable across viewpoints, reusing the diff model ([ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)).

## Honest state carried into the document

Content in a Kerux output keeps its classification — Asserted, Inferred, Generated — and any result state (`Bounded`, `Stale`) at the moment of generation ([ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md); [Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)). A report **does not launder** a Generated suggestion into apparent fact, and a bounded analytic result is labelled bounded in the published document. The honesty obligations the product carries on screen carry through into the deliverable.

## Worked example

A Kerux roadmap is generated at a viewpoint pinned to a planning scenario, plan layer, as-of an asserted time. It renders only entities resolvable there — for instance the seed `Application` `n:application:automation-orchestrator` (`disposition = Migrate`) with its planned migration, and the `Capability` `n:capability:automation-fabric` it touches. The output records that viewpoint in its header. A centrality figure that Metis computed under a depth bound is marked `Bounded` in the roadmap. Owner names the redaction policy excludes are removed before rendering ([redaction and PII](./redaction-and-pii.md)). Re-generating the roadmap over the unchanged twin and viewpoint reproduces it byte-for-byte where the form allows.

## References & standards

_Informative:_

- The Open Group — **TOGAF Standard, 10th Edition**. The deliverables and views the output forms map to.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                   | What it covers                                            |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| [Kerux README](./README.md)                                                                | The module index and invariants.                          |
| [Redaction and PII](./redaction-and-pii.md)                                                | The deny-by-default step that runs before rendering.      |
| [ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)                         | The diff model published artefacts are comparable across. |
| [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md) | The viewpoint every output records.                       |
