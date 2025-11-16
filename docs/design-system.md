# Aideon Design System

Location: `app/AideonDesignSystem`

## Purpose

Centralize all vanilla shadcn/ui primitives, React Flow UI registry components, and Praxis-specific
proxy blocks so every renderer (Praxis Canvas, legacy desktop, future apps) consumes the same
layered design system.

## Structure

```

The Tailwind tokens now live inside `src/styles.css`; we removed the separate
`tailwind.config.ts`, so the CLI relies purely on that stylesheet instead of a
dedicated config file.
app/AideonDesignSystem/
├── package.json              # workspace: scripts + dependencies
├── components.json           # shadcn + React Flow registry config
├── src/
│   ├── blocks/*              # reusable blocks (panel, toolbar, sidebar, modal)
│   ├── components/ui/*       # shadcn CLI output (raw primitives + registry adapters)
│   ├── hooks/*               # shared hooks (e.g., `useIsMobile`)
│   ├── ui/*                  # wrapped/aggregated exports consumed by renderers
│   ├── reactflow/*           # React Flow UI registry components + Praxis proxies
│   ├── lib/cn.ts             # shared utility helpers
│   ├── styles.css            # base CSS variables (import from consumers plus Tailwind tokens)
│   └── index.ts              # aggregated exports
```

The CLI now targets `src/components/ui` via `components.json`, so treat that folder as
generated output and wrap its primitives inside `src/ui/*` or `src/blocks/*` before shipping.

## Refreshing components

Always run the refresh script inside the design-system package so every consumer stays aligned with
vanilla shadcn/reactflow:

```
pnpm --filter @aideon/design-system run components:refresh
```

This pulls the default shadcn primitives plus the React Flow UI registry entries (Base Node, Node
Tooltip, Node Search, Animated SVG Edge, etc.). Do not edit the generated files directly; wrap them
in proxy components under `src/reactflow` or `src/blocks` if you need design-system behavior.

## Proxy + block layers

- `src/blocks/panel.tsx` exposes the standard card/form stack (`Panel`, `PanelHeader`,
  `PanelField`, `PanelToolbar`) used by Praxis components and future apps.
- `src/blocks/modal.tsx` wraps shadcn `Dialog` so command palette, exports, and confirmations share
  the same chrome.
- `src/blocks/toolbar.tsx` defines toolbar rows/sections/separators for canvas controls.
- `src/blocks/sidebar.tsx` defines the shell/headings/nav sections for inspectors and navigation.
- New block concepts should be added here (forms, toolbars, modals, sidebars, inspectors, etc.) and
  then consumed downstream through `@aideon/design-system/blocks/*`. Keep them vanilla-first (only
  compose the primitives) so refreshing registries remains a one-line command.

## Using the design system

- Add `@aideon/design-system` as a workspace dependency and import via the documented subpaths
  (e.g., `@aideon/design-system/ui/button`, `@aideon/design-system/blocks/panel`,
  `@aideon/design-system/reactflow/praxis-node`).
- Include `@aideon/design-system/styles.css` (or copy its CSS variables) in the renderer’s global CSS
  so the tokens match.
- Tailwind consumers must include `../AideonDesignSystem/src/**/*.{ts,tsx}` in their `content` globs
  so class names from the shared components are discovered.
- Renderer-specific helpers (`@/components/blocks/*`) should depend on the design system instead of
  duplicating shadcn components.
