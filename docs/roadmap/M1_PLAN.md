# M1 Plan — Time-First Workspace Experience

This plan expands `docs/ROADMAP.md` M1 into concrete, trackable work. It is written as an
**end-state** plan: each item describes what must be true for M1 to be considered delivered, not
what is currently implemented.

Status notation:

- `[x]` implemented and verified in this repo
- `[~]` in progress (partially implemented / partially verified)
- `[ ]` not yet met

## Design references (primary)

- Boundary rules: `ARCHITECTURE-BOUNDARY.md`
- Suite design overview: `docs/DESIGN.md`
- Contracts (IPC/events/envelopes): `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/contracts/ipc-manifest.json`, `docs/contracts/event-manifest.json`
- Host design (capabilities, lifecycle, windowing, jobs): `crates/desktop/DESIGN.md`
- Praxis engine design (time/scenario model, tasks, artefacts): `crates/praxis/DESIGN.md`
- Chrona design (time/scenario semantics and safe UX posture): `crates/chrona/DESIGN.md`
- Desktop shell UX contract: `app/AideonDesktop/DESIGN.md`
- Praxis workspace UX contract: `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`
- Cross-cutting UX contract: `docs/UX-DESIGN.md`
- Testing strategy: `docs/TESTING-STRATEGY.md`

## M1.1 Outcome — Time context controls are always visible (scenario/branch, commit/as_of, layer)

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define the canonical **time context DTO** used by the renderer for all workspace actions
       (valid time `as_of`, optional `scenario`, `layer`, optional confidence), and ensure it is shared
       via `app/AideonDesktop/src/dtos` rather than redefined in widgets. Refs: `docs/DESIGN.md`,
       `docs/CONTRACTS-AND-SCHEMAS.md`, `ARCHITECTURE-BOUNDARY.md`.
2. [ ] Make time context controls a shell-level invariant: a workspace can customize the controls,
       but cannot remove them from the primary interaction surface. Refs: `docs/UX-DESIGN.md`,
       `app/AideonDesktop/DESIGN.md`, `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`.
3. [ ] Ensure the time context summary string is always visible and unambiguous (no implicit “now”
       defaults; always render the explicit `as_of` and current `layer`, and scenario when present).
       Refs: `docs/UX-DESIGN.md`, `crates/chrona/DESIGN.md`.
4. [ ] Provide explicit controls for:
   - `as_of` input + picker,
   - layer toggle (plan/actual),
   - scenario selector (when scenarios exist).
     Refs: `docs/UX-DESIGN.md`, `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`.
5. [ ] Make scenario UX match “overlay” semantics (no VCS metaphors): naming, selection, and
       baseline/overlay presentation. Refs: `docs/UX-DESIGN.md`, `crates/chrona/DESIGN.md`,
       `crates/praxis/DESIGN.md`.
6. [ ] Ensure time context selection is the single source of truth for artefact execution, layout
       persistence keys, and selection preservation logic; do not allow per-widget drift. Refs:
       `docs/UX-DESIGN.md`, `crates/praxis/DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
7. [ ] Add “time context disabled/unavailable” states (e.g., no scenario support) with explicit UI
       messaging rather than hiding controls. Refs: `docs/UX-DESIGN.md`,
       `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`.
8. [ ] Provide keyboard access to time controls (open picker, toggle layer, cycle scenarios) and
       document shortcuts. Refs: `docs/UX-DESIGN.md`, `app/AideonDesktop/DESIGN.md`.
9. [ ] Ensure the host remains authoritative for scenario lists and constraints; renderer never
       fabricates scenarios. Refs: `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`,
       `docs/CONTRACTS-AND-SCHEMAS.md`.
10. [ ] Add tests that assert time controls are present in the primary workspace surface across
        key states (loading/empty/error). Refs: `docs/TESTING-STRATEGY.md`,
        `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`.

## M1.2 Outcome — Every artefact execution request carries explicit time context (as_of + scenario + layer)

Roadmap status: `[x]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [x] Require all artefact execution IPC commands to include `as_of` plus optional `scenario` and
       `layer` fields in payload DTOs. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `crates/praxis/DESIGN.md`.
2. [x] Ensure host IPC commands for artefact execution are snake_case and listed in
       `docs/contracts/ipc-manifest.json`. Refs: `docs/contracts/ipc-manifest.json`,
       `docs/CONTRACTS-AND-SCHEMAS.md`.
3. [x] Ensure renderer artefact calls do not infer time context from UI state implicitly; the time
       context is explicitly passed per request. Refs: `docs/UX-DESIGN.md`,
       `docs/CONTRACTS-AND-SCHEMAS.md`.
