# ADR-0004: Adopt shadcn/ui + React Flow UI Registry for the Design System

- Status: Accepted
- Date: 2025-11-17
- Related: `ADR-0001-tauri-host-migration.md`, `0003-adapter-boundaries.md`

## Context

Praxis Desktop is migrating from a legacy Svelte renderer to a React/Tauri canvas runtime. We need a
design system that:

- Works well with React and the Tauri webview.
- Provides accessible, composable primitives without locking us into a proprietary theming engine.
- Plays nicely with a node-based canvas (React Flow / XYFlow).

We evaluated:

- Rolling our own component library on top of Radix and Tailwind.
- Using a heavier React UI kit with its own design language.
- Using shadcn/ui as copy-in components plus the React Flow UI registry for canvas affordances.

## Decision

Adopt **shadcn/ui** as the base React component set and the **React Flow UI registry** for canvas
elements, packaged as a dedicated design system module under `app/AideonDesktop/src/design-system`:

- `app/AideonDesktop/src/design-system` becomes the **single source of truth** for React primitives, blocks, and
  tokens.
- Generated components live in `src/components/ui` (shadcn + React Flow); they are treated as
  read-only and refreshed via `components.json` and the `components:refresh` script.
- All consumers (Praxis Canvas, future React apps) import from
  `@aideon/design-system/*` instead of talking to shadcn/React Flow directly.
- Higher-level blocks (`Panel`, `Sidebar`, `Toolbar`, `Modal`, canvas node wrappers, etc.) live in
  `src/blocks` and `src/reactflow`.

## Rationale

- **Stability and flexibility:** shadcn/ui gives us copy-in components that we control while staying
  close to upstream. React Flow UI registry provides battle-tested canvas affordances.
- **Single design system:** centralising primitives in `app/AideonDesktop/src/design-system` avoids divergence
  between Praxis Canvas and other React surfaces.
- **Refactor-friendly:** by treating generated components as read-only and wrapping them in blocks,
  we can refresh or swap primitives with minimal impact on feature code.

## Consequences

- All React renderers must depend on `@aideon/design-system` rather than importing UI libraries
  ad-hoc.
- Tailwind configuration and CSS tokens are maintained in the design system; other apps include
  `styles/globals.css` instead of defining their own token sets.
- Design changes flow through the design system first; downstream renderers should avoid forking
  primitives.

## References

- `docs/design-system.md` – structure and usage of `app/AideonDesktop/src/design-system`
- `docs/UX-DESIGN.md` – UX goals and layout principles
- `app/AideonDesktop/src/design-system/DESIGN.md` – internal design of the design system module
