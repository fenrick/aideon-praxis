# Praxis Desktop – Svelte → React Migration Tracker

The React/shadcn canvas in `app/PraxisCanvas` now delivers the primary shell (sidebar, canvas, catalogue/matrix/chart widgets, templates), but the legacy SvelteKit renderer under `app/PraxisDesktop` is still bundled. This doc captures the remaining Svelte surface area and the steps required to fully replace it with the React runtime specified in the implementation guide.

## Current Svelte footprint

| Area                                                       | Svelte files                                                                        | Status in React runtime                                                                                                                                                                                                                            |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **App shell & navigation**                                 | `routes/+page.svelte`, `lib/components/{Sidebar,Toolbar,StatusBar,Titlebar}.svelte` | React now has `AppSidebar`, `ShellHeader`, shadcn-based cards, and the new `TimeCursorCard` (Select controls powered by `@radix-ui/react-select`). Status bar messaging is still Svelte-only, but branch/commit selection has a React replacement. |
| **Workspace views** (overview, timeline, canvas, activity) | `MainView.svelte` (+ helpers) orchestrates tabs + ELK canvas + activity feed        | React `CanvasRuntime` covers the canvas tab (graph/catalogue/matrix/chart widgets). Timeline/activity/overview panels not yet ported.                                                                                                              |
| **Catalogues & meta-model**                                | `MetaModelPanel.svelte`, catalogue lists via `CatalogEntitySummary`                 | React shows catalogue widgets but lacks the rich meta-model reference and catalogue selection sidebar.                                                                                                                                             |
| **Search & sidebar wiring**                                | `Sidebar.svelte`, `searchStore` integration from `+page.svelte`                     | React sidebar is static; no global search/filter yet.                                                                                                                                                                                              |
| **Styleguide & theming**                                   | `routes/styleguide/*`, `@aideon/PraxisDesignSystem` usage                           | React uses shadcn/ui + Tailwind but doesn’t yet replicate dark/light auto detection, OS previews, or the styleguide sandbox.                                                                                                                       |
| **Worker/time controls**                                   | `timeStore`, toolbar actions (branch select, commit select, merge)                  | React dashboard cards call `praxisApi` but don’t expose time cursor controls yet.                                                                                                                                                                  |

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
- Keep lint/type/test clean (`pnpm run node:lint`, `pnpm --filter @aideon/PraxisCanvas run typecheck`, `pnpm run node:test`) before each chunked commit.

This tracker should evolve as we knock off sections; once every row in the table reads “Replaced in React”, we can safely delete `app/PraxisDesktop` and declare the migration complete.
