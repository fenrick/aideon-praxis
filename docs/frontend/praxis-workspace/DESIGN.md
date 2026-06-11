# Praxis Workspace — Internal Design

The component, state, canvas, and interaction contracts of the primary modelling surface. This file is for anyone building or reviewing a Praxis workspace surface. The package contract is in [README.md](./README.md).

---

## Components

The workspace exposes four slot components the shell renders ([shell.md](../shell.md)), plus a chrome-free surface for embedding:

| Component                   | Slot         | Owns                                                        |
| --------------------------- | ------------ | ----------------------------------------------------------- |
| `PraxisWorkspaceNavigation` | `navigation` | The projects/scenarios tree                                 |
| `PraxisWorkspaceToolbar`    | `toolbar`    | The workspace toolbar beside the shared viewpoint controls  |
| `PraxisWorkspaceContent`    | `content`    | The active artefact widget (canvas, catalogue, matrix, map) |
| `PraxisWorkspaceInspector`  | `inspector`  | Selection-driven details and edit forms                     |
| `PraxisWorkspaceSurface`    | —            | A chrome-free surface for tests and previews                |

Navigation follows the shadcn sidebar pattern as its base layout — an inset sidebar with a header, a nested rail, a workspace switcher, favourites, a collapsible scenario tree, and a right-side action popover — composed from the design-system `Sidebar` proxy, not bespoke layout ([ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)).

Content widgets prefer design-system blocks and primitives — cards, badges, buttons, the canvas blocks — over bespoke wrappers; the golden vertical (time cursor + artefact widgets) is the template for a new surface ([blocks.md](../../03-design/design-system/blocks.md)).

## State ownership

`PraxisWorkspaceProvider` owns state once; the four slots consume it so state is not duplicated ([state-architecture.md](../state-architecture.md)). The golden pattern is a hook returning `[state, actions]` with async side effects inside the hook (e.g. `useTemporalPanel`); UI-ready state is derived from DTOs and global singletons are avoided.

| State                                            | Kind               | Notes                                                           |
| ------------------------------------------------ | ------------------ | --------------------------------------------------------------- |
| Graph slices, artefact results                   | Server-state       | Viewpoint-keyed cache ([data-fetching.md](../data-fetching.md)) |
| Selection, time cursor, filters, active template | UI-state           | Local, in the provider                                          |
| Canvas layout snapshots                          | Persisted via host | Keyed by viewpoint + `documentId` (below)                       |

## Data fetching keys

Server-state reads key on the surface, the resource, its params, and the full viewpoint ([data-fetching.md](../data-fetching.md)):

```
[ "praxis", "graphSlice", { scope }, viewpoint ]
[ "praxis", "artefactResult", { artefactId }, viewpoint ]
[ "praxis", "metaModel", {}, viewpoint ]
```

Identifiers are real seed ids — a scenario read keys on its scenario id (e.g. `scn_plan_q3`), an artefact on its stable artefact id. Changing the viewpoint changes the key and refetches; a read cached at one viewpoint is never served for another ([ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)).

## The selection contract

`PraxisWorkspaceSurface` accepts an optional `onSelectionChange` callback and emits the current `SelectionState` whenever it changes, so the shell or a test harness can observe selection. Selection is the global driver of the inspector ([ux/selection-model.md](../../03-design/ux/selection-model.md)):

- A single node/edge selection surfaces editable fields in the inspector and dispatches scoped operations (below).
- A multi-select is bulk-only.
- A matrix cell selection emits `SelectionState.cellIds` using the `rowId::columnId` key.

## Topos: the time-first canvas

The canvas renders the **effective graph** — the node-and-edge projection of a snapshot, where the graph terms node and edge are correct ([CONTEXT.md](../../../CONTEXT.md)). Cartography and auto-layout on the canvas are the folded concern **Topos**, living in the renderer plus [Praxis](../../05-modules/praxis/README.md) ([DOCUMENTATION-STANDARD.md §10](../../02-standards/DOCUMENTATION-STANDARD.md), [canvas-and-graph.md](../../03-design/design-system/canvas-and-graph.md)). The division of labour:

