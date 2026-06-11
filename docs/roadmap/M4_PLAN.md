# M4 Plan — Proven Automation and Ingest

This plan expands `docs/ROADMAP.md` M4 into concrete, trackable work. It is written as an
**end-state** plan: each item describes what must be true for M4 to be considered delivered, not
what is currently implemented.

Status notation:

- `[x]` implemented and verified in this repo
- `[~]` in progress (partially implemented / partially verified)
- `[ ]` not yet met

## Design references (primary)

- Boundary rules: `ARCHITECTURE-BOUNDARY.md`
- Suite design overview: `docs/DESIGN.md`
- Contracts (IPC/events/envelopes): `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/contracts/ipc-manifest.json`, `docs/contracts/event-manifest.json`
- Host design (capabilities, lifecycle, job orchestration, events, OS integration): `src-tauri/DESIGN.md`
- Continuum design (automation, scheduling, connectors, provenance): `crates/continuum/DESIGN.md`
- Mneme designs (ops/facts durability, ingest, provenance, exports, workers): `crates/mneme_core/DESIGN.md`, `crates/mneme_store/DESIGN.md`
- Praxis design (metamodel constraints on ingest, tasks, explainability): `crates/praxis/DESIGN.md`
- Chrona design (time/scenario context in ingest): `crates/chrona/DESIGN.md`
- Cross-cutting UX contract (job-driven flows, recovery): `docs/UX-DESIGN.md`
- Continuum automation UX: `docs/frontend/continuum-automation/DESIGN.md`
- Mneme workspace UX (ingest/maintenance surfaces): `docs/frontend/mneme-workspace/DESIGN.md`
- Testing strategy: `docs/TESTING-STRATEGY.md`

## M4.1 Outcome — Schedules and connectors run through adapters with explicit capability controls

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define the canonical “connector” interface: inputs, outputs, bounds, required capabilities,
       and supported modes (desktop local, remote later). Refs: `crates/continuum/DESIGN.md`,
       `ARCHITECTURE-BOUNDARY.md`.
2. [ ] Define capability ids for automation surfaces (e.g., read/write filesystem, network
       connectors, secrets access, export) and keep them snake_case and deny-by-default. Refs:
       `src-tauri/DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
3. [ ] Ensure all connector execution is host-owned (renderer never opens sockets); host calls
       Continuum traits/adapters. Refs: `ARCHITECTURE-BOUNDARY.md`, `src-tauri/DESIGN.md`,
       `crates/continuum/DESIGN.md`.
4. [ ] Provide a minimal set of built-in connectors (at least one “local file ingest” and one
       “external system” stub) to prove the adapter seam without weakening security posture. Refs:
       `crates/continuum/DESIGN.md`, `src-tauri/DESIGN.md`.
5. [ ] Expose host IPC commands to manage connectors/schedules (list, enable/disable, run now,
       view last run), and ensure all are snake_case and listed in the IPC manifest. Refs:
       `docs/contracts/ipc-manifest.json`, `docs/CONTRACTS-AND-SCHEMAS.md`,
       `src-tauri/DESIGN.md`.
6. [ ] Ensure connector configuration and secrets are stored only in host-controlled secure stores,
       never in renderer state. Refs: `ARCHITECTURE-BOUNDARY.md`, `src-tauri/DESIGN.md`.
7. [ ] Provide a user-visible “capability request/approval” UX for connectors where needed (explicit,
       audited, reversible). Refs: `docs/UX-DESIGN.md`, `src-tauri/DESIGN.md`,
       `docs/frontend/continuum-automation/DESIGN.md`.
8. [ ] Ensure connector runs are job-driven with progress/cancel and completion notifications. Refs:
       `docs/UX-DESIGN.md`, `src-tauri/DESIGN.md`, `crates/continuum/DESIGN.md`.
9. [ ] Add tests that assert no renderer HTTP is introduced and that capability checks gate connector
       execution. Refs: `ARCHITECTURE-BOUNDARY.md`, `docs/TESTING-STRATEGY.md`.
10. [ ] Document the “adapter seam” and capability posture in both Continuum design and the UX doc
        for automation. Refs: `crates/continuum/DESIGN.md`,
        `docs/frontend/continuum-automation/DESIGN.md`.

## M4.2 Outcome — Ingest workflows preserve provenance (ops + facts) and remain replayable

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define ingest as an op-producing workflow: connectors produce proposed operations/facts,
       and Mneme persists them as the canonical record. Refs: `docs/DESIGN.md`,
       `crates/mneme_core/DESIGN.md`, `crates/mneme_store/DESIGN.md`.
2. [ ] Define provenance fields required for every ingest op/fact: source system, connector id,
       run id, timestamp, actor, and optional evidence refs. Refs: `crates/mneme_core/DESIGN.md`,
       `crates/continuum/DESIGN.md`.
3. [ ] Ensure ingest is schema-aware: validate against Praxis metamodel constraints before write,
       and surface validation failures as actionable diagnostics. Refs: `crates/praxis/DESIGN.md`,
       `crates/mneme_store/DESIGN.md`, `docs/UX-DESIGN.md`.
4. [ ] Ensure ingest is time-aware: every ingested fact/op has explicit time context semantics and
       does not silently default to “now”. Refs: `crates/chrona/DESIGN.md`, `docs/DESIGN.md`,
       `crates/mneme_core/DESIGN.md`.
5. [ ] Make ingest runs replayable: store the exact input snapshot (or a stable reference), the
       transformation version, and the produced ops. Refs: `crates/continuum/DESIGN.md`,
       `crates/mneme_store/DESIGN.md`.
6. [ ] Provide a user-visible “ingest run detail” view (what happened, what changed, why, and how
       to replay/rollback) in the Mneme workspace and Status window. Refs:
       `docs/frontend/mneme-workspace/DESIGN.md`, `docs/UX-DESIGN.md`.
7. [ ] Ensure ingest does not leak PII by default: apply redaction rules for stored artifacts and
       exported diagnostics. Refs: `ARCHITECTURE-BOUNDARY.md`, `src-tauri/DESIGN.md`.
8. [ ] Add deterministic fixtures for ingest flows and assert replay produces identical state
       (within defined bounds). Refs: `docs/TESTING-STRATEGY.md`,
       `crates/mneme_store/DESIGN.md`.
9. [ ] Define and document “rollback” semantics (if supported) or explicit “compensating ops”
       patterns. Refs: `crates/mneme_core/DESIGN.md`, `crates/praxis/DESIGN.md`.
10. [ ] Update contracts docs for any new ingest IPC commands/events and snapshot them in manifests.
        Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/contracts/ipc-manifest.json`,
        `docs/contracts/event-manifest.json`.

