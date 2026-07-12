# Mneme Workspace

The operator surface, facing [Mneme](../../05-modules/mneme/README.md): storage health, jobs, integrity heads, schema,
and safe maintenance. It renders inside the one shell ([shell.md](../shell.md)) and exists to make the system observable
and recoverable without leaving the app.

This README is the contract; [DESIGN.md](./DESIGN.md) carries the screen, interaction, and test detail.

## What it provides

- Health and diagnostics — engine health, storage connectivity, migration status.
- Jobs — running, completed, and failed jobs with failure summaries and correlation ids.
- Integrity — head summaries and bounded recent findings, with a read-only explain entrypoint.
- Schema — read-only manifest and bounded effective-schema views.
- Maintenance — safe, bounded, capability-gated operations, each declaring its impact before it runs.

## Faces

[Mneme](../../05-modules/mneme/README.md) — storage: the op log, bitemporal facts, schema-as-data, and derived runtime.
The renderer renders DTOs the host returns and triggers maintenance as bounded jobs; the SQLite path stays host-owned
and the renderer sees health only.

## State ownership

Server-state (health, job lists, integrity heads, schema) is a cache invalidated by host events — `job_updated` /
`job_completed` ([data-fetching.md](../data-fetching.md)); selection (active job, finding, schema type) and maintenance
confirmation flow are UI-state. No durable state lives in the renderer
([state-architecture.md](../state-architecture.md)).

## Boundaries

- Typed IPC only; no renderer HTTP; reads and actions flow through host capabilities
  ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).
- The operator surface must remain usable when other surfaces fail, prioritise clarity over density, and never expose
  unsafe raw internals by default.
- Maintenance operations are explicit, bounded, capability-gated, and deny-by-default; diagnostics and exports are
  PII-redacted by default.

## Running and testing

- Tests: `pnpm run node:test` — component tests for health rendering, jobs empty/failed/running states, maintenance
  confirmation flows (IPC mocked), and error surfaces with copy-diagnostics ([testing.md](../testing.md)).

## Related documents

| Document                                            | What it covers                                         |
| --------------------------------------------------- | ------------------------------------------------------ |
| [DESIGN.md](./DESIGN.md)                            | The screens, interaction contracts, and tests.         |
| [Mneme](../../05-modules/mneme/README.md)           | The module this surface faces.                         |
| [error-loading-empty.md](../error-loading-empty.md) | The error/loading/empty contract this surface renders. |
| [shell.md](../shell.md)                             | The shell slots the surface fills.                     |
