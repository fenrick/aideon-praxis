# Package Layout

How the renderer is decomposed into packages, and why a feature package mirrors the module it faces. This file is for anyone adding a surface or deciding where a piece of code belongs.

---

## The principle

Two kinds of package make up the renderer: the **platform** (`src/platform/`), which owns the one shell and composes it, and the **engine packages** (`src/engines/<module>/`), one folder per functional engine, which contribute widgets to that shell ([DOCUMENTATION-STANDARD.md §10](../02-standards/DOCUMENTATION-STANDARD.md)). An engine package mirrors the module it faces, echoing the module taxonomy ([ADR-0011](../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)): the engine that faces [Praxis](../05-modules/praxis/README.md) is `src/engines/praxis`, the one that faces [Mneme](../05-modules/mneme/README.md) is `src/engines/mneme`. A reader who knows the modules knows where the surface code lives, and a module's renderer concerns stay together.

The trade-off is that a concern spanning two engines has no single home; it belongs in the platform if it is shell-level, in the design system if it is domain-free, or in the leaf adapters/DTOs if it is contract. An engine package never depends on another engine package — cross-engine sharing goes down through the platform or the leaves, never sideways.

## The layers

The packages form a strict downward dependency, mirroring the design-system layer model ([03-design/design-system/README.md](../03-design/design-system/README.md)):

| Layer                | Package(s)                                                                                                            | Depends only on                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Engines**          | `src/engines/<module>` (each exports an `EngineDefinition`)                                                           | platform, design system, adapters, DTOs |
| **Platform / shell** | `src/platform/` (engine registry, widget catalogue, host-platform state) + `src/aideon/shell/` (`AideonDesktopShell`) | design system, adapters, DTOs           |
| **Design system**    | `src/design-system` (proxy boundary)                                                                                  | tokens, shadcn/Radix/XYFlow (wrapped)   |
| **Contract leaves**  | `src/adapters`, `src/dtos`                                                                                            | TypeScript only                         |

An engine imports down; nothing imports an engine except the platform's engine registry (`src/platform/engines.ts`). The contract leaves (`src/adapters`, `src/dtos`) are type-first and have no React, Tauri, DOM, or network dependency, so they stay portable across renderer and host-mock contexts ([ipc-adapters-and-dtos.md](./ipc-adapters-and-dtos.md)).

## What an engine package owns

An engine package under `src/engines/<module>` owns:

- **Its `EngineDefinition`** (`engine.tsx`) — the `widgets` it contributes and the `renderWidget(widget, context)` dispatcher the platform calls ([shell.md](./shell.md)).
- **Its widget components** — the canvas widgets (Praxis: graph, catalogue, matrix, chart) those contributions render.
- **Its data-fetching keys and hooks** — server-state read through the adapters and the engine's API module (e.g. `praxis-api.ts`), keyed by viewpoint ([data-fetching.md](./data-fetching.md)).
- **Its layout presets and engine-local hooks** — e.g. `layouts/` (reusable canvas configurations), `use-canvas-layout.ts`, `use-platform-shortcuts.ts`, the selection store, and the temporal-panel hook.
- **Its DTO mapping** — turning boundary DTOs into UI-ready state inside hooks, not components.
- **Its tests** — hook tests, component tests, and the engine's slice of the Playwright journeys ([testing.md](./testing.md)).

An engine package does **not** own: the shell or its regions (the platform owns those), domain-free visual components (the design system), IPC wiring beyond calling an adapter, or any durable storage.

## What the platform owns

`src/platform/` owns the single shell composition and the shared state:

- **The engine registry** (`engines.ts`, `ENGINES`) and the **widget catalogue** (`widget-catalog.ts`, `useWidgetCatalog`) that flattens the licensed engines' widgets and routes rendering.
- **Licensing** (`licensing.tsx`, `useLicensing`) — the gate that decides which engines appear.
- **The host-platform state provider** (`host-platform-provider.tsx`, `useHostPlatform`) — the active surface, Workspace structure (scenarios, saved structures, artefacts, review work), layout presets, selection, temporal cursor, surface composition/layout, inspector patch, owned once for the whole shell ([state-architecture.md](./state-architecture.md)).
- **The four region components** the shell renders: `PlatformNavigation`, `PlatformToolbar`, `PlatformContent`, `PlatformInspector` (`platform-navigation.tsx`, `platform-surfaces.tsx`).

## The seed packages

The seed renderer ships:

- `src/engines/praxis` — the only engine registered in `ENGINES` today; contributes the graph/catalogue/matrix/chart widgets ([praxis-contributions](./praxis-contributions/README.md)).
- `src/engines/mneme` — the Mneme engine API scaffold backing contract tests ([mneme-workspace](./mneme-workspace/README.md)); not yet a registered widget-contributing engine.
- The Metis and Continuum surfaces ([metis-workspace](./metis-workspace/README.md), [continuum-automation](./continuum-automation/README.md)) and the shell-level [chrona-time](./chrona-time/README.md) viewpoint control are documented as design intent until their engine packages register widgets.

The planned surfaces — kairos, koinon, themis, aegis, skopos, lexis, pylon, kerux, sophia — each carry a PLANNED design-intent README in this folder and will land as `src/engines/<module>` when their module's crate exists ([DOCUMENTATION-STANDARD.md §10](../02-standards/DOCUMENTATION-STANDARD.md)).

## Naming and imports

Imports use relative or `src`-rooted paths; the adapters and DTOs were flattened from standalone packages into `src/adapters` and `src/dtos` within the desktop package, and package aliases follow the configured roots (`praxis/*` → `src/engines/praxis/*`, `platform` → `src/platform`). An engine imports the platform from `src/platform`, the design system from `src/design-system`, and the contract from `src/adapters` / `src/dtos`; it never imports shadcn, Radix, `react-resizable-panels`, the icon library, or XYFlow directly ([ADR-0010](../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)).

## Related documents

| Document                                                                                | What it covers                                               |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [shell.md](./shell.md)                                                                  | The platform shell and how engines contribute widgets to it. |
| [state-architecture.md](./state-architecture.md)                                        | The single platform state provider.                          |
| [ipc-adapters-and-dtos.md](./ipc-adapters-and-dtos.md)                                  | The contract leaves the engines depend on.                   |
| [ADR-0011](../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)                       | The module taxonomy the packages mirror.                     |
| [01-architecture/ARCHITECTURE-BOUNDARY.md](../01-architecture/ARCHITECTURE-BOUNDARY.md) | The suite-level layering rule.                               |
