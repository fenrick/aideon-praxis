# UX

The behaviour-level interaction contract for Aideon Desktop. This folder fixes how the product behaves — how selection
drives the inspector, how a user moves from a result to its explanation to a valid action, how time and scenario
controls work, how long-running work and write backpressure are shown, and how the product keeps partial, stale, and
generated content honest. It is the behavioural counterpart to the visual contract in
[DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md): the pixels, tokens, and component anatomy live there; the rules of behaviour
live here.

This folder is the behaviour layer of the [UX overview/map](../UX-DESIGN.md) — start there for the whole picture (the
shell, the surface family, and where every UX concern is specified). This folder is a contract, not a tour. Each file
answers one question. Where a concept is fixed elsewhere — the four shell regions in [the-shell.md](../the-shell.md),
the honest-state vocabulary in the [Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md), the
artefact frame in [artefacts/](../artefacts/README.md) — this folder restates the conclusion and links the definition
rather than forking it.

---

## Contents

1. [Shell structure](./shell-structure.md) — the four regions and the behavioural role each plays; time and scenario
   controls always visible.
2. [Selection model](./selection-model.md) — global selection, the selection kinds, and the
   inline-versus-inspector-versus-drawer rule.
3. [Drill-down](./drill-down.md) — the result → explanation → action path, and where explanation is placed.
4. [Time and scenario UX](./time-and-scenario-ux.md) — time as the coordinate system, the toolbar controls, and scenario
   overlays.
5. [Accepted-work UX](./accepted-work-ux.md) — long-running work shown with explicit status, not spinners; the shared
   lifecycle vocabulary.
6. [Backpressure UX](./backpressure-ux.md) — what the renderer shows when the write queue is saturated.
7. [Honest-state treatment](./honest-state-treatment.md) — how result states and content classification render in the
   shell.
8. [Editing flow](./editing-flow.md) — edits are task-based; the renderer never mutates durable truth.
9. [Workspace family](./workspace-family.md) — the surfaces the product opens onto and the role of each.
10. [Accessibility and performance](./accessibility-and-performance.md) — keyboard, non-colour cues, virtualisation,
    bounded detail.
11. [Multi-user conflict UX](./multi-user-conflict-ux.md) — how concurrent edits reconcile and how conflicts surface for
    human resolution (design intent).

---

## How to read this folder

A reader new to the product reads [shell structure](./shell-structure.md) then [selection model](./selection-model.md) —
the two together explain how the surface holds together. A reader building a renderer feature reads the file for that
feature: editing reads [editing flow](./editing-flow.md); a long-running operation reads
[accepted-work UX](./accepted-work-ux.md) and [backpressure UX](./backpressure-ux.md). A reader auditing the product's
honesty obligations reads [honest-state treatment](./honest-state-treatment.md) against
[trust-and-honesty.md](../trust-and-honesty.md).

The component anatomy that used to sit beside these rules — artefact frame, inspector section, field row, difference
block, accepted-work strip — is now owned by [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md). This folder names those components
by their behaviour and links the visual contract; it does not redraw it.

---

## References & standards

_Informative — the basis this folder leans on (full entries in the
[standards register](../../02-standards/STANDARDS-REGISTER.md)):_

- Nielsen — **10 Usability Heuristics**, 1994. Visibility of system status, user control, recognition over recall.
- Wertheimer — **Gestalt principles**. Visual grouping in the inspector and dense surfaces.
- Pirolli & Card — **Information Foraging**, 1999; progressive disclosure. Information scent for drill-down and
  explanation placement.
- **WCAG 2.2** (W3C) and the **WAI-ARIA Authoring Practices Guide**. Accessibility and interaction patterns.

## Related documents

| Document                                                                                | What it covers                                                                          |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [the-shell.md](../the-shell.md)                                                         | The canonical definition of the four shell regions and their fixed roles.               |
| [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md)                                                 | The pixel-level tokens, primitives, and component anatomy these rules render through.   |
| [trust-and-honesty.md](../trust-and-honesty.md)                                         | The honest-state obligations the product carries; the vocabulary this folder defers to. |
| [artefacts/README.md](../artefacts/README.md)                                           | The artefact — the primary product these interactions operate on.                       |
| [TEMPORAL-AND-SCENARIO-CONTEXT.md](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The viewpoint contract the time and scenario controls drive.                            |
| [ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)           | The accepted-work lifecycle and event schema these surfaces render.                     |
