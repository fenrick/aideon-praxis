# Design System (renderer-side)

The renderer-side wrappers behind the proxy boundary: the code at `src/design-system` that realises the visual contract in [03-design/design-system](../../03-design/design-system/README.md). This is the contract leaf product surfaces compose from; product code consumes these wrappers and never raw shadcn, Radix, `react-resizable-panels`, the icon library, or XYFlow ([ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)).

This README is the contract; [DESIGN.md](./DESIGN.md) carries the internal structure and token detail.

## What it provides

- The proxied shadcn/Radix primitives — `Sidebar`, `SidebarInset`, `SidebarTrigger`, `Resizable`, `Menubar`/`Toolbar`, `Panel`, `ScrollArea`, `Card`, `Form`, `Tabs`, `Select`, `Dialog`, `DropdownMenu`, and more — with APG patterns built in once ([accessibility.md](../accessibility.md)). All available from `import { X } from 'design-system'`.
- Icons via `import { AlertTriangle, … } from 'design-system/icons'` — a curated barrel re-exporting from lucide-react, kept separate to avoid the `Command` name collision.
- The Aideon-specific blocks: shell regions (`Toolbar`, `Panel`, `Modal`, `SidebarShell`) and the honest-state treatments ([honest-state-treatments.md](../../03-design/design-system/honest-state-treatments.md)).
- XYFlow canvas wrappers via `import { X } from 'design-system/reactflow/node-search'` etc. — the renderer side of **Topos** ([canvas-and-graph.md](../../03-design/design-system/canvas-and-graph.md)).
- The DTCG-sourced token contracts (`src/design-system/foundations/`) and generated CSS variables, the single styling truth ([ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md), [tokens.md](../../03-design/design-system/tokens.md)).

## The boundary

The design system carries no domain semantics: it knows nothing of an entity type, a layer, a scenario, or an artefact family ([03-design/design-system/README.md](../../03-design/design-system/README.md)). A component that only makes sense inside one feature lives in that feature; a pattern two features share is promoted here, stripped of domain meaning and exposed through slots. The boundary is enforced architecturally, by lint (raw third-party imports are bugs), and by review ([ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)).

## Faces

Every renderer surface. It is a leaf with no dependency on a feature package ([package-layout.md](../package-layout.md)).

## Boundaries

- Exposes React components and CSS only; no business logic, no IPC.
- Generated components are treated as read-only; customisation happens in wrappers/blocks.
- Tokens stay centralised; product code consumes semantic tokens, never raw values or hard-coded colour utilities.

## Running and testing

- Refresh upstream primitives: `pnpm run components:refresh`.
- Tests: `pnpm run node:test`; visual regression covers the rendered blocks and honest-state treatments ([testing.md](../testing.md)).

## Related documents

| Document                                                                                    | What it covers                               |
| ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| [DESIGN.md](./DESIGN.md)                                                                    | The internal structure, tokens, and theming. |
| [03-design/design-system/README.md](../../03-design/design-system/README.md)                | The visual contract this code realises.      |
| [ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md) | The proxy boundary and foundation choice.    |
| [ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md)                             | The DTCG, tiered token architecture.         |
| [canvas-and-graph.md](../../03-design/design-system/canvas-and-graph.md)                    | The Topos canvas wrappers.                   |
