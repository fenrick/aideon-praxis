# Interaction States

The concrete rules for hover, focus, active, disabled, and selection, and for pointer target sizes. This file is for
anyone building an interactive primitive or block. Every interactive component implements these states; there are no
exceptions.

---

## The principle

A user must always be able to tell, without guessing, what a control will do and what state it is in. Focus and
selection are _different_ states and never collapse into one treatment
([hig/interaction-model.md](../hig/interaction-model.md)): focus tells the user where keyboard input will go; selection
tells them what object is targeted. On dense surfaces both can exist at once, and when they do the user must see both.
All state treatments draw from semantic tokens ([tokens.md](./tokens.md)), never hard-coded values.

## The five states

| State                             | Concrete rule                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hover**                         | A visible change in background, border, or text colour from a `*-hover` semantic token (e.g. `color.action.primary-hover`). Deliberate, not accidental — a one-step tone shift on the relevant colour ramp ([tokens.md](./tokens.md)). Hover **must not** be the sole way to reach structural navigation or context that changes meaning ([hig/shell-and-navigation.md](../hig/shell-and-navigation.md)). |
| **Focus**                         | A high-contrast focus ring using `color.border.focus`, at least 2 px and offset so it is visible on any surface. Reachable by keyboard without a pointer. Meets WCAG 2.2 contrast and 2.4.11 Focus Appearance ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)). Focus is never suppressed; `:focus-visible` distinguishes keyboard focus from pointer focus.                         |
| **Active / pressed**              | Distinct from hover — typically a deeper tone (`*-active` token) and an optional inward transform. Animated only through a motion token so it degrades under reduced motion ([motion.md](./motion.md)).                                                                                                                                                                                                   |
| **Disabled**                      | Reduced contrast via `color.foreground.disabled`; non-interactive; does not respond to hover or active; `aria-disabled` so assistive technology announces it.                                                                                                                                                                                                                                             |
| **Selected / checked / expanded** | Same discipline — token-backed (`color.action.*`, a selection tint), with the ARIA state (`aria-selected`, `aria-checked`, `aria-expanded`) set so it is announced and is not signalled by colour alone ([accessibility.md](./accessibility.md)).                                                                                                                                                         |

## Target sizes

Pointer targets meet the WCAG 2.2 2.5.8 AA minimum of **24 × 24 CSS pixels** _(WCAG 2.2)_, backed by `size.target.min`
([tokens.md](./tokens.md), [ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)). This is a token-backed
default at the proxy boundary, not a per-surface choice.

- Primary controls default to `size.target.comfortable` (40 px), larger than the floor.
- A visually small control (a dense table-row action) keeps a 24 px _hit area_ via padding even when the glyph is
  smaller — the target, not the icon, must meet the minimum.
- Spacing between adjacent small targets prevents mis-taps; the dense spacing tokens ([tokens.md](./tokens.md)) keep
  gaps above the accidental-activation threshold.

Touch and pointer are treated the same here: the minimum is the floor for any pointer modality, and on the desktop the
comfortable default keeps precise mouse work fast without sacrificing the floor.

## Worked example

A dense `DataTable` row carries an inline delete action. The glyph is 16 px, but the button's hit area is padded to 24
px (`size.target.min`). At rest it is quiet; on hover it shifts one tone (`color.action.destructive-hover`); on keyboard
focus it shows the 2 px `color.border.focus` ring; pressed, it deepens (`color.action.destructive-active`) with a
sub-100 ms transform that disappears under reduced motion; when the row is not editable the button is `aria-disabled` at
reduced contrast. Row _selection_ (a left tint + `aria-selected`) is visually separate from the button's _focus_ ring,
so the two states never read as one ([hig/interaction-model.md](../hig/interaction-model.md)).

## References & standards

_Normative:_

- **WCAG 2.2** (W3C): 2.5.8 Target Size (Minimum), 2.4.11 Focus Appearance, 1.4.1 Use of Colour
  ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)).

## Related documents

| Document                                                | What it covers                                          |
| ------------------------------------------------------- | ------------------------------------------------------- |
| [tokens.md](./tokens.md)                                | The interaction-state and target-size tokens.           |
| [accessibility.md](./accessibility.md)                  | The conformance target and APG behaviour.               |
| [motion.md](./motion.md)                                | The reduced-motion fallback for active-state animation. |
| [hig/interaction-model.md](../hig/interaction-model.md) | The focus-vs-selection operating model.                 |
