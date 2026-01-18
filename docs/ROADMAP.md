# Roadmap (Evergreen Planning)

## Purpose

Capture the staged delivery plan for Aideon Suite. This document is **planning**, not architecture.
Design truth lives in `docs/DESIGN.md` and `ARCHITECTURE-BOUNDARY.md`.

This roadmap is evergreen: it is continuously updated as outcomes, constraints, and user needs evolve.

---

## Planning rules

- Desktop-first and offline-first by default.
- No renderer HTTP; no open TCP ports in desktop mode.
- Renderer remains stable: locality (local vs remote) is an adapter swap behind the host.
- Work ships as bounded, explainable artefacts and tasks; no unbounded “query UI”.
- Backlog lives in GitHub Issues/Projects; this doc only records milestones and SLO targets.

---

## Milestones (outcomes, evergreen)

Evergreen rules:

- Milestones describe outcomes, not delivery mechanics or specific implementations.
- Ordering is progressive but not rigid; work may move earlier or later based on evidence.
- Outcomes are satisfied by user-visible capability, not by code completion alone.
- When an outcome is achieved, record it in the changelog and update this roadmap.
- Retire or merge outcomes that are no longer relevant; do not keep stale items.
- Maintain alignment with design and boundary docs; update outcomes when constraints change.
- Status marking: each bullet is an outcome.
  - `[x]` implemented and verified in this repo
  - `[~]` in progress (partially implemented / partially verified)
  - `[ ]` not yet met
- A milestone is complete only when every bullet (including the DoD line) is checked.

### M0 - Launchable, secure desktop

- [~] Desktop app launches offline and completes first-run setup without network access.
- [~] Security boundaries are enforced by default (no renderer HTTP, no open TCP ports).
- [x] IPC command surface is stable snake_case with a canonical request/response error envelope.
- [x] Local storage and migrations exist for desktop mode (SQLite + forward-only migrations).
- [x] Core windows (splash, main, settings, status, about) open reliably via menu/commands (`shell_command` event + snake_case ids).
- [x] Workspace seed/navigation works (projects/scenarios list; templates list/save) without renderer-side storage.
- [ ] Workspace lifecycle is fully usable and safe (create/open/close/backup/restore + recovery UX).
- [ ] DoD: cold start meets SLO and core flows are covered by tests with no security exceptions required.

### M1 - Time-first workspace experience

- [ ] Time context controls are always visible (scenario/branch, commit/as_of, layer).
- [x] Every artefact execution request carries explicit time context (as_of + scenario + layer).
- [x] Selection is global and consistent across widgets (node/edge/cell/widget) and drives the inspector.
- [x] Inspector edits dispatch task operations via IPC; no direct renderer mutations.
- [x] Layout persistence works per time context for canvas and graph widgets (get/save keyed by context).
- [ ] Time context changes invalidate caches and re-run artefacts deterministically (event-driven; no manual refresh required).
- [ ] Time/scenario UX is explainable and bounded (diff/merge/conflicts are first-class and safe).
- [ ] DoD: time/scenario UX matches the contract and is exercised in tests (loading/error/empty + merge conflict paths).

### M2 - Job‑driven analytics

- [ ] Analytics run as background jobs with progress, cancellation, and completion notifications.
- [ ] Job metadata is durable across restarts; interrupted jobs are visible and recoverable.
- [ ] Job UX is consistent across modules (single job tray + Status window support).
- [ ] Analytics outputs are deterministic, bounded, and explainable (evidence included; truncation labeled).
- [ ] Large result payloads do not block the UI (virtualized UI + streaming/columnar where needed).
- [ ] Job events flow through a single renderer subscription adapter (no polling by default).
- [ ] Failures surface actionable diagnostics and retry guidance (with correlation ids).
- [ ] DoD: analytics jobs meet SLOs on baseline datasets and are fully observable end‑to‑end.

### M3 - Stored, explainable artefacts

- [ ] Artefacts are stored and schema-validated as first-class outcomes.
- [x] Core artefact execution exists for key surface types (graph/catalogue/matrix/chart).
- [ ] Artefact rendering is consistent across types (loading/empty/error, selection integration, inspector integration).
- [ ] Drill‑down and explainability are consistent (selection → explain → task) with bounded evidence.
- [ ] Scenario compare and time‑diff are grounded in artefact outputs (not ad-hoc UI diffing).
- [ ] Artefact caches invalidate on workspace/time/scenario/model changes via events.
- [ ] Export/print flows respect PII redaction and capabilities (deny-by-default).
- [ ] DoD: artefacts are reproducible and explainable without bespoke UI logic.

### M4 - Proven automation and ingest

- [ ] Schedules and connectors run through adapters with explicit capability controls.
- [ ] Ingest workflows preserve provenance (ops + facts) and remain replayable.
- [ ] Automated runs are job-driven (progress, cancellation, durable history).
- [ ] Connector outputs are validated against schema and time context pre-write.
- [ ] Failures surface actionable diagnostics and retry guidance.
- [ ] Schedules can be paused/resumed without data loss.
- [ ] Backfills are bounded and auditable.
- [ ] DoD: ingest can be replayed to an identical state with documented provenance.

### M5 - Remote‑ready without UI fork

- [ ] Remote execution preserves renderer contracts; switching locality is configuration-only.
- [ ] Authn/z, audit, and capability posture match desktop security defaults.
- [ ] Remote mode does not introduce renderer networking; host remains the boundary.
- [ ] Network failures degrade gracefully; offline mode remains fully functional.
- [ ] Data portability is proven: workspace export/import works across modes.
- [ ] Latency budgets are tracked and surfaced against SLOs.
- [ ] Capability defaults remain deny-by-default in both modes.
- [ ] DoD: parity tests confirm identical UX and contracts in local vs remote mode.

### M6 - Extensible, documented platform

- [ ] Extension seams are proven by at least one non‑core module with real UI + IPC surface.
- [x] Module UX docs exist for core workspaces and cross-cutting time/automation patterns.
- [x] Contracts and boundaries are documented and kept consistent (IPC + events + error envelopes).
- [ ] Contract tests and coverage thresholds remain enforced as the command/event surface grows.
- [ ] Performance SLOs are continuously tracked and do not regress with extensions.
- [ ] Extension install/uninstall is safe and reversible.
- [ ] Extension capabilities are explicitly declared and audited.
- [ ] DoD: extensions behave like first‑class workspaces with no boundary exceptions.

---

## SLO targets (v1)

- Cold start <= 3s
- Open medium workspace (tens of thousands of entities) <= 2s
- Interactive artefact execution p95 <= 250ms (warm)
- Matrix execution (1k x 1k sparse) <= 1s; export <= 2s (500 items)

---

## Non-goals (v1)

- Full OWL/SHACL reasoning.
- Marketplace plugins and multi-tenant SaaS productization.
