# HIG: Foundations

The shared defaults every user-facing surface inherits before a feature team adds local behaviour. This page covers
accessibility, typography, density, colour, motion, language, and data visualisation — the places where a product drifts
quietly if nobody sets a standard. Apply it when designing or reviewing any screen, component, or design-system
primitive.

It does not substitute for workflow semantics, contract rules, or module ownership. Foundations tell the product how to
present itself; they do not decide what a workflow may do.

---

## The principle

Foundations are the rules that disappear into the product once they work. A user should not notice that typography,
spacing, and motion are consistent; they notice immediately when they are not. Teams treat foundations as defaults to
inherit, not values to negotiate per feature. A surface that needs a different type scale, spacing logic, or state
colours should be rare and should trigger a design-system review.

These defaults are realised by the design system, not re-implemented per surface: tokens
([design-system/tokens.md](../design-system/tokens.md)), interaction states
([design-system/interaction-states.md](../design-system/interaction-states.md)), motion
([design-system/motion.md](../design-system/motion.md)), and accessibility
([design-system/accessibility.md](../design-system/accessibility.md)).

## Accessibility baseline

Accessibility is both an inclusion requirement and a design-quality test. A complex surface with no coherent keyboard
path is usually a muddled surface; a focus state that cannot be shown cleanly usually means focus, selection, and
activation are being conflated.

The baseline is **WCAG 2.2 AA**, applied uniformly
([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)). Every meaningful action **must** be reachable
from the keyboard; focus **must** always be visible; colour **must not** carry meaning alone; reduced-motion preferences
**must** be honoured; and on complex surfaces — tables, charts, canvases — a screen reader **must** be able to identify
an object's name, type, state, relationship, and available action. These are minimums, not stretch goals; reviews check
actual keyboard flow and announcement, not assumptions inherited from third-party primitives
([design-system/accessibility.md](../design-system/accessibility.md)).

## Typography, density, and layout

Aideon supports three reading modes at once — narrative reading, rapid scanning, and precise comparison — so prose,
metadata, identifiers, measures, and numbers **should not** all look alike; users switch modes constantly. The type
families and scale serve this ([design-system/tokens.md](../design-system/tokens.md)).

A default density (tuned for clarity) and a compact density (tuned for expert dense-data work) are both supported.
Compact **must never** mean cramped: spacing still reveals grouping, hierarchy, and interaction boundaries
([design-system/density-and-calm.md](../design-system/density-and-calm.md)).

## Colour and state

Colour is semantic before it is expressive. Accent colour identifies emphasis and interaction; status colour identifies
meaning (success, warning, error, information, selected, disabled); brand colour is not a substitute for a complete
state system ([design-system/tokens.md](../design-system/tokens.md)). Light and dark are both valid — as semantic token
remaps ([ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md)) — but readability wins: a theme that makes
comparison, structure, or focus harder to read is wrong for Aideon however fashionable.

## Motion and spatial logic

Motion explains change; it does not perform delight. It earns its place when it shows where something came from, where
it went, or what now has focus — when it reduces thinking. Long transitions and decorative physics are out of scope.
Motion honours reduced-motion preferences and is never the sole carrier of meaning
([design-system/motion.md](../design-system/motion.md),
[ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)).

## Language and voice

The product voice is plain, direct, and stable. Labels say what they mean; buttons name the action; empty states explain
what belongs on the surface and how to begin; helper text answers the next real question. The corpus and product use
**British English** ([DOCUMENTATION-STANDARD.md §2](../../02-standards/DOCUMENTATION-STANDARD.md)). Copy avoids inflated
habits — vague abstractions, promotional adjectives, seriousness-by-synonym, and filler that delays the point. If
language on a surface cannot tell the user what is happening in a few plain sentences, the surface usually needs
structural work, not better adjectives.

## Data visualisation

Charts are analytical instruments: their job is to support reading, comparison, and decision-making. Every chart needs a
clear title, an intelligible measure, visible units where relevant, and defaults that favour truthful reading over
novelty. When a chart is central to a decision, the user **must** be able to discover the filters, thresholds,
assumptions, freshness, and provenance that shape it
([provenance-and-generated-work.md](./provenance-and-generated-work.md)). Distorted scales, ambiguous colour ramps, and
decorative clutter are design failures, not styling choices.

## Desktop-first note

These foundations are written for the desktop, local-first, offline Tauri renderer ([DESIGN.md](../DESIGN.md)). Fonts
are self-hosted, never a runtime CDN, to honour the offline posture
([ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)). Hover may enrich the
desktop experience, but it is never the only path to structural navigation or meaning-changing context
([shell-and-navigation.md](./shell-and-navigation.md)).

## References & standards

_Normative:_

- **WCAG 2.2** (W3C). The accessibility baseline ([ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)).

_Informative:_

- Nielsen — **10 Usability Heuristics**, 1994. Visibility, minimalist design.

## Related documents

| Document                                                            | What it covers                                     |
| ------------------------------------------------------------------- | -------------------------------------------------- |
| [design-system/README.md](../design-system/README.md)               | The layer that implements these foundations.       |
| [design-system/tokens.md](../design-system/tokens.md)               | Colour, type, spacing, motion tokens.              |
| [design-system/accessibility.md](../design-system/accessibility.md) | The WCAG 2.2 AA realisation.                       |
| [interaction-model.md](./interaction-model.md)                      | The operating model that builds on these defaults. |
