# Praxis Canvas – Aideon Suite module

## Purpose

Praxis Canvas is the React/Tauri canvas shell for the **Aideon Praxis** desktop module. It hosts the
node-based workspace (React Flow + Aideon Design System blocks) and surfaces widgets such as graph,
catalogue, matrix, and timeline views over the time-first digital twin.

## Responsibilities

- Render the main desktop workspace UI (canvas, sidebar, dashboards) for Praxis.
- Manage canvas layout, widget placement, and time/selection state.
- Talk to the Tauri host via typed adapters (`@aideon/PraxisAdapters` and `@aideon/PraxisDtos`).
- Consume shared UI primitives from `app/AideonDesignSystem`.
- Respect renderer boundaries (no direct filesystem/DB access; IPC only).

## Relationships

- **Depends on:** Aideon Design System, Praxis Adapters, Praxis DTOs, Praxis Host IPC.
- **Used by:** Aideon Suite desktop app (Tauri shell via Praxis Host).

## Running and testing

- Dev (canvas shell): `pnpm --filter @aideon/PraxisCanvas dev`
- Typecheck: `pnpm --filter @aideon/PraxisCanvas run typecheck`
- JS/TS tests (suite-wide, including canvas): `pnpm run node:test`

For multi-terminal dev workflow, see `docs/getting-started.md`.

## Design and architecture

Praxis Canvas is the primary renderer surface for the digital twin, built on React, React Flow, and
the shared design system. Internal layout, state, and widget composition are described in
`app/PraxisCanvas/DESIGN.md`. Suite-level architecture lives in `Architecture-Boundary.md`.
