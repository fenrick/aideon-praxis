# Aideon Design System – Internal Design

## Overview

The Aideon Design System centralises UI primitives and blocks for React-based modules. It wraps
shadcn/ui and React Flow UI registry components and exposes a small, opinionated set of blocks and
tokens to keep renderers consistent.

## Internal structure

- `src/components/ui`: generated shadcn/ui and React Flow primitives (treated as read-only).
- `src/ui`: thin wrappers and convenience exports.
- `src/blocks`: higher-level blocks (panel, sidebar, toolbar, modal, etc.).
- `src/reactflow`: React Flow wrapper components for Praxis-specific nodes/edges.
- `src/styles/globals.css`: CSS variables and Tailwind tokens shared by all consumers.

## Data model and APIs

- Exposes React components and CSS only; no business logic or IPC.
- Provides stable import paths such as `@aideon/design-system/ui/button` and
  `@aideon/design-system/blocks/panel`.

## Interactions

- Consumed by Praxis Canvas (and future React apps) as the single source of UI primitives/blocks.
- Refreshed via the `components:refresh` script, which updates generated components in
  `src/components/ui` from `components.json`.

## Constraints and invariants

- Generated components must not be edited directly; all customisation happens in wrappers/blocks.
- Tokens remain centralised in `globals.css` to avoid drift between apps.

