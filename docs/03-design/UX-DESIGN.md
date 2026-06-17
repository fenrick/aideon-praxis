# UX overview — the map

The single entry point to Aideon Desktop's user experience: **what the product is, the surfaces it opens onto, the rules every surface obeys, and where each of those is specified**. It is a map, not a re-specification — it states each conclusion in a sentence and links the canonical document. If this page and a linked document disagree, the linked document governs.

The UX is documented across several folders by design (small single-topic files, per [Documentation Standard §4](../02-standards/DOCUMENTATION-STANDARD.md)); this page is the spine that ties them into one navigable whole.

---

## 1. One shell

The product runs in **one platform-owned shell** with four stable regions — a navigation rail, a toolbar carrying the always-visible time + scenario viewpoint, a dominant content surface, and a selection-driven inspector. Every surface renders **inside** this shell and brings **no chrome of its own**. Engines (Praxis, Chrona, Metis, …) contribute **licensed widgets** to the content surface; a user never moves between a "Praxis workspace" and a "Metis workspace" — they see one unified landscape. An unlicensed engine contributes nothing and simply does not appear.

| Concern                                                                              | Canonical document                                           |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| The four regions and their fixed roles                                               | [the-shell.md](./the-shell.md)                               |
| The behaviour contract per region                                                    | [ux/shell-structure.md](./ux/shell-structure.md)             |
| The renderer-side shell + how engines plug in (licensing gate, no per-module chrome) | [../frontend/shell.md](../frontend/shell.md)                 |
| IA rules (navigation reflects user goals, not the engine org)                        | [hig/shell-and-navigation.md](./hig/shell-and-navigation.md) |

## 2. The surfaces

The product opens onto a **family of surfaces**, each playing one role for one audience, all sharing the shell, the selection model, and the honest-state rules. The role of each is fixed in [ux/workspace-family.md](./ux/workspace-family.md); the cross-cutting surfaces closest to the shell are detailed under [host-surfaces/](./host-surfaces/README.md).

The **primary milestone** below is derived from the engine ownership in the [ROADMAP](../00-index/ROADMAP.md) (the MVP is M0–M3); it is a guide, not a separately-ratified UX roadmap. The shell and every cross-cutting behaviour in §3 exist from M0.

| Surface                         | Role (one line)                                                                                                        | Primary milestone       | Canonical doc                                                                                                                                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Workspace home**              | Resume surface — recency, active scenarios, unfinished work; not a welcome page.                                       | M0                      | [host-surfaces/workspace-home.md](./host-surfaces/workspace-home.md)                                                                                                                                           |
| **Modelling studio**            | The expert work surface: structured editing, the graph/direct-manipulation canvas, explainability, artefact authoring. | M1–M3 (MVP core)        | [ux/workspace-family.md](./ux/workspace-family.md), [../frontend/praxis-workspace/DESIGN.md](../frontend/praxis-workspace/DESIGN.md), [design-system/canvas-and-graph.md](./design-system/canvas-and-graph.md) |
| **Scenario studio**             | Work with the base case and alternative futures: create, compare, explain, promote.                                    | M2                      | [ux/time-and-scenario-ux.md](./ux/time-and-scenario-ux.md)                                                                                                                                                     |
| **Artefact family library**     | Start from known-good artefacts organised by question, audience, abstraction — the antidote to the blank canvas.       | M3 (end of MVP)         | [artefacts/families.md](./artefacts/families.md)                                                                                                                                                               |
| **Import and mapping**          | Where external material meets the controlled language — every step reviewable, reversible, explicit about uncertainty. | M4                      | [hig/import-and-export.md](./hig/import-and-export.md)                                                                                                                                                         |
| **Executive briefing**          | Surfaces legible in meetings and defensible under questioning; usable in packaged output.                              | M5                      | [host-surfaces/executive-briefing.md](./host-surfaces/executive-briefing.md)                                                                                                                                   |
| **Review and contribution**     | The bounded, plain-language surface for SMEs and stewards confirming facts they own.                                   | M5–M6 _(design intent)_ | [participation-and-trust/participation-modes.md](./participation-and-trust/participation-modes.md), [hig/collaboration-and-review.md](./hig/collaboration-and-review.md)                                       |
| **Administration and controls** | Access, templates, integrations, automation rules, audit — scope (personal / workspace / org) always unmistakable.     | M6 _(design intent)_    | [host-surfaces/administration-and-controls.md](./host-surfaces/administration-and-controls.md)                                                                                                                 |

## 3. How it works — the cross-cutting behaviour

These rules hold on **every** surface; they are the behavioural contract in [ux/](./ux/README.md) (the visual counterpart is the [design system](./design-system/README.md)).

| Rule                                                                  | Canonical document                                                                                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Selection is global; inline vs inspector vs drawer placement          | [ux/selection-model.md](./ux/selection-model.md)                                                                                                       |
| Result → explanation → valid action                                   | [ux/drill-down.md](./ux/drill-down.md)                                                                                                                 |
| Time as the coordinate system; toolbar viewpoint; scenario overlays   | [ux/time-and-scenario-ux.md](./ux/time-and-scenario-ux.md)                                                                                             |
| Long-running work shown with explicit status, never a bare spinner    | [ux/accepted-work-ux.md](./ux/accepted-work-ux.md)                                                                                                     |
| What the renderer shows when the write queue saturates                | [ux/backpressure-ux.md](./ux/backpressure-ux.md)                                                                                                       |
| Partial / stale / generated content kept honest (two orthogonal axes) | [ux/honest-state-treatment.md](./ux/honest-state-treatment.md), [design-system/honest-state-treatments.md](./design-system/honest-state-treatments.md) |
| Edits are task-based; the renderer never mutates durable truth        | [ux/editing-flow.md](./ux/editing-flow.md)                                                                                                             |
| Keyboard, non-colour cues, virtualisation, bounded detail             | [ux/accessibility-and-performance.md](./ux/accessibility-and-performance.md)                                                                           |
| Concurrent edits and conflict resolution _(design intent)_            | [ux/multi-user-conflict-ux.md](./ux/multi-user-conflict-ux.md)                                                                                         |

