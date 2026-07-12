# Accessibility

The renderer's accessibility baseline and the patterns each component type follows. This file is for anyone building or
reviewing an interactive surface. It applies [ADR-0024](../06-adrs/ADR-0024-accessibility-baseline-wcag22.md); the
design-system [accessibility.md](../03-design/design-system/accessibility.md) is the visual-contract counterpart.

---

## The principle

WCAG 2.2 Level AA is the conformance target ([ADR-0024](../06-adrs/ADR-0024-accessibility-baseline-wcag22.md), WCAG
2.2). AA is the floor, applied uniformly, not negotiated per surface; AAA criteria are adopted where they are
inexpensive and do not conflict with a dense expert surface. Accessibility on graph canvases, inspectors, matrices, and
roadmaps is not retrofittable — it is a property of how the components are built, which is why the patterns live once at
the design-system proxy boundary
([ADR-0010](../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)) and a product surface
inherits them.

## Where accessibility is implemented

The WAI-ARIA Authoring Practices Guide patterns are implemented once at the proxy boundary, so a surface composing the
proxies inherits correct keyboard interaction, focus management, and ARIA roles/states rather than re-implementing them
([ADR-0024](../06-adrs/ADR-0024-accessibility-baseline-wcag22.md), WAI-ARIA APG). A surface's obligation is to **compose
the proxies correctly** — provide accessible names, group related controls, and wire selection — not to hand-roll ARIA.

## Patterns per component type

Each complex widget follows its APG pattern (WAI-ARIA APG); the proxy supplies the behaviour, the surface supplies the
content and labels:

| Component type              | APG pattern                | What the surface owns                                                                                                          |
| --------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Menus, menubar              | Menu / Menubar             | Action labels; the native-menu accelerator mapping ([shell.md](./shell.md))                                                    |
| Dialogs, drawers            | Dialog (modal)             | Focus trap is the proxy's; the surface sets the accessible name and initial focus                                              |
| Type/scenario filters       | Combobox                   | Options and the selected value; arrow navigation and `aria-activedescendant` are the proxy's                                   |
| Navigation tree (scenarios) | Tree view                  | Node labels and expand/collapse state; roving focus is the proxy's                                                             |
| Tables, matrices            | Grid                       | Cell content and headers; cell navigation is the proxy's; large grids are virtualised ([data-fetching.md](./data-fetching.md)) |
| Tabs                        | Tabs                       | Tab labels and panel association                                                                                               |
| Toolbar                     | Toolbar                    | Grouped controls and labels                                                                                                    |
| Graph canvas                | Grid-style (design intent) | Node/edge labels; keyboard model is an open follow-up (below)                                                                  |

## The canvas keyboard model is design intent

The graph canvas needs an explicit keyboard model — move selection between nodes, inspect a node, discover its
relationships, and invoke actions without a pointer
([hig/canvas-and-graph-work.md](../03-design/hig/canvas-and-graph-work.md)). A concrete APG-grid-style design for the
canvas is an open follow-up ([ADR-0024](../06-adrs/ADR-0024-accessibility-baseline-wcag22.md),
[canvas-and-graph.md](../03-design/design-system/canvas-and-graph.md)); until it lands, canvas keyboard navigation is
marked **design intent**, not a shipped guarantee.

## Token-backed defaults

Two accessibility defaults are carried by the token layer, so a component inherits them by consuming the semantic token
([ADR-0025](../06-adrs/ADR-0025-design-token-architecture.md)):

- **Reduced motion.** Motion tokens resolve to minimal or no animation under a reduced-motion preference; motion is
  never the sole carrier of meaning ([ADR-0024](../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)).
- **Target size.** Interactive targets meet the WCAG 2.2 target-size minimum (24×24 CSS pixels, 2.5.8 AA), with larger
  defaults for primary controls; the minimum is a token-backed default, not a per-surface choice.

## Non-colour cues and announcements

Honest-state badges are perceivable without colour alone — a `Generated` or `Stale` element carries text or shape as
well as colour ([error-loading-empty.md](./error-loading-empty.md), WCAG 1.4.1). Plan/actual and scenario state are
never colour-only ([chrona-time](./chrona-time/README.md)). State changes that are not focus-driven announce through an
`aria-live` region — "Time context updated", "Analysis complete" — so a screen-reader user is told without a visible cue
carrying the only signal.

## Keyboard reachability

Every control is keyboard reachable and operable; focus is visible and meets the 2.2 focus-appearance criterion through
the focus token ([interaction-states.md](../03-design/design-system/interaction-states.md)). Lists announce selection
changes; the navigation tree and result lists carry accessible labels ([chrona-time](./chrona-time/README.md),
[metis-workspace](./metis-workspace/README.md)).

## Worked example

The inspector's type-filter combobox uses the APG combobox pattern from the proxy — arrow-key navigation,
`aria-activedescendant`, escape to close. Its `Stale` badge shows an icon and label, not colour alone. Its clear button
consumes `size.target.min` and is at least 24×24 px. A surface composing this combobox writes the option labels and the
selected value; it does not write the ARIA wiring.

## References & standards

_Normative — recorded in the [standards register](../02-standards/STANDARDS-REGISTER.md):_

- **WCAG 2.2** (W3C). The conformance target, Level AA.
- **WAI-ARIA Authoring Practices Guide**. The interaction patterns per widget.

## Related documents

| Document                                                                                | What it covers                                      |
| --------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [ADR-0024](../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)                        | The WCAG 2.2 AA baseline and APG-at-the-proxy rule. |
| [design-system/accessibility.md](../03-design/design-system/accessibility.md)           | The visual contract — contrast, target size, focus. |
| [error-loading-empty.md](./error-loading-empty.md)                                      | Honest-state badges perceivable without colour.     |
| [ADR-0025](../06-adrs/ADR-0025-design-token-architecture.md)                            | The reduced-motion and target-size token defaults.  |
| [ux/accessibility-and-performance.md](../03-design/ux/accessibility-and-performance.md) | The behaviour-level accessibility contract.         |
