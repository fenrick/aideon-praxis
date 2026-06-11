# Design System (renderer-side) — Internal Design

The internal structure of `src/design-system`, its tokens, and its theming. This file is for anyone adding or theming a wrapper. The package contract is in [README.md](./README.md); the visual contract is [03-design/design-system](../../03-design/design-system/README.md).

---

## Scope

The renderer-side design system centralises UI primitives and blocks for the React renderer: it wraps shadcn/ui and the XYFlow registry components behind the proxy boundary and exposes a small, opinionated set of blocks and tokens ([ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)). It lives inside `src/design-system`; import directly from that tree, no package aliases.

## Internal structure

| Path                                   | Holds                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/design-system/components/ui`      | Generated shadcn/ui and XYFlow primitives — treated as read-only                                                                      |
| `src/design-system/ui`                 | Thin wrappers and convenience exports                                                                                                 |
| `src/design-system/blocks`             | Higher-level blocks — panel, sidebar, toolbar, modal, inspector, artefact frames                                                      |
| `src/design-system/components`         | XYFlow node/edge wrappers — the renderer side of **Topos** ([canvas-and-graph.md](../../03-design/design-system/canvas-and-graph.md)) |
| `src/design-system/styles/globals.css` | The generated CSS variables and Tailwind token mappings                                                                               |

Generated components are not edited directly; all customisation happens in wrappers and blocks, so `components:refresh` stays safe. New UI prefers existing primitives (`Button`, `Badge`, `Select`, `ToggleGroup`, `ScrollArea`, the canvas wrappers) over a bespoke tree; a wrapper is added only when multiple features share the exact composition.

## Tokens

Tokens are the source of styling truth, authored in the W3C DTCG format and generated to CSS variables ([ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md), [tokens.md](../../03-design/design-system/tokens.md)). They are tiered: a **reference** token is a raw value (`teal.500`, `space.4`), a **semantic** token gives it a role (`color.action.destructive`, `surface.raised`). Product code and proxy components consume **semantic** tokens only, never raw values; this makes theming a remap rather than a find-and-replace. Tailwind v4 resolves utilities through the `@theme inline` mappings; a new token is a CSS variable in `:root`/`.dark` mapped to `--color-*`, never an edit to `components/ui`.

Accessibility defaults live in the token layer: motion tokens resolve to minimal animation under a reduced-motion preference, and target-size tokens default to the WCAG 2.2 minimum, so a component inherits them by consuming the semantic token ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md), [accessibility.md](../accessibility.md)).

## Theming

Light and dark are semantic remaps — a theme rebinds semantic tokens to different reference values and components are unchanged ([ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md)). Colour themes are override files; the runtime applies a `data-color-theme` attribute on the document root, lazily loads the theme CSS, and persists the choice locally as persistent UI state ([state-architecture.md](../state-architecture.md)). The active theme is not workspace truth.

## The shell primitives

Application-level layout uses only the proxied primitives — `Sidebar`, `SidebarInset` + `SidebarTrigger`, `Resizable`, `Menubar`/`NavigationMenu` + `Toolbar`, and `ScrollArea`/`Card`/`Form` for inspector content ([shell.md](../shell.md)). No other primitive is used for the shell, so layout composition stays consistent across modules. The shell follows the shadcn sidebar layout: `SidebarProvider` wraps the shell, the workspace `Sidebar` is a sibling of `SidebarInset`, and `SidebarTrigger` lives in the header.

## Constraints

- Generated components must not be edited directly; customise in wrappers/blocks.
- Tokens stay centralised to avoid drift; no hard-coded colour utilities in product code.
- The design system carries no domain semantics ([README.md](./README.md)); a block naming a domain type is rejected at review.

## Related documents

| Document                                                                                    | What it covers                       |
| ------------------------------------------------------------------------------------------- | ------------------------------------ |
| [README.md](./README.md)                                                                    | The package contract.                |
| [03-design/design-system/README.md](../../03-design/design-system/README.md)                | The visual contract and layer model. |
| [tokens.md](../../03-design/design-system/tokens.md)                                        | The full token architecture.         |
| [ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md)                             | The DTCG, tiered token decision.     |
| [ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md) | The proxy boundary and foundation.   |