## M4.3 Outcome — Automated runs are job-driven (progress, cancellation, durable history)

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Ensure every automation/ingest run is represented as a durable job record with correlation
       ids, progress stages, and timestamps. Refs: `src-tauri/DESIGN.md`,
       `crates/mneme_store/DESIGN.md`.
2. [ ] Ensure job kinds for automation are snake_case and bounded, and that results are referenced
       by ref rather than inline payloads. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`,
       `crates/continuum/DESIGN.md`.
3. [ ] Implement cancellation semantics for automation runs and ensure partial results are handled
       safely (no inconsistent writes). Refs: `crates/continuum/DESIGN.md`,
       `crates/mneme_store/DESIGN.md`, `docs/UX-DESIGN.md`.
4. [ ] Provide durable run history and “rerun” actions in the automation UX (bounded list). Refs:
       `docs/frontend/continuum-automation/DESIGN.md`, `docs/UX-DESIGN.md`.
5. [ ] Ensure automated runs are observable in the global job tray and Status window. Refs:
       `docs/UX-DESIGN.md`, `DESIGN.md`.
6. [ ] Ensure job progress stage names are stable and meaningful (snake_case stages). Refs:
       `src-tauri/DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
7. [ ] Ensure automation jobs are recoverable across restarts (interrupted jobs visible and
       actionable). Refs: `crates/mneme_store/DESIGN.md`, `src-tauri/DESIGN.md`.
8. [ ] Add tests for enqueue→progress→complete, enqueue→cancel, and restart mid-run. Refs:
       `docs/TESTING-STRATEGY.md`.
