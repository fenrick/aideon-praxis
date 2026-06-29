# Praxis contributions

The renderer's primary modelling engine, facing [Praxis](../../05-modules/praxis/README.md). This is where a user reads and authors the time-first twin: a graph canvas, a catalogue, a matrix, and a chart, all framed by the one shell ([shell.md](../shell.md)) and read at an explicit viewpoint. Praxis is the only engine registered in the platform today (`PRAXIS_ENGINE`, `src/engines/praxis/engine.tsx`); it contributes widgets that the platform renders into the shared content surface, and it owns no shell chrome of its own.

This README is the contract; [DESIGN.md](./DESIGN.md) carries the component, state, canvas, and interaction detail.

## Naming rule

A module may own contributions, adapters, DTOs, widgets, commands, and engine logic. It does not own a workspace, toolbar, inspector, navigation region, or shell surface. The rename pattern:

| Old (wrong)             | New (correct)                                        |
| ----------------------- | ---------------------------------------------------- |
| `<Module>Workspace`     | `<Module>Contributions` or `<ProductSurface>Surface` |
| `<Module>Toolbar`       | `<Module>ToolbarContribution`                        |
| `<Module>CanvasSurface` | `<Concern>CanvasSurface` (e.g. `ToposCanvasSurface`) |

Praxis `Praxis*` names are valid for anything that genuinely faces the meaning engine: `PraxisGraphWidget`, `PraxisAdapter`, `PraxisDTOs`, `PraxisArtefactExecution`. The product surface is **Modelling studio** (`ModellingStudioSurface`), not Praxis; the canvas concern is **Topos** (`ToposCanvasSurface`), not Praxis.

## What it provides

- An `EngineDefinition` (`src/engines/praxis/engine.tsx`) contributing the widgets the platform renders into the shared content surface: **graph** (the **Topos** canvas, [DESIGN.md](./DESIGN.md)), **catalogue**, **matrix**, and **chart**.
- A `renderWidget(widget, context)` dispatcher the platform's widget catalogue routes to ([shell.md](../shell.md)).
- The toolbar content the platform's `PlatformToolbar` renders — layout-preset and temporal controls (`PraxisToolbarContribution`) — beside the shared viewpoint controls ([chrona-time](../chrona-time/README.md)).
- The selection contract that drives the platform inspector.
- A chrome-free `ToposCanvasSurface` for tests and previews.
- Time-first canvas behaviour: layout geometry persisted per viewpoint and re-run only on demand.

## Faces

[Praxis](../../05-modules/praxis/README.md) — the meaning engine: metamodel, types, edge catalogue, artefact execution, integrity scoring, and the Topos layout computation. The renderer reads projections and artefact results and dispatches operations as commands; it executes no meaning logic itself.

## State ownership

The platform owns the single shared state provider, `HostPlatformProvider` / `useHostPlatform()` ([state-architecture.md](../state-architecture.md)); the engine's widgets consume it rather than owning their own provider. Server-state (graph slices, artefact results) is a viewpoint-keyed cache ([data-fetching.md](../data-fetching.md)); selection, time cursor, filters, and active template flow through the platform state; canvas layout snapshots are persisted through host commands keyed by `surface_id + surface_instance/destination + layout_preset` — **not** the viewpoint (a scenario/time switch changes the data, never the arrangement; see [DESIGN.md](./DESIGN.md)).

## Boundaries

- Typed IPC only, through `src/adapters`; no renderer HTTP, no TCP listener, no raw path access ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).
- The twin is the source of truth; React state mirrors it, never replaces it ([state-architecture.md](../state-architecture.md)).
- Design-system primitives only; XYFlow reached through the canvas blocks, never raw ([ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)).

## Running and testing

- Dev: `pnpm --filter @aideon/desktop run dev`.
- Typecheck: `pnpm --filter @aideon/desktop run typecheck`.
- Tests: `pnpm run node:test` — hook tests for state machines, component tests for rendering and interaction, IPC mocked at the adapter ([testing.md](../testing.md)).

## Related documents

| Document                                                                 | What it covers                                           |
| ------------------------------------------------------------------------ | -------------------------------------------------------- |
| [DESIGN.md](./DESIGN.md)                                                 | The component, state, canvas, and interaction contracts. |
| [Praxis](../../05-modules/praxis/README.md)                              | The engine module these contributions face.              |
| [chrona-time](../chrona-time/README.md)                                  | The shared viewpoint controls this surface adopts.       |
| [shell.md](../shell.md)                                                  | The platform shell and how engines contribute widgets.   |
| [canvas-and-graph.md](../../03-design/design-system/canvas-and-graph.md) | The Topos canvas blocks and styling conformance.         |
