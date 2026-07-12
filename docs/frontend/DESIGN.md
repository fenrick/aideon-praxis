# Frontend Design — see the renderer architecture index

This document is superseded by the decomposed renderer architecture. Its content — the one platform-owned shell, its
four regions, how engines contribute widgets, and the static-export constraints — now lives in [shell.md](./shell.md),
and the cross-cutting narrative lives in the folder index [README.md](./README.md).

Start at [README.md](./README.md) for the renderer architecture, then:

- [shell.md](./shell.md) — the one shell, its four regions, and the static-export constraints.
- [package-layout.md](./package-layout.md) — the platform (`src/platform/`) and engine packages at
  `src/engines/<module>`.
- [state-architecture.md](./state-architecture.md) — the three-way state separation and the viewpoint as a cache
  coordinate ([ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md)).
- [data-fetching.md](./data-fetching.md), [error-loading-empty.md](./error-loading-empty.md),
  [accessibility.md](./accessibility.md), [testing.md](./testing.md),
  [ipc-adapters-and-dtos.md](./ipc-adapters-and-dtos.md) — the per-concern contracts.

This pointer is retained so existing cross-links to `frontend/DESIGN.md` continue to resolve
([DOCUMENTATION-STANDARD.md §11](../02-standards/DOCUMENTATION-STANDARD.md)).
