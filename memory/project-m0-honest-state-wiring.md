---
name: project-m0-honest-state-wiring
description: 'M0 honest-state wiring — what was done, what was reverted, which issues are closed, which were reopened'
metadata:
  type: project
  originSessionId: c69086b7-fb2c-4f96-9f0a-11b322b42668
---

## Status after 2026-06-29 cleanup

All legacy screen-level components deleted (`src/engines/praxis/components/`). Work originally done against those
components was partially correct at the design-system block level but cannot count for surface-level requirements until
canonical surfaces are built.

## Design-system blocks — DONE (blocks exist and are correct)

`ErrorFrame`, `EmptyState`, `PartialBanner`, `StaleBadge`, `RebuildingIndicator`, `Skeleton` all exist in
`src/design-system/blocks/`.

Issues closed and staying closed:

- #689 — every block ships loading/error/empty variants
- #693 — Skeleton block
- #700 — EmptyState block
- #705 — ErrorFrame block
- #713 — PartialBanner block

## Architecture verifications — DONE (hold regardless of surfaces)

- #751 — mutations via IPC commands, no in-place cache edits
- #758 — UI-state local to owning hook

## Surface-level requirements — REOPENED (canonical surfaces not yet built)

- **#683** — Canvas must declare PartialBanner for partial views → blocked on `PraxisCanvasSurface`
- **#722** — Renderer must not fake state → must be verified on new platform surfaces
- **#730** — Loading must not block whole workspace → pane-level isolation requires surfaces

## What was deleted (2026-06-29)

- `src/engines/praxis/components/` — all 56 files (template-screen, canvas, chrome, dashboard, shell, blocks,
  debug-overlay)
- `tests/praxis/components/` — all 25 legacy component test files

## What survives

- `src/engines/praxis/engine.tsx` — EngineDefinition (canonical)
- `src/engines/praxis/widgets/` — graph, catalogue, matrix, chart widgets (canonical)
- `src/engines/praxis/stores/`, `hooks/`, `time/`, `layouts/`, `lib/` — engine hooks
- `SelectionKind` moved to `praxis/types` where it belongs
- `platform-navigation.tsx` — engine rail intact; scenarios sidebar is a stub
- `platform-surfaces.tsx` — PlatformToolbar/Content/Inspector are stubs

## Why deleted

PraxisCanvasWorkspace and the template-screen pattern had no design-doc backing. The canonical canvas surface is
`PraxisCanvasSurface` (specified in `docs/frontend/praxis-workspace/DESIGN.md`) but not yet built. All new surfaces must
be built from the design-system layer per `docs/frontend/praxis-workspace/DESIGN.md` and `docs/frontend/shell.md`.