9. [ ] Ensure jobs never require renderer polling for correctness (events + bounded list queries).
       Refs: `docs/UX-DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
10. [ ] Document the automation job lifecycle and how it maps to ingest/provenance records. Refs:
        `crates/continuum/DESIGN.md`, `crates/mneme_store/DESIGN.md`.

## M4.4 Outcome — Connector outputs are validated against schema and time context pre-write

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define a pre-write validation pipeline: schema validation (types/fields), time context
       validity, scenario/layer policy, and bounds checks. Refs: `crates/praxis/DESIGN.md`,
       `crates/chrona/DESIGN.md`, `crates/mneme_store/DESIGN.md`.
2. [ ] Ensure connectors emit typed “proposed changes” (ops/facts) rather than writing directly,
       enabling validation and preview. Refs: `crates/continuum/DESIGN.md`,
       `ARCHITECTURE-BOUNDARY.md`.
3. [ ] Provide a user-visible “preview changes” step for interactive ingest (diff-like summary)
       before applying writes. Refs: `docs/UX-DESIGN.md`,
       `docs/frontend/continuum-automation/DESIGN.md`.
4. [ ] Ensure validation errors are actionable and grouped (what field/type failed, why, how to fix)
       and include correlation ids. Refs: `docs/UX-DESIGN.md`, `src-tauri/DESIGN.md`.
5. [ ] Ensure validation is deterministic (same inputs → same validation results). Refs:
       `docs/TESTING-STRATEGY.md`, `crates/praxis/DESIGN.md`.
6. [ ] Ensure time context validation rejects implicit defaults; require explicit `as_of` and
       scenario/layer policies. Refs: `crates/chrona/DESIGN.md`, `docs/DESIGN.md`.
7. [ ] Add guardrails that prevent connectors from emitting unbounded volumes (batching and
       limits), and fail gracefully with guidance. Refs: `crates/continuum/DESIGN.md`,
       `docs/UX-DESIGN.md`.
8. [ ] Add tests that cover validation success, schema failure, time context failure, and bounds
       exceeded. Refs: `docs/TESTING-STRATEGY.md`.
9. [ ] Ensure validation results are persisted alongside run provenance for auditability. Refs:
       `crates/mneme_store/DESIGN.md`, `crates/continuum/DESIGN.md`.
10. [ ] Snapshot validation-related contracts in docs and manifests, and keep them stable. Refs:
        `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/contracts/ipc-manifest.json`.

## M4.5 Outcome — Failures surface actionable diagnostics and retry guidance

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define failure classes for automation/ingest: connector auth, schema mismatch, bounds,
       network/timeouts (host-owned), storage unavailable, partial apply prevented. Refs:
       `crates/continuum/DESIGN.md`, `src-tauri/DESIGN.md`.
2. [ ] Ensure failure UIs show “what failed / why / what to do next” in human text and link to
       run/job details. Refs: `docs/UX-DESIGN.md`,
       `docs/frontend/continuum-automation/DESIGN.md`.
3. [ ] Ensure every failure includes correlation id and redacted diagnostic context (copyable via
       Status). Refs: `src-tauri/DESIGN.md`, `docs/UX-DESIGN.md`.
4. [ ] Define safe retry semantics per connector/job kind and surface retry only when safe. Refs:
       `crates/continuum/DESIGN.md`, `docs/UX-DESIGN.md`.
5. [ ] Ensure “auth required” failures route to a host-controlled credential setup flow and do not
       leak secrets into renderer. Refs: `src-tauri/DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
6. [ ] Ensure validation/bounds failures include suggested mitigations (narrow scope, adjust mapping,
       split run). Refs: `docs/UX-DESIGN.md`, `crates/continuum/DESIGN.md`.
7. [ ] Ensure storage failures offer recovery actions (retry, restore from backup, open read-only).
       Refs: `docs/UX-DESIGN.md`, `crates/mneme_store/DESIGN.md`.
8. [ ] Add tests for representative failure paths and assert both error envelopes and UI guidance.
       Refs: `docs/TESTING-STRATEGY.md`.
9. [ ] Ensure failures are recorded durably as part of run history with redaction. Refs:
       `crates/mneme_store/DESIGN.md`, `src-tauri/DESIGN.md`.
10. [ ] Document failure patterns and expected UX in the Continuum automation UX doc. Refs:
        `docs/frontend/continuum-automation/DESIGN.md`, `docs/UX-DESIGN.md`.

## M4.6 Outcome — Schedules can be paused/resumed without data loss

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define schedule model: id, cron/interval, connector, parameters, last run, next run, enabled
       flag, and bounds. Refs: `crates/continuum/DESIGN.md`.
2. [ ] Persist schedules durably and ensure they survive restarts. Refs: `crates/mneme_store/DESIGN.md`,
       `src-tauri/DESIGN.md`.
3. [ ] Ensure “pause” stops future runs without affecting already-applied ops/facts. Refs:
       `crates/continuum/DESIGN.md`, `docs/DESIGN.md`.
4. [ ] Ensure “resume” recomputes next run deterministically and does not silently backfill unless
       explicitly requested. Refs: `crates/continuum/DESIGN.md`, `docs/UX-DESIGN.md`.
5. [ ] Provide UI controls for pause/resume with explicit confirmation and capability gating. Refs:
       `docs/frontend/continuum-automation/DESIGN.md`, `src-tauri/DESIGN.md`.
