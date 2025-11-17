# Aideon Design System – Aideon Suite module

## Purpose

The Aideon Design System centralises shadcn/ui primitives, React Flow UI registry components, and
Praxis-specific proxy blocks so React-based renderers share a consistent look-and-feel and token
set.

## Responsibilities

- Host vanilla shadcn/ui and React Flow primitives under `src/components/ui` and `src/reactflow`.
- Provide reusable blocks (`Panel`, `Sidebar`, `Toolbar`, `Modal`, etc.) for Praxis Canvas and
  future apps.
- Export a single CSS token source (`src/styles/globals.css`) for colours, spacing, and typography.
- Keep generated primitives refreshable via `components.json` and the `components:refresh` script.

## Relationships

- **Depends on:** shadcn/ui, React Flow UI registry.
- **Used by:** Praxis Canvas (and other future React apps in Aideon Suite).

## Running and testing

- Refresh primitives: `pnpm --filter @aideon/design-system run components:refresh`
- Build (if defined): `pnpm --filter @aideon/design-system run build`
- Tests (if present): `pnpm --filter @aideon/design-system test`

Consumers must import CSS from `@aideon/design-system/styles/globals.css` and point Tailwind
`content` globs at the design-system `src` folder.

## Design and architecture

Structure, refresh workflow, and block layers are described in `docs/design-system.md` and
`app/AideonDesignSystem/DESIGN.md`. The decision to standardise on shadcn/ui + React Flow is
captured in `docs/adr/0004-design-system-shadcn-reactflow.md`.

