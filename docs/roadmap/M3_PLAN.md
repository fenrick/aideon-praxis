# M3 Plan — Stored, Explainable Artefacts

This plan expands `docs/ROADMAP.md` M3 into concrete, trackable work. It is written as an
**end-state** plan: each item describes what must be true for M3 to be considered delivered, not
what is currently implemented.

Status notation:

- `[x]` implemented and verified in this repo
- `[~]` in progress (partially implemented / partially verified)
- `[ ]` not yet met

## Design references (primary)

- Boundary rules: `ARCHITECTURE-BOUNDARY.md`
- Suite design overview: `docs/DESIGN.md`
- Contracts (IPC/events/envelopes): `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/contracts/ipc-manifest.json`, `docs/contracts/event-manifest.json`
- Host design (capabilities, lifecycle, job orchestration, events): `src-tauri/DESIGN.md`
- Praxis engine design (artefacts, tasks, explainability): `crates/praxis/DESIGN.md`
- Mneme designs (durability, schema-as-data, exports/streams): `crates/mneme_core/DESIGN.md`, `crates/mneme_store/DESIGN.md`
- Cross-cutting UX contract (artefact rendering rules, drill-down): `docs/UX-DESIGN.md`
- Desktop shell UX contract: `DESIGN.md`
- Praxis workspace UX contract: `docs/frontend/praxis-workspace/DESIGN.md`
- Testing strategy: `docs/TESTING-STRATEGY.md`

## M3.1 Outcome — Artefacts are stored and schema-validated as first-class outcomes

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define the canonical artefact record model: id, kind, definition, time context, inputs,
       output reference(s), schema version, created/updated timestamps, and provenance. Refs:
       `crates/praxis/DESIGN.md`, `docs/DESIGN.md`, `crates/mneme_core/DESIGN.md`.
2. [ ] Decide and document where artefacts are stored (Mneme Store tables vs separate artefact
       store) and ensure storage is local-first and portable. Refs: `crates/mneme_store/DESIGN.md`,
       `docs/storage/SQLITE.md`, `ARCHITECTURE-BOUNDARY.md`.
3. [ ] Define artefact schema versions (forward-only), and validate both artefact definitions and
       artefact results at the host boundary before persistence. Refs: `src-tauri/DESIGN.md`,
       `docs/CONTRACTS-AND-SCHEMAS.md`, `crates/praxis/DESIGN.md`.
4. [ ] Expose host IPC commands for artefact CRUD and retrieval by reference (snake_case and
       manifest-listed): create/update definition, list, fetch, delete/archive, fetch result bytes.
       Refs: `docs/contracts/ipc-manifest.json`, `docs/CONTRACTS-AND-SCHEMAS.md`,
       `src-tauri/DESIGN.md`.
5. [ ] Ensure artefacts are keyed by time context and scenario semantics (no mixing across contexts)
       and that the UI always labels the context for stored artefacts. Refs: `docs/UX-DESIGN.md`,
       `crates/praxis/DESIGN.md`, `docs/DESIGN.md`.
6. [ ] Define retention rules for stored artefacts and their results (eviction policy and how it
       affects reproducibility). Refs: `crates/mneme_store/DESIGN.md`, `docs/ROADMAP.md`.
7. [ ] Ensure persistence does not store unredacted PII by default; exports must apply redaction and
       capability gating. Refs: `ARCHITECTURE-BOUNDARY.md`, `src-tauri/DESIGN.md`.
8. [ ] Add contract tests that validate artefact record DTOs and schema versions are stable across
       host/renderer boundaries. Refs: `docs/TESTING-STRATEGY.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
9. [ ] Provide a user-visible “Artefacts library/history” entry point in the Praxis workspace (or
       shell) that is bounded and searchable. Refs: `docs/UX-DESIGN.md`,
       `docs/frontend/praxis-workspace/DESIGN.md`.
10. [ ] Document the artefact storage model and lifecycle in `crates/praxis/DESIGN.md` and ensure it
        matches the UX contract (no hidden caches presented as “saved artefacts”). Refs:
        `crates/praxis/DESIGN.md`, `docs/UX-DESIGN.md`.

## M3.2 Outcome — Core artefact execution exists for key surface types (graph/catalogue/matrix/chart)

Roadmap status: `[x]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [x] Ensure core artefact execution commands exist and are snake_case (graph/catalogue/matrix/chart).
       Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/contracts/ipc-manifest.json`.
2. [x] Ensure each execution request carries explicit time context (as_of, scenario, layer). Refs:
       `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/UX-DESIGN.md`.
3. [x] Ensure execution responses include stable metadata (`ViewMetadata`) so the UI can label
       sources, timestamps, and context. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/UX-DESIGN.md`.
