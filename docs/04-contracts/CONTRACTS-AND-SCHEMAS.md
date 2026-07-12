# Contracts and Schemas

This document has been decomposed. The contracts layer is now a folder of small, single-topic areas indexed by
[README.md](./README.md).

- The IPC envelope, error envelope, command surface, versioning, idempotency, correlation, and generated-schema
  discipline are in **[ipc/](./ipc/README.md)**.
- The temporal query context and resolution semantics are in
  **[temporal-and-scenario/](./temporal-and-scenario/README.md)**.
- Projection freshness and invalidation are in
  **[projection-and-invalidation/](./projection-and-invalidation/README.md)**.
- Accepted work and events are in **[accepted-work-and-events/](./accepted-work-and-events/README.md)**.

The per-engine command tables (Mneme store, Chrona temporal, Praxis artefact and workspace) live with their modules:
[Mneme](../05-modules/mneme/README.md), [Chrona](../05-modules/chrona/README.md),
[Praxis](../05-modules/praxis/README.md). The executable command snapshot is the
[IPC manifest](../contracts/ipc-manifest.json).
