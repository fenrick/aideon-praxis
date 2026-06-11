# Package Layout

How the renderer is decomposed into packages, and why a feature package mirrors the module it faces. This file is for anyone adding a surface or deciding where a piece of code belongs.

---

## The principle

A feature package mirrors the module it faces, one folder per module under `src/workspaces/<module>` ([DOCUMENTATION-STANDARD.md §10](../02-standards/DOCUMENTATION-STANDARD.md)). The renderer's package graph echoes the module taxonomy ([ADR-0011](../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)): the surface that faces [Metis](../05-modules/metis/README.md) is `src/workspaces/metis`, the surface that faces [Mneme](../05-modules/mneme/README.md) is `src/workspaces/mneme`. This means a reader who knows the modules knows where the surface code lives, and a module's renderer concerns stay together.

The trade-off is that a concern spanning two modules has no single home; it belongs in the design system if it is domain-free, or in the leaf adapters/DTOs if it is contract. A surface package never depends on another surface package — cross-workspace sharing goes down through the leaves, never sideways.

## The layers

The packages form a strict downward dependency, mirroring the design-system layer model ([03-design/design-system/README.md](../03-design/design-system/README.md)):

| Layer               | Package(s)                                                     | Depends only on                       |
| ------------------- | -------------------------------------------------------------- | ------------------------------------- |
| **Surfaces**        | `src/workspaces/<module>` (feature packages)                   | design system, adapters, DTOs         |
| **Shell**           | `AideonDesktopShell`, `src/workspaces/registry.ts`, `types.ts` | design system                         |
| **Design system**   | `src/design-system` (proxy boundary)                           | tokens, shadcn/Radix/XYFlow (wrapped) |
| **Contract leaves** | `src/adapters`, `src/dtos`                                     | TypeScript only                       |

A surface imports down; nothing imports a surface except the registry. The contract leaves (`src/adapters`, `src/dtos`) are type-first and have no React, Tauri, DOM, or network dependency, so they stay portable across renderer and host-mock contexts ([ipc-adapters-and-dtos.md](./ipc-adapters-and-dtos.md)).

## What a feature package owns

A feature package under `src/workspaces/<module>` owns:

- **Its four slot components** filling the shell contract ([shell.md](./shell.md)).
- **One state provider** holding the module's UI-state and persistent UI state, consumed by the four slots so state is owned once ([state-architecture.md](./state-architecture.md)).
- **Its data-fetching keys and hooks** — server-state read through the adapters, keyed by viewpoint ([data-fetching.md](./data-fetching.md)).
- **Its DTO mapping** — turning boundary DTOs into UI-ready state inside hooks, not components.
- **Its tests** — hook tests, component tests, and the surface's slice of the Playwright journeys ([testing.md](./testing.md)).

A feature package does **not** own: domain-free visual components (those go to the design system), IPC wiring beyond calling an adapter, or any durable storage.

## The seed packages

The seed renderer ships these surface packages, each documented in this folder:

- `src/workspaces/praxis` — [praxis-workspace](./praxis-workspace/README.md).
- `src/workspaces/metis` — [metis-workspace](./metis-workspace/README.md).
- `src/workspaces/mneme` — [mneme-workspace](./mneme-workspace/README.md).
- `src/workspaces/continuum` — [continuum-automation](./continuum-automation/README.md).
- Chrona time is a shell-level shared surface adopted by every workspace, documented as [chrona-time](./chrona-time/README.md).

The planned surfaces — kairos, koinon, themis, aegis, skopos, lexis, pylon, kerux, sophia — each carry a PLANNED design-intent README in this folder and will land as `src/workspaces/<module>` when their module's crate exists ([DOCUMENTATION-STANDARD.md §10](../02-standards/DOCUMENTATION-STANDARD.md)).

## Naming and imports

Imports use relative or `src`-rooted paths; the adapters and DTOs were flattened from standalone workspaces into `src/adapters` and `src/dtos` within the desktop package, and package aliases are not used. A surface imports the design system from `src/design-system` and the contract from `src/adapters` / `src/dtos`; it never imports shadcn, Radix, `react-resizable-panels`, the icon library, or XYFlow directly ([ADR-0010](../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)).

## Related documents

| Document                                                                                | What it covers                                          |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [shell.md](./shell.md)                                                                  | The `WorkspaceModule` contract a feature package fills. |
| [state-architecture.md](./state-architecture.md)                                        | The single per-module state provider.                   |
| [ipc-adapters-and-dtos.md](./ipc-adapters-and-dtos.md)                                  | The contract leaves the surfaces depend on.             |
| [ADR-0011](../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)                       | The module taxonomy the packages mirror.                |
| [01-architecture/ARCHITECTURE-BOUNDARY.md](../01-architecture/ARCHITECTURE-BOUNDARY.md) | The suite-level layering rule.                          |
