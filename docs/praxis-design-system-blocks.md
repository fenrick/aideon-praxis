# Praxis Canvas – Design System Block Audit

Date: 2025-11-15

Purpose: capture the React/shadcn building blocks currently in `app/PraxisCanvas`, confirm
they stay on vanilla shadcn primitives (default theme), and highlight any follow-ups needed to
stay aligned with the UX ground rules.

## Compliance summary

- Direct `@radix-ui/*` imports only appear inside `app/PraxisCanvas/src/components/ui` wrappers
  (`button`, `select`, `dialog`, `command`). Feature components exclusively consume these wrappers
  plus Tailwind tokens, so we can swap upstream shadcn updates without touching app code.
- Dashboard cards (`Card`, `Button`, `Select`) all import from `@/components/ui`; none re-style the
  primitives beyond Tailwind utilities scoped to the block, as required by the UX doc.
- The new `TemporalCommandMenu` composes shadcn’s default Command/Dialog blocks directly, exposing
  a Praxis-specific API while leaving cmdk styles untouched.

## Block inventory

| Block               | File                                                                         | shadcn primitives                     | Status                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Time cursor         | `app/PraxisCanvas/src/components/dashboard/time-cursor-card.tsx`             | `Card`, `Button`, `Select`            | Uses vanilla primitives; promote into a named block when time controls expand beyond card usage.                                          |
| Commit timeline     | `.../commit-timeline-card.tsx`                                               | `Card`, `Button`                      | Compliant; future enhancement is to extract branch pills into a reusable `BranchPillList` block.                                          |
| Command palette     | `.../global-search-card.tsx` + `components/blocks/temporal-command-menu.tsx` | `Card`, `Button`, `Command`, `Dialog` | New block built atop shadcn Command/Dialog with no custom theme overrides.                                                                |
| Canvas runtime      | `.../canvas-runtime-card.tsx`                                                | `Card`, `Button`, tables              | Uses shared `Card`/`Table` primitives; no direct Radix usage.                                                                             |
| Selection inspector | `.../selection-inspector-card.tsx`                                           | `Card`, `Table`, `Button`             | All UI primitives imported from `/ui`; consistent tokens.                                                                                 |
| Worker health       | `.../worker-health-card.tsx`                                                 | `Card`, `Badge` (Tailwind)            | No Radix usage; keep watch for future Toast integrations.                                                                                 |
| Sidebar shell       | `app/PraxisCanvas/src/components/app-sidebar.tsx`                            | `Button`                              | Conforms to Tailwind + token rules; currently a bespoke component that can be promoted to a “Sidebar block” when navigation wiring lands. |

## Follow-ups

1. Extract the time controls into `components/blocks/time-control-panel.tsx` so both the dashboard
   card and future toolbar replacement can share the UI state machine.
2. Build a catalogue/meta-model search provider so the command palette mirrors the legacy
   `searchStore` coverage described in the UX guide.
3. Document token usage per block (primary/muted) once the design system exposes formal tokens.
