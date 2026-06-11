# Narrative and rationale — Logos

The folded **Logos** concern: narrative, decision rationale, and ADR-like model annotations over the twin. This file names the concern, says where it lives today, and records the explicit trigger that would split it out into its own module. For practitioners reasoning about where decision rationale and narrative belong.

> **PLANNED / FOLDED CONCERN.** No `aideon_kerux` crate exists, and **Logos is not a module** — it is a folded concern documented as capabilities within existing modules, per [ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md) and [Documentation Standard §10](../../02-standards/DOCUMENTATION-STANDARD.md). This is design intent.

## What Logos is

**Logos** is the concern of _narrative and decision rationale over the twin_: the prose that explains why the architecture is as it is, the rationale behind a decision, and ADR-like annotations attached to model content ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md); [Documentation Standard §10](../../02-standards/DOCUMENTATION-STANDARD.md)). It is real and worth naming, but it does **not** yet earn its own module under the "earns its own module" test — a distinct invariant, a distinct failure mode, and a distinct seam ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). Folding is the default; splitting is the exception that must be earned. **Keep the name Logos**: naming the folded concern is what makes the split-out trigger checkable later.

## Where Logos lives today

Logos is folded across two modules ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md), folded-concern table):

| Aspect of Logos                                                                                                                           | Lives in  | How                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Narrative** — the explanatory prose in a briefing or roadmap                                                                            | **Kerux** | Composed at generation time from the twin and its annotations, rendered into the published output ([deterministic generation](./deterministic-generation.md)). |
| **Annotations and rationale as facts** — decision rationale and ADR-like model annotations attached to entities, relationships, and slots | **Mneme** | Stored as facts on the op log like any other content, bitemporal and resolvable through a viewpoint.                                                           |

So a decision rationale is **authored and stored** as annotation facts (Mneme) and **rendered into narrative** (Kerux). Neither module reaches into the other; the host composes them — Kerux reads annotation facts through Mneme to build the narrative, with no engine-to-engine call ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)).

This split is deliberate. Storing rationale as facts means it inherits the twin's honesty machinery for free: an annotation has a valid-time interval, an asserted time, a content classification, and resolves through a viewpoint exactly as a `Capability`'s `tier` does. Rendering narrative in Kerux means rationale travels into deliverables under the same determinism, redaction, and viewpoint-preservation guarantees as everything else Kerux publishes.

## The split-out trigger

Logos **splits out into its own module when narrative and rationale need their own authored model and method, beyond reporting prose and annotation facts** ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md), folded-concern table). Concretely, the trigger fires if decision rationale grows a first-class authored structure — for example a rationale graph linking decisions to drivers, options, and consequences, with its own lifecycle and validation — that reporting prose and flat annotation facts can no longer carry. Until then, Kerux narrative plus Mneme annotation facts are sufficient, and splitting would add a module that owns no distinct invariant the current home does not already uphold.

This mirrors how the other folded concerns are recorded with their triggers: **Oikos** (run-cost / FinOps, in Metis + Kairos), **Krisis** (validation, in Praxis), and **Topos** (cartography/layout, in the renderer + Praxis — likely never an engine) ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)).

## Worked example

An architect records why the seed `Application` `n:application:automation-orchestrator` is set to `disposition = Migrate`: "End-of-support for the underlying platform; migration funded under the Q3 programme." That rationale is stored as an annotation fact on the application through Mneme — valid from the decision's date, asserted now, classified Asserted. When Kerux later publishes a roadmap at a viewpoint covering that date, it reads the annotation through the host and renders it as the narrative behind the migration entry, under the roadmap's redaction policy and recorded viewpoint. No "Logos engine" is involved, because none exists or is needed: the trigger above has not fired.

## References & standards

_Normative for the folding rule:_

- [ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md) — the module taxonomy, the "earns its own module" test, and the folded-concern table with split-out triggers.
- [Documentation Standard §10](../../02-standards/DOCUMENTATION-STANDARD.md) — module and crate naming, and the folded concerns.

## Related documents

| Document                                                             | What it covers                                                   |
| -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [Kerux README](./README.md)                                          | The module index; Logos narrative is a Kerux capability.         |
| [Mneme module](../mneme/README.md)                                   | Where annotation facts are stored.                               |
| [Deterministic generation](./deterministic-generation.md)            | How narrative is rendered into a published output.               |
| [ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md) | The decision that folds Logos and records its split-out trigger. |
