# Praxis Canvas – Design System Block Audit

Date: 2025-11-15

Purpose: capture the React/shadcn building blocks currently in `app/PraxisCanvas`, confirm
they stay on vanilla shadcn primitives (default theme), and highlight any follow-ups needed to
stay aligned with the UX ground rules.

## Compliance summary

- Direct `@radix-ui/*` imports only appear inside `app/PraxisCanvas/src/components/ui` wrappers
  (`button`, `select`, `dialog`, `command`, `slider`). Refreshing them is a single command:
  `pnpm dlx shadcn@latest add button card input select table dialog command slider --overwrite --yes`.
- React Flow UI components (`node-search`) are imported via the same CLI (`pnpm dlx shadcn@latest add https://ui.reactflow.dev/node-search --overwrite --yes`) and wrapped in
  Praxis blocks so they stay vanilla but proxy our tokens.
- Dashboard cards (`Card`, `Button`, `Select`) all import from `@/components/ui`; none re-style the
  primitives beyond Tailwind utilities scoped to the block, as required by the UX doc.
- The new `TemporalCommandMenu` composes shadcn’s default Command/Dialog blocks directly, exposing
  a Praxis-specific API while leaving cmdk styles untouched.

## Block inventory

| Block               | File                                                                         | shadcn primitives                     | Status                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Time control panel  | `app/PraxisCanvas/src/components/blocks/time-control-panel.tsx`             | `Card`, `Button`, `Select`, `Slider` | Extracted from the dashboard card; adds the shadcn Slider timeline plus merge/reload actions for reuse in future toolbar work.            |
| Commit timeline     | `.../commit-timeline-card.tsx`                                               | `Card`, `Button`                      | Compliant; future enhancement is to extract branch pills into a reusable `BranchPillList` block.                                          |
| Command palette     | `.../global-search-card.tsx` + `components/blocks/temporal-command-menu.tsx` | `Card`, `Button`, `Command`, `Dialog` | Uses vanilla shadcn Command/Dialog plus catalogue + meta-model groups; callbacks update local UX instead of forking primitives.          |
| Canvas runtime      | `.../canvas-runtime-card.tsx`                                                | `Card`, `Button`, tables              | Uses shared `Card`/`Table` primitives; no direct Radix usage.                                                                             |
| Selection inspector | `.../selection-inspector-card.tsx`                                           | `Card`, `Table`, `Button`             | All UI primitives imported from `/ui`; consistent tokens.                                                                                 |
| Worker health       | `.../worker-health-card.tsx`                                                 | `Card`, `Badge` (Tailwind)            | No Radix usage; keep watch for future Toast integrations.                                                                                 |
| Sidebar shell       | `app/PraxisCanvas/src/components/app-sidebar.tsx`                            | `Button`                              | Conforms to Tailwind + token rules; currently a bespoke component that can be promoted to a “Sidebar block” when navigation wiring lands. |
| Node search         | `app/PraxisCanvas/src/components/node-search.tsx` + graph widgets            | React Flow UI `NodeSearch` + shadcn   | Imported via React Flow UI registry; the block proxies selection + fitView without mutating upstream styles.                             |

## Follow-ups

1. Promote branch pills (commit timeline) and graph overlays (node search panels) into dedicated
   blocks so timeline/activity parity becomes a drop-in replacement for the Svelte tabs.
2. Pipe catalogue/meta-model selection into the sidebar inspector templates once those panels are
   ported, keeping renderer navigation in sync.
3. Document token usage per block (primary/muted) once the design system exposes formal tokens.
