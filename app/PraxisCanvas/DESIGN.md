# Praxis Canvas – Internal Design

## Overview

Praxis Canvas is the React-based renderer for the Aideon Praxis desktop module. It hosts the
workspace shell (canvas, sidebar, dashboards) and projects the time-first digital twin into widgets
such as graph, catalogue, matrix, and timeline views.

## Internal structure

- React application entry that mounts the canvas shell inside the Tauri window.
- Layout components for sidebar, main canvas, and dashboard cards.
- State management for selection, filters, time cursor, and active template.
- Integration points to Aideon Design System blocks and React Flow-based canvas primitives.

## Data model and APIs

- Consumes DTOs from `@aideon/PraxisDtos` (temporal snapshots/diffs, meta-model documents, job DTOs).
- Talks to the host exclusively via adapters defined in `@aideon/PraxisAdapters`.
- Treats the digital twin as read/write projections only; no private data store beyond UI state.

## Interactions

- Renderer ↔ Host: IPC commands exposed by Praxis Host (see `Architecture-Boundary.md`).
- Renderer ↔ Engines: indirect, via host commands (no direct engine or DB access).
- Renderer ↔ Design system: components and tokens from `app/AideonDesignSystem`.

## Constraints and invariants

- No backend logic or storage access in the renderer; IPC only.
- Twin is the source of truth; React state mirrors but never replaces it.
- Component and state boundaries should make it easy to plug in additional widgets (Chrona/Metis)
  without breaking existing flows.
