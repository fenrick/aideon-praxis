# Shell Structure

The behavioural role of each of the shell's four regions. The regions themselves — the navigation rail, the toolbar, the content surface, and the inspector rail — are fixed in [the-shell.md](../the-shell.md); this document does not redefine them. It states what each region must do, must not do, and may do as the user works, so that a renderer feature renders into the right region for the right reason.

## The principle

The shell is one stable frame, and every surface renders inside it. A user moving between a capability map, an impact analysis, and an executive briefing reads them as one product because the regions hold steady — orientation on the left, context above, work in the centre, explanation and action on the right. The cost is deliberate: a surface may not invent its own chrome to optimise a special case, and must express itself within these four regions (the trade-off recorded in [the-shell.md](../the-shell.md)).

This stability serves a usability obligation: the system's status must be visible at all times without the user having to ask for it (Nielsen, _10 Usability Heuristics_, 1994 — visibility of system status). The shell makes the active viewpoint, the running work, and the current selection readable without a secondary click.

## The regions and their roles

| Region              | Behavioural role                                                               | Must                                                                                                                                                                     | Must not                                                                                               |
| ------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Navigation rail** | Orientation. The map of where the user can go.                                 | Read as product structure; keep active state obvious; keep counts and badges secondary to labels.                                                                        | Become a feed, a launcher, or a scoreboard of metrics.                                                 |
| **Toolbar**         | Context and command. The controls that change the meaning of the current view. | Keep the workspace identity, the artefact or task identity, and the **time and scenario controls** readable; surface accepted-work and freshness when work is in flight. | Hide the time or scenario controls behind overflow or a settings screen; behave as a marketing header. |
| **Content surface** | Work. The dominant area where the active artefact result renders.              | Stay dominant; keep the active question obvious.                                                                                                                         | Be crowded out by secondary work stacked on top of it.                                                 |
| **Inspector rail**  | Explanation, editing, provenance, and valid action for the current selection.  | Open with a selection summary and stack the relevant sections; feel attached to the selected object.                                                                     | Be a flat property dump, or a separate mini-app with unrelated layout logic.                           |

The content surface is **always dominant**. Secondary work — a property edit, a transient comparison, a confirmation — belongs in the inspector, a drawer, or a sheet, never layered over the main view. This is the rule that keeps the active question legible while the user does adjacent work.

## Time and scenario controls are always visible

The toolbar carries the active viewpoint — valid time, asserted time, layer, and scenario — and these controls are **never** collapsible. Every surface the user looks at resolves at some viewpoint; a result read without knowing its viewpoint is a result read wrongly. The toolbar therefore makes the viewpoint readable in place, and a change to it triggers re-execution rather than a silent local edit. The full behaviour of these controls is in [time-and-scenario-ux.md](./time-and-scenario-ux.md).

## Worked example

A user opens the "Application Portfolio Health" catalogue. The **navigation rail** shows the catalogue's family as the active destination. The **toolbar** shows the workspace identity, the catalogue's name, and the viewpoint: valid time _2026-06-11_, layer _actual_, scenario _(base case)_. The **content surface** renders the catalogue, with `Insight Hub` (disposition `Invest`, lifecycle `Run`) as one row. The user selects that row; the **inspector rail** opens with `Insight Hub`'s selection summary, properties, explanation, provenance, differences, and valid actions — while the catalogue stays dominant in the centre. No region changed its role; the surface filled them.

## References & standards

_Informative:_

- Nielsen — **10 Usability Heuristics**, 1994. Visibility of system status; user control and freedom; aesthetic and minimalist design.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                             | What it covers                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| [the-shell.md](../the-shell.md)                      | The canonical definition of the four regions and their fixed roles. |
| [selection-model.md](./selection-model.md)           | How global selection drives the inspector rail.                     |
| [time-and-scenario-ux.md](./time-and-scenario-ux.md) | The toolbar's time and scenario controls.                           |
| [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md)              | The shell primitives and visual language each region renders.       |
