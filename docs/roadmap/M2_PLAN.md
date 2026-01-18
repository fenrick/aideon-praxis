# M2 Plan — Job‑Driven Analytics

This plan expands `docs/ROADMAP.md` M2 into concrete, trackable work. It is written as an
**end-state** plan: each item describes what must be true for M2 to be considered delivered, not
what is currently implemented.

Status notation:

- `[x]` implemented and verified in this repo
- `[~]` in progress (partially implemented / partially verified)
- `[ ]` not yet met

## Design references (primary)

- Boundary rules: `ARCHITECTURE-BOUNDARY.md`
- Suite design overview: `docs/DESIGN.md`
- Contracts (IPC/events/envelopes): `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/contracts/ipc-manifest.json`, `docs/contracts/event-manifest.json`
- Host design (capabilities, lifecycle, job orchestration, events): `crates/desktop/DESIGN.md`
- Metis design (analytics intent, boundedness, explainability): `crates/metis/DESIGN.md`
- Mneme designs (durability, job metadata, retention/compaction): `crates/mneme_core/DESIGN.md`, `crates/mneme_store/DESIGN.md`
- Chrona design (time/scenario context for analytics): `crates/chrona/DESIGN.md`
- Cross-cutting UX contract (job tray, failure handling): `docs/UX-DESIGN.md`
- Workspace UX docs (job surfaces per module): `app/AideonDesktop/docs/metis-workspace/DESIGN.md`, `app/AideonDesktop/docs/mneme-workspace/DESIGN.md`, `app/AideonDesktop/docs/chrona-time/DESIGN.md`, `app/AideonDesktop/docs/continuum-automation/DESIGN.md`
- Testing strategy: `docs/TESTING-STRATEGY.md`

## M2.1 Outcome — Analytics run as background jobs with progress, cancellation, and completion notifications

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define the canonical job model (DTOs + lifecycle states): `queued`, `running`, `succeeded`,
       `failed`, `cancelled`, with explicit progress fields and timestamps. Refs:
       `crates/desktop/DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/UX-DESIGN.md`.
2. [ ] Define the analytics job request surface (snake_case job identifiers and payload schemas)
       and the job result reference model (result refs, not giant payloads). Refs:
       `crates/metis/DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`, `ARCHITECTURE-BOUNDARY.md`.
3. [ ] Add host IPC commands for:
   - enqueue analytics job,
   - cancel job,
   - list jobs (bounded window),
   - get job details,
   - fetch job result by reference.
     Ensure all are snake_case and appear in `docs/contracts/ipc-manifest.json`. Refs:
     `crates/desktop/DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`,
     `docs/contracts/ipc-manifest.json`.
4. [ ] Define and implement host→renderer events for jobs (`job_updated`, `job_completed`) with a
       stable envelope and snapshot them in `docs/contracts/event-manifest.json`. Refs:
       `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/contracts/event-manifest.json`.
5. [ ] Ensure job execution never blocks request/response IPC: enqueue returns quickly, work runs
       in a worker loop, progress is event-driven. Refs: `ARCHITECTURE-BOUNDARY.md`,
       `crates/desktop/DESIGN.md`.
6. [ ] Implement cancellation semantics end-to-end (best-effort vs guaranteed), and ensure the UI
       communicates which semantics apply per job kind. Refs: `crates/desktop/DESIGN.md`,
       `crates/metis/DESIGN.md`, `docs/UX-DESIGN.md`.
7. [ ] Ensure completion notifications are non-intrusive and deep-link to results when applicable
       (job tray + Status window). Refs: `docs/UX-DESIGN.md`, `app/AideonDesktop/DESIGN.md`.
8. [ ] Ensure job kinds are bounded (time/memory/result size) and enforce bounds in the engine and
       host (reject unbounded jobs). Refs: `crates/metis/DESIGN.md`, `crates/desktop/DESIGN.md`,
       `docs/UX-DESIGN.md`.
