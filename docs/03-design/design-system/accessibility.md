# Accessibility

The conformance target, the interaction patterns, and the perceivability rules the design system builds in. This file is
for anyone building a component or reviewing a surface for accessibility. It realises
[ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md); the ADR records the decision, this file states how
the design system meets it.

---

## The principle

Accessibility on dense interactive surfaces is not retrofittable; it is a property of how the components are built
([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)). The proxy boundary
([ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)) is where these properties
are made once, so a product surface inherits keyboard and ARIA correctness from the proxies it composes rather than
re-implementing it. If a complex surface has no coherent keyboard path, that is usually a sign the surface itself is
muddled ([hig/foundations.md](../hig/foundations.md)).

## The conformance target

**WCAG 2.2 Level AA** is the target _(WCAG 2.2)_, applied uniformly, not negotiated per feature
([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)). AAA criteria are adopted where they are
inexpensive and do not conflict with an information-dense surface's purpose. A formal third-party audit and a published
VPAT are deferred ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)); the engineering target is in
force now.

## WAI-ARIA APG patterns

Complex widgets follow the **WAI-ARIA Authoring Practices Guide** pattern for their role _(WAI-ARIA APG)_ — keyboard
interaction, focus management, and ARIA roles/states for menus, dialogs, comboboxes, tabs, tree, and grid widgets
([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)). The patterns are implemented at the proxy
boundary ([primitives.md](./primitives.md)), so surfaces inherit them. The graph canvas's keyboard model is an
APG-grid-style design and is an open follow-up ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md),
[canvas-and-graph.md](./canvas-and-graph.md)).

## Contrast

- Text and meaningful non-text content meet WCAG 1.4.3 (4.5:1 for normal text, 3:1 for large text and UI
  component/graphic boundaries). The oklch reference ramps ([tokens.md](./tokens.md)) are stepped so semantic
  foreground/surface pairings clear AA; a contrast check is part of adding or rebinding a semantic colour token.
- A high-contrast theme is a further semantic remap and is an open follow-up
  ([ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md)).

## Colour independence

Meaning is never conveyed by colour alone (WCAG 1.4.1). Honest-state and content-classification badges carry text or
shape in addition to colour, so a `Generated` or `Stale` state is distinguishable without colour perception
([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)). The full greyscale obligation is in
[honest-state-treatments.md](./honest-state-treatments.md). The honesty obligation and the accessibility obligation
reinforce each other here.

## Target size

Interactive targets meet WCAG 2.2 2.5.8 (24 × 24 CSS px minimum), token-backed via `size.target.min`, with larger
comfortable defaults on primary controls ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)). The
concrete rules are in [interaction-states.md](./interaction-states.md).

## Reduced motion

Animation and transition honour the user's reduced-motion preference through the motion tokens; motion is never the sole
carrier of meaning ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)). The fallback is in
[motion.md](./motion.md).

## Focus and keyboard

Every meaningful action is reachable from the keyboard; focus is always visible (2.4.11 Focus Appearance,
[interaction-states.md](./interaction-states.md)); focus and selection are distinct treatments
([hig/interaction-model.md](../hig/interaction-model.md)). On complex surfaces, screen readers can identify an object's
name, type, state, relationship, and available action ([hig/foundations.md](../hig/foundations.md)). The shell preserves
keyboard movement between its four regions without trapping focus ([the-shell.md](../the-shell.md)).

## Worked example

The inspector's type-filter combobox uses the APG combobox pattern: arrow-key navigation, `aria-activedescendant`,
escape to close. Its `Stale` badge shows an icon and label, not colour alone. Its clear button is at least 24 × 24 px.
Its focus ring meets 2.4.11. None of this is implemented in the feature surface — it is inherited from the proxy
combobox ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)).

## References & standards

_Normative:_

- **WCAG 2.2** (W3C). Conformance target, Level AA
  ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)).
- **WAI-ARIA Authoring Practices Guide**. Interaction patterns for complex widgets.

## Related documents

| Document                                                            | What it covers                       |
| ------------------------------------------------------------------- | ------------------------------------ |
| [ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md) | The WCAG 2.2 AA decision.            |
| [interaction-states.md](./interaction-states.md)                    | Focus, target size, and state rules. |
| [honest-state-treatments.md](./honest-state-treatments.md)          | The colour-independence treatments.  |
| [motion.md](./motion.md)                                            | The reduced-motion fallback.         |
| [canvas-and-graph.md](./canvas-and-graph.md)                        | The graph-canvas keyboard model.     |
