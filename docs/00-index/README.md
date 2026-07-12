# Aideon Desktop — Documentation

Aideon Desktop is a **desktop-first, local-first, time-first digital twin** of an organisation. It runs as a Tauri v2
application — a WebView renderer over a Rust core — and separates **meaning** (Praxis), **memory/storage** (Mneme),
**time** (Chrona), **analytics** (Metis), and **orchestration** (Continuum) behind typed boundaries, so the interface
stays stable while the engines evolve.

This is the documentation map. New here? Read in this order: the glossary, then the design spine, then the layer you
need.

> **The one idea everything rests on.** The canonical project is a **portable workspace folder** — append-only
> operations (`model/ops/`), schema-as-data (`model/schema/`), and immutable content-addressed blobs
> (`objects/sha256/`). The runtime database under `.aideon/runtime/` is a **derived, rebuildable cache**: delete it and
> rebuild it from the canonical files with no data loss. Operations and schema-as-data are canonical; temporal facts,
> effective graphs, indexes, and projections are derived (a fact is resolved from operations on read). See
> [`03-design/desktop-first-workspace/`](../03-design/desktop-first-workspace/README.md) and
> [`ADR-0001`](../06-adrs/ADR-0001-workspace-is-canonical-authority.md).

---

## Start here

| Read first                                                                            | Why                                                                                                                                   |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [`CONTEXT.md`](../../CONTEXT.md)                                                      | The canonical domain glossary — twin, workspace, viewpoint, fact, layer, scenario, artefact. Every document uses these terms exactly. |
| [`03-design/README.md`](../03-design/README.md)                                       | The product design spine — what Aideon is and how it behaves.                                                                         |
| [`02-standards/DOCUMENTATION-STANDARD.md`](../02-standards/DOCUMENTATION-STANDARD.md) | How these documents are written: voice, the unified scales, citation rules, and the module pantheon.                                  |

---

## Layers

| Folder                                             | Convention            | Contents                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`01-architecture/`](../01-architecture/README.md) | arc42 + C4            | System shape, the boundary rules, the module dependency graph, quality attributes, [performance and scale](../01-architecture/performance-and-scale.md), C4 model.                                                                                                                                                                  |
| [`02-standards/`](../02-standards/)                | Engineering handbook  | The documentation standard, the [standards register](../02-standards/STANDARDS-REGISTER.md), design governance, ADR format, coding standards, [CI checks](../02-standards/CI-CHECKS.md), [testing](../02-standards/testing/README.md), [security](../02-standards/security/README.md), getting started.                             |
| [`03-design/`](../03-design/README.md)             | Explanation           | What the product is and how it behaves — the design spine, metamodel, semantic spine, forces of change, artefacts, UX, design system, HIG, signal surfaces.                                                                                                                                                                         |
| [`04-contracts/`](../04-contracts/README.md)       | Interface reference   | The typed shapes binding renderer ↔ host ↔ engines: [temporal & scenario](../04-contracts/temporal-and-scenario/README.md), [IPC](../04-contracts/ipc/README.md), [projection & invalidation](../04-contracts/projection-and-invalidation/README.md), [accepted work & events](../04-contracts/accepted-work-and-events/README.md). |
| [`05-modules/`](../05-modules/)                    | Per-component design  | One folder per module — see the pantheon below.                                                                                                                                                                                                                                                                                     |
| [`06-adrs/`](../06-adrs/ADRS.md)                   | MADR / Nygard ADRs    | The decisions that fix the invariants — start at [`ADRS.md`](../06-adrs/ADRS.md).                                                                                                                                                                                                                                                   |
| [`frontend/`](../frontend/README.md)               | Renderer architecture | The React renderer: shell, state architecture, data fetching, accessibility, and the per-module workspaces.                                                                                                                                                                                                                         |

---

## The module pantheon

Modules carry conceptual names from Greek and Latin roots; the name evokes the role, never the technology. The full
taxonomy and boundary rules are fixed by [ADR-0011](../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md).

**Engines (implemented or in progress)**

| Module                                         | Role                                                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [Praxis](../05-modules/praxis/README.md)       | Meaning — metamodel, edge catalogue, tasks, artefact execution, integrity scoring, explainability. |
| [Mneme](../05-modules/mneme/README.md)         | Memory — op log, bitemporal facts, schema-as-data, blob store, derived runtime, engine trait.      |
| [Metis](../05-modules/metis/README.md)         | Analytics — bounded centrality, impact, paths, and cost over the graph.                            |
| [Chrona](../05-modules/chrona/README.md)       | Chronological time — viewpoint resolution, layer policy, diff, scenario composition.               |
| [Continuum](../05-modules/continuum/README.md) | Durable orchestration — jobs, retries, schedules, workflow composition, the run ledger.            |
| [Host](../05-modules/host/README.md)           | The Tauri trust boundary — typed IPC, capabilities, workspace lifecycle, OS integration.           |
| [Engine](../05-modules/engine/README.md)       | The engine harness that wires the domain engines behind their traits for the host.                 |