4. [x] Ensure artefact result metadata includes `as_of`/`scenario`/`layer` for UI display and cache
       keys. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/UX-DESIGN.md`.
5. [ ] Define and document “missing time context” host errors (`code` identifiers) and ensure the
       renderer surfaces actionable guidance (not raw objects). Refs: `crates/desktop/DESIGN.md`,
       `docs/UX-DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
6. [ ] Ensure time context is included in all future artefact types (map/report/page), not only the
       current core set. Refs: `crates/praxis/DESIGN.md`, `docs/UX-DESIGN.md`.
7. [ ] Add contract tests that fail if any artefact execute call is missing required time context
       keys. Refs: `docs/TESTING-STRATEGY.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
8. [ ] Ensure the host validates time context inputs (ISO timestamps, known scenarios/layers) and
       returns stable error codes on validation failure. Refs: `crates/desktop/DESIGN.md`,
       `crates/praxis/DESIGN.md`.
9. [ ] Ensure artefact execution is bounded by time context (limits, filters) and the UI labels any
       truncation/partial results. Refs: `docs/UX-DESIGN.md`, `crates/praxis/DESIGN.md`.
10. [ ] Ensure time context always flows through adapters, not ad-hoc `invoke()` calls, so contract
        enforcement remains centralized. Refs: `ARCHITECTURE-BOUNDARY.md`,
        `docs/CODING-STANDARDS.md`.

## M1.3 Outcome — Selection is global and consistent across widgets (node/edge/cell/widget) and drives the inspector

Roadmap status: `[x]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [x] Define a canonical selection model (kinds `node`/`edge`/`cell`/`widget`/`none`, plus primary
       selection) in shared renderer state. Refs: `docs/UX-DESIGN.md`,
       `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`.
2. [x] Ensure selection events from React Flow and other widgets are normalized into stable ids and
       pushed to the global store. Refs: `docs/UX-DESIGN.md`,
       `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`.
3. [x] Ensure inspector rendering is driven only by the global selection store (no widget-local
       inspector mutations). Refs: `docs/UX-DESIGN.md`, `app/AideonDesktop/DESIGN.md`.
4. [x] Ensure selection includes origin context (widget id) for disambiguation and focused actions.
       Refs: `docs/UX-DESIGN.md`, `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`.
5. [ ] Define selection preservation rules on time context changes (preserve when safe, otherwise
       clear with explicit explanation). Refs: `docs/UX-DESIGN.md`, `crates/praxis/DESIGN.md`.
6. [ ] Define cross-widget selection semantics (e.g., selecting a catalogue row highlights the
       corresponding node in a graph when present) as an explicit, bounded behaviour. Refs:
       `docs/UX-DESIGN.md`, `crates/praxis/DESIGN.md`.
7. [ ] Add a stable “selection → explain” action surface (button/menu) that dispatches an
       explanation artefact rather than embedding traversal rules in the UI. Refs:
       `docs/UX-DESIGN.md`, `crates/praxis/DESIGN.md`.
8. [ ] Add a stable “selection → task” action surface (create/update/delete/link/unlink) with
       explicit preview and bounds. Refs: `docs/UX-DESIGN.md`, `crates/praxis/DESIGN.md`.
9. [ ] Ensure selection state is resilient across workspace navigation (opening/closing) and is
       cleared on workspace close events. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`,
       `docs/UX-DESIGN.md`.
10. [ ] Expand tests to cover selection across all supported widget types and ensure inspector
        updates are deterministic. Refs: `docs/TESTING-STRATEGY.md`,
        `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`.

## M1.4 Outcome — Inspector edits dispatch task operations via IPC; no direct renderer mutations

Roadmap status: `[x]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [x] Ensure inspector edits are expressed as explicit task operations and sent via a snake_case
       IPC command (`praxis_task_apply_operations`). Refs: `docs/CONTRACTS-AND-SCHEMAS.md`,
       `crates/praxis/DESIGN.md`.
2. [x] Ensure the renderer does not mutate the twin directly (no ad-hoc graph mutations); only UI
       state updates locally. Refs: `ARCHITECTURE-BOUNDARY.md`, `docs/UX-DESIGN.md`.
3. [x] Ensure the host returns structured success/failure envelopes with stable error codes. Refs:
       `crates/desktop/DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
4. [x] Ensure the inspector uses loading/saving states and handles failures as user-readable
       summaries. Refs: `docs/UX-DESIGN.md`, `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`.
5. [ ] Define optimistic UI posture explicitly (default: pessimistic; do not show success until
       host acknowledges), and document when optimism is allowed. Refs: `docs/UX-DESIGN.md`,
       `crates/praxis/DESIGN.md`.
6. [ ] Provide “dry run / preview” for high-impact operations (delete, unlink, bulk updates) before
       applying them. Refs: `docs/UX-DESIGN.md`, `crates/praxis/DESIGN.md`.
7. [ ] Ensure operations carry explicit time context / branch/scenario semantics where required, and
       document the rules (e.g., plan vs actual writes). Refs: `crates/praxis/DESIGN.md`,
       `crates/chrona/DESIGN.md`, `docs/DESIGN.md`.
8. [ ] Ensure task operations are bounded (batch size, validation rules, conflict detection) and
       failures are actionable. Refs: `crates/praxis/DESIGN.md`, `docs/UX-DESIGN.md`.
9. [ ] Add event-driven invalidation (model changed events) so post-save artefacts re-run without
       manual refresh. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/UX-DESIGN.md`.