9. [ ] Add module-specific entry points for starting analytics jobs (Metis workspace primary, but
       others may trigger analytics as sub-flows) and keep UI consistent. Refs:
       `app/AideonDesktop/docs/metis-workspace/DESIGN.md`, `docs/UX-DESIGN.md`.
10. [ ] Add tests for: enqueue→progress→complete, enqueue→cancelled, enqueue→failed with stable
        error envelope; assert events, not polling. Refs: `docs/TESTING-STRATEGY.md`,
        `docs/CONTRACTS-AND-SCHEMAS.md`.

## M2.2 Outcome — Job metadata is durable across restarts; interrupted jobs are visible and recoverable

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define what must be durable for every job: request payload (redacted if needed), status,
       progress, timestamps, actor, correlation id, and result refs. Refs: `crates/mneme_store/DESIGN.md`,
       `crates/desktop/DESIGN.md`.
2. [ ] Persist job records via Mneme Store (or equivalent durable store) and ensure jobs survive
       process restarts without data loss. Refs: `crates/mneme_store/DESIGN.md`,
       `ARCHITECTURE-BOUNDARY.md`.
3. [ ] Define restart semantics: on boot, host must list jobs and mark “in-progress” jobs as
       `interrupted` (or restart them) deterministically, with explicit user-visible behavior. Refs:
       `crates/desktop/DESIGN.md`, `docs/UX-DESIGN.md`.
4. [ ] Provide “recover” actions: retry failed jobs (when safe), rerun job with same inputs, and
       cancel/clear interrupted jobs. Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`,
       `crates/metis/DESIGN.md`.
5. [ ] Ensure job result references remain valid across restarts (or clearly expire) and define
       retention policies. Refs: `crates/mneme_store/DESIGN.md`, `crates/metis/DESIGN.md`,
       `docs/UX-DESIGN.md`.
6. [ ] Provide a “job history” view in the Status window with filtering and bounded paging; avoid
       unbounded lists. Refs: `docs/UX-DESIGN.md`, `app/AideonDesktop/DESIGN.md`.
7. [ ] Ensure durability does not leak sensitive inputs/outputs: redact by default and require
       explicit export permission to persist PII. Refs: `ARCHITECTURE-BOUNDARY.md`,
       `crates/desktop/DESIGN.md`.
8. [ ] Add storage health and corruption handling for job tables (fallback guidance, safe reset)
       without crashing the app. Refs: `docs/UX-DESIGN.md`, `crates/mneme_store/DESIGN.md`.
9. [ ] Add tests that simulate restart mid-job and assert persisted job is visible, marked
       interrupted/recoverable, and UI flows work. Refs: `docs/TESTING-STRATEGY.md`,
       `crates/desktop/DESIGN.md`.
10. [ ] Document job retention/compaction defaults and how they interact with analytics result
        caching. Refs: `crates/mneme_store/DESIGN.md`, `docs/ROADMAP.md`.

## M2.3 Outcome — Job UX is consistent across modules (single job tray + Status window support)

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Implement a shell-level job tray that is always reachable (footer/status region) and cannot
       be replaced by module chrome. Refs: `docs/UX-DESIGN.md`, `app/AideonDesktop/DESIGN.md`.
2. [ ] Define a single renderer subscription adapter for job events and expose a stable hook/store
       API for modules to read job state. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`,
       `ARCHITECTURE-BOUNDARY.md`.
3. [ ] Standardize job row UI: kind, status, progress, started/finished times, and a short error
       summary (if any). Refs: `docs/UX-DESIGN.md`.
4. [ ] Standardize job actions: cancel (when supported), retry (when supported), open result (when
       available), open diagnostics. Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
5. [ ] Ensure the Status window provides a superset view: job list/history + diagnostics + logs +
       “copy diagnostic summary”. Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
