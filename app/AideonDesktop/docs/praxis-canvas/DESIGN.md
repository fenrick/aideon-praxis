# Praxis Canvas – Internal Design

## Overview

Praxis Canvas is the React-based renderer for the Aideon Praxis desktop module. It hosts the
workspace shell (canvas, sidebar, dashboards) and projects the time-first digital twin into widgets
such as graph, catalogue, matrix, and timeline views.

The primary export is `PraxisCanvasSurface`, a chrome-free surface intended to live inside the
Aideon Desktop shell. The legacy `LegacyPraxisCanvasApp` keeps the old header/sidebar for standalone
routes and should be considered transitional.

## Internal structure

- React application entry that mounts the canvas shell inside the Tauri window.
- Layout components for sidebar, main canvas, and dashboard cards.
- State management for selection, filters, time cursor, and active template.
- Integration points to Aideon Design System blocks and React Flow-based canvas primitives.
- Surface component (`PraxisCanvasSurface`) renders only the workspace content; host shells provide
  outer chrome (toolbar/sidebar/properties).

## Selection contract

- `PraxisCanvasSurface` accepts an optional `onSelectionChange` callback. The surface emits the
  current `SelectionState` whenever it changes so host shells (e.g., Aideon Desktop) can render
  properties panels.

## Time-first canvas behaviour

- Geometry persists per `asOf` (and optional `scenario`) via host IPC; renderer respects saved positions and only re-runs layout on demand.
- Auto-layout is user-triggered; default layout uses React Flow/ELK-compatible routines but must not override existing coordinates unless explicitly requested.
- Save/load flows go through typed adapters; no renderer-side storage beyond UI state.

## Data model and APIs

- Consumes DTOs from `src/dtos` (temporal snapshots/diffs, meta-model documents, job DTOs).
- Talks to the host exclusively via adapters defined in `src/adapters`.
- Treats the digital twin as read/write projections only; no private data store beyond UI state.

## Interactions

- Renderer ↔ Host: IPC commands exposed by Praxis Host (see `Architecture-Boundary.md`).
- Renderer ↔ Engines: indirect, via host commands (no direct engine or DB access).
- Renderer ↔ Design system: components and tokens from `app/AideonDesktop/src/design-system`.

## UI patterns (golden example)

- **Golden vertical:** Time control + temporal panel + diff widgets (commit timeline, state-at, diff summary) use the current shadcn/React pattern. Use these as the template for new surfaces.
- **State management:** Co-locate state in hooks (`useTemporalPanel`) with return `[state, actions]`; avoid global singletons. Derive UI-ready state from DTOs; keep async side effects inside hooks.
- **Data fetching/IPC:** Use typed functions from `praxis-api.ts` that wrap Tauri IPC with consistent error handling. Keep IPC mapping inside the API layer, not components.
- **Loading/error/empty handling:** Components accept `loading`, `error`, and optional `empty` hints from their hook state and render design-system `Alert`/`Skeleton` patterns. Errors should be human-readable, not raw objects.
- **Composition:** Prefer shadcn blocks (cards, badges, buttons) and design-system primitives; avoid bespoke wrappers. Keep layout simple: card header, body, action row.
- **Testing:** Mirror the golden vertical tests: hook-level tests for state machines; component tests for rendering + interactions; IPC adapters mocked at the boundary.

## Constraints and invariants

- No backend logic or storage access in the renderer; IPC only.
- Twin is the source of truth; React state mirrors but never replaces it.
- Component and state boundaries should make it easy to plug in additional widgets (Chrona/Metis)
  without breaking existing flows.