10. [ ] Add tests that cover successful apply, validation failure, and conflict-like failure paths
        through the inspector UI. Refs: `docs/TESTING-STRATEGY.md`,
        `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`.

## M1.5 Outcome — Layout persistence works per time context for canvas and graph widgets (get/save keyed by context)

Roadmap status: `[x]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [x] Define layout DTOs with explicit time context keys (`as_of`, optional `scenario`/`layer`) for
       canvas and graph widgets. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `crates/praxis/DESIGN.md`.
2. [x] Ensure layout persistence flows through host IPC commands and is listed in the IPC manifest.
       Refs: `docs/contracts/ipc-manifest.json`, `docs/CONTRACTS-AND-SCHEMAS.md`.
3. [x] Ensure persistence keys include document/widget identity so layouts do not collide across
       templates or workspaces. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`,
       `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`.
4. [x] Ensure loading/saving failures are handled gracefully (fallback to computed layout and
       surface a warning). Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
5. [ ] Add “layout versioning” or schemaVersion strategy so layout DTO evolution does not break
       users. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `crates/desktop/DESIGN.md`.
6. [ ] Ensure layout persistence is bounded and doesn’t block UI (debounced saves, payload size
       limits). Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
7. [ ] Add tests that validate layout keys change when time context changes and that layouts do not
       bleed across contexts. Refs: `docs/TESTING-STRATEGY.md`,
       `docs/CONTRACTS-AND-SCHEMAS.md`.
8. [ ] Ensure “reset layout” is available and is host-persisted (not only local state), with a
       clear user confirmation. Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
9. [ ] Ensure layout persistence works across restarts (durable), and is covered by at least one
       integration/E2E test. Refs: `docs/TESTING-STRATEGY.md`, `crates/desktop/DESIGN.md`.
10. [ ] Ensure layout persistence respects capabilities (deny-by-default) and cannot be used as a
        data exfiltration channel. Refs: `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`.

## M1.6 Outcome — Time context changes invalidate caches and re-run artefacts deterministically (event-driven; no manual refresh required)

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define the renderer-side caching model explicitly (what is cached, key structure includes
       time context, expiry/invalidation). Refs: `docs/UX-DESIGN.md`, `crates/praxis/DESIGN.md`.
2. [ ] Add host→renderer events for model/time/scenario changes that are relevant to cache
       invalidation (e.g., `model_changed`), and snapshot them in the event manifest. Refs:
       `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/contracts/event-manifest.json`.
3. [ ] Ensure time context changes trigger deterministic re-execution (same inputs → same outputs)
       and the UI labels any nondeterminism as a bug. Refs: `docs/DESIGN.md`, `crates/praxis/DESIGN.md`.
4. [ ] Remove manual refresh as the primary correctness mechanism; keep it only as a “recovery”
       fallback when events are missed. Refs: `docs/UX-DESIGN.md`.
5. [ ] Ensure concurrent artefact runs are managed (cancel stale runs, keep only latest for a
       given key) to avoid “late response overwrites” bugs. Refs: `docs/UX-DESIGN.md`,
       `crates/desktop/DESIGN.md`.
6. [ ] Ensure selection preservation runs after re-execution and is consistent with defined rules.
       Refs: `docs/UX-DESIGN.md`, `crates/praxis/DESIGN.md`.
7. [ ] Ensure layout persistence fetch is keyed and triggered appropriately on time context changes
       (load layout for new context, don’t reuse old). Refs: `docs/CONTRACTS-AND-SCHEMAS.md`,
       `docs/UX-DESIGN.md`.
8. [ ] Add tests that simulate time context changes and assert artefacts re-run, caches invalidate,
       and UI state transitions are correct (loading/empty/error). Refs: `docs/TESTING-STRATEGY.md`,
       `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`.
9. [ ] Ensure “missed event” recovery works via explicit user action and doesn’t silently poll.
       Refs: `docs/UX-DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
10. [ ] Ensure host publishes event correlation ids/sequence where needed so renderer can detect
        gaps. Refs: `crates/desktop/DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.

