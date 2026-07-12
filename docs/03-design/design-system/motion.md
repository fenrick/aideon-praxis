# Motion

How the design system animates, and how it stops. This file is for anyone adding a transition. Motion in Aideon explains
change; it does not perform delight. It is governed by the motion tokens of
[ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md) and the reduced-motion obligation of
[ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md).

---

## The principle

Motion is useful when it shows where something came from, where it went, or what now has focus — when it reduces
thinking ([hig/foundations.md](../hig/foundations.md)). Long transitions, decorative physics, and animation that
competes with analytical work are out of scope. Motion is never the sole carrier of meaning
([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)).

## Motion is token-driven

Every transition consumes a semantic motion token (`motion.transition.standard`, `motion.transition.emphasis`,
`motion.transition.none`) which resolves to a reference duration and easing ([tokens.md](./tokens.md)). A component
never writes a raw duration. This is what lets the reduced-motion fallback live in the token layer rather than in every
component.

## The reduced-motion fallback

The accessibility default lives in the token, so a component inherits it by consuming the token
([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md),
[ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md)). Under a user's reduced-motion preference, the semantic
motion tokens resolve to `motion.duration.instant` (0 ms) with no easing — the transition becomes an immediate state
change, not an animation. Concretely:

```css
@media (prefers-reduced-motion: reduce) {
  /* semantic motion tokens rebind to instant */
  --motion-transition-standard: 0ms;
  --motion-transition-emphasis: 0ms;
}
```

Because the rebinding is at the token, a `Dialog`, a `StaleBadge`, and an active-state button press all degrade to
instant together, with no per-component code. A `useReducedMotion` hook is available for the rare case where a component
must branch in JavaScript (for example, to skip an enter animation entirely rather than run it at 0 ms) — but the
default path is the token.

Meaning that an animation conveyed must survive its removal: if a transition signalled "this came from there", the
relationship must also be readable statically (position, label, or marker), so a reduced-motion user loses no
information.

## Compositor-friendly properties only

Animate only properties the compositor can handle off the main thread: `transform`, `opacity`, and `clip-path`. These do
not trigger layout or paint and so stay smooth on a dense surface under load. Layout-bound properties — `width`,
`height`, `top`, `left`, `margin` — **must not** be animated; animate a `transform` instead. This keeps motion from
competing with the analytical work the surface exists for ([density-and-calm.md](./density-and-calm.md)) and matters
more on the desktop renderer, where a heavy canvas or virtualised table is often already using the main thread.

## Worked example

The inspector slides in when a selection is made. It animates `transform: translateX` and `opacity` over
`motion.transition.standard` (200 ms, decelerate) — compositor-friendly, so the table beside it does not stutter. Under
reduced motion the token resolves to 0 ms: the inspector simply appears, already framed around the selection. The
"belongs to the current selection" meaning is carried by the inspector's header naming the selected object
([hig/canvas-and-graph-work.md](../hig/canvas-and-graph-work.md)), not by the slide — so nothing is lost when the motion
is removed.

## References & standards

_Normative:_

- **WCAG 2.2** (W3C): 2.3.3 Animation from Interactions; honour `prefers-reduced-motion`
  ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)).

## Related documents

| Document                                                            | What it covers                                    |
| ------------------------------------------------------------------- | ------------------------------------------------- |
| [tokens.md](./tokens.md)                                            | The motion token family.                          |
| [ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md) | The reduced-motion obligation.                    |
| [ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md)     | Motion tokens carrying the accessibility default. |
| [density-and-calm.md](./density-and-calm.md)                        | The restraint motion observes.                    |
