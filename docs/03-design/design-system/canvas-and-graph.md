# Canvas and Graph

How the design system wraps the node-graph canvas and keeps its styling conformant. This file is for anyone building a canvas surface or a custom node. The canvas is where Aideon is most likely to become clever at the user's expense ([hig/canvas-and-graph-work.md](../hig/canvas-and-graph-work.md)); the design system's job is to keep it direct, recoverable, and visually part of the product.

---

## The principle

A canvas renders the **effective graph** — the node-and-edge projection of a snapshot ([CONTEXT.md](../../../CONTEXT.md)). Here, and only here, the graph terms **node** and **edge** are correct; in domain prose the terms are entity and relationship. The substrate is **XYFlow** (React Flow), wrapped inside design-system canvas containers and never imported raw by a surface ([ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)).

## The folded concern: Topos

Cartography and auto-layout are a real concern with a name. **Topos** is the folded concern covering cartography and auto-layout/ELK, and it lives in the **renderer plus [Praxis](../../05-modules/praxis/README.md)** ([DOCUMENTATION-STANDARD.md §10](../../02-standards/DOCUMENTATION-STANDARD.md)). It is "folded" because it does not yet earn its own module; ADR-0011 records the trigger that would split it out. The name is kept deliberately — use **Topos** when referring to layout/cartography on the canvas.

The division of labour:

- **Praxis side of Topos** — the layout _computation_: running ELK (the Eclipse Layout Kernel) to assign node positions and edge routes for a given graph and layout intent. This is deterministic and bounded, sitting with the meaning engine.
- **Renderer side of Topos** — the canvas _presentation_: panning, zooming, framing, minimap, selection grammar, and node/edge rendering conforming to tokens. The design-system canvas blocks are the renderer side.

The canvas blocks consume layout from Topos; they do not invent their own positions for a structured layout. A free-form arrangement the user drags is held as their authored arrangement; an automatic layout is a Topos computation.

## The canvas blocks

| Block             | Role                                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CanvasContainer` | The outer bounds, background, and scroll/viewport region wrapping XYFlow.                                                                                                   |
| `CanvasToolbar`   | A local control bar for zoom, fit-to-view, and mode controls — near the surface, not floating in isolation ([hig/shell-and-navigation.md](../hig/shell-and-navigation.md)). |
| `CanvasNode`      | The base node frame whose styling conforms to tokens; custom node _content_ is slotted by the surface.                                                                      |
| `CanvasEdge`      | The base edge whose stroke, label, and marker conform to tokens.                                                                                                            |
| `CanvasMinimap`   | Orientation aid for large graphs.                                                                                                                                           |

## Styling conformance

Node and edge styling **must** conform to design-system tokens; a custom node may not introduce a raw colour, radius, or shadow ([tokens.md](./tokens.md)):

- **Surface and border** from `color.surface.*` and `color.border.*`; radius from `radius.surface`; depth from `elevation.*`, restrained ([density-and-calm.md](./density-and-calm.md)).
- **Selection, hover, and focus** use the same interaction-state tokens as every other control ([interaction-states.md](./interaction-states.md)) — selection is not a bespoke canvas glow.
- **Content classification** on a node or edge uses the provenance treatment, including the greyscale obligation ([honest-state-treatments.md](./honest-state-treatments.md)) — a Generated node is marked the same way a Generated cell is.
- **State grammar.** Selected, focused, locked, invalid, grouped, connected, and hovered each have a consistent, token-backed treatment; the user must not have to infer state from tiny variations in shadow or motion ([hig/canvas-and-graph-work.md](../hig/canvas-and-graph-work.md)). A custom node slots its _content_; the frame supplies the _state_.

## Bounded rendering and honesty

Large graphs need bounded rendering and honest warning language. When the canvas shows a partial view, truncates detail, or simplifies relationships for performance, it **must** say so with a `PartialBanner` ([honest-state-treatments.md](./honest-state-treatments.md)); false completeness is worse than visible limitation ([hig/canvas-and-graph-work.md](../hig/canvas-and-graph-work.md)). The bound is the §9 Partial/Bounded result state ([DOCUMENTATION-STANDARD.md §9](../../02-standards/DOCUMENTATION-STANDARD.md)).

## Keyboard model

The canvas needs an explicit keyboard model: move selection, inspect a node, discover its relationships, and invoke key actions without a pointer ([hig/canvas-and-graph-work.md](../hig/canvas-and-graph-work.md)). A concrete APG-grid-style keyboard design for the canvas is an open follow-up ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md), [accessibility.md](./accessibility.md)); until it lands, treat canvas keyboard navigation as **design intent**.

## Worked example

A surface renders an application-dependency effective graph. It asks Topos (Praxis side) for an ELK layered layout; the positions come back; `CanvasContainer` renders them, each application as a `CanvasNode` whose content the surface slots and whose frame draws from `color.surface.raised` and `radius.surface`. A node carrying an inferred criticality shows the `inferred` provenance treatment ([honest-state-treatments.md](./honest-state-treatments.md)). The graph is capped at 500 nodes for performance, so a `PartialBanner` states the bound. Selecting a node reframes the inspector around it ([hig/canvas-and-graph-work.md](../hig/canvas-and-graph-work.md)); selection uses the standard interaction tokens, not a canvas-only glow.

## References & standards

_Informative:_

- Eclipse Layout Kernel (**ELK**). The auto-layout engine behind the Topos computation side.

## Related documents

| Document                                                                                    | What it covers                                              |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [DOCUMENTATION-STANDARD.md §10](../../02-standards/DOCUMENTATION-STANDARD.md)               | Topos as the folded cartography/auto-layout concern.        |
| [Praxis](../../05-modules/praxis/README.md)                                                 | The meaning engine that hosts the Topos computation side.   |
| [tokens.md](./tokens.md)                                                                    | The tokens node and edge styling must conform to.           |
| [honest-state-treatments.md](./honest-state-treatments.md)                                  | The provenance and bounded-result treatments on the canvas. |
| [hig/canvas-and-graph-work.md](../hig/canvas-and-graph-work.md)                             | The canvas interaction guidance.                            |
| [ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md) | XYFlow wrapped behind the proxy boundary.                   |