4. [ ] Define standard bounds for each artefact type (max nodes/edges/rows/cells) and ensure bounds
       are enforced by the engine and labeled by the UI. Refs: `crates/praxis/DESIGN.md`,
       `docs/UX-DESIGN.md`.
5. [ ] Define deterministic rendering semantics: same inputs + same time context → same output
       ordering/layout hints. Refs: `docs/DESIGN.md`, `crates/praxis/DESIGN.md`.
6. [ ] Ensure execution errors are mapped to stable host error codes and displayed as actionable
       user-facing messages. Refs: `src-tauri/DESIGN.md`, `docs/UX-DESIGN.md`.
7. [ ] Ensure execution can be job-driven for expensive artefacts (progress/cancel), without
       blocking IPC. Refs: `src-tauri/DESIGN.md`, `docs/UX-DESIGN.md`.
8. [ ] Add tests that cover at least one “happy path” execution per artefact type and one failure
       per type (validation/bounds). Refs: `docs/TESTING-STRATEGY.md`.
9. [ ] Ensure artefact definitions are schema-validated before execution (reject invalid kinds or
       filters). Refs: `crates/praxis/DESIGN.md`, `src-tauri/DESIGN.md`.
10. [ ] Ensure future artefact types can be added without UI fork by preserving the “diagram spec”
        contract posture. Refs: `docs/UX-DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.

## M3.3 Outcome — Artefact rendering is consistent across types (loading/empty/error, selection integration, inspector integration)

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define a shared artefact runtime component pattern (wrapper) that standardizes loading,
       empty, error, and “partial/truncated” states. Refs: `docs/UX-DESIGN.md`,
       `docs/frontend/praxis-workspace/DESIGN.md`.
2. [ ] Ensure every artefact type integrates with global selection consistently (node/edge/cell),
       including primary selection semantics. Refs: `docs/UX-DESIGN.md`,
       `docs/frontend/praxis-workspace/DESIGN.md`.
3. [ ] Ensure the inspector integrates with every artefact type:
   - selection details,
   - actions,
   - task forms.
     Refs: `docs/UX-DESIGN.md`, `DESIGN.md`,
     `docs/frontend/praxis-workspace/DESIGN.md`.
4. [ ] Standardize artefact header metadata display (name, kind, time context, last run, source),
       with consistent placement across widgets. Refs: `docs/UX-DESIGN.md`,
       `docs/frontend/praxis-workspace/DESIGN.md`.
5. [ ] Standardize bounded results warnings (counts, truncation reasons, “narrow scope” actions).
       Refs: `docs/UX-DESIGN.md`, `crates/praxis/DESIGN.md`.
6. [ ] Ensure “refresh” is not a correctness mechanism; reruns are event-driven (with manual refresh
       as explicit recovery only). Refs: `docs/UX-DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
7. [ ] Ensure all artefact widgets support keyboard navigation and accessibility conventions (focus
       outlines, ARIA). Refs: `docs/UX-DESIGN.md`, `docs/CODING-STANDARDS.md`.
8. [ ] Ensure rendering large results is performant (virtualization where needed; avoid heavy DOM).
       Refs: `docs/UX-DESIGN.md`, `docs/CODING-STANDARDS.md`.
9. [ ] Add tests that assert consistent loading/empty/error states across all core artefact widgets.
       Refs: `docs/TESTING-STRATEGY.md`.
10. [ ] Update the Praxis workspace UX doc to list the consistent artefact wrapper behavior and
        required states. Refs: `docs/frontend/praxis-workspace/DESIGN.md`,
        `docs/UX-DESIGN.md`.

## M3.4 Outcome — Drill‑down and explainability are consistent (selection → explain → task) with bounded evidence

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define the canonical “explain” artefact types (e.g., why a node exists, why a relationship
       exists, why a diff occurred) and their bounded evidence model. Refs:
       `crates/praxis/DESIGN.md`, `docs/UX-DESIGN.md`.
2. [ ] Ensure “explain” is always invoked via host/engine (no local traversal) and returns evidence
       references (ops, facts, provenance) without leaking DB internals. Refs:
       `ARCHITECTURE-BOUNDARY.md`, `crates/praxis/DESIGN.md`, `crates/mneme_core/DESIGN.md`.
3. [ ] Define evidence bounds (max ops/facts/paths) and enforce them with explicit truncation
       labeling. Refs: `crates/praxis/DESIGN.md`, `docs/UX-DESIGN.md`.
4. [ ] Provide a stable “Explain” action surface for all selection kinds (graph nodes/edges, matrix
       cells, catalogue rows). Refs: `docs/UX-DESIGN.md`,
       `docs/frontend/praxis-workspace/DESIGN.md`.
5. [ ] Define the canonical “task” actions that follow explain (create/update/delete/link/unlink)
       and ensure they are explicit operations with preview/dry run where needed. Refs:
       `crates/praxis/DESIGN.md`, `docs/UX-DESIGN.md`.