## M1.7 Outcome — Time/scenario UX is explainable and bounded (diff/merge/conflicts are first-class and safe)

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define “scenario compare” and “time diff” as artefacts (not local UI computations) and
       document the output shapes and UX flows. Refs: `docs/UX-DESIGN.md`, `crates/praxis/DESIGN.md`,
       `crates/chrona/DESIGN.md`.
2. [ ] Define merge semantics for scenarios in user terms (no Git metaphors), including conflict
       categories and safe resolution steps. Refs: `crates/chrona/DESIGN.md`, `docs/UX-DESIGN.md`,
       `crates/praxis/DESIGN.md`.
3. [ ] Ensure diff/merge operations are bounded (scope filters, size limits, timeouts) and the UI
       labels truncation clearly. Refs: `docs/UX-DESIGN.md`, `crates/chrona/DESIGN.md`.
4. [ ] Provide explainability for diffs (“why did this change”) via evidence surfaces (operations,
       provenance, affected artefacts). Refs: `crates/praxis/DESIGN.md`, `docs/UX-DESIGN.md`.
5. [ ] Ensure conflict resolution produces explicit task operations rather than silent state
       rewriting. Refs: `crates/praxis/DESIGN.md`, `docs/DESIGN.md`.
6. [ ] Ensure merge/diff flows are job-driven when expensive (progress, cancel, completion UX) and
       do not block the UI thread. Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
7. [ ] Add recovery UX for invalid scenarios (missing base, corrupt overlay) with explicit options
       (open read-only, restore, export diagnostics). Refs: `docs/UX-DESIGN.md`,
       `crates/desktop/DESIGN.md`.
8. [ ] Ensure scenario actions are capability-gated (create, delete, merge, export) and deny-by-default.
       Refs: `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`.
9. [ ] Add tests for diff and merge conflict scenarios (at least one deterministic fixture per
       conflict type). Refs: `docs/TESTING-STRATEGY.md`, `crates/chrona/DESIGN.md`,
       `crates/praxis/DESIGN.md`.
10. [ ] Update the Praxis workspace UX doc to include the full diff/merge/conflict flows with
        loading/error/empty states. Refs: `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`,
        `docs/UX-DESIGN.md`.

## M1.8 Outcome — DoD: time/scenario UX matches the contract and is exercised in tests (loading/error/empty + merge conflict paths)

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Enumerate the “time/scenario core flows” that must be tested for M1:
   - change `as_of`,
   - toggle `layer`,
   - select/create/delete scenario (as supported),
   - run a diff artefact,
   - run a merge with a conflict,
   - resolve a conflict via explicit operations.
     Refs: `docs/UX-DESIGN.md`, `crates/chrona/DESIGN.md`, `crates/praxis/DESIGN.md`.
2. [ ] Ensure every flow has explicit loading/empty/error states and that the UI never silently
       “lies” about time/scenario context. Refs: `docs/UX-DESIGN.md`,
       `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`.
3. [ ] Add/extend contract tests so time/scenario-related commands and events are covered (manifest
       guards + shape assertions). Refs: `docs/CONTRACTS-AND-SCHEMAS.md`,
       `docs/TESTING-STRATEGY.md`.
4. [ ] Add E2E coverage for at least one time context change and one scenario merge conflict path
       (even if minimal). Refs: `docs/TESTING-STRATEGY.md`.
5. [ ] Ensure tests are deterministic: fixed seeds, stable fixture datasets, and no reliance on
       system “today” time. Refs: `docs/TESTING-STRATEGY.md`, `crates/chrona/DESIGN.md`.
6. [ ] Ensure performance bounds are respected for core time UX (no excessive re-renders, no large
       synchronous diffs client-side). Refs: `docs/ROADMAP.md`, `docs/UX-DESIGN.md`.
7. [ ] Ensure time/scenario changes do not violate security boundaries (no renderer HTTP, no new
       ports, no secrets in renderer). Refs: `ARCHITECTURE-BOUNDARY.md`,
       `docs/CODING-STANDARDS.md`.
8. [ ] Ensure the Status window provides diagnostics for time/scenario failures (merge conflicts,
       migration errors, invalid scenario state) and users can recover. Refs: `docs/UX-DESIGN.md`,
       `crates/desktop/DESIGN.md`.
9. [ ] Update `docs/ROADMAP.md` M1 checkboxes only when verification exists (tests or explicit
       evidence), and record changes in `CHANGELOG.md` when outcomes are delivered. Refs:
       `docs/ROADMAP.md`, `CHANGELOG.md`.
10. [ ] Mark M1 complete only when every M1 outcome and the DoD line are `[x]` and the design docs
        remain consistent (no drift between UX contract and implementation contracts). Refs:
        `docs/UX-DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`, `crates/desktop/DESIGN.md`.
