# Praxis Workspace

The renderer's primary modelling surface, facing [Praxis](../../05-modules/praxis/README.md). This is the workspace where a user reads and authors the time-first twin: a graph canvas, a catalogue, a matrix, a map, and a selection-driven inspector, all framed by the one shell ([shell.md](../shell.md)) and read at an explicit viewpoint.

This README is the contract; [DESIGN.md](./DESIGN.md) carries the component, state, and interaction detail.

## What it provides

- The four shell slots — `PraxisWorkspaceNavigation`, `PraxisWorkspaceToolbar`, `PraxisWorkspaceContent`, `PraxisWorkspaceInspector` — plus a chrome-free `PraxisWorkspaceSurface` for tests and previews.
- Artefact widgets over the twin: graph canvas (the **Topos** canvas, [DESIGN.md](./DESIGN.md)), catalogue, matrix, map, and timeline.
- The selection contract that drives the inspector and the shared viewpoint controls ([chrona-time](../chrona-time/README.md)).
- Time-first canvas behaviour: layout geometry persisted per viewpoint and re-run only on demand.

## Faces

[Praxis](../../05-modules/praxis/README.md) — the meaning engine: metamodel, types, edge catalogue, artefact execution, integrity scoring, and the Topos layout computation. The renderer reads projections and artefact results and dispatches operations as commands; it executes no meaning logic itself.

## State ownership

`PraxisWorkspaceProvider` owns the module's state once; the four slots consume it ([state-architecture.md](../state-architecture.md)). Server-state (graph slices, artefact results) is a viewpoint-keyed cache ([data-fetching.md](../data-fetching.md)); selection, time cursor, filters, and active template are UI-state; canvas layout snapshots are persisted through host commands keyed by viewpoint.

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
| [Praxis](../../05-modules/praxis/README.md)                              | The module this surface faces.                           |
| [chrona-time](../chrona-time/README.md)                                  | The shared viewpoint controls this surface adopts.       |
| [shell.md](../shell.md)                                                  | The shell contract the four slots fill.                  |
| [canvas-and-graph.md](../../03-design/design-system/canvas-and-graph.md) | The Topos canvas blocks and styling conformance.         |
