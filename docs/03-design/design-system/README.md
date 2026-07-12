# Design System

The shared, domain-free UI layer that makes Aideon Desktop's calm, dense, explainable, workspace-first posture the
cheapest path to build. This folder is for anyone designing, building, or reviewing a renderer surface; it is the
rulebook for the reusable visual and interaction vocabulary every product surface composes from.

The design system is owned by `src/design-system` and sits behind the proxy boundary fixed by
[ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md): shadcn/ui + Tailwind v4 are
the building material, but product code never imports them directly. This folder is the spec; the ADR records the
decision.

---

## Contents

1. [The layer model](#1-the-layer-model)
2. [The domain-free boundary](#2-the-domain-free-boundary)
3. [The files in this folder](#3-the-files-in-this-folder)
4. [What the design system must make easy, and prevent](#4-what-the-design-system-must-make-easy-and-prevent)
5. [References & standards](#5-references--standards)
6. [Related documents](#6-related-documents)

---

## 1. The layer model

The design system is layered: each layer depends only on the layers below it, and a change at one layer does not ripple
upward. This is Atomic Design's atoms→molecules→organisms progression _(Frost, Atomic Design, 2016)_, adapted to four
named layers the corpus uses consistently.

| Layer          | What it is                                                                                              | Where it lives                        | File                             |
| -------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------- |
| **Tokens**     | Named values — colour, type, space, radius, elevation, motion — in two tiers (reference then semantic)  | DTCG source + generated CSS variables | [tokens.md](./tokens.md)         |
| **Primitives** | Accessible low-level controls (button, input, select, dialog, table, tabs) wrapped from shadcn/Radix    | `src/design-system/components`        | [primitives.md](./primitives.md) |
| **Blocks**     | Aideon-specific compositions (shell regions, inspector stack, artefact frames, honest-state treatments) | `src/design-system/blocks`            | [blocks.md](./blocks.md)         |
| **Surfaces**   | Product feature UI and host-shell composition — where work _means_ something                            | feature modules + app shell           | [surfaces.md](./surfaces.md)     |

The progression is strict. A token never depends on a primitive; a primitive never reaches into a block; a block never
imports a surface. The dependency arrow points only downward, which is what lets the team retheme (a token remap,
[ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md)) or swap a primitive's substrate at one seam without
product-code churn.

Tokens are the source of styling truth
([ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)); product code and proxy
components consume **semantic** tokens, never raw values. The full token architecture is in [tokens.md](./tokens.md).

## 2. The domain-free boundary

The design system carries **no domain semantics**. It must not know about an entity type, a layer, a scenario, an
artefact family, or any term from the [glossary](../../../CONTEXT.md). It provides structural, visual, and interaction
vocabulary; feature code decides what the work means.

The rule is a two-way test:

- If a component only makes sense inside one domain feature and has no reusable pattern behind it, it **must** live in
  that feature module, not here.
- If two feature modules need the same pattern, it **should** be promoted into the design system — but stripped of
  domain meaning, exposing the domain part through slots and props.

**How it is enforced.** The boundary is the same proxy boundary
[ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md) draws and is enforced three
ways:

1. **Architecturally** — the domain-free rule is owned by
   [ARCHITECTURE-BOUNDARY.md](../../01-architecture/ARCHITECTURE-BOUNDARY.md); the design system is a leaf with no
   dependency on feature modules.
2. **By lint** — the ESLint proxy-boundary rule (`no-restricted-imports`) blocks these patterns in all product code
   outside `src/design-system/`
   ([ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)):
   - `lucide-react` → use `import { … } from 'design-system/icons'`
   - `@radix-ui/*` → use the proxied shadcn component from `'design-system'`
   - `design-system/components/**` → use `'design-system'` or `'design-system/reactflow/*'`
   - `design-system/blocks/**` → use `'design-system'`
3. **By review** — a block that names a domain type, hard-codes a status string, or branches on a layer/scenario is
   rejected at review and the domain part is lifted into a slot.

A worked check: a `ProvenanceBadge` block is in-bounds because it takes a classification token (`asserted` / `inferred`
/ `generated`) and renders the agreed treatment; it does _not_ know what a `Capability` is. A component that renders
"Capability tier" labels is a surface, not a block.

## 3. The files in this folder

| File                                                                         | What it covers                                                                                                                                          |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [tokens.md](./tokens.md)                                                     | The W3C DTCG token format, the reference/semantic tiers, and every token family — colour ramp, typography, spacing, radius, shadow/elevation, motion.   |
| [primitives.md](./primitives.md)                                             | The accessible low-level controls wrapped behind the proxy boundary, and the rules every primitive obeys.                                               |
| [blocks.md](./blocks.md)                                                     | The Aideon-specific compositions: shell, inspector, artefact frames, dashboards, honest-state treatments.                                               |
| [surfaces.md](./surfaces.md)                                                 | What a product surface may and may not do, and how it composes blocks.                                                                                  |
| [honest-state-treatments.md](./honest-state-treatments.md)                   | The visual treatments for the §9 honest-state vocabulary and content classification, including the provenance colour ramp and its greyscale obligation. |
| [interaction-states.md](./interaction-states.md)                             | Hover, focus, active, disabled, selected, and target-size rules with concrete values.                                                                   |
| [density-and-calm.md](./density-and-calm.md)                                 | The dense-by-default, quiet-chrome posture.                                                                                                             |
| [motion.md](./motion.md)                                                     | Motion tokens, the reduced-motion fallback, and compositor-friendly properties.                                                                         |
| [accessibility.md](./accessibility.md)                                       | The WCAG 2.2 AA target, the ARIA APG patterns, contrast, and target size 2.5.8.                                                                         |
| [canvas-and-graph.md](./canvas-and-graph.md)                                 | XYFlow integration, the **Topos** folded concern, and node/edge styling conformance.                                                                    |
| [component-completeness-checklist.md](./component-completeness-checklist.md) | The variants every block must ship before it is considered done.                                                                                        |

## 4. What the design system must make easy, and prevent

It must make easy: opening a workspace that feels calm and dense; keeping the viewpoint visible when time, scenario,
layer, or freshness changes meaning; moving from artefact to explanation to action inside the one shell; rendering
honest loading, empty, partial, stale, rebuilding, generated, and error states from a shared vocabulary; and
distinguishing Asserted, Inferred, and Generated content at a glance.

It must prevent: raw third-party primitives leaking into surfaces; module-specific chrome invented in feature code;
hidden viewpoint context; custom status colours and one-off loaders; decorative layouts that waste dense space; and any
domain semantics encoded in shared components. A design system that only enables and never forbids is a polite
suggestion, not a system.

## 5. References & standards

_Informative — recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md):_

- Frost — **Atomic Design**, 2016. The token → primitive → block → surface layering.
- Google — **Material Design 3** token architecture. Reference vs semantic token separation.
- W3C — **Design Tokens Community Group format**. The token source format
  ([ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md)).

## 6. Related documents

| Document                                                                                    | What it covers                                                   |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md) | The shadcn/Tailwind foundation behind the proxy boundary.        |
| [ADR-0025](../../06-adrs/ADR-0025-design-token-architecture.md)                             | The DTCG, tiered token architecture.                             |
| [ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)                         | The WCAG 2.2 AA accessibility baseline.                          |
| [ARCHITECTURE-BOUNDARY.md](../../01-architecture/ARCHITECTURE-BOUNDARY.md)                  | The domain-free boundary rule and its enforcement.               |
| [hig/README.md](../hig/README.md)                                                           | The desktop Human Interface Guidelines the design system serves. |
| [the-shell.md](../the-shell.md)                                                             | The one shared shell and its four stable regions.                |
| [trust-and-honesty.md](../trust-and-honesty.md)                                             | The honest-state obligations the treatments realise.             |
| [frontend/DESIGN.md](../../frontend/DESIGN.md)                                              | The renderer architecture that consumes this system.             |