6. [ ] Ensure module UIs (Metis/Mneme/Chrona/Continuum) reuse the job tray rather than implementing
       custom spinners/progress UIs for long-running work. Refs:
       `app/AideonDesktop/docs/metis-workspace/DESIGN.md`, `app/AideonDesktop/docs/mneme-workspace/DESIGN.md`,
       `app/AideonDesktop/docs/chrona-time/DESIGN.md`, `app/AideonDesktop/docs/continuum-automation/DESIGN.md`.
7. [ ] Add consistent “missed events” recovery UX (explicit refresh) while keeping default behavior
       event-driven (no polling). Refs: `docs/UX-DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
8. [ ] Define job grouping semantics (by workspace/module, by scenario/time context) and ensure UI
       does not misattribute jobs. Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
9. [ ] Add accessibility requirements for job tray (keyboard navigation, ARIA status updates,
       non-color-only status). Refs: `docs/UX-DESIGN.md`.
10. [ ] Add tests validating the job tray and Status window show consistent job states and actions
        across modules. Refs: `docs/TESTING-STRATEGY.md`.

## M2.4 Outcome — Analytics outputs are deterministic, bounded, and explainable (evidence included; truncation labeled)

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define determinism requirements per algorithm (stable ordering, stable ties, fixed seeds)
       and ensure they are testable. Refs: `crates/metis/DESIGN.md`, `docs/TESTING-STRATEGY.md`.
2. [ ] Define bounding controls for every analytics request (scope filters, max nodes/edges, max
       depth, max duration) and enforce them in Metis. Refs: `crates/metis/DESIGN.md`,
       `docs/UX-DESIGN.md`.
3. [ ] Define explainability payloads: evidence references, input parameters, and summary “why”
       strings that can be surfaced in UI without interpretation. Refs: `crates/metis/DESIGN.md`,
       `crates/praxis/DESIGN.md`, `docs/UX-DESIGN.md`.
4. [ ] Ensure truncation is explicit: include `truncated: true` and reasons/counters, and the UI
       must label results as partial. Refs: `docs/UX-DESIGN.md`, `crates/metis/DESIGN.md`.
5. [ ] Ensure analytics outputs are keyed to time context (`as_of`, `scenario`, `layer`) and do not
       mix contexts. Refs: `crates/chrona/DESIGN.md`, `docs/DESIGN.md`, `crates/metis/DESIGN.md`.
6. [ ] Add schema validation for analytics outputs (DTO validation at host boundary) and reject
       malformed results with stable host error codes. Refs: `crates/desktop/DESIGN.md`,
       `docs/CONTRACTS-AND-SCHEMAS.md`.
7. [ ] Provide an “evidence viewer” UX pattern (lightweight) so users can inspect why an analytics
       result was produced, without exposing raw DB details. Refs: `docs/UX-DESIGN.md`,
       `app/AideonDesktop/docs/metis-workspace/DESIGN.md`.
8. [ ] Add golden datasets (small synthetic graphs) to assert determinism and bounded behavior for
       key analytics jobs. Refs: `docs/TESTING-STRATEGY.md`, `crates/metis/DESIGN.md`.
9. [ ] Define “explainability minimum” per job kind (what evidence must be present) and make it a
       test assertion. Refs: `crates/metis/DESIGN.md`, `docs/TESTING-STRATEGY.md`.
10. [ ] Ensure analytics outputs never contain unredacted PII by default (deny-by-default export
        posture). Refs: `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`.

## M2.5 Outcome — Large result payloads do not block the UI (virtualized UI + streaming/columnar where needed)

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Establish size thresholds for payloads that must not cross IPC as JSON blobs; prefer result
       refs + streaming retrieval. Refs: `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`,
       `crates/metis/DESIGN.md`.
2. [ ] Define a result transport strategy for large analytics outputs (streaming bytes, Arrow-like
       columnar, paged lists) and document the chosen approach. Refs: `crates/desktop/DESIGN.md`,
       `crates/metis/DESIGN.md`, `crates/mneme_store/DESIGN.md`.
3. [ ] Ensure renderer renders large lists/tables with virtualization and does not render full
       graphs/tables synchronously. Refs: `docs/UX-DESIGN.md`, `docs/CODING-STANDARDS.md`.
4. [ ] Ensure long-running UI operations are cancellable and do not lock interaction (progressive
       rendering, incremental fetch). Refs: `docs/UX-DESIGN.md`.
5. [ ] Define memory budgets and ensure result caching does not blow them (eviction policy). Refs:
       `crates/desktop/DESIGN.md`, `docs/ROADMAP.md`.
6. [ ] Provide “export” of analytics results as a separate job (never blocking UI), with explicit
       redaction posture. Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`,
       `ARCHITECTURE-BOUNDARY.md`.
