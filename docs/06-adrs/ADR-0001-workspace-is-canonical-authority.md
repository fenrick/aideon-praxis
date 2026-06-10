# ADR-0001: The Portable Workspace Is the Canonical Authority

- Status: Accepted
- Date: 2026-06-10

## Context

Aideon Desktop is a local-first, time-first application: a user opens a project from a
folder, works offline, and expects portability — copy the folder to a colleague, open it
elsewhere, no server required. These constraints drive a fundamental question about where
authority lives.

The architecture must support offline-first writes, multi-user merge, binary handling, and
an optional hosted deployment — all without redefining the source of truth. Two postures are
possible: a hosted database accumulates records and acts as the authority, or the workspace
folder accumulates an append-only operation log and the database is a derived index. The
second posture is the only one consistent with the product's portability requirement.

The append-only operation log is the durable truth. Schema is portable data. Projections and
indexes are derived and rebuildable. This is the foundational invariant.

## Governance Framing

- **Decision type:** Invariant.
- **Known future pressure:** a hosted/multi-user deployment mode; multiple storage engines;
  cross-device sync and merge.
- **What stays stable:** the workspace folder is the source of truth; databases are derived.
- **What is provisional:** which embedded engine backs the runtime (see ADR-0004).
- **What is deferred:** hosted-mode materialisation into an optional adapter; sync
  (see ADR-0005).
- **Why hard to reverse:** every module, contract, and sync decision depends on where truth
  lives. Reversing this is a product-model change, not a refactor.

## Decision

**The canonical Aideon project is a portable workspace** containing append-only operation
segments, schema-as-data, and immutable content-addressed blobs (format defined in
[ADR-0002](./ADR-0002-portable-workspace-format.md) and
[ADR-0003](./ADR-0003-content-addressed-object-store.md)).

- **Operations and temporal facts are canonical.** Effective graphs, indexes, search and
  vector sidecars, and any runtime database are **derived** and rebuildable from the
  workspace.
- **No database file is the source of truth, and no local HTTP service is the seam.** The
  runtime database is a cache; deleting it loses no user data.
- **Hosted PostgreSQL, if used, is an optional adapter** that materialises the same workspace
  semantics behind the persistence interface — never the definition of truth.

This is the cross-runtime authority. Any deployment posture is downstream of it.

## Consequences

- The temporal-truth, scenario, and projection invariants — facts as canonical, projections
  as derived — are the direct expression of this posture.
- Mneme's embedded store is the canonical runtime store; any hosted-mode storage is an
  adapter behind the persistence interface.
- The renderer can never hold durable truth; it is disposable
  ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).
- Every module, contract, and IPC surface is designed with this posture as the fixed point.
  See [`../01-architecture/ARCHITECTURE-BOUNDARY.md`](../01-architecture/ARCHITECTURE-BOUNDARY.md)
  and [`../05-modules/mneme/README.md`](../05-modules/mneme/README.md).
