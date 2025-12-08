# Praxis Canvas – Aideon Suite module

_Flatten note: the canvas now lives inside `app/AideonDesktop/src/canvas` alongside the design
system, adapters, and DTOs. Use relative or `src`-rooted imports (no aliases such as
`src/canvas`)._

## Purpose

Praxis Canvas is the React/Tauri canvas shell for the **Aideon Praxis** desktop module. It hosts the
node-based workspace (React Flow + Aideon Design System blocks) and surfaces widgets such as graph,
catalogue, matrix, and timeline views over the time-first digital twin.

## Responsibilities

- Render the main desktop workspace UI (canvas, sidebar, dashboards) for Praxis.
- Manage canvas layout, widget placement, and time/selection state.
- Talk to the Tauri host via typed adapters (`src/adapters` and `src/dtos`).
- Consume shared UI primitives from `app/AideonDesktop/src/design-system` (aliased as
  `src/design-system`).
- Respect renderer boundaries (no direct filesystem/DB access; IPC only).

## Relationships

- **Depends on:** Aideon Design System, Praxis Adapters, Praxis DTOs, Aideon Host IPC.
- **Used by:** Aideon Suite desktop app (Tauri shell via Aideon Host).

## Running and testing

- Dev (canvas shell): `pnpm --filter @aideon/desktop dev`
- Typecheck: `pnpm --filter @aideon/desktop run typecheck`
- JS/TS tests (suite-wide, including canvas): `pnpm run node:test`

For multi-terminal dev workflow, see `docs/getting-started.md`.

## Design and architecture

Praxis Canvas is the primary renderer surface for the digital twin, built on React, React Flow, and
the shared design system. Internal layout, state, and widget composition are described in
`app/PraxisCanvas/DESIGN.md`. Suite-level architecture lives in `Architecture-Boundary.md`.