6. [ ] Ensure schedule state changes are event-driven and reflected in UI promptly (no polling by
       default). Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/UX-DESIGN.md`.
7. [ ] Define race conditions (pause during run, resume while queued) and handle them safely and
       deterministically. Refs: `src-tauri/DESIGN.md`, `crates/continuum/DESIGN.md`.
8. [ ] Add tests covering pause/resume interactions, including restart mid-change. Refs:
       `docs/TESTING-STRATEGY.md`.
9. [ ] Ensure schedule changes are audited (who changed what, when) in run history. Refs:
       `crates/mneme_store/DESIGN.md`, `src-tauri/DESIGN.md`.
10. [ ] Document schedule semantics in Continuum design and automation UX docs. Refs:
        `crates/continuum/DESIGN.md`, `docs/frontend/continuum-automation/DESIGN.md`.

## M4.7 Outcome — Backfills are bounded and auditable

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define backfill as a first-class workflow: specify time range, scope, connector, and max
       volume bounds. Refs: `crates/continuum/DESIGN.md`, `crates/chrona/DESIGN.md`.
2. [ ] Ensure backfills run as jobs with progress stages and cancellation, and do not block UI. Refs:
       `src-tauri/DESIGN.md`, `docs/UX-DESIGN.md`.
3. [ ] Ensure backfill runs are auditable: run id, parameters, produced ops/facts, and validation
       results are persisted. Refs: `crates/mneme_store/DESIGN.md`, `crates/continuum/DESIGN.md`.
4. [ ] Provide “preview” of backfill impact (bounded diff summary) before applying writes. Refs:
       `docs/UX-DESIGN.md`, `docs/frontend/continuum-automation/DESIGN.md`.
5. [ ] Ensure backfills are idempotent where possible (dedupe keys, deterministic mapping) and
       document non-idempotent cases explicitly. Refs: `crates/mneme_store/DESIGN.md`,
       `crates/continuum/DESIGN.md`.
6. [ ] Ensure backfills are time-context correct and never fabricate implicit time; label time
       semantics in UI. Refs: `crates/chrona/DESIGN.md`, `docs/UX-DESIGN.md`.
7. [ ] Ensure bounds exceeded yields actionable guidance (split range, narrow scope). Refs:
       `docs/UX-DESIGN.md`, `crates/continuum/DESIGN.md`.
8. [ ] Add tests for bounded backfill (small range) and bounds exceeded case with stable error codes.
       Refs: `docs/TESTING-STRATEGY.md`, `src-tauri/DESIGN.md`.
9. [ ] Ensure backfill results can be replayed to identical state and compared against baseline
       (within defined invariants). Refs: `crates/mneme_store/DESIGN.md`, `docs/DESIGN.md`.
10. [ ] Document backfill workflow and audit requirements in Continuum design and automation UX docs.
        Refs: `crates/continuum/DESIGN.md`, `docs/frontend/continuum-automation/DESIGN.md`.

## M4.8 Outcome — DoD: ingest can be replayed to an identical state with documented provenance

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define “identical state” invariants for ingest replay (same ops/facts, same derived
       projections after processing, stable ids where required). Refs: `docs/DESIGN.md`,
       `crates/mneme_core/DESIGN.md`.
2. [ ] Ensure ingest runs store all required inputs (or stable references) and transformation
       versions to enable replay. Refs: `crates/continuum/DESIGN.md`, `crates/mneme_store/DESIGN.md`.
3. [ ] Provide a “replay run” action in UI that is explicit, bounded, and job-driven. Refs:
       `docs/frontend/continuum-automation/DESIGN.md`, `docs/UX-DESIGN.md`.
4. [ ] Add deterministic end-to-end replay tests using synthetic fixtures and assert identical
       results (within defined tolerance). Refs: `docs/TESTING-STRATEGY.md`.
5. [ ] Ensure provenance is visible and queryable (run detail shows sources, dedupe keys, validation
       steps, produced ops). Refs: `docs/frontend/mneme-workspace/DESIGN.md`,
       `docs/UX-DESIGN.md`.
6. [ ] Ensure replay does not require renderer networking; all IO and connector interactions are
       host-owned and capability-gated. Refs: `ARCHITECTURE-BOUNDARY.md`, `src-tauri/DESIGN.md`.
7. [ ] Ensure retention/compaction policies do not break replay guarantees (retain required op log
       windows or store snapshots explicitly). Refs: `crates/mneme_store/DESIGN.md`, `docs/ROADMAP.md`.
8. [ ] Ensure failure handling during replay is actionable (can resume/split/rollback via
       compensating ops where supported). Refs: `docs/UX-DESIGN.md`, `crates/continuum/DESIGN.md`.
9. [ ] Update `docs/ROADMAP.md` M4 checkboxes only when verification exists and record delivered
       outcomes in `CHANGELOG.md`. Refs: `docs/ROADMAP.md`, `CHANGELOG.md`.
10. [ ] Mark M4 complete only when every M4 outcome and the DoD line are `[x]` and contracts remain
        stable (manifests and tests enforced). Refs: `docs/CONTRACTS-AND-SCHEMAS.md`,
        `docs/TESTING-STRATEGY.md`.
