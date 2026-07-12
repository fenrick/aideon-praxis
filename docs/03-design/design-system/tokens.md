# Tokens

The lowest, most stable layer of the design system: the named values every surface inherits. This file is for anyone
authoring a token, adding a theme, or wiring a primitive to the token contract. It is the spec behind
[ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md); the ADR records the decision, this file enumerates the
families.

---

## Contents

1. [The format and the tiers](#1-the-format-and-the-tiers)
2. [Colour](#2-colour)
3. [Typography](#3-typography)
4. [Spacing](#4-spacing)
5. [Radius](#5-radius)
6. [Shadow and elevation](#6-shadow-and-elevation)
7. [Motion](#7-motion)
8. [Target size](#8-target-size)
9. [References & standards](#9-references--standards)

---

## 1. The format and the tiers

Tokens are authored in the **W3C Design Tokens Community Group format** _(W3C Design Tokens Community Group format)_:
each token is a `$type`/`$value` pair, so the source is portable to design tooling and not locked to one build pipeline
([ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md)). CSS custom properties are generated from the DTCG
source; primitives and blocks consume the generated variables, never the source directly.

Tokens are tiered, and the tier separation is an invariant:

- A **reference** token is a raw value with no meaning — `teal.500`, `space.4`, `radius.md`, `red.600`. It answers "what
  value", never "what for".
- A **semantic** token gives a reference value a role — `color.action.primary`, `surface.raised`,
  `motion.transition.standard`, `size.target.min`. It answers "what for".

Product code and proxy components **must** consume semantic tokens only; they **must not** reference a raw value
directly. This is what makes a theme a rebinding of semantic→reference, not a hunt through components. Light and dark
are exactly this: the same semantic names rebound to different reference values, components unchanged.

```jsonc
// reference tier — a raw value, no meaning
"teal": { "600": { "$type": "color", "$value": "oklch(0.55 0.11 195)" } }

// semantic tier — a role, bound to a reference
"color": {
  "action": {
    "primary": { "$type": "color", "$value": "{teal.600}" }
  }
}
```

The reference palette is teal-anchored oklch
([ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)); oklch is used because
perceptually uniform lightness makes contrast-safe ramps and a high-contrast theme tractable as a remap. The specific
values are provisional ([ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md)); the _families and tiering
below_ are the stable contract.

## 2. Colour

The colour families are complete ramps, not single values, so a theme has every step it needs without inventing one in a
component. Each ramp runs the same fixed steps.

**Reference ramps** — neutral and each hue carry steps `50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950`. A ramp
this complete is required so that surface layering, borders, hover/active tones, and disabled tones all draw from named
steps rather than ad-hoc `opacity` tweaks.

| Reference ramp | Anchors                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| `neutral.*`    | Greyscale spine for surfaces, text, borders.                                                                    |
| `teal.*`       | Brand/accent hue ([ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)). |
| `blue.*`       | Informational status.                                                                                           |
| `green.*`      | Success status.                                                                                                 |
| `amber.*`      | Warning status.                                                                                                 |
| `red.*`        | Error / destructive status.                                                                                     |

**Semantic colour tokens** bind those ramps to roles. The families:

| Semantic family      | Role                                                                                                 | Example bindings                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `color.surface.*`    | Surface hierarchy: `base`, `raised`, `overlay`, `sunken`                                             | `base → neutral.50` (light) / `neutral.950` (dark)                                   |
| `color.foreground.*` | Text/icon on surfaces: `default`, `muted`, `subtle`, `on-accent`, `disabled`                         | meets AA contrast on its paired surface                                              |
| `color.border.*`     | Dividers and outlines: `default`, `subtle`, `strong`, `focus`                                        | `focus → teal.500`                                                                   |
| `color.action.*`     | Interactive emphasis: `primary`, `secondary`, `destructive`, with `-hover`/`-active`/`-disabled`     | `destructive → red.600` (light) / `red.400` (dark)                                   |
| `color.status.*`     | Operational state: `info`, `success`, `warning`, `error`, `neutral`, each with `-fg`/`-bg`/`-border` | per result state — see [honest-state-treatments.md](./honest-state-treatments.md)    |
| `color.provenance.*` | Content classification: `asserted`, `inferred`, `generated`                                          | the provenance ramp — see [honest-state-treatments.md](./honest-state-treatments.md) |
| `color.chart.*`      | Stable, contrast-checked series colours `1…8`                                                        | distinguishable in greyscale and for common colour-vision deficiencies               |
| `color.sidebar.*`    | Sidebar-specific surface/foreground/border                                                           | subdued per [density-and-calm.md](./density-and-calm.md)                             |

The provenance and status families must satisfy the colour-independence rule
([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)): colour is never the sole carrier of meaning; the
treatment pairs it with icon, shape, or label. That rule and the greyscale obligation are specified in
[honest-state-treatments.md](./honest-state-treatments.md).

## 3. Typography

Type supports three reading modes at once — narrative reading, rapid scanning, precise comparison — so prose, metadata,
identifiers, and measures do not all look alike.

| Family                 | Tokens                                                        | Purpose                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `font.family.*`        | `sans` (Geist), `mono` (Geist Mono), `editorial` (Newsreader) | self-hosted ([ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)); mono for identifiers and measures, editorial for headers |
| `font.size.*`          | `xs, sm, base, md, lg, xl, 2xl, 3xl, 4xl`                     | full scale from caption to display                                                                                                                                  |
| `font.weight.*`        | `regular (400), medium (500), semibold (600), bold (700)`     | weight ramp for hierarchy through contrast, not colour                                                                                                              |
| `font.lineHeight.*`    | `tight, snug, normal, relaxed`                                | dense display vs reading variants                                                                                                                                   |
| `font.letterSpacing.*` | `tight, normal, wide`                                         | caption and label tracking                                                                                                                                          |

Semantic text roles (`text.body`, `text.label`, `text.caption`, `text.code`, `text.heading.*`, `text.display`) bind
size/weight/line-height/family together, so a surface picks a role rather than three separate tokens.

## 4. Spacing

A single spacing scale drives padding, gap, and margin. Dense surfaces draw from the small end; breathing room is earned
([density-and-calm.md](./density-and-calm.md)).

`space.0 (0) · space.px (1px) · space.0_5 (2px) · space.1 (4px) · space.2 (8px) · space.3 (12px) · space.4 (16px) · space.5 (20px) · space.6 (24px) · space.8 (32px) · space.10 (40px) · space.12 (48px) · space.16 (64px)`

These are reference tokens. Semantic spacing roles (`space.inset.dense`, `space.inset.comfortable`, `space.stack.*`,
`space.inline.*`) bind density intent to a step, so a density mode is a rebinding, not a per-component change.

> **Implementation note.** The TypeScript token contracts in `src/design-system/foundations/tokens.ts` use T-shirt-size
> semantic names (`2xs · xs · sm · md · lg · xl · 2xl · 3xl`) that correspond to the small-to-large steps of the spacing
> scale above. Components and density mode definitions consume these semantic keys; the numeric DTCG reference names
> above are the long-form spec.

## 5. Radius

`radius.none (0) · radius.sm (2px) · radius.md (4px) · radius.lg (8px) · radius.xl (12px) · radius.full (9999px)`.
Semantic roles: `radius.control` (inputs, buttons), `radius.surface` (cards, panels), `radius.pill` (badges).

> **Implementation note.** `src/design-system/foundations/tokens.ts` exposes `radiusScale` with keys
> `sm · md · lg · xl · frame`, mapped to CSS variable references. The `frame` key covers canvas node borders; it
> corresponds to a large-radius semantic role.

## 6. Shadow and elevation

Depth is built from layered surfaces first and shadow second ([density-and-calm.md](./density-and-calm.md)); shadow
tokens stay restrained.

| Token         | Use                                 |
| ------------- | ----------------------------------- |
| `elevation.0` | Flat — on-surface content, default. |
| `elevation.1` | Raised — cards, resting menus.      |
| `elevation.2` | Overlay — popovers, dropdowns.      |
| `elevation.3` | Modal — dialogs, command palette.   |

Each `elevation.*` binds a `shadow` `$type` token; a high-contrast theme may rebind elevation to a border treatment
rather than a shadow, since the tier separation allows it.

## 7. Motion

Motion tokens carry the accessibility default in the token layer, so a component inherits reduced motion by consuming
the token ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md),
[ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md)).

| Family                | Tokens                                                      | Notes                                                            |
| --------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| `motion.duration.*`   | `instant (0ms), fast (120ms), normal (200ms), slow (320ms)` | reference durations                                              |
| `motion.easing.*`     | `standard, decelerate, accelerate, linear`                  | `linear` for progress only                                       |
| `motion.transition.*` | `standard`, `emphasis`, `none`                              | semantic; resolve to `instant`/no animation under reduced motion |

The reduced-motion fallback and the compositor-friendly property rule are specified in [motion.md](./motion.md).

## 8. Target size

`size.target.min` defaults to **24 px** — the WCAG 2.2 2.5.8 AA minimum _(WCAG 2.2)_ — and `size.target.comfortable` to
40 px for primary controls ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)). Target size is a
token-backed default at the proxy boundary, not a per-surface choice; the detail is in
[interaction-states.md](./interaction-states.md) and [accessibility.md](./accessibility.md).

## 9. References & standards

_Normative:_

- W3C — **Design Tokens Community Group format**. The token source format
  ([ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md)).
- **WCAG 2.2** (W3C). Contrast (1.4.3), target size (2.5.8), colour independence (1.4.1)
  ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)).

_Informative:_

- Google — **Material Design 3** token architecture. Reference vs semantic separation.
- Frost — **Atomic Design**, 2016. Tokens as the lowest layer.

## Related documents

| Document                                                                                    | What it covers                                                  |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md)                             | The decision: DTCG format and the reference/semantic tiers.     |
| [ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md) | Tokens as styling truth behind the proxy boundary.              |
| [honest-state-treatments.md](./honest-state-treatments.md)                                  | The status and provenance colour treatments and greyscale rule. |
| [motion.md](./motion.md)                                                                    | The reduced-motion fallback for motion tokens.                  |
| [accessibility.md](./accessibility.md)                                                      | Contrast and target-size obligations the tokens satisfy.        |
