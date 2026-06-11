# The Shell

The product runs in one shared shell with four stable regions. Every surface renders inside this shell and brings no chrome of its own. This document fixes the regions and their roles; the behaviour-level interaction contract is [ux/shell-structure.md](./ux/shell-structure.md), and the pixels are [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md).

The shell has four permanent jobs: keep orientation stable, keep context visible, keep the work surface dominant, and make action available without forcing the user to hunt for it. The regions' proportions vary by surface; their roles never change.

```
┌────────────────────────────────────────────────────────────┐
│  Toolbar   workspace identity · time + scenario · search · status │
├─────────┬────────────────────────────────────┬─────────────┤
│         │                                    │             │
│   Nav   │          Content surface           │  Inspector  │
│  rail   │          (artefact dominant)       │   rail      │
│         │                                    │             │
└─────────┴────────────────────────────────────┴─────────────┘
```

_The four regions of the shared shell. Their roles are fixed; their proportions vary by surface._

## Navigation rail

The stable left edge — a map of workspaces, artefact families, saved structures, pinned and recent destinations, and scenario entry points. It reads as product structure, not as a feed or a launcher. Status badges appear only when they clarify a destination; counts stay secondary to labels. It is quiet, dense, and steady, and active state is always obvious.

## Toolbar

The control band above the active surface, carrying the controls that change the meaning of the current view: workspace identity, the artefact or task identity, **time and scenario controls**, search and command entry, accepted-work and freshness summaries, and export entry points. The time and scenario controls are **always visible** here — never collapsible — because every surface has a viewpoint, and the toolbar must make that viewpoint readable without a secondary click. It behaves as a control band, not a marketing header.

## Content surface

The dominant work area. It renders the active artefact result — graph, catalogue, matrix, map, report, page, or a guided review flow — and keeps the current question obvious. Secondary work belongs in the inspector, drawers, or sheets, never stacked on top of the main view.

## Inspector rail

Where selection becomes explanation, editing, provenance, and valid action. It opens with a selection summary and stacks the relevant sections — properties, explanation, provenance, differences, valid actions — and feels attached to the selected object rather than a separate mini-app. **Selection is global within a workspace**: once the user selects something, the inspector, the action affordances, and the drill-down path all respond predictably. A property dump is not an inspector. See [ux/selection-model.md](./ux/selection-model.md).

## The trade-off

One fixed shell means individual surfaces cannot optimise their own chrome for a special case; a workspace that wanted a bespoke layout must instead express itself within these four regions. The product accepts that constraint deliberately: a stable shell is what lets a user move between a capability map, an impact analysis, and an executive briefing and read them as one product rather than several.

## References & standards

_Informative:_

- Nielsen — **10 Usability Heuristics**, 1994. Visibility of system status (the always-visible viewpoint), user control and freedom.

Recorded in the [standards register](../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                             | What it covers                                |
| ---------------------------------------------------- | --------------------------------------------- |
| [ux/shell-structure.md](./ux/shell-structure.md)     | The behaviour-level contract for each region. |
| [ux/selection-model.md](./ux/selection-model.md)     | How global selection drives the inspector.    |
| [host-surfaces/README.md](./host-surfaces/README.md) | The surfaces that render inside the shell.    |
| [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md)               | The shell primitives and visual language.     |
