# Praxis Design System (legacy) – Aideon Suite module

## Purpose

Praxis Design System contains legacy Svelte-oriented design system components used by the original
Praxis Desktop renderer. It exists to keep the Svelte prototype healthy during the migration to the
React-based Aideon Design System.

## Responsibilities

- Provide Svelte-era UI primitives and tokens for the legacy Svelte renderer.
- Support maintenance-only fixes while the React/Tauri canvas replaces Svelte views.
- Avoid introducing new design patterns that are not reflected in `app/AideonDesignSystem`.

## Relationships

- **Depends on:** Svelte and related UI tooling.
- **Used by:** `app/PraxisDesktop` (legacy Svelte prototype).

## Running and testing

- Build/check (if scripts are defined): `pnpm --filter @aideon/PraxisDesignSystem run build`
- Tests (if present): `pnpm --filter @aideon/PraxisDesignSystem test`

Most day-to-day work should happen in the React-based Aideon Design System instead.

## Design and architecture

New UX and design-system decisions live in `docs/UX-DESIGN.md`, `docs/design-system.md`, and
`docs/adr/0004-design-system-shadcn-reactflow.md`. This package is legacy; use it as a reference
only and prefer Aideon Design System for new work.
