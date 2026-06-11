# HIG: Canvas and Graph Work

How Aideon handles canvases, graph modelling surfaces, and other direct-manipulation workspaces where users act on visible objects instead of forms alone. Apply this page when designing or reviewing node-and-edge canvases, layout workspaces, mapping surfaces, connection editors, or grouped object views.

It does not cover tables, dashboards ([tables-and-dashboards.md](./tables-and-dashboards.md)), or document review — those need different defaults about density, navigation, and inspection.

---

## The principle

The canvas is where Aideon is most likely to differentiate itself and most likely to become clever at the user's expense. The right canvas feels direct, precise, and recoverable; the wrong one feels impressive until somebody uses it under pressure. The canvas therefore needs a firm object model: the user can tell what exists, what can be selected, what is connected, what is grouped, what is locked, and what is merely hovered. When those states blur, the surface becomes mysterious quickly.

A canvas renders the **effective graph** — the node-and-edge projection of a snapshot ([CONTEXT.md](../../../CONTEXT.md)); the graph terms node and edge are correct only here. The substrate, styling conformance, and the layout concern are owned by the design system ([design-system/canvas-and-graph.md](../design-system/canvas-and-graph.md)).

## Alignment to Topos

Cartography and auto-layout are the folded concern **Topos**, living in the renderer plus [Praxis](../../05-modules/praxis/README.md) ([DOCUMENTATION-STANDARD.md §10](../../02-standards/DOCUMENTATION-STANDARD.md)). Layout _computation_ (ELK) sits with Praxis; canvas _presentation_ (pan, zoom, framing, minimap, rendering) is the renderer side. A surface asks Topos for an automatic layout rather than inventing positions; a free-form arrangement the user drags is their authored arrangement. The name **Topos** is used deliberately for this concern.

## Direct manipulation

The canvas lets users act on objects directly where direct action is genuinely faster than a remote form: moving, connecting, grouping, annotating, resizing, and laying out feel local to the object changed. That does not remove the need for precise controls — keyboard alternatives, context menus, inspectors, and explicit commands still matter, because expert users often need exactness more than gestural freedom ([interaction-model.md](./interaction-model.md)).

## Selection and state

Canvas states — selected, focused, locked, invalid, grouped, connected, hovered — need consistent presentation; the user **must not** have to interpret state from tiny variations in shadow, colour, or motion. The surface needs a clear grammar of state, supplied by the canvas blocks ([design-system/canvas-and-graph.md](../design-system/canvas-and-graph.md)). Selection drives inspector content and contextual commands; focus drives keyboard action; the two are never collapsed ([interaction-model.md](./interaction-model.md)).

## Navigation, layout, and bounded views

Pan and zoom stay stable enough that users keep orientation in larger graphs. Search, minimaps, framing actions, and layout helpers reduce the cost of getting lost; they are not an excuse for an unreadable default view. Large graphs need bounded rendering and honest warning language: if the surface shows a partial view, truncates detail, or simplifies relationships for performance, it **must** say so with a partial-result treatment ([design-system/honest-state-treatments.md](../design-system/honest-state-treatments.md)) — the §9 Partial/Bounded state ([DOCUMENTATION-STANDARD.md §9](../../02-standards/DOCUMENTATION-STANDARD.md)). False completeness is worse than visible limitation.

## Inspector relationship

The inspector feels attached to the current object, not like a second application beside the canvas. Selecting a node reframes the inspector around that node's properties, relationships, and valid actions, so the user reads the canvas and inspector as one conversation. The inspector is also the right place for structured edits that would be awkward or risky to perform directly ([interaction-model.md](./interaction-model.md)).

## Accessibility

The canvas needs an explicit keyboard model: move selection, inspect objects, discover relationships, and invoke key actions without the pointer. Assistive-technology users need object names, types, states, and relationship cues clear enough to build a mental model. A concrete APG-grid-style keyboard design for the canvas is an open follow-up ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md), [design-system/accessibility.md](../design-system/accessibility.md)); treat full canvas keyboard navigation as **design intent** until it lands.

## Content rules

Object labels, connection labels, warnings, and inspector headings use stable domain language ([CONTEXT.md](../../../CONTEXT.md)), not local shorthand. If the surface is bounded, filtered, or partially rendered, the warning text says so plainly and early.

## Worked example

A user opens an application-dependency map. The surface requests a Topos layered layout (Praxis side) and renders it; each node carries its content classification — an Inferred criticality shows the `inferred` treatment ([design-system/honest-state-treatments.md](../design-system/honest-state-treatments.md)). The graph is capped at 500 nodes, so a partial-result banner states the bound. The user selects a node; the inspector reframes around its relationships; selection and focus stay visually distinct.

## References & standards

_Informative:_

- Eclipse Layout Kernel (**ELK**). The auto-layout behind Topos.

## Related documents

| Document                                                                      | What it covers                                         |
| ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| [design-system/canvas-and-graph.md](../design-system/canvas-and-graph.md)     | XYFlow integration, Topos, styling conformance.        |
| [Praxis](../../05-modules/praxis/README.md)                                   | The meaning engine hosting the Topos computation side. |
| [DOCUMENTATION-STANDARD.md §10](../../02-standards/DOCUMENTATION-STANDARD.md) | Topos as the folded cartography/auto-layout concern.   |
| [interaction-model.md](./interaction-model.md)                                | Direct manipulation, focus, and selection.             |