## 4. The layers behind the surfaces

| Layer                          | What it owns                                                                                                             | Entry point                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| **Human Interface Guidelines** | The interaction principles (foundations, interaction model, canvas, tables, assisted work, provenance).                  | [hig/README.md](./hig/README.md)                                         |
| **Design system**              | Tokens → primitives → blocks → surfaces; honest-state treatments; motion; density; canvas-and-graph.                     | [design-system/README.md](./design-system/README.md)                     |
| **Participation & trust**      | Who uses which surface — Expert, Guided, Steward, Read-only modes; trust cues; behaviour under pressure.                 | [participation-and-trust/README.md](./participation-and-trust/README.md) |
| **Renderer architecture**      | How the WebView is built to deliver all of the above: shell, state, data-fetching, IPC seam, engine widget contribution. | [../frontend/README.md](../frontend/README.md)                           |

## 5. The MVP build layer

For the M0–M3 build, the UX is pinned to executable contracts:

| Document                                                                                   | What it fixes                                                                                                                                |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [../build-contracts/golden-journey.md](../build-contracts/golden-journey.md)               | The end-to-end MVP path (create → seed → edit → time-travel → diff → catalogue → close/reopen/rebuild) tied to commands and oracle fixtures. |
| [../build-contracts/mvp-ui-state-machines.md](../build-contracts/mvp-ui-state-machines.md) | Per-surface state tables (loading/empty/error/stale/rebuilding/recovery/backpressure…) + settled front-end choices.                          |
| [../build-contracts/mvp-command-registry.md](../build-contracts/mvp-command-registry.md)   | The MVP IPC surface each interaction calls.                                                                                                  |

## 6. Reading paths

- **New to the product:** §1 here → [the-shell.md](./the-shell.md) → [ux/selection-model.md](./ux/selection-model.md) → [ux/workspace-family.md](./ux/workspace-family.md).
- **Building a renderer feature:** [../frontend/README.md](../frontend/README.md) → [../frontend/shell.md](../frontend/shell.md) → the [ux/](./ux/README.md) file for the behaviour → [../build-contracts/mvp-ui-state-machines.md](../build-contracts/mvp-ui-state-machines.md).
- **Auditing honesty obligations:** [ux/honest-state-treatment.md](./ux/honest-state-treatment.md) → [trust-and-honesty.md](./trust-and-honesty.md) → [design-system/honest-state-treatments.md](./design-system/honest-state-treatments.md).

## 7. Open information-architecture decisions

The shell model, the per-surface behaviour, and the MVP state machines are settled and mutually consistent. What is **not yet decided** is a cluster of concrete IA arrangements — deliberately deferred, not contradictory, but a designer/implementer would otherwise invent them. These are the candidates for a follow-up decision pass:

- **Navigation model — _resolved_.** The rail is organised by **user-goal surfaces, never engines**; the eight workspace-family surfaces are the primary destinations, with scenarios/artefacts/saved-structures/review as secondary destinations within them (the **Workspace structure** section); widgets compose _within_ a surface (extensively only in the modelling studio); surface changes preserve the active viewpoint unless an opened saved destination carries another. Pinned in [hig/shell-and-navigation.md](./hig/shell-and-navigation.md), [the-shell.md](./the-shell.md), [ux/workspace-family.md](./ux/workspace-family.md), [../frontend/shell.md](../frontend/shell.md).
- **Surface/widget launch & discovery mechanics** — the surface/widget _model_ is resolved (above); still open is the concrete UX of the widget-library dialog, the add-widget affordance, and the empty-surface state.
- **Search-results presentation** — the rules exist ([hig/shell-and-navigation.md](./hig/shell-and-navigation.md)); the result-card format does not.
- **Settings IA** — personal / workspace / org scopes are named as "visibly separate"; the concrete arrangement is open.
- **Canvas keyboard / accessibility** — flagged design intent, pending an APG-grid-style design ([../frontend/praxis-workspace/DESIGN.md](../frontend/praxis-workspace/DESIGN.md)).
- **Multi-engine orchestration** — cross-engine selection/inspector when more than Praxis is licensed; M4+ design intent.

## Related documents

| Document                                             | What it covers                                                |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| [the-shell.md](./the-shell.md)                       | The canonical four-region shell.                              |
| [ux/README.md](./ux/README.md)                       | The behaviour-level interaction contract (per-surface rules). |
| [design-system/README.md](./design-system/README.md) | The visual contract — tokens, primitives, blocks, surfaces.   |
| [hig/README.md](./hig/README.md)                     | The interaction principles.                                   |
| [host-surfaces/README.md](./host-surfaces/README.md) | The cross-cutting surfaces close to the shell.                |
| [../frontend/README.md](../frontend/README.md)       | How the renderer is built to deliver the UX.                  |
| [../00-index/ROADMAP.md](../00-index/ROADMAP.md)     | The milestone the surface scoping is derived from.            |
