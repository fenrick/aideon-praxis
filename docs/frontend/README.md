# Frontend (Renderer) Architecture

The architecture of the Aideon Desktop renderer: the WebView surface that presents the twin and never owns it. This folder is for anyone building, reviewing, or auditing a renderer surface; it is the durable record of how the renderer is structured, how it holds state, how it talks to the host, and the contracts every surface meets before it ships.

The renderer is a presentation layer. It owns no canonical data, talks to the host only through typed IPC adapters, and runs offline-first with no renderer network ([ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). It realises the visual contract of the [design system](../03-design/design-system/README.md) and the behaviour contract of the [Human Interface Guidelines](../03-design/hig/README.md) and the [UX folder](../03-design/ux/README.md); those folders decide what a surface looks like and how it behaves, and this folder decides how the renderer is built to deliver them.

---

## Contents

1. [The renderer in one picture](#1-the-renderer-in-one-picture)
2. [The files in this folder](#2-the-files-in-this-folder)
3. [The engine packages](#3-the-engine-packages)
4. [The invariants](#4-the-invariants)
5. [References & standards](#5-references--standards)
6. [Related documents](#6-related-documents)

---

## 1. The renderer in one picture

The renderer is one platform-owned shell, a set of engine packages that contribute widgets to it, a design system behind a proxy boundary, and a thin typed-IPC seam to the host. Engines are gated by licensing — an unlicensed engine contributes nothing. Nothing durable lives in the renderer; everything it shows is a cache of host truth read at a [viewpoint](../../CONTEXT.md), and everything it changes is a command.

```
┌──────────────────────────────────────────────────────────┐
│  Aideon Desktop shell (one shell, four regions)            │
│  ┌──────────────┬───────────────────────────┬───────────┐ │
│  │ navigation   │ content (engine widgets)   │ inspector │ │
│  └──────────────┴───────────────────────────┴───────────┘ │
│  src/platform   ←  shell composition, licensing, catalogue  │
│  src/engines/<module>  ←  engines contribute widgets        │
│        │                                                    │
│  src/design-system  ←  proxy boundary (shadcn/Radix/XYFlow) │
│        │                                                    │
│  adapters + DTOs    ←  typed IPC seam (no HTTP)             │
└────────┼───────────────────────────────────────────────────┘
         ▼
      Tauri host (Rust): owns all data and side effects
```

The four files that carry the cross-cutting narrative are the shell, the state architecture, the IPC seam, and the package layout. The remaining files fix one contract each — data-fetching, the honest-state contract, accessibility, and testing — that every surface meets.

## 2. The files in this folder

| File                                                   | What it covers                                                                                                                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [shell.md](./shell.md)                                 | The one platform-owned shell, its four regions, how engines contribute widgets, and the static-export constraints.                                                     |
| [package-layout.md](./package-layout.md)               | The platform (`src/platform/`) and the engine packages at `src/engines/<module>`, and the design-system/adapters/DTOs leaf packages.                                   |
| [state-architecture.md](./state-architecture.md)       | The three-way state separation and the viewpoint as a first-class state coordinate ([ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md)).                   |
| [data-fetching.md](./data-fetching.md)                 | Server-state caching, the viewpoint-keyed cache key, invalidation from host events, and optimistic mutation.                                                           |
| [error-loading-empty.md](./error-loading-empty.md)     | The loading / error / empty / honest-state contract every surface renders, mapped to the §9 vocabulary.                                                                |
| [accessibility.md](./accessibility.md)                 | The WCAG 2.2 AA baseline, the ARIA APG patterns per component type, and where they are implemented ([ADR-0024](../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)). |
| [testing.md](./testing.md)                             | The testing architecture — Vitest, React Testing Library, Playwright, IPC mocking, and visual regression.                                                              |
| [ipc-adapters-and-dtos.md](./ipc-adapters-and-dtos.md) | The typed-IPC seam: adapters, DTOs, branded types, zod validation, error mapping, and versioning ([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)).     |

## 3. The engine packages

Engine packages mirror the modules they face, one folder per module under `src/engines/<module>` ([DOCUMENTATION-STANDARD.md §10](../02-standards/DOCUMENTATION-STANDARD.md)); the platform (`src/platform/`) composes the shell and renders their licensed widgets. A package owns its `EngineDefinition`, its widgets, its state hooks, its data-fetching keys, and its tests; it composes the design system and reaches the host only through the adapters.

**Engine surfaces** — Praxis is the engine registered today; the others are documented as design intent (their widgets land when the engine package registers in `ENGINES`):

| Package                                                  | Faces                                          | What it provides                                                                                             |
| -------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [praxis-workspace](./praxis-workspace/README.md)         | [Praxis](../05-modules/praxis/README.md)       | The primary modelling widgets: graph canvas (**Topos**), catalogue, matrix, chart, the time-first inspector. |
| [chrona-time](./chrona-time/README.md)                   | [Chrona](../05-modules/chrona/README.md)       | The viewpoint controls: as-of time, layer, scenario, diff, and merge UX, owned by the platform toolbar.      |
| [metis-workspace](./metis-workspace/README.md)           | [Metis](../05-modules/metis/README.md)         | The analytics widgets: bounded, explainable runs, results, and evidence.                                     |
| [mneme-workspace](./mneme-workspace/README.md)           | [Mneme](../05-modules/mneme/README.md)         | The operator widgets: storage health, jobs, integrity, schema, maintenance.                                  |
| [continuum-automation](./continuum-automation/README.md) | [Continuum](../05-modules/continuum/README.md) | The automation widgets: schedules, connectors, runs, and provenance.                                         |

**Shared leaf packages:**

| Package                                        | What it provides                                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [design-system](./design-system/README.md)     | The renderer-side wrappers behind the proxy boundary; realises [03-design/design-system](../03-design/design-system/README.md). |
| [praxis-adapters](./praxis-adapters/README.md) | The typed IPC adapter interfaces (`GraphAdapter`, `MutableGraphAdapter`, `MetaModelProvider`).                                  |
| [praxis-dtos](./praxis-dtos/README.md)         | The DTO shapes crossing the boundary, with branded types and zod validation.                                                    |

**Planned surfaces** — design intent only, one short README each, landing at `src/engines/<module>`:

[kairos-investment](./kairos-investment/README.md) · [koinon-collaboration](./koinon-collaboration/README.md) · [themis-governance](./themis-governance/README.md) · [aegis-risk](./aegis-risk/README.md) · [skopos-discovery](./skopos-discovery/README.md) · [lexis-search](./lexis-search/README.md) · [pylon-interchange](./pylon-interchange/README.md) · [kerux-reporting](./kerux-reporting/README.md) · [sophia-assist](./sophia-assist/README.md)

## 4. The invariants

These hold across every surface and are checked at review; a surface that breaks one is a defect, not a variation.

- **The renderer owns no data.** Server-state is a cache of host truth, never canonical ([ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md)). A mutation is a command, never an in-place edit of the cache.
- **The host is reached only through typed IPC adapters.** No `fetch`, no `axios`, no TCP listener, no raw path access ([ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). The renderer is offline-first.
- **The viewpoint is part of every server-state cache key.** A read cached at one viewpoint is never served for another ([ADR-0009](../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md), [ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md)).
- **Product code consumes the design system, never raw primitives.** shadcn, Radix, `react-resizable-panels`, the icon library, and XYFlow are reached only through `src/design-system` ([ADR-0010](../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)).
- **Honest state is never faked.** Loading, empty, partial, stale, rebuilding, generated, and failed states render from the shared §9 vocabulary ([DOCUMENTATION-STANDARD.md §9](../02-standards/DOCUMENTATION-STANDARD.md)); the renderer never locally diffs or invents a state the host did not report.

## 5. References & standards

_Normative — recorded in the [standards register](../02-standards/STANDARDS-REGISTER.md):_

- **WCAG 2.2** (W3C) and the **WAI-ARIA Authoring Practices Guide**. The accessibility baseline and interaction patterns ([ADR-0024](../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)).
- W3C — **Design Tokens Community Group format**. The token source format ([ADR-0025](../06-adrs/ADR-0025-design-token-architecture.md)).
- **Semantic Versioning 2.0.0**. DTO and contract versioning ([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)).

_Informative:_

- Frost — **Atomic Design**, 2016. The token → primitive → block → surface layering.
- Nielsen — **10 Usability Heuristics**, 1994. Visibility of system status, behind the honest-state contract.

## 6. Related documents

| Document                                                                                | What it covers                                                                  |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [DESIGN.md](./DESIGN.md)                                                                | The prior shell design, retained as a pointer to this index and the shell file. |
| [03-design/design-system/README.md](../03-design/design-system/README.md)               | The visual contract the renderer realises.                                      |
| [03-design/hig/README.md](../03-design/hig/README.md)                                   | The behaviour and visual pattern guidelines the renderer realises.              |
| [03-design/ux/README.md](../03-design/ux/README.md)                                     | The behaviour-level interaction contract.                                       |
| [ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)                   | The trust boundary and typed IPC the renderer sits behind.                      |
| [ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md)                          | The frontend state architecture this folder builds on.                          |
| [01-architecture/ARCHITECTURE-BOUNDARY.md](../01-architecture/ARCHITECTURE-BOUNDARY.md) | The suite-level boundary and layering rules.                                    |
