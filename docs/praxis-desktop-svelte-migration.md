# Praxis Desktop – Svelte → React Migration Tracker

The React/shadcn canvas in `app/PraxisCanvas` now delivers the primary shell (sidebar, canvas, catalogue/matrix/chart widgets, templates), but the legacy SvelteKit renderer under `app/PraxisDesktop` is still bundled. This doc captures the remaining Svelte surface area and the steps required to fully replace it with the React runtime specified in the implementation guide.

## Current Svelte footprint

| Area                                                       | Svelte files                                                                        | React parity status                              | Notes on React runtime                                                                                                                                                                                                                       |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **App shell & navigation**                                 | `routes/+page.svelte`, `lib/components/{Sidebar,Toolbar,StatusBar,Titlebar}.svelte` | Partial — status bar messaging still Svelte-only | React now has `AppSidebar`, `ShellHeader`, shadcn-based cards, and the new `TimeCursorCard` (Select controls powered by `@radix-ui/react-select`). The card handles branch/commit selection, but streaming notifications remain Svelte-only. |
| **Workspace views** (overview, timeline, canvas, activity) | `MainView.svelte` (+ helpers) orchestrates tabs + ELK canvas + activity feed        | Partial — canvas ready, other tabs missing       | React `CanvasRuntime` covers the canvas tab (graph/catalogue/matrix/chart widgets). Timeline/activity/overview panels not yet ported.                                                                                                        |
| **Catalogues & meta-model**                                | `MetaModelPanel.svelte`, catalogue lists via `CatalogEntitySummary`                 | Not started                                      | React shows catalogue widgets but lacks the rich meta-model reference and catalogue selection sidebar.                                                                                                                                       |
| **Search & sidebar wiring**                                | `Sidebar.svelte`, `searchStore` integration from `+page.svelte`                     | Partial — command palette w/ catalogue/meta-model | React sidebar is static, but the dashboard card now exposes a shadcn command palette (⌘K / Ctrl+K) for branches/commits/actions and now includes catalogue + meta-model entries. Sidebar quick search + navigation still exist only in Svelte.                                          |
| **Styleguide & theming**                                   | `routes/styleguide/*`, `@aideon/PraxisDesignSystem` usage                           | Not started                                      | React uses shadcn/ui + Tailwind but doesn’t yet replicate dark/light auto detection, OS previews, or the styleguide sandbox.                                                                                                                 |
| **Worker/time controls**                                   | `timeStore`, toolbar actions (branch select, commit select, merge)                  | Partial — toolbar still Svelte                   | React now owns a TimeControlPanel block (branch/commit selects, slider, merge/reload), but the global toolbar/status surface still lives in Svelte.                                                                                        |

## Review snapshot — 15 Nov 2025

- `app/PraxisCanvas/src/components/blocks/time-control-panel.tsx` now wraps the branch/commit selects, adds a shadcn Slider timeline, and exposes merge/reload actions; `Toolbar.svelte` still handles global status messaging.
- `app/PraxisCanvas/src/components/dashboard/global-search-card.tsx` pulls a real catalogue view + meta-model schema so the command palette can surface those entries alongside branches/commits, but sidebar search shortcuts still depend on the Svelte `searchStore`.
- The React canvas runtime (`app/PraxisCanvas/src/canvas/canvas-runtime.tsx` and the surrounding dashboard card) renders graph, catalogue, matrix, and chart widgets, while timeline/activity/overview tabs remain Svelte-only and still rely on the ELK canvas wiring.
- `app/PraxisCanvas/src/components/app-sidebar.tsx` ships only a static navigation/state summary; there is no command/search flow mirroring Svelte’s `searchStore`, so quick-jump and filtering remain blocked.
- `app/PraxisCanvas/src/components/dashboard/global-search-card.tsx` now wraps shadcn’s command palette block for branch/commit jumps but still lacks catalogue/meta-model search sources.
- Meta-model inspectors (`app/PraxisDesktop/src/lib/components/MetaModelPanel.svelte`) and the styleguide routes continue to be the reference implementations; React lacks equivalent inspectors and theming previews.
- Worker controls such as merge/apply actions are still surfaced via `timeStore` in Svelte, so React must gain parity before `app/PraxisDesktop` can be removed from the Tauri bundle.

## Replacement priorities

1. **Time/Toolbar controls (shadcn Command + Select).** Build a React `TimeControlPanel` that mirrors Svelte’s branch/commit selection and merge actions, wired through `praxisApi` and the host commands. This unblocks removing `Toolbar.svelte` and gets us closer to feature parity.
2. **Workspace tabs as React panels.** Recreate the “timeline”, “activity”, and “overview” tabs using shadcn components (Tabs, Accordion, Card) plus React Flow for graph snapshots. Each tab becomes either a widget or a sidebar panel controlled by the template system.
3. **Sidebar/search integration.** Add a search input (Command menu) that leverages the same data sources Svelte exposes via `searchStore`, allowing users to jump to catalogue/meta-model entries inside the React shell.
4. **Meta-model & catalogue inspectors.** Port `MetaModelPanel` into a React component built from shadcn Table/Accordion primitives so the Svelte reference view is no longer required.
5. **Theme/styleguide parity.** Implement shadcn-driven theme toggles + OS previews (using `@radix-ui/react-select` and `next-themes` equivalent) and expose them under a React “Styleguide” route so `routes/styleguide/*` can be retired.
6. **Dependency removal + build swap.** Once the above are in place, stop launching the Svelte renderer from Tauri, delete `app/PraxisDesktop`, and drop its tests from CI.

## Execution approach

- Track each migration chunk as its own issue/PR (e.g., “feat(canvas): port timeline view to React”) to keep commits reviewable.
- For every Svelte component replaced, add a note in this doc (or an issue checklist) and remove the Svelte file plus related tests.
- Continue leaning on shadcn/ui primitives (Tabs, Command, Dialog, Table, Badge, Tooltip) and React Flow for any graph/canvas work so the React runtime stays consistent with the design brief.
- Keep lint/type/test clean by running `pnpm run ci` (Node + Rust lint, typecheck, tests, and format) before each chunked commit; this satisfies the repository testing strategy without drifting from the host/renderer guardrails.

This tracker should evolve as we knock off sections; once every row in the table reads “Replaced in React”, we can safely delete `app/PraxisDesktop` and declare the migration complete.