7. [ ] Add performance tests (optional local) for rendering large results and ensure p95 UI remains
       responsive. Refs: `docs/TESTING-STRATEGY.md`, `docs/ROADMAP.md`.
8. [ ] Ensure any streaming/byte APIs are capability-gated and do not allow arbitrary filesystem
       writes from renderer. Refs: `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`.
9. [ ] Add “result too large” UX that provides alternatives (narrow scope, add filters, export)
       instead of crashing or freezing. Refs: `docs/UX-DESIGN.md`,
       `app/AideonDesktop/docs/metis-workspace/DESIGN.md`.
10. [ ] Add tests that assert the renderer does not attempt to render >N rows/nodes without
        virtualization (component-level guard tests). Refs: `docs/TESTING-STRATEGY.md`,
        `docs/CODING-STANDARDS.md`.

## M2.6 Outcome — Job events flow through a single renderer subscription adapter (no polling by default)

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define the canonical event subscription layer in the renderer (one adapter/hook), and ban
       ad-hoc `@tauri-apps/api/event` usage in feature code. Refs: `ARCHITECTURE-BOUNDARY.md`,
       `docs/CODING-STANDARDS.md`.
2. [ ] Ensure the host publishes job events consistently and that renderer subscribes once and
       fans out internally. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `crates/desktop/DESIGN.md`.
3. [ ] Snapshot job event names in `docs/contracts/event-manifest.json` and add a contract test that
       fails when runtime subscriptions drift. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`,
       `docs/TESTING-STRATEGY.md`.
4. [ ] Ensure no polling is required for correctness; polling is allowed only as explicit user
       recovery (“Refresh jobs”). Refs: `docs/UX-DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
5. [ ] Ensure event handling is robust to missed events (sequence ids, replay on startup via list
       jobs). Refs: `crates/desktop/DESIGN.md`, `crates/mneme_store/DESIGN.md`.
6. [ ] Ensure job updates are idempotent and can be applied multiple times without state bugs. Refs:
       `crates/desktop/DESIGN.md`.
7. [ ] Ensure event payloads are bounded (don’t emit huge results inline; emit refs). Refs:
       `docs/CONTRACTS-AND-SCHEMAS.md`, `crates/metis/DESIGN.md`.
8. [ ] Ensure subscriptions are workspace-aware (jobs can be filtered/grouped, but not missed). Refs:
       `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
9. [ ] Add tests that simulate rapid job updates and assert UI remains consistent (no dropped
       transitions, correct latest status). Refs: `docs/TESTING-STRATEGY.md`.
10. [ ] Document the “event-first” posture in UX docs for all modules that surface jobs. Refs:
        `docs/UX-DESIGN.md`, `app/AideonDesktop/docs/metis-workspace/DESIGN.md`.

## M2.7 Outcome — Failures surface actionable diagnostics and retry guidance (with correlation ids)

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define stable error code taxonomy for job failures (validation, bounds exceeded, engine
       internal error, storage unavailable, cancelled) and ensure codes are snake_case. Refs:
       `crates/desktop/DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
2. [ ] Ensure every job has a correlation id that ties together:
   - enqueue request,
   - job record,
   - engine logs,
   - user-facing failure summary.
     Refs: `crates/desktop/DESIGN.md`, `docs/UX-DESIGN.md`.
