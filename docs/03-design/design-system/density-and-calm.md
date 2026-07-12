# Density and Calm

The dense-by-default, quiet-chrome posture the design system enforces. This file is for anyone making a spacing,
hierarchy, or chrome decision. Aideon is a serious work tool used in long sessions; the design system makes calm density
the cheap default and decoration the thing that has to justify itself.

---

## The principle

Compact must never mean cramped ([hig/foundations.md](../hig/foundations.md)). Density is achieved by drawing from the
small end of the spacing scale and by establishing hierarchy through type and surface contrast rather than colour
quantity — not by removing the spacing that reveals grouping and interaction boundaries.

## Dense by default

- Interactive controls, table rows, and list items use the small end of the spacing scale (`space.inset.dense`,
  [tokens.md](./tokens.md)). Breathing room is earned, not defaulted; open space must carry information or hierarchy.
- The type scale supports compact UI labels alongside readable body text, so a dense surface stays legible at smaller
  sizes ([tokens.md](./tokens.md)).
- A default density and a compact density are both supported; compact is a rebinding of the semantic spacing roles
  ([ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md)), not a per-component change, and held as persistent
  UI state ([ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)).

## Chrome stays quiet

- Navigation and toolbar chrome use subdued surface tokens (`color.sidebar.*`, `color.surface.*`), not accent colours.
  The content surface is always the visual focus ([the-shell.md](../the-shell.md)).
- Status indicators are small inline affordances by default, not full-width banners. A banner is reserved for state that
  genuinely blocks or reframes the surface ([honest-state-treatments.md](./honest-state-treatments.md)).
- Decorative elements — gradients, illustrations, animation — are absent unless they carry information. Motion clarifies
  flow; it does not perform ([motion.md](./motion.md)).
- Accent colour is limited to interactive affordances and genuine status signals, so a coloured element on screen always
  means something.

## Hierarchy through contrast, depth through surfaces

Hierarchy comes from type scale and weight contrast, not from adding colours. Depth comes from layered surface tokens
(`surface.base` → `surface.raised` → `surface.overlay`) before it comes from shadow; shadow tokens stay restrained
([tokens.md](./tokens.md)). This keeps a dense screen readable without heavy ornament.

## Long-session stability

- Layout must not shift during data updates: skeletons match the expected content shape so content does not jump on
  arrival ([honest-state-treatments.md](./honest-state-treatments.md)).
- Entrances and exits are restrained; there are no unsolicited full-page transitions. Panel and content transitions are
  local ([motion.md](./motion.md)).
- A long working session should not accumulate visual noise; the calm default is what makes hours of comparison work
  sustainable.

## Worked example

A capability matrix renders 400 dense cells. Rows use `space.inset.dense`; identifiers are set in the mono family so
they scan distinctly from prose labels ([tokens.md](./tokens.md)); the toolbar above it uses a subdued surface, not the
teal accent, so the matrix is the focus. A single stale region carries a small inline `StaleBadge`, not a full-width
banner ([honest-state-treatments.md](./honest-state-treatments.md)). Switching to compact density rebinds the spacing
roles one notch tighter without touching the matrix component.

## References & standards

_Informative:_

- Nielsen — **10 Usability Heuristics**, 1994. Aesthetic and minimalist design; visibility of status.
- Wertheimer — **Gestalt principles**. Grouping and proximity in dense surfaces.

## Related documents

| Document                                    | What it covers                                          |
| ------------------------------------------- | ------------------------------------------------------- |
| [tokens.md](./tokens.md)                    | The spacing, type, and surface tokens density draws on. |
| [motion.md](./motion.md)                    | The restraint motion observes.                          |
| [the-shell.md](../the-shell.md)             | The quiet shell the chrome composes into.               |
| [hig/foundations.md](../hig/foundations.md) | The product-level density and calm posture.             |
