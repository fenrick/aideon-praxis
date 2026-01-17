# Mneme Workspace (Desktop) – Internal Design

## Purpose & scope

The Mneme workspace provides operator-facing surfaces for storage and processing visibility:

- health and diagnostics
- job lists and failed jobs
- integrity head / schema head summaries
- schema manifest visibility (read-only)

This workspace is not a general modelling surface; it exists to make the system observable and
recoverable without leaving the desktop app.

## Explicit intent (non-negotiable)

- This workspace is the “operator surface” inside the product:
  - it must remain usable when other surfaces fail,
  - it must prioritize clarity over density,
  - it must never expose unsafe raw internals by default.
- Maintenance operations are explicit, bounded, and capability-gated.
- Exports and diagnostics are safe-by-default (PII redacted).

## Boundaries

- Renderer uses typed IPC only (no renderer HTTP).
- All reads and actions flow through the host’s capabilities.
- No database-specific logic in the renderer; it renders DTOs returned by IPC.

## UX outcomes

- Users can quickly determine whether the system is healthy (engines, storage, migrations).
- Users can see running/completed/failed jobs and inspect failure summaries.
- Users can trigger safe, bounded maintenance operations via explicit actions (when enabled).

## Shell slots (required)

### Navigation

- Health overview
- Jobs (running/completed/failed)
- Integrity (head summaries + findings)
- Schema (manifest + effective schema)
- Maintenance (safe operations)

### Toolbar

- Refresh (explicit)
- Copy diagnostics
- Open Status window
- Export audit pack (capability-gated)

### Content surface

Screens (minimum):

1) Health
   - engine health summary
   - storage connectivity (SQLite path remains host-owned; renderer sees health only)
   - migration status (running/blocked/ok)
2) Jobs
   - running jobs list (progress, cancel when allowed)
   - failed jobs list (error summary, retry when allowed)
   - job detail view (metadata + timeline + correlation ids)
3) Integrity
   - integrity head summary
   - recent integrity findings (bounded)
   - “explain” entrypoint for a finding (read-only)
4) Schema
   - schema manifest (read-only)
   - effective schema view for a type (read-only, bounded)
5) Maintenance
   - safe operations (rebuild schema, refresh integrity, refresh projections, retention, compaction)
   - each operation shows bounds, expected impact, and requires explicit confirmation

### Inspector

- Selection-driven details for:
  - a job,
  - an integrity finding,
  - a schema type/field/rule.
- Inspector actions are capability-gated and must explain the impact before execution.

### Footer / status

- Job tray entrypoint and a compact health indicator.

## Data model and APIs

Target contract shape:

- DTOs: `app/AideonDesktop/src/dtos/mneme.ts` (canonical renderer-side contract surface).
- Renderer calls the host only through a workspace adapter surface under `app/AideonDesktop/src/workspaces/mneme/`.
- Host exposes storage and maintenance commands and emits job/integrity events; the renderer renders DTOs only.

## Interaction contracts

### Job handling

- Job lists update via `job_updated` / `job_completed` events where available.
- Cancellation is explicit and best-effort; the UI must reflect final status reliably.
- Failure summaries must be human-readable and must include correlation ids (`job_id`, `request_id`) when present.

### Maintenance operations

- Maintenance operations run as jobs when they can be long-running.
- Every maintenance operation must declare:
  - why it exists,
  - bounds applied,
  - what will change (and what will not),
  - how to recover if it fails.

## Loading/error/empty contract

- Loading: use shell-consistent skeletons/spinners from the design system.
- Error: show a human-readable message plus a “copy diagnostics” affordance when available.
- Empty: treat empty states as informative (e.g., “No failed jobs”).

## Constraints

- No long-running operations in a single request/response; use jobs for heavy maintenance.
- All maintenance actions must be capability-gated and deny-by-default.

## Test expectations

- Component tests cover:
  - health screen rendering,
  - jobs screen empty/failed/running states,
  - maintenance action confirmation flows (IPC mocked),
  - error surfaces and “copy diagnostics”.
