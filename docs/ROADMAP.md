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

### M0 - Launchable, secure desktop

- Desktop app launches offline and completes first-run setup without network access.
- Security boundaries are enforced by default (no renderer HTTP, no open TCP ports).
- IPC command names are snake_case and capability-gated end-to-end.
- IPC contracts are stable and test-verified (DTO parity + error envelope parity).
- Core windows (splash, main, settings, status, about) open reliably via menu/commands.
- Workspace lifecycle works locally: create/open/close/list/backup/restore.
- Recovery UX exists for missing/corrupt workspace data.
- Definition of done: cold start meets SLO; core flows are covered by tests and no security exceptions are required.

### M1 - Time-first workspace experience

- Valid time, layer (plan/actual), and scenario controls are always visible.
- Every artefact call carries explicit time context; no implicit “current state” reads.
- Selection is global and consistent across widgets (node/edge/cell/widget).
- Inspector edits dispatch tasks via IPC; no direct renderer mutations.
- Core artefacts render with loading/empty/error states and test coverage.
- Time/scenario changes trigger artefact invalidation and re-run deterministically.
- Layout persistence works per time context for canvas and graph widgets.
- Definition of done: time/scenario UX matches the contract and is exercised in tests; no manual refresh is required.

### M2 - Job‑driven analytics

- Analytics run as background jobs with progress, cancellation, and completion notifications.
- Job metadata persists across restarts; interrupted jobs are visible and recoverable.
- Outputs are deterministic and explainable (inputs, scope, and parameters surfaced).
- Baseline performance targets are met on medium datasets; long runs are bounded.
- Large result payloads do not block the UI; streaming/columnar approaches are used where needed.
- Job events flow through a single renderer subscription adapter (no polling by default).
- Failures surface actionable diagnostics and retry guidance.
- Definition of done: analytics jobs meet SLOs on baseline datasets and are fully observable end‑to‑end.

### M3 - Stored, explainable artefacts

- Artefacts are stored and schema-validated as first-class outcomes.
- Artefact types are consistently rendered (views/catalogues/matrices/maps/reports).
- Drill‑down and explainability are consistent (selection → explain → task).
- Scenario compare and time‑diff are grounded in artefact outputs.
- Artefact caches invalidate on workspace/time/scenario/model changes via events.
- Integrity gates and warnings are human-readable with links to affected items.
- Export/print flows respect PII redaction and permissions.
- Definition of done: artefacts are reproducible and explainable without bespoke UI logic.

### M4 - Proven automation and ingest

- Schedules and connectors run through adapters with explicit capability controls.
- Ingest workflows preserve provenance (ops + facts) and remain replayable.
- Automated runs emit job events, metrics, and audit records.
- Connector outputs are validated against schema and time‑context rules pre‑write.
- Failures surface actionable diagnostics and retry guidance.
- Schedules can be paused/resumed without data loss.
- Backfills are bounded and auditable.
- Definition of done: ingest can be replayed to an identical state with documented provenance.

### M5 - Remote‑ready without UI fork

- Remote execution preserves renderer contracts; switching locality is configuration-only.
- Authn/z, audit, and capability posture match desktop security defaults.
- Network failures degrade gracefully; offline mode remains fully functional.
- Data portability is proven: workspace export/import works across modes.
- Latency budgets are tracked and surfaced against SLOs.
- Remote mode can be enabled without reinstalling or reconfiguring the UI.
- Capability defaults remain deny-by-default in both modes.
- Definition of done: parity tests confirm identical UX and contracts in local vs remote mode.

### M6 - Extensible, documented platform

- Extension seams are proven by at least one non‑core module with real UI + IPC surface.
- C4 diagrams, contracts, UX shell guidance, and boundaries are complete and current.
- Contract tests and coverage thresholds remain enforced as extensions land.
- Performance SLOs are continuously tracked and do not regress with extensions.
- Extension install/uninstall is safe and reversible.
- Extension capabilities are explicitly declared and audited.
- Extension UX integrates with the desktop shell without custom chrome.
- Definition of done: extensions behave like first‑class workspaces with no boundary exceptions.

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
