# Aideon Design System

Location: `app/AideonDesignSystem`

## Purpose

Centralize all vanilla shadcn/ui primitives, React Flow UI registry components, and Praxis-specific
proxy blocks so every renderer (Praxis Canvas, legacy desktop, future apps) consumes the same
layered design system.

## Structure

```
app/AideonDesignSystem/
├── package.json              # workspace: scripts + dependencies
├── components.json           # shadcn + React Flow registry config
├── tailwind.config.ts        # tailwind tokens for components.json / previews
├── src/
│   ├── ui/*                  # vanilla shadcn components, untouched
│   ├── reactflow/*           # React Flow UI registry components + Praxis proxies
│   ├── lib/cn.ts             # shared utility helpers
│   ├── styles.css            # base CSS variables (import from consumers)
│   └── index.ts              # aggregated exports
```

## Refreshing components

Always run the refresh script inside the design-system package so every consumer stays aligned with
vanilla shadcn/reactflow:

```
pnpm --filter @aideon/design-system run components:refresh
```

This pulls the default shadcn primitives plus the React Flow UI registry entries (Base Node, Node
Tooltip, Node Search, Animated SVG Edge, etc.). Do not edit the generated files directly; wrap them
in proxy components under `src/reactflow` or `src/blocks` if you need design-system behavior.

## Using the design system

- Add `@aideon/design-system` as a workspace dependency and import via the documented subpaths
  (e.g., `@aideon/design-system/ui/button`, `@aideon/design-system/reactflow/praxis-node`).
- Include `@aideon/design-system/styles.css` (or copy its CSS variables) in the renderer’s global CSS
  so the tokens match.
- Tailwind consumers must include `../AideonDesignSystem/src/**/*.{ts,tsx}` in their `content` globs
  so class names from the shared components are discovered.
- Renderer-specific helpers (`@/components/blocks/*`) should depend on the design system instead of
  duplicating shadcn components.