- **Praxis side of Topos** — the layout _computation_: running ELK (the Eclipse Layout Kernel) to assign node positions and edge routes for a graph and a layout intent. Deterministic and bounded.
- **Renderer side of Topos** — the canvas _presentation_: panning, zooming, framing, minimap, the selection grammar, and node/edge rendering conforming to tokens. Built on XYFlow (React Flow), wrapped in the design-system canvas blocks and never imported raw ([ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)).

The canvas blocks consume layout from Topos; they do not invent positions for a structured layout. Auto-layout is **user-triggered**: the default layout uses ELK-compatible routines but must not override existing coordinates unless explicitly requested. A free-form arrangement the user drags is held as their authored arrangement; an automatic layout is a Topos computation ([canvas-and-graph.md](../../03-design/design-system/canvas-and-graph.md)).

### Layout persistence keyed by viewpoint

Canvas geometry persists per viewpoint (as-of valid time, layer, optional scenario) through host IPC; the renderer respects saved positions and re-runs layout only on demand. The persistence key is the viewpoint plus a stable `documentId` carried by the canvas template — distinct from the template `id`. The renderer **must not** infer document identity from the active template id, and a layer switch updates any persistence key that includes layer ([chrona-time](../chrona-time/README.md)). Templates are persisted by the host (`workspace_templates_list` / `workspace_templates_save`) and rehydrated by the renderer; the host seeds default templates on first run so the workspace always has initial artefacts to render.

### Canvas honest state and accessibility

A bounded or simplified canvas view shows a `PartialBanner` stating the bound ([error-loading-empty.md](../error-loading-empty.md)); a node carrying Inferred or Generated content shows the provenance treatment, the same way a Generated cell is marked ([honest-state-treatments.md](../../03-design/design-system/honest-state-treatments.md)). Selection, hover, and focus use the shared interaction tokens, not a canvas-only glow ([interaction-states.md](../../03-design/design-system/interaction-states.md)). The canvas keyboard model — move selection, inspect, discover relationships, invoke actions — is **design intent** pending an APG-grid-style design ([accessibility.md](../accessibility.md), [ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)).

## Inspector edits

A single node/edge selection surfaces editable fields built from the effective schema (`MetaModelProvider`, [praxis-adapters](../praxis-adapters/README.md)) and dispatches `praxis_task_apply_operations` updates scoped to the active scenario branch ([editing-flow.md](../../03-design/ux/editing-flow.md)). Edits are commands, never in-place cache edits ([state-architecture.md](../state-architecture.md)); a multi-select remains bulk-only.

## Loading, error, empty

Components receive `loading`, `error`, and optional `empty` hints from their hook and render the shared treatments ([error-loading-empty.md](../error-loading-empty.md)): skeletons for loading, an informative empty state, a human-readable error mapped from the envelope with a copy-diagnostics affordance. A loading pane never blanks the whole workspace.

## Testing

Mirror the golden vertical ([testing.md](../testing.md)): hook tests for the selection and time state machines (including viewpoint-change refetch), component tests for rendering and interaction across loading/error/empty/partial states, IPC mocked at the adapter with a stub graph (e.g. `DevelopmentMemoryGraph`, [praxis-adapters](../praxis-adapters/README.md)). The chrome-free `PraxisWorkspaceSurface` is the unit under component test.

## Security invariants

- No renderer HTTP (no `fetch`/`axios`); all privileged actions through host IPC.
- Desktop mode opens no TCP listeners.
- File dialogs and paths come from the host; the renderer treats them as data and never reads arbitrary paths directly.

## Related documents

| Document                                                                     | What it covers                                       |
| ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| [README.md](./README.md)                                                     | The package contract.                                |
| [canvas-and-graph.md](../../03-design/design-system/canvas-and-graph.md)     | The Topos canvas blocks and styling conformance.     |
| [hig/canvas-and-graph-work.md](../../03-design/hig/canvas-and-graph-work.md) | The canvas interaction guidance.                     |
| [ux/selection-model.md](../../03-design/ux/selection-model.md)               | The global selection model the inspector follows.    |
| [chrona-time](../chrona-time/README.md)                                      | The viewpoint controls and layer-switch key rule.    |
| [praxis-adapters](../praxis-adapters/README.md)                              | The graph and metamodel adapters this surface calls. |
