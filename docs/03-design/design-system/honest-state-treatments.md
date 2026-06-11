# Honest-State Treatments

The visual treatments for every operational state a surface can be in, and for the content classification of a value. This file is for anyone building or reviewing a state treatment. It realises the honest-state vocabulary of [DOCUMENTATION-STANDARD.md §9](../../02-standards/DOCUMENTATION-STANDARD.md) and the honesty obligations of [trust-and-honesty.md](../trust-and-honesty.md); it does not redefine them.

---

## Contents

1. [The principle](#1-the-principle)
2. [The two axes never collapse](#2-the-two-axes-never-collapse)
3. [Result-state treatments](#3-result-state-treatments)
4. [Content-classification treatments — the provenance ramp](#4-content-classification-treatments--the-provenance-ramp)
5. [The greyscale obligation](#5-the-greyscale-obligation)
6. [References & standards](#6-references--standards)

---

## 1. The principle

Aideon surfaces live data with latency, partial results, and model output. Honesty is a user-interface responsibility, not only a backend one ([hig/provenance-and-generated-work.md](../hig/provenance-and-generated-work.md)). The design system therefore ships a _shared_ vocabulary of state treatments as first-class blocks, so a surface never invents its own loader, status colour, or "generated" mark. These treatments are blocks ([blocks.md](./blocks.md)); they consume status and provenance tokens ([tokens.md](./tokens.md)).

## 2. The two axes never collapse

[DOCUMENTATION-STANDARD.md §9](../../02-standards/DOCUMENTATION-STANDARD.md) fixes two orthogonal axes, and the treatments keep them visually distinct:

- **Content classification** (what _kind_ of claim): Asserted, Inferred, Generated. One per element.
- **Result state** (the condition of a result when shown): Fresh, Stale, Rebuilding, Partial/Bounded, In progress, Awaiting review, Failed. Any number per element.

A surface may carry one classification _and_ several result states on the same element — a value can be **Generated** _and_ **Stale**. The treatments must read as two separate signals: a classification badge and one or more state badges. They never merge into a single chip, because "Generated" (a claim kind) is not "Stale" (a freshness condition).

## 3. Result-state treatments

| State                 | Block                               | Treatment                                                                                                                                                                                             |
| --------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Loading**           | `Skeleton`                          | Skeleton shimmer proportional to the expected content shape, so layout does not shift on arrival ([density-and-calm.md](./density-and-calm.md)). No spinner-only default.                             |
| **Empty**             | `EmptyState`                        | Purposeful empty frame — contextual message and a suggested next action. Never a generic placeholder.                                                                                                 |
| **Partial / Bounded** | `PartialBanner`                     | Content renders with an inline partial-result banner stating coverage. Never silently truncated ([hig/canvas-and-graph-work.md](../hig/canvas-and-graph-work.md)).                                    |
| **Stale**             | `StaleBadge`                        | Content renders with a stale badge near the affected region; the timestamp shows on hover. Driven by `ProjectionFreshnessStatus` ([ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)). |
| **Rebuilding**        | `RebuildingIndicator`               | Prior values stay visible; a rebuilding indicator shows; a progress token appears if duration is known.                                                                                               |
| **In progress**       | `RebuildingIndicator` / status slot | Accepted work still executing; a prior or interim state shown with an in-progress marker, not a fake completion ([hig/interaction-model.md](../hig/interaction-model.md)).                            |
| **Awaiting review**   | `WarningBanner` / status badge      | Content queued for human confirmation (an import exception, a steward task); marked, not silently applied.                                                                                            |
| **Failed**            | `ErrorFrame`                        | Content region replaced with an error frame: message written for the blocked user, retry action, optional detail. Never a blank surface. Partial results, if any, shown with explicit coverage.       |
| **Warning**           | `WarningBanner`                     | Inline warning badge or banner without blocking the surface; action optional.                                                                                                                         |

Result-state colour draws from `color.status.*` ([tokens.md](./tokens.md)). A result derived from an analysis may also carry a `ConfidenceLabel` — the ordinal confidence band (High/Medium/Low/Indicative) from [DOCUMENTATION-STANDARD.md §8.2](../../02-standards/DOCUMENTATION-STANDARD.md); confidence qualifies a _result_, classification labels a _claim_, and the two are shown separately.

## 4. Content-classification treatments — the provenance ramp

The Asserted / Inferred / Generated triad is a first-class, token-level commitment, not a tooltip afterthought. It is carried by `ProvenanceBadge` and an optional region tint, both bound to the `color.provenance.*` semantic family ([tokens.md](./tokens.md)).

> **Naming note.** The token family is named `color.provenance.*` for continuity with the renderer's CSS variables and [ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md). The _axis_ it encodes is **content classification** (the glossary's canonical term, [CONTEXT.md](../../../CONTEXT.md)) — what kind of claim a value is — which is distinct from _provenance_ (origin) and _confidence_ (quality). The treatments visualise classification.

The ramp gives each classification a distinct hue, icon, and label so the three are separable at the cell and region level:

| Classification | Token                        | Hue intent                                           | Icon + label                       |
| -------------- | ---------------------------- | ---------------------------------------------------- | ---------------------------------- |
| **Asserted**   | `color.provenance.asserted`  | Neutral / settled (low chroma)                       | filled check + "Asserted"          |
| **Inferred**   | `color.provenance.inferred`  | Cool / derived (blue family)                         | function/derive glyph + "Inferred" |
| **Generated**  | `color.provenance.generated` | Warm / provisional (amber–violet, the most distinct) | spark/AI glyph + "Generated"       |

Each token resolves to a foreground, a low-saturation background tint, and a border, so a value can be marked at cell scale (badge) or region scale (tint + edge). The Generated treatment is the most visually distinct of the three because generated output must not inherit authority from polish — a clean render can still be weakly supported ([hig/provenance-and-generated-work.md](../hig/provenance-and-generated-work.md)). A Generated value remains marked until acceptance writes a new Asserted operation ([CONTEXT.md](../../../CONTEXT.md)), at which point the treatment switches to Asserted.

## 5. The greyscale obligation

Colour is **never** the sole carrier of meaning (WCAG 1.4.1, [ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)). Every honest-state treatment — result state and classification alike — **must** remain unambiguous in greyscale and for common colour-vision deficiencies. This is an obligation on the _treatment_, not a hope about the palette:

1. Each treatment pairs its colour with a **distinct icon or shape** and a **text label**, so the badge reads correctly with colour removed.
2. The provenance ramp's three hues are chosen so their _lightness_ steps differ enough to separate in greyscale, but the design **must not rely** on that alone — the icon and label carry the meaning, the colour reinforces it.
3. Region tints are accompanied by an edge treatment (border style or marker), so a tinted region is still distinguishable when printed or rendered monochrome.

A worked check: a `Generated` cell shows the spark glyph and "Generated" text on an amber tint; desaturated to greyscale, the glyph and label still identify it, and its border style distinguishes it from an adjacent `Inferred` cell. This satisfies both the honesty obligation ([trust-and-honesty.md](../trust-and-honesty.md)) and WCAG 1.4.1 simultaneously ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)).

## 6. References & standards

_Normative:_

- **WCAG 2.2** (W3C), 1.4.1 Use of Colour. Meaning not conveyed by colour alone ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)).

_Informative:_

- Nielsen — **10 Usability Heuristics**, 1994. Visibility of system status.

## Related documents

| Document                                                                     | What it covers                                                        |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [DOCUMENTATION-STANDARD.md §9](../../02-standards/DOCUMENTATION-STANDARD.md) | The honest-state vocabulary these treatments realise.                 |
| [DOCUMENTATION-STANDARD.md §8](../../02-standards/DOCUMENTATION-STANDARD.md) | The integrity and confidence scales the labels reference.             |
| [tokens.md](./tokens.md)                                                     | The status and provenance colour families.                            |
| [accessibility.md](./accessibility.md)                                       | The colour-independence and contrast obligations.                     |
| [trust-and-honesty.md](../trust-and-honesty.md)                              | The product-level honesty obligations.                                |
| [signal-surfaces/README.md](../signal-surfaces/README.md)                    | How analytical and ML outputs are presented as prompts for judgement. |