3. [ ] Ensure failures show “what failed / why / what to do next” in human text, not raw objects.
       Refs: `docs/UX-DESIGN.md`.
4. [ ] Provide explicit retry guidance and a retry action only when safe (idempotent jobs or jobs
       with stable inputs). Refs: `crates/metis/DESIGN.md`, `docs/UX-DESIGN.md`.
5. [ ] Ensure job failure details are redacted appropriately; surface minimal diagnostics by
       default, allow “copy diagnostics” via Status. Refs: `docs/UX-DESIGN.md`,
       `crates/desktop/DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
6. [ ] Ensure bounds-exceeded failures include the bound that was hit and a suggested mitigation
       (narrow scope, change filters). Refs: `crates/metis/DESIGN.md`, `docs/UX-DESIGN.md`.
7. [ ] Ensure renderer can deep-link from a failure toast to the job details in the job tray/Status
       window. Refs: `docs/UX-DESIGN.md`, `app/AideonDesktop/DESIGN.md`.
8. [ ] Ensure engine errors are mapped into stable `HostError` shapes without leaking internal
       details by default. Refs: `crates/desktop/DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
9. [ ] Add tests for representative failure classes and assert both error envelopes and UI text
       guidance. Refs: `docs/TESTING-STRATEGY.md`.
10. [ ] Document the failure UX pattern in module UX docs (Metis primary, but applicable broadly).
        Refs: `app/AideonDesktop/docs/metis-workspace/DESIGN.md`, `docs/UX-DESIGN.md`.

## M2.8 Outcome — DoD: analytics jobs meet SLOs on baseline datasets and are fully observable end‑to‑end

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define baseline datasets and sizes for analytics (e.g., 5k/50k nodes) and store them as
       deterministic fixtures or generators. Refs: `docs/TESTING-STRATEGY.md`,
       `crates/metis/DESIGN.md`.
2. [ ] Define SLO targets for analytics jobs (p95 end-to-end for common jobs) and how they are
       measured. Refs: `docs/ROADMAP.md`, `crates/metis/DESIGN.md`.
3. [ ] Ensure job execution is observable: structured logs, correlation ids, progress stages, and
       status transitions are recorded. Refs: `crates/desktop/DESIGN.md`, `docs/UX-DESIGN.md`.
4. [ ] Add a lightweight performance harness (local runnable) that executes core analytics jobs on
       baseline datasets and reports timing. Refs: `docs/TESTING-STRATEGY.md`, `docs/ROADMAP.md`.
5. [ ] Ensure job progress uses stable stage names (snake_case) so UI can render meaningful stage
       labels without guessing. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `crates/desktop/DESIGN.md`.
6. [ ] Ensure “fully observable” includes UI observability: the Status window shows job details,
       last errors, and summary counts. Refs: `docs/UX-DESIGN.md`, `app/AideonDesktop/DESIGN.md`.
7. [ ] Ensure end-to-end flows are covered by tests:
   - enqueue,
   - progress update,
   - completion with result ref,
   - open result,
   - retry/cancel,
   - failure class handling.
     Refs: `docs/TESTING-STRATEGY.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
8. [ ] Ensure SLO regressions are detectable (trend tracking or threshold gates) without making CI
       flaky. Refs: `docs/CODING-STANDARDS.md`, `docs/ROADMAP.md`.
9. [ ] Update `docs/ROADMAP.md` M2 checkboxes only when verification exists (tests or harness
       evidence), and record delivered outcomes in `CHANGELOG.md`. Refs: `docs/ROADMAP.md`,
       `CHANGELOG.md`.
10. [ ] Mark M2 complete only when every M2 outcome and the DoD line are `[x]` and the contracts
        remain stable (no drift between job/event docs and implementation). Refs:
        `docs/CONTRACTS-AND-SCHEMAS.md`, `crates/desktop/DESIGN.md`.