**Planned modules (design intent)**

| Module                                   | Role                                                                                                                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Kairos](../05-modules/kairos/README.md) | Opportune time — investment and portfolio/programme/project planning. Pairs with Chrona (_chronos_ + _kairos_). See [Forces of Change](../03-design/forces-of-change/README.md). |
| [Lexis](../05-modules/lexis/README.md)   | Search and discovery — full-text and semantic retrieval over the twin.                                                                                                           |
| [Pylon](../05-modules/pylon/README.md)   | Interchange — file/manual import/export and connectors (ArchiMate Open Exchange, CSV/Excel).                                                                                     |
| [Skopos](../05-modules/skopos/README.md) | Automated discovery / reality-sync — continuous ingestion keeping the `actual` layer fresh; the entropy feeder for Kairos.                                                       |
| [Sophia](../05-modules/sophia/README.md) | AI assistance — LLM-assisted authoring behind guardrails; all output Generated.                                                                                                  |
| [Kerux](../05-modules/kerux/README.md)   | Reporting and publishing — deterministic briefings, roadmaps, and packaged outputs.                                                                                              |
| [Koinon](../05-modules/koinon/README.md) | Collaboration — sync, presence, shared workspace, merge/conflict UX (owns [ADR-0005](../06-adrs/ADR-0005-sync-and-conflict-model.md)).                                           |
| [Themis](../05-modules/themis/README.md) | Governance — identity, RBAC, approvals, retention, audit, capability policy.                                                                                                     |
| [Aegis](../05-modules/aegis/README.md)   | Risk, controls, and compliance — risk register and control library mapped onto the twin.                                                                                         |

**Folded concerns** — named capabilities that live inside an existing module, each with a split-out trigger recorded in
[ADR-0011](../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md): **Oikos** (run-cost/FinOps, in Metis + Kairos),
**Krisis** (validation & data-quality, in Praxis), **Topos** (cartography & auto-layout, in the renderer + Praxis),
**Logos** (narrative & rationale, in Kerux + Mneme).

---

## Common entry points

- **Architecture & boundaries** → [`01-architecture/README.md`](../01-architecture/README.md), then
  [`boundary/`](../01-architecture/boundary/README.md) and the
  [module dependency map](../01-architecture/module-dependency-map.md).
- **The product design spine** → [`03-design/README.md`](../03-design/README.md), then
  [`artefacts/`](../03-design/artefacts/README.md), [`ux/`](../03-design/ux/README.md), and the
  [semantic spine](../03-design/semantic-spine/README.md).
- **Planning the spend** → [`03-design/forces-of-change/`](../03-design/forces-of-change/README.md) (entropy and action)
  and [Kairos](../05-modules/kairos/README.md).
- **The metamodel** → [`03-design/metamodel/`](../03-design/metamodel/README.md) and the
  [Praxis edge catalogue](../05-modules/praxis/edge-catalogue/README.md).
- **Storage & the temporal model** → [`05-modules/mneme/`](../05-modules/mneme/README.md),
  [`04-contracts/temporal-and-scenario/`](../04-contracts/temporal-and-scenario/README.md).
- **The IPC boundary** → [`04-contracts/ipc/`](../04-contracts/ipc/README.md),
  [`05-modules/host/`](../05-modules/host/README.md).
- **Look and behaviour** → [`03-design/design-system/`](../03-design/design-system/README.md),
  [`03-design/hig/`](../03-design/hig/README.md), [`frontend/`](../frontend/README.md).
- **What to build first** → [`ROADMAP.md`](./ROADMAP.md) (the MVP, the milestone exit criteria, and the build sequence)
  and [`03-design/module-delivery-order.md`](../03-design/module-delivery-order.md) (the dependency rationale).
- **Building it as executable contracts** → [`build-contracts/`](../build-contracts/README.md) — the golden journey, the
  contract precedence, and the agent-ready issue template that turn the design into work an agent can complete.
- **Making a durable decision** → [`02-standards/DESIGN-GOVERNANCE.md`](../02-standards/DESIGN-GOVERNANCE.md), then
  write an ADR per [`02-standards/ADR-FORMAT.md`](../02-standards/ADR-FORMAT.md).

---

## How the docs relate

Design lineage flows downward; each layer realises the one above it.

```text
CONTEXT.md       →  the shared vocabulary every layer uses
01-architecture  →  boundaries, the module graph, quality attributes
02-standards     →  how decisions are made and code/docs are held to standard
03-design        →  what the product is and how it behaves
04-contracts     →  the typed shapes that bind renderer ↔ host ↔ engines
05-modules       →  how each engine expresses the design
06-adrs          →  the decisions that fix the invariants
```

Documentation is authoritative: code is updated to match it, and documentation changes to match code only when the
intended architecture has genuinely changed (see [Architecture Boundary](../01-architecture/boundary/README.md),
_Documentation Precedence_).
