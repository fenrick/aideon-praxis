# Praxis Canvas – Design System Block Audit

Date: 2025-11-16

Purpose: capture the layered blocks that now live in `app/AideonDesignSystem`, confirm Praxis
Canvas consumes them without forking vanilla shadcn/reactflow components, and highlight the gaps
left in the Svelte → React migration.

## Compliance summary

- All shadcn/ui and React Flow UI primitives sit inside `app/AideonDesignSystem/src/ui` or
  `src/reactflow`; the only `@radix-ui/*` imports in the workspace reside there. Refreshing _all_
  primitives is a single command scoped to the package:
  `pnpm --filter @aideon/design-system run components:refresh` (pulls shadcn defaults plus the
  React Flow UI registry entries such as `@reactflow/base-node`, `@reactflow/node-tooltip`,
  `@reactflow/node-search`, `@reactflow/animated-svg-edge`).
- `components.json` in the design-system package tracks both registries (shadcn default + React Flow)
  so we can add future sources without touching app bundles. No renderer edits are required when the
  registries are refreshed.
- Vanilla-first blocks now live under `app/AideonDesignSystem/src/blocks` (panel, toolbar, sidebar,
  modal). They proxy the primitives so UX surfaces (forms, toolbars, modals, sidebars) can be
  assembled from consistent Lego pieces while keeping upstream code refreshable.
- Praxis Canvas imports everything through `@aideon/design-system`. Example: the
  `TimeControlPanel` block now uses `Panel`, `PanelField`, and `PanelToolbar` rather than pulling
  shadcn cards directly, proving the proxy layer is working.
- React Flow canvas nodes/edges (`PraxisNode`, `TimelineEdge`, `NodeSearchDialog`) are defined in the
  design system package and consume the vanilla React Flow UI exports untouched; Praxis-specific
  styling/tokens happen only in the proxy wrappers.

## Block inventory

### Shared design-system blocks

| Block                                                                                                                | File                                            | Built from                                 | Notes                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panel stack (`Panel`, `PanelHeader`, `PanelTitle`, `PanelDescription`, `PanelContent`, `PanelField`, `PanelToolbar`) | `app/AideonDesignSystem/src/blocks/panel.tsx`   | shadcn `Card` primitives + Tailwind tokens | Canonical form block for cards, inspectors, and control panels. `TimeControlPanel` is the first adopter; roadmap is to migrate the remaining dashboard cards and inspector views. |
| Modal shell (`Modal`, `ModalContent`, `ModalHeader`, `ModalTitle`, `ModalDescription`, `ModalFooter`)                | `app/AideonDesignSystem/src/blocks/modal.tsx`   | shadcn `Dialog` primitives                 | Provides default padding/radius for dialogs so command palette, exports, and confirmation prompts stay consistent. Ready for adoption as command/search modals are refreshed.     |
| Toolbar (`Toolbar`, `ToolbarSection`, `ToolbarSeparator`)                                                            | `app/AideonDesignSystem/src/blocks/toolbar.tsx` | Tailwind layout + shadcn tokens            | Used for future canvas/tool controls; aligns with UX ask for vanilla shadcn blocks assembled into reusable toolbars. Pending wiring into the React shell toolbar.                 |
| Sidebar (`SidebarShell`, `SidebarSection`, `SidebarHeading`, `SidebarNav`)                                           | `app/AideonDesignSystem/src/blocks/sidebar.tsx` | Semantic `aside` + shadcn tokens           | Provides the baseline for navigation and catalog inspectors; will replace the bespoke sidebar in Praxis Canvas once search wiring lands.                                          |

### Praxis Canvas adoption snapshot

| Surface                                                                              | Consumed blocks                                                         | Status                                                                                             |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Time control panel (`app/PraxisCanvas/src/components/blocks/time-control-panel.tsx`) | `Panel`, `PanelField`, `PanelToolbar`, shadcn `Select`/`Slider` proxies | ✅ Migrated to the shared panel block; demonstrates field + helper usage and action toolbar.       |
| Command palette (`components/blocks/temporal-command-menu.tsx`)                      | `Modal` (planned), shadcn `Command`                                     | ⏳ Next step is to swap in `Modal` wrappers so dialogs inherit the shared chrome.                  |
| Sidebar shell (`components/app-sidebar.tsx`)                                         | `SidebarShell`, `SidebarHeading` (planned)                              | ⏳ Currently bespoke; target is to adopt the sidebar block once search shortcuts port from Svelte. |
| Canvas toolbar + widget toolbars                                                     | `Toolbar`, `ToolbarSection` (planned)                                   | ⏳ Will replace bespoke flex rows as soon as timeline/activity tabs move to React.                 |
| React Flow nodes/edges                                                               | `PraxisNode`, `TimelineEdge`, `NodeSearchDialog` from design system     | ✅ Already consuming vanilla React Flow UI registry components via proxies.                        |

## Follow-ups

1. Convert the remaining dashboard cards (`commit-timeline`, `worker-health`, `selection-inspector`,
   etc.) to the shared `Panel` stack so future apps get the same block palette.
2. Switch the command palette + context modals to the `Modal` shell and move the React sidebar onto
   the `Sidebar` block before removing the Svelte renderer.
3. Track adoption progress directly in this doc (per component) and link each migration back to
   `docs/praxis-desktop-svelte-migration.md`, especially for the helper windows/workspace tabs, so we know when those Svelte entries can finally flip to “Replaced in React.”
