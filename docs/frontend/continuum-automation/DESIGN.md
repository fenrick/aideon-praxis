# Continuum Automation UX (Desktop) – Internal Design

## Purpose & scope

Continuum automation UX covers user-facing automation flows:

- creating and managing schedules (pause/resume, maintenance windows),
- configuring connectors (CMDB, file imports, other adapters),
- running manual “run now” executions,
- viewing run history and provenance,
- troubleshooting failures and retries.

This UX is job-driven and capability-gated. The renderer never performs network calls directly.

## Explicit intent (non-negotiable)

- Automation is never “silent”: every run is visible, attributable, and cancelable.
- Ingest is provenance-preserving: users can answer “what changed, why, and from where?”
- Replayability is a product requirement: re-running with the same inputs should not duplicate facts.
- Safety defaults win:
  - deny-by-default capabilities,
  - PII-redacted exports,
  - bounded runs (limits + truncation warnings).
- Offline-first remains true:
  - scheduling may be disabled or paused when offline,
  - connector runs that require network must fail clearly and safely.

## Primary outcomes

- Users can automate ingest safely (no silent background mutation).
- Users can explain “where did this data come from?” (provenance).
- Users can see, cancel, retry, and audit automation runs.
- Users can run offline; automation degrades gracefully when a connector requires network access.

## Surface placement (shell)

This is **design intent**: Continuum is not yet registered in the platform's `ENGINES` ([package-layout.md](../package-layout.md)). When the Continuum engine is licensed it contributes automation widgets to the one shared shell; the platform owns navigation, toolbar, content, and inspector, and Continuum ships no chrome of its own ([shell.md](../shell.md)). There is no separate “Automation” workspace to switch into — its widgets join the shared content surface like any other licensed engine's.

## Vocabulary and identifiers

- `schedule_id`: stable identifier for a schedule definition.
- `connector_id`: stable identifier for a connector configuration.
- `run_id`: stable identifier for a run instance (normally `job_id`).
- `dedupe_key`: stable idempotency key used to avoid duplicating ingest on retry/replay.
- `provenance`: `{ source_system, connector_version, run_id, asserted_time_policy }`.

## Widgets contributed

The widgets Continuum intends to contribute to the shared content surface (design intent — see [Surface placement](#surface-placement-shell)):

1. **Schedule detail**: configuration + next runs + history.
2. **Connector detail**: configuration + auth status + schema mapping summary.
3. **Run detail**: progress timeline + outputs summary + provenance + logs/errors.

How the shared shell hosts these widgets:

- **Navigation** (platform-owned) surfaces the schedules list (grouped: enabled, paused, failing, disabled), the connectors list (healthy, needs-auth, failing, disabled), run history (filterable by schedule, connector, status, time window), and failures (failed runs and the retry queue).
- **Toolbar** (platform-owned) carries the actions Continuum registers — “Run now” (contextual; capability-gated, with a clear reason such as “requires automation_run” when blocked), “Create schedule”, “Add connector”, reversible “Pause all”/“Resume all” (no queued runs dropped without confirmation), and a status summary chip (running count, last failure) that opens the run list filtered to active/failing runs.
- **Inspector** (platform-owned) shows selection-driven details for a schedule, run, or connector, with capability-gated actions (pause/resume, retry failed run, open diagnostics, export audit pack).
- **Footer / status** (platform-owned) carries the job tray entrypoint and an automation health badge.

Schedule detail (required sections)

- Overview:
  - name, description, enabled/paused,
  - next run time,
  - last run status (success/failure) and last duration.
- Schedule definition:
  - cadence (cron/interval),
  - jitter and maintenance windows,
  - concurrency policy (one-at-a-time vs allow overlap),
  - bounds (max duration, max records, max fanout).
- Target:
  - connector_id,
  - workspace/scope (where the ingest lands).
- History:
  - last N runs (job ids) with status and links.

Connector detail (required sections)

- Overview:
  - connector type (CMDB/file/etc),
  - enabled/disabled,
  - last successful run,
  - health summary.
- Auth status:
  - connected/not connected,
  - “connect” action (host-owned prompt),
  - “disconnect” action (explicit confirmation).
- Mapping:
  - schema mapping summary (what types/fields are produced),
  - time context mapping policy,
  - dedupe key policy.
- Bounds:
  - max records per run,
  - rate limits/backoff hints.

Run detail (required sections)

- Progress timeline:
  - stage list,
  - percent + stage label,
  - timestamps (started/ended).
- Output summary:
  - ops ingested count,
  - facts written count,
  - dedupe hits,
  - warnings (truncation, partial ingest).
- Provenance:
  - source system,
  - connector version,
  - run_id/job_id,
  - asserted time policy,
  - scenario/branch target (when applicable).
- Errors:
  - human-readable summary,
  - retry guidance,
  - link to Status window and copy diagnostics.

## Interaction contracts

### Capability gating (required)

- Every destructive or side-effecting action is capability-gated (deny-by-default).
- Actions requiring network access must be explicit and user-confirmed (host-owned prompts where needed).

### Job-driven execution

- Schedules enqueue jobs; they do not run inline.
- Runs stream progress via `job_updated` and finalize via `job_completed`.
- Long runs expose checkpoints when supported; UI shows “resume available” when applicable.

### Provenance and replayability

- Every run has:
  - stable `run_id` (job id),
  - connector identity and version,
  - input summary (bounded),
  - output summary (ops/facts counts),
  - dedupe keys policy,
  - asserted time policy.
- The UI must surface provenance as first-class metadata on run details.

## Offline and degraded modes

- If a connector requires network access and network is unavailable:
  - scheduled runs must not silently retry forever,
  - the UI must show a clear failure reason (“offline”),
  - users can pause the schedule and resume later.
- If the host disables automation by policy:
  - the UI shows schedules/connectors as read-only and explains how to enable.

## Loading/error/empty contract

- Loading: show skeletons for lists and detail panes.
- Empty:
  - no schedules: prompt “Create schedule” with safe defaults.
  - no connectors: prompt “Add connector”.
- Error:
  - show a human-readable summary,
  - show next actions (retry, open Status window, copy diagnostics),
  - never show raw error blobs by default.

## Security posture

- No renderer HTTP.
- No credentials in renderer state; auth status is derived from host-managed secure storage.
- Exports are PII-redacted by default; capability prompts are explicit.

## Test expectations

- Component tests cover:
  - empty states for schedules/connectors,
  - rendering of a run detail with progress + error states,
  - retry/pause actions (IPC mocked).

Minimum test fixtures:

- no schedules, no connectors
- schedule exists with next run and history
- connector needs auth
- run in progress (job_updated stream)
- run failed (job_completed with error)

## Data model and APIs (target end state)

- Renderer uses typed IPC only; no renderer HTTP.
- Continuum automation DTOs live in `src/dtos/continuum.ts` and are re-exported from `src/dtos/index.ts`.
- The automation surface calls the host exclusively via an adapter surface under `src/engines/continuum/`.
- Host-side automation runs as jobs and emits:
  - `job_updated` / `job_completed` (progress and completion),
  - `sync_updated` when connector sync status changes.
