# Product Design

What Aideon Desktop is and how it behaves — the durable design record for the product layer. This folder is the
_explanation_ layer of the corpus (Procida, Diátaxis): it sits below the architecture and standards, above the contracts
and modules, and explains the reasoning a competent engineer or architect would need to rebuild, extend, or audit the
product. It does not make architecture decisions; those live in the [ADR set](../06-adrs/ADRS.md).

Aideon Desktop is a **desktop-first, local-first, time-first digital-twin modelling application**: a Tauri v2 shell (an
untrusted WebView renderer over a Rust core) that separates **meaning** ([Praxis](../05-modules/praxis/README.md)) from
**storage** ([Mneme](../05-modules/mneme/README.md)) so the surface stays stable while engines evolve behind typed
boundaries. The vocabulary it uses is fixed by the root glossary, [`CONTEXT.md`](../../CONTEXT.md); the form it is
written in is fixed by the [Documentation Standard](../02-standards/DOCUMENTATION-STANDARD.md).

---

## How to read this layer

Start with the design spine, then follow the area that answers your question. Each area below is a folder of small
single-topic files indexed by its own README (Documentation Standard §4).

```
overview & axioms  →  design/ (this README + the spine files)
the workspace      →  desktop-first-workspace/
the product unit   →  artefacts/
the whole UX (map) →  UX-DESIGN.md
how it feels       →  ux/
honesty signals    →  signal-surfaces/
the numbers        →  analytics/
the framing        →  host-surfaces/, participation-and-trust/
the modelling lang →  metamodel/, semantic-spine/
the movement       →  forces-of-change/
the pixels         →  DESIGN-SYSTEM.md, frontend/
```

---

## The design spine

The five files that carry the cross-cutting design narrative. Read these first.

| Document                                               | What it covers                                                                                                                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [DESIGN.md](./DESIGN.md)                               | Short overview and entry point into this layer.                                                                                                                                |
| [design-axioms.md](./design-axioms.md)                 | The ten non-negotiable invariants every surface and module upholds.                                                                                                            |
| [the-shell.md](./the-shell.md)                         | The one shared shell and its four stable regions.                                                                                                                              |
| [UX-DESIGN.md](./UX-DESIGN.md)                         | The UX overview/map — one shell, the surface family with milestone scope, the cross-cutting rules, the layers, and the open IA decisions; the navigable entry to the whole UX. |
| [module-map.md](./module-map.md)                       | The module pantheon — implemented and planned — and how the renderer reaches them.                                                                                             |
| [module-delivery-order.md](./module-delivery-order.md) | Why modules ship in the order the [roadmap](../00-index/ROADMAP.md) states — the dependency-driven critical path.                                                              |
| [trust-and-honesty.md](./trust-and-honesty.md)         | The honest-state obligations the product carries to its users.                                                                                                                 |
| [vocabulary.md](./vocabulary.md)                       | Pointer to the canonical glossary and the most consequential distinctions.                                                                                                     |

## Product design areas

| Area                                                            | What it covers                                                                                                                                                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [artefacts/](./artefacts/README.md)                             | The artefact — the primary product of the model: what it is, its contract, its forms and families, content classification, explanation surfaces, intelligence and automation, abstraction levels.             |
| [ux/](./ux/README.md)                                           | The behaviour-level interaction contract: shell, selection, drill-down, time and scenario, accepted work, backpressure, honest-state treatment, editing, the workspace family, accessibility and performance. |
| [signal-surfaces/](./signal-surfaces/README.md)                 | How analytical and ML outputs are presented as prompts for judgement — the authority rule, required elements, signal families, confidence, suppression, ownership.                                            |
| [analytics/](./analytics/README.md)                             | The Metis analytics engine — deterministic, bounded, explainable — and opt-in usage telemetry.                                                                                                                |
| [desktop-first-workspace/](./desktop-first-workspace/README.md) | The single thesis the product rests on: a canonical portable workspace plus a derived local index engine.                                                                                                     |
| [host-surfaces/](./host-surfaces/README.md)                     | The cross-cutting surfaces close to the shell: workspace home, executive briefing, administration and controls.                                                                                               |
| [participation-and-trust/](./participation-and-trust/README.md) | The human operating model: participation modes, trust cues, and behaviour under pressure.                                                                                                                     |

## The modelling language and its movement

These areas are authored separately and are linked here as the foundation the product layer rests on. **Treat them as
canonical** — the product areas above defer to them on the metamodel, the spine, and the planning thesis.

| Area                                              | What it covers                                                                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [metamodel/](./metamodel/README.md)               | The authored, portable modelling language — entity and relationship types, slots, the effective schema, packages, validation, extension.                     |
| [semantic-spine/](./semantic-spine/README.md)     | The normative strategy-to-execution lineage (Intent → Value → Capability → Execution → Technology → Change) along which integrity and explainability reason. |
| [forces-of-change/](./forces-of-change/README.md) | Why a twin is never still — entropy and action — and how Aideon turns movement into investment, the thesis behind [Kairos](../05-modules/kairos/README.md).  |

## The visual layer

Owned by the design-system author; linked here so the product design resolves down to the pixels.

| Area                                       | What it covers                                                                                                                                                                                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [design system](./design-system/README.md) | The token→primitive→block→surface system, the shadcn foundation behind the proxy boundary ([ADR-0010](../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)), and the visual language the shell renders. |
| [HIG](./hig/README.md)                     | The desktop Human Interface Guidelines — the recurring interaction and visual patterns every surface follows.                                                                                                                    |
| [frontend/](../frontend/DESIGN.md)         | The renderer architecture and the per-module frontend feature packages.                                                                                                                                                          |

---

## References & standards

_Informative — the references this whole layer leans on (full list in the
[standards register](../02-standards/STANDARDS-REGISTER.md)):_

- Procida — **Diátaxis**. The explanation/reference/how-to separation that places this layer.
- The Open Group — **TOGAF Standard, 10th Edition** and **ArchiMate 3.2 Specification**. The enterprise-architecture
  alignment behind artefact families and the metamodel.
- Nielsen — **10 Usability Heuristics**, 1994; Pirolli & Card — **Information Foraging**, 1999. The UX and
  explanation-surface basis.

## Related documents

| Document                                                            | What it covers                                                                 |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [`CONTEXT.md`](../../CONTEXT.md)                                    | The canonical domain glossary — the source of truth for vocabulary.            |
| [Documentation Standard](../02-standards/DOCUMENTATION-STANDARD.md) | How every document in this layer is written, structured, and held to standard. |
| [Standards Register](../02-standards/STANDARDS-REGISTER.md)         | The shared bibliography this layer cites.                                      |
| [01-architecture/README.md](../01-architecture/README.md)           | The system shape and boundary rules this layer realises.                       |
| [00-index/README.md](../00-index/README.md)                         | The documentation map and reading order.                                       |