6. [ ] Ensure explain outputs are time-context aware and always label the active context. Refs:
       `docs/DESIGN.md`, `docs/UX-DESIGN.md`, `crates/chrona/DESIGN.md`.
7. [ ] Add IPC commands and DTOs for explain surfaces and snapshot them in manifests. Refs:
       `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/contracts/ipc-manifest.json`.
8. [ ] Ensure explain/inspect actions are capability-gated where they expose sensitive diagnostics.
       Refs: `src-tauri/DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
9. [ ] Add tests with deterministic fixtures that assert explainability includes evidence and
       truncation behavior. Refs: `docs/TESTING-STRATEGY.md`, `crates/praxis/DESIGN.md`.
10. [ ] Document the drill-down flow in UX docs with explicit states (loading/empty/error) and
        consistent placement. Refs: `docs/UX-DESIGN.md`,
        `docs/frontend/praxis-workspace/DESIGN.md`.

## M3.5 Outcome — Scenario compare and time‑diff are grounded in artefact outputs (not ad-hoc UI diffing)

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define “compare” artefact types (time diff, scenario compare) and their output schema (counts,
       lists, affected entities, topology deltas). Refs: `crates/chrona/DESIGN.md`,
       `crates/praxis/DESIGN.md`, `docs/UX-DESIGN.md`.
2. [ ] Ensure compare artefacts are executed by engines and returned as diagram/table outputs; the
       UI only renders them. Refs: `ARCHITECTURE-BOUNDARY.md`, `docs/UX-DESIGN.md`.
3. [ ] Define bounding controls (scope filters, max diffs) and enforce them; label truncation. Refs:
       `crates/chrona/DESIGN.md`, `docs/UX-DESIGN.md`.
4. [ ] Ensure compare artefacts are time-context explicit for both “from” and “to” contexts (including
       scenarios/layers). Refs: `crates/chrona/DESIGN.md`, `docs/DESIGN.md`.
5. [ ] Provide consistent UI affordances to launch compare artefacts from selection/time controls.
       Refs: `docs/UX-DESIGN.md`, `docs/frontend/praxis-workspace/DESIGN.md`.
6. [ ] Ensure compare artefacts can be stored like other artefacts and re-opened later. Refs:
       `crates/praxis/DESIGN.md`, `crates/mneme_store/DESIGN.md`.
7. [ ] Ensure compare artefacts can be explained (“why did this change”) via evidence surfaces. Refs:
       `crates/praxis/DESIGN.md`, `docs/UX-DESIGN.md`.
8. [ ] Add contract tests for compare artefact DTO shapes and time context requirements. Refs:
       `docs/TESTING-STRATEGY.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
9. [ ] Add tests that ensure the renderer does not compute diffs locally for correctness (no ad-hoc
       compare logic). Refs: `ARCHITECTURE-BOUNDARY.md`, `docs/CODING-STANDARDS.md`.
10. [ ] Update UX docs to include compare artefact patterns and placement in the workspace. Refs:
        `docs/UX-DESIGN.md`, `docs/frontend/praxis-workspace/DESIGN.md`.

## M3.6 Outcome — Artefact caches invalidate on workspace/time/scenario/model changes via events

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define the artefact cache model explicitly (what is cached, how it is keyed, eviction) and
       keep it separate from “stored artefacts” records. Refs: `docs/UX-DESIGN.md`,
       `crates/praxis/DESIGN.md`.
2. [ ] Add host→renderer events for cache invalidation triggers (`model_changed`, `workspace_opened`,
       `workspace_closed`, scenario updates) and snapshot them. Refs:
       `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/contracts/event-manifest.json`.
3. [ ] Ensure invalidation triggers deterministic re-execution (cancel stale runs, rerun latest).
       Refs: `docs/UX-DESIGN.md`, `src-tauri/DESIGN.md`.
4. [ ] Ensure cache invalidation occurs after task operations that mutate the model. Refs:
       `docs/CONTRACTS-AND-SCHEMAS.md`, `crates/praxis/DESIGN.md`.
5. [ ] Ensure caches do not outlive their workspace (clear on workspace close). Refs:
       `docs/UX-DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
6. [ ] Ensure the renderer subscribes via a single subscription adapter (no ad-hoc event wiring).
       Refs: `ARCHITECTURE-BOUNDARY.md`, `docs/CODING-STANDARDS.md`.
7. [ ] Add tests that simulate event-driven invalidation and assert artefacts rerun correctly and UI
       state transitions are stable. Refs: `docs/TESTING-STRATEGY.md`.
8. [ ] Provide a user-visible “recover from missed events” action that is explicit (no background
       polling). Refs: `docs/UX-DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
