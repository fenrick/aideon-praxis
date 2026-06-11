# Primitives

The accessible low-level controls the design system wraps and re-exports. This file is for anyone adding a primitive or wiring one into a block. Primitives are the second layer of the [layer model](./README.md#1-the-layer-model): they depend only on [tokens](./tokens.md).

---

## The principle

A primitive is a single accessible control with no domain meaning: a button, an input, a select, a dialog, a table, a set of tabs. The substrate is **shadcn/ui** (Radix-based, Tailwind-styled), the generated base mandated by [ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md). The generated files live under `components/ui/` and are **not** edited directly; customisation happens by wrapping and re-exporting through the proxy. Product surfaces import the design-system proxy, never raw `shadcn`, `radix`, `react-resizable-panels`, or the icon library — the boundary is lint-enforced ([ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)).

## The rules every primitive obeys

1. **Tokens only.** A primitive consumes semantic tokens ([tokens.md](./tokens.md)); it never hard-codes a colour, size, radius, or duration.
2. **All interaction states.** Every interactive primitive implements hover, focus, active, and disabled per [interaction-states.md](./interaction-states.md). No exceptions.
3. **APG behaviour built in.** Complex primitives follow the WAI-ARIA Authoring Practices Guide pattern for their role, implemented once at the proxy so surfaces inherit correctness ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)) — see [accessibility.md](./accessibility.md).
4. **Target size.** Interactive targets meet `size.target.min` (24 px, WCAG 2.2 2.5.8), with comfortable defaults on primary controls ([interaction-states.md](./interaction-states.md)).
5. **Domain-free.** A primitive exposes content through slots and props; it does not know what the content means ([README.md §2](./README.md#2-the-domain-free-boundary)).
6. **Reduced motion.** Any transition consumes a motion token and so degrades under reduced motion automatically ([motion.md](./motion.md)).

## The set

| Group         | Primitives                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| Form controls | `Button`, `Input`, `Textarea`, `Label`, `Checkbox`, `RadioGroup`, `Switch`, `Select`, `Combobox`, `Slider` |
| Containers    | `Card`, `Tabs`, `Accordion`, `ScrollArea`, `Separator`, `Resizable` (group/panel/handle)                   |
| Overlays      | `Dialog`, `Sheet`, `Drawer`, `Popover`, `Tooltip`, `DropdownMenu`, `ContextMenu`, `Command` (palette)      |
| Display       | `Table`, `Badge`, `Avatar`, `Skeleton`, `Progress`, `Icon`                                                 |
| Navigation    | `Sidebar`, `Menubar`, `Toolbar`, `Breadcrumb`                                                              |

The `Icon` primitive is the single entry point to the icon set; ad-hoc icon imports are a boundary violation ([ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)). Canvas/graph primitives are wrapped separately — see [canvas-and-graph.md](./canvas-and-graph.md).

## Worked example

`Combobox` wraps the shadcn combobox and is re-exported from the proxy. It ships the APG combobox keyboard model (arrow keys, `aria-activedescendant`, escape to close), a focus ring from `color.border.focus`, a hit area of at least 24 px, and a hover/active/disabled treatment from semantic tokens. A feature module uses it to filter entity types; the combobox itself has no idea "entity type" exists — it renders the option list the surface supplies ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)).

## Honest-state status

The shadcn/Tailwind foundation and the proxy boundary are built; the _applied_ component layer (artefact frames, the inspector stack, honest-state treatments) is in progress and tracked against [ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md). Where this file describes a primitive not yet wrapped, treat it as **design intent**.

## References & standards

_Normative:_

- **WAI-ARIA Authoring Practices Guide**. Keyboard and ARIA patterns for complex primitives ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)).

## Related documents

| Document                                                                                    | What it covers                                                     |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md) | The shadcn foundation and proxy boundary.                          |
| [blocks.md](./blocks.md)                                                                    | The Aideon compositions primitives are assembled into.             |
| [interaction-states.md](./interaction-states.md)                                            | The interaction-state and target-size rules every primitive obeys. |
| [accessibility.md](./accessibility.md)                                                      | The APG patterns and conformance target.                           |
| [component-completeness-checklist.md](./component-completeness-checklist.md)                | The variants a wrapped primitive must ship.                        |
