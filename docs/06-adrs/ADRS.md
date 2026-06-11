# Architecture Decision Records (ADRs)

ADRs capture significant, lasting decisions about architecture, contracts, persistence identity, the workspace format, and operational posture. Write them using [`../02-standards/ADR-FORMAT.md`](../02-standards/ADR-FORMAT.md) and review them against [`../02-standards/DESIGN-GOVERNANCE.md`](../02-standards/DESIGN-GOVERNANCE.md).

> **Status changes are PR-reviewed, never edited ad hoc on `main`.**

## The desktop-first thesis

These ADRs establish a single cross-runtime authority: **the portable workspace is canonical; the runtime database is derived.** Operations and temporal facts are the durable truth; indexes, projections, and search sidecars are rebuildable from them. Hosted PostgreSQL, where it appears at all, is an optional adapter behind the persistence interface — never the definition of truth.

## ADR set

| ADR | Title | Status | Decision type |
| --- | --- | --- | --- |
| [0001](./ADR-0001-workspace-is-canonical-authority.md) | Portable workspace is the canonical authority | Accepted | Invariant |
| [0002](./ADR-0002-portable-workspace-format.md) | Portable workspace folder format | Accepted | Invariant + stable seam |
| [0003](./ADR-0003-content-addressed-object-store.md) | Content-addressed object store for binaries | Accepted | Invariant + stable seam |
| [0004](./ADR-0004-storage-engine-abstraction.md) | Storage-engine abstraction + single-writer queue | Accepted | Stable seam + provisional |
| [0005](./ADR-0005-sync-and-conflict-model.md) | Sync and conflict model | Proposed | Stable seam + deferred |
| [0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md) | Tauri trust boundary and typed IPC | Accepted | Invariant + stable seam |
| [0007](./ADR-0007-deterministic-package-export.md) | Deterministic `.aideonpkg` export/import | Proposed | Stable seam |