9. [ ] Ensure invalidation events include correlation ids / sequence markers when needed to detect
       gaps. Refs: `src-tauri/DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
10. [ ] Update the contracts doc to list required artefact invalidation events and payload keys. Refs:
        `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/contracts/event-manifest.json`.

## M3.7 Outcome — Export/print flows respect PII redaction and capabilities (deny-by-default)

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define export/print as host-owned capabilities (deny-by-default), not renderer-side file IO.
       Refs: `ARCHITECTURE-BOUNDARY.md`, `src-tauri/DESIGN.md`.
2. [ ] Define export formats for artefacts (PDF/PNG/CSV/JSON) and which ones are supported in M3
       (can be staged) with explicit redaction rules. Refs: `docs/UX-DESIGN.md`, `docs/DESIGN.md`.
3. [ ] Implement export/print as jobs when expensive; provide progress/cancel and result refs. Refs:
       `src-tauri/DESIGN.md`, `docs/UX-DESIGN.md`.
4. [ ] Ensure exports are PII-redacted by default; provide explicit opt-in for sensitive fields only
       when a capability allows it. Refs: `ARCHITECTURE-BOUNDARY.md`, `src-tauri/DESIGN.md`.
5. [ ] Ensure exports capture the artefact context (time/scenario/layer, filters, bounds) in
       metadata for auditability. Refs: `docs/DESIGN.md`, `docs/UX-DESIGN.md`.
6. [ ] Ensure export results are stored/referenced in a safe location and cleaned up per retention
       policy. Refs: `src-tauri/DESIGN.md`, `crates/mneme_store/DESIGN.md`.
7. [ ] Add a user-visible export UX pattern (from artefact header/actions) consistent across types.
       Refs: `docs/UX-DESIGN.md`, `docs/frontend/praxis-workspace/DESIGN.md`.
8. [ ] Add tests that assert exports are denied without capability, and that redaction is applied in
       at least one export path. Refs: `docs/TESTING-STRATEGY.md`, `ARCHITECTURE-BOUNDARY.md`.
9. [ ] Document export/print capabilities, defaults, and redaction posture in the host design doc.
       Refs: `src-tauri/DESIGN.md`.
10. [ ] Update the roadmap statuses only when export/print flows are verified end-to-end and do not
        weaken security posture (no renderer HTTP, no new ports). Refs: `docs/ROADMAP.md`,
        `ARCHITECTURE-BOUNDARY.md`.

## M3.8 Outcome — DoD: artefacts are reproducible and explainable without bespoke UI logic

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Enumerate the M3 “core artefact flows” that must be reproducible:
   - execute,
   - store,
   - re-open and render,
   - explain from selection,
   - run compare artefact,
   - export with redaction.
     Refs: `docs/UX-DESIGN.md`, `crates/praxis/DESIGN.md`.
2. [ ] Ensure artefact definitions/results are deterministic given the same inputs and time context,
       and add tests/golden fixtures that assert this. Refs: `docs/TESTING-STRATEGY.md`,
       `crates/praxis/DESIGN.md`.
3. [ ] Ensure artefacts remain bounded; any partial/truncated results must be explicit and included
       in persisted records. Refs: `docs/UX-DESIGN.md`, `crates/praxis/DESIGN.md`.
4. [ ] Ensure explainability is part of the artefact contract: “why” surfaces are artefacts or
       evidence views, not widget-specific heuristics. Refs: `docs/UX-DESIGN.md`,
       `ARCHITECTURE-BOUNDARY.md`.
5. [ ] Ensure renderer-side code does not embed backend traversal/analytics logic (guardrails in CI,
       design-system patterns). Refs: `ARCHITECTURE-BOUNDARY.md`, `docs/CODING-STANDARDS.md`.
6. [ ] Add contract tests for any new artefact commands/events and ensure manifests are updated and
       enforced. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/TESTING-STRATEGY.md`.
7. [ ] Add E2E smoke for “stored artefact reopen” and “explain from selection” flows (even minimal).
       Refs: `docs/TESTING-STRATEGY.md`.
8. [ ] Ensure Status window provides diagnostics relevant to artefact reproduction (schema versions,
       missing result refs, export failures). Refs: `docs/UX-DESIGN.md`, `src-tauri/DESIGN.md`.
9. [ ] Update `docs/ROADMAP.md` M3 checkboxes only when verification exists, and record delivered
       outcomes in `CHANGELOG.md`. Refs: `docs/ROADMAP.md`, `CHANGELOG.md`.
10. [ ] Mark M3 complete only when every M3 outcome and the DoD line are `[x]`, and the design docs
        remain consistent (no drift between artefact UX contract and storage/contract docs). Refs:
        `docs/UX-DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`, `crates/praxis/DESIGN.md`.
