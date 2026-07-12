# Human Interface Guidelines

The desktop HIG handbook for Aideon Desktop: the recurring interaction and visual patterns every surface inherits. This
folder is for anyone designing, building, or reviewing a renderer surface and needing pattern guidance detailed enough
to act on. It is the _behaviour and visual_ counterpart to the [design system](../design-system/README.md): the HIG says
how surfaces should behave; the design system supplies the tokens, primitives, and blocks that make that behaviour
cheap.

These guidelines are adapted from a prior, shelved web version of the platform HIG. The durable interaction and visual
thinking is kept; runtime-specific guidance is updated to the desktop-first, local-first, offline Tauri posture
([DESIGN.md](../DESIGN.md), [the-shell.md](../the-shell.md)).

---

## Contents

| Page                                                                   | What it covers                                                                                                                    |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [foundations.md](./foundations.md)                                     | The shared defaults every surface inherits: accessibility, typography, density, colour, motion, language, data visualisation.     |
| [interaction-model.md](./interaction-model.md)                         | How users move, select, edit, confirm, recover, and read state — input, focus, selection, undo, drag and drop, long-running work. |
| [shell-and-navigation.md](./shell-and-navigation.md)                   | How the one shared shell frames workspaces, navigation, search, settings, and the viewpoint.                                      |
| [tables-and-dashboards.md](./tables-and-dashboards.md)                 | Dense analytical views — tables, dashboards, drill-down, saved views.                                                             |
| [provenance-and-generated-work.md](./provenance-and-generated-work.md) | Presenting content classification, freshness, explainability, and generated work as prompts for judgement.                        |
| [assisted-work.md](./assisted-work.md)                                 | Assistant entry, assisted responses, guided authoring, and review-before-commit, under the Sophia guardrails.                     |
| [canvas-and-graph-work.md](./canvas-and-graph-work.md)                 | Direct-manipulation canvases and graph modelling, aligned to Topos.                                                               |
| [collaboration-and-review.md](./collaboration-and-review.md)           | Comments, review, approvals, presence, and conflict — aligned to Koinon, Themis, and the Steward mode.                            |
| [import-and-export.md](./import-and-export.md)                         | Import and export as trust-sensitive review workflows, aligned to Pylon and Skopos.                                               |

## Reading order

Read foundations first because it applies everywhere. Read shell-and-navigation and interaction-model next because they
shape the frame and the operating model. The remaining pages cover the trust-sensitive work patterns that most determine
whether Aideon feels coherent or improvised.

## How the HIG sits in the corpus

The HIG is the _explanation_ of behaviour ([Procida, Diátaxis](../../02-standards/STANDARDS-REGISTER.md)). It does not
decide what a workflow may do — that belongs to the modules and contracts. It does not make architecture decisions —
those are [ADRs](../../06-adrs/ADRS.md). It tells the product how to present itself and how to behave under the load of
serious analytical work. Each page links the module it faces and the ADR or standard it rests on.

## References & standards

_Informative — recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md):_

- Nielsen — **10 Usability Heuristics**, 1994. Status visibility, user control, honest state.
- Pirolli & Card — **Information Foraging**, 1999. Information scent for drill-down and explanation.
- Procida — **Diátaxis**. The explanation layer this folder sits in.

## Related documents

| Document                                              | What it covers                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| [design-system/README.md](../design-system/README.md) | The tokens, primitives, and blocks the HIG behaviour is built from. |
| [the-shell.md](../the-shell.md)                       | The one shared shell and its four regions.                          |
| [trust-and-honesty.md](../trust-and-honesty.md)       | The honest-state obligations the HIG realises.                      |
| [ux/README.md](../ux/README.md)                       | The behaviour-level interaction contract the HIG aligns to.         |
| [frontend/DESIGN.md](../../frontend/DESIGN.md)        | The renderer architecture the surfaces are built on.                |
