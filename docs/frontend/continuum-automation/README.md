# Continuum Automation

The automation surface, facing [Continuum](../../05-modules/continuum/README.md): schedules, connector runs, ingest
history, and provenance. It renders inside the one shell ([shell.md](../shell.md)) and keeps automation visible,
attributable, and cancellable without weakening the offline-first posture. When the Continuum engine is licensed it
contributes its automation widgets to the shared shell like any other engine ([shell.md](../shell.md)).

This README is the contract; [DESIGN.md](./DESIGN.md) carries the screen, run-model, and provenance detail.

## What it provides

- Schedule management — create, pause/resume, maintenance windows, bounds.
- Connector configuration — CMDB, file imports, other adapters — with host-owned auth.
- Manual "run now" executions, run history, and a failures/retry queue.
- Provenance on every run: source system, connector version, run id, asserted-time policy.

## Faces

[Continuum](../../05-modules/continuum/README.md) — local durable orchestration: jobs, retries, schedules, and the run
ledger. The renderer enqueues and observes jobs and renders their provenance; it never performs a network call itself.

## State ownership

Server-state (schedules, connectors, runs) is a cache invalidated by `job_updated` / `job_completed` and `sync_updated`
([data-fetching.md](../data-fetching.md)); selection and form state are UI-state. No credentials live in renderer state
— auth status is derived from host-managed secure storage ([state-architecture.md](../state-architecture.md)).

## Boundaries

- Automation is never silent: every run is visible, attributable, and cancellable.
- Ingest is provenance-preserving and replayable; a re-run with the same inputs does not duplicate facts (`dedupeKey`,
  [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).
- Safety defaults win: deny-by-default capabilities, PII-redacted exports, bounded runs; offline-first holds, and a
  connector needing network fails clearly and safely.
- No renderer HTTP; network-requiring actions are explicit and user-confirmed through host-owned prompts.

## Running and testing

- Tests: `pnpm run node:test` — component tests for empty schedules/connectors, run detail with progress and error
  states, and retry/pause actions (IPC mocked) ([testing.md](../testing.md)).

## Related documents

| Document                                                                      | What it covers                                         |
| ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| [DESIGN.md](./DESIGN.md)                                                      | The screens, run model, and provenance UX.             |
| [Continuum](../../05-modules/continuum/README.md)                             | The module this surface faces.                         |
| [ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) | The job lifecycle and events the runs follow.          |
| [error-loading-empty.md](../error-loading-empty.md)                           | The error/loading/empty contract this surface renders. |
