# Aideon Praxis — Rectification Plan

**Author:** Codex Agent
**Date:** 2025-11-10
**Scope:** Close architectural gaps (git-structured storage, abstract meta-model, configurable schema delivery, baseline dataset, reporting/analytics) identified during audit.

## 0. Identified Gaps in Design

### Git-structured timeline

The intent in Architecture-Boundary.md:75–146 is a Git-like, append-only commit graph with deterministic ancestry and timeline semantics, yet PraxisEngine just keeps commits/branches in BTreeMaps behind a mutex and increments next_commit for ids (crates/praxis/src/engine.rs:37 and crates/praxis/src/engine.rs:159), meaning history evaporates on restart and commit timestamps are optional/unused; even the UI falls back to showing the id when time is missing (app/desktop/src/lib/components/MainView.svelte:103). Wire PraxisEngine to a persistent CommitStore abstraction that leverages the existing, currently unused SnapshotStore trait (crates/continuum/src/lib.rs:7), stamp commit metadata server-side, and surface branch pointers so “main” always reflects “now” without trusting the renderer.

### Abstract meta-model enforcement

The design requires every node/edge to obey the ArchiMate-style catalog (docs/DESIGN.md:83–196), but the engine only stores opaque NodeVersion/EdgeVersion records with TODOs where schema validation should live (crates/praxis/src/engine.rs:183 and crates/praxis/src/graph.rs:235); StateAtResult today exposes counts only (crates/mneme/src/temporal.rs:24), so no meta-model attributes reach consumers. Introduce a MetaModelRegistry (Rust + shared JSON) that describes element types, relationships, attribute constraints, and plan-event rules, enforce it inside GraphSnapshot::apply, and emit typed DTOs the renderer can project without embedding business logic.

### Configurable/deliverable meta-model

The delivered meta-model is only prose in docs/DESIGN.md, and there’s no mechanism to configure it or ship extensions; even the analytics contract (app/adapters/src/contracts.ts:145) lists job types but nothing populates them. Package the canonical meta-model as data (e.g., docs/meta/core.json) with migration/ versioning, allow tenant overrides via config or scenario commits, and expose schema metadata through the host so UI/business logic can materialise different viewpoints without code changes.

### Base dataset alignment

Requirements call for a baseline dataset that mirrors the strategy-to-execution chain, yet the engine seeds just five sample nodes and four edges (crates/praxis/src/engine.rs:425) and the renderer’s dev adapter merely tracks node/edge counts in memory (app/adapters/src/development-memory.ts:14). Build an importer that loads the real delivered dataset (value streams, capabilities, applications, plan events, etc.) into commits, version it alongside migrations, and ensure state_at can stream actual graph data (not just counts) to both the canvas and reporting layers.

### Reporting & analytics surface

The design promises executive dashboards, scorecards, and roadmap visuals (docs/DESIGN.md:860–884), but today the renderer shows only snapshot counts and diff totals in MainView (app/desktop/src/lib/components/MainView.svelte:275), the canvas pulls a hard-coded two-rectangle scene (crates/chrona/src/scene.rs:5), StateAtResult lacks any graph detail, and Metis is an empty placeholder (crates/metis/src/lib.rs:1). Deliver the analytics worker jobs defined in the contracts file (app/adapters/src/contracts.ts:145), add host commands to invoke them, persist/report their outputs (heatmaps, TCO, timeline charts), and expand.

## 1. Guiding Principles

- **Time-first, git-native:** Commits are the single source of truth; wall-clock timestamps are metadata only.
- **Local-first, cloud-ready:** Desktop persists data locally but uses interfaces that can swap to remote backends.
- **Strict boundaries:** Renderer stays IPC-only; all domain logic lives in host/worker crates.
- **Security by default:** No renderer HTTP, no new ports, PII redaction enforced in reporting.
- **Incremental delivery:** Each workstream lands behind tested commits, documented in GitHub issues with DoD checklists.

## 2. Workstream Overview

| Workstream | Goal                                          | Primary Owners            | Dependencies              |
| ---------- | --------------------------------------------- | ------------------------- | ------------------------- |
| WS-A       | Git-structured temporal storage & persistence | Praxis / Continuum        | None (foundation)         |
| WS-B       | Meta-model enforcement & configurability      | Praxis / Core Data        | WS-A (storage primitives) |
| WS-C       | Delivered baseline dataset & tooling          | Praxis / Docs             | WS-A/B (schema + storage) |
| WS-D       | Analytics & reporting functionality           | Metis / Chrona / Renderer | WS-B/C (schema + data)    |
| WS-E       | Process/quality guardrails & tracking         | Repo-wide                 | Parallel (supports all)   |

Each workstream below details steps, Definition of Done (DoD), testing, and commit guidance.

## WS-A — Git-Structured Temporal Storage

**Objective:** Replace in-memory `BTreeMap` commit log with durable, git-like storage where commits form an immutable DAG, branches map to refs, and snapshots persist across sessions.

### Tasks

1. **Storage design**
   - Document required commit fields (parents, ChangeSet hash, metadata) in `docs/Architecture-Boundary.md`.
   - Specify on-disk layout: `<repo>/.praxis/commits/<hash>.json`, `refs/heads/<branch>`, `snapshots/<commit>.bin`.
2. **Implement `CommitStore` interface**
   - Define trait (put/get commit, list refs, update refs atomically) backed by `continuum::SnapshotStore`.
   - Provide file-based implementation with fsync + write-temp-then-rename semantics.
3. **Refactor Praxis engine**
   - Inject `CommitStore`/`SnapshotStore` via config.
   - Replace `next_commit` counter with content address generator (e.g., blake3 over ChangeSet + parents).
   - Ensure branch operations use optimistic locking (compare-and-swap on refs).
4. **Migrations & tooling**
   - Add CLI (`cargo xtask migrate-state`) to export existing in-memory commits to new store.
   - Update Tauri setup to initialise store location under `AppData/AideonPraxis`.

### Definition of Done

- Application restart preserves entire history; `list_commits('main')` includes authoritative timestamps.
- `state_at()`/`diff()` read from persisted snapshots with structural sharing to meet SLOs.
- Docs updated with storage layout & recovery steps; ADR recorded if format is new.

### Testing & Quality

- Unit tests for `CommitStore` (write/read, ref updates, corruption handling) and persistence-backed engine flows.
- Property test: `apply(diff(a,b), snapshot(a)) == snapshot(b)` using stored snapshots.
- Benchmarks confirm `state_at()` p95 ≤ 250 ms (record results in PR summary).
- Commands to run before commit: `cargo fmt`, `cargo clippy --all-targets --all-features`, `cargo test --all --all-targets`.

### Commit & Tracking Guidance

- Commit 1: Introduce `CommitStore` trait + file-backed implementation.
- Commit 2: Refactor Praxis engine to use store + update tests.
- Commit 3: Add migration tooling + docs.
- Reference GitHub issue; include `Fixes #<id>`; ensure DoD checklist updated via `pnpm run issues:dod`.

## WS-B — Meta-Model Enforcement & Configurability

**Objective:** Materialise the ArchiMate-aligned meta-model as machine-readable data, enforce it during commits, and expose it via Typed IPC for UI adaptability.

**Status (2025-11-11):** `docs/meta/core-v1.json` is now the canonical schema, Praxis loads it via
`MetaModelRegistry`, and the Tauri command `temporal_metamodel_get` feeds the renderer’s new
Meta-model panel plus the adapter contracts. Overrides remain data-driven to keep swaps trivial.

### Tasks

1. **Schema artefacts**
   - Convert `docs/DESIGN.md` meta-model into JSON/YAML (`docs/meta/core-v1.json`), covering element types, relationships, attributes, constraints.
   - Define override format for tenant extensions (e.g., `~/.praxis/meta/custom.json`).
2. **Registry implementation**
   - Build `MetaModelRegistry` (Praxis crate) to load base + overrides, validate version, and expose APIs for lookup/validation.
3. **Validation integration**
   - Update `GraphSnapshot::apply` to call registry validators for creates/updates/edges.
   - Emit typed `PraxisError::ValidationFailed` with actionable messages.
4. **Host exposure**
   - Add Tauri command `temporal_metamodel_get` returning schema metadata.
   - Extend adapters/UI to cache schema and use it for form generation (no backend logic in renderer).

### Definition of Done

- Commits violating type/relationship/attribute rules are rejected with deterministic errors.
- Renderer can fetch meta-model snapshot (read-only) and re-render forms without hardcoded enums.
- Schema versioning documented; upgrades require explicit migration notes.

### Testing & Quality

- Rust tests covering valid/invalid nodes, edges, attribute constraints, plan-event rules.
- Snapshot/golden tests for schema serialization.
- Vitest tests verifying adapters parse schema payload and update stores.

### Commit & Tracking Guidance

- Commit 1: Add schema files + registry skeleton.
- Commit 2: Wire validation into graph engine + tests.
- Commit 3: Add host IPC + adapter/UI updates.
- Update `docs/Architecture-Boundary.md` and `docs/DESIGN.md` references.

## WS-C — Baseline Dataset Delivery

**Objective:** Replace toy seed data with the delivered strategy-to-execution dataset aligned with the meta-model, and provide tooling to maintain it.

### Tasks

1. **Dataset authoring**
   - Model baseline entities/relations in structured files (e.g., `docs/data/base/*.yaml`).
   - Include version metadata and change log.
2. **Importer pipeline**
   - Implement CLI (`cargo xtask import-dataset`) that converts dataset files into ordered commits on `main` (using `CommitStore`).
   - Support dry-run validation for CI.
3. **Engine seeding**
   - Update Praxis `ensure_seeded` to call importer instead of `build_seed_change_set`.
   - Tag baseline commit (`tags: ['baseline','v1']`).
4. **Docs & maintenance**
   - Create `docs/data/README.md` explaining dataset structure, update process, and QA checklist.

### Definition of Done

- Fresh installs reproduce baseline dataset; renderer shows real nodes/edges & relationships.
- Dataset updates follow semantic versioning; importer idempotent on existing stores.
- QA script validates counts, mandatory attributes, and cross-links per design.

### Testing & Quality

- Integration test runs importer into temporary store; asserts expected counts per type.
- Lint dataset files via JSON Schema/YAML validation (add to CI).
- Document manual validation steps (e.g., run `cargo xtask import-dataset --check`).

### Commit & Tracking Guidance

- Commit 1: Add dataset files + documentation.
- Commit 2: Add importer CLI + tests.
- Commit 3: Update engine seeding + remove obsolete hard-coded sample.

## WS-D — Reporting & Analytics Functionality

**Objective:** Deliver analytics jobs (Metis) and UI reporting surfaces aligned with design documents (capability scorecards, roadmap timelines, diff/impact views).

### Tasks

1. **Worker jobs**
   - Flesh out `crates/metis` with algorithms for `Analytics.ShortestPath`, `Analytics.Centrality`, `Analytics.Impact`, `Finance.TCO` using graph snapshots.
   - Provide deterministic fixtures and SLO instrumentation.
2. **Host adapters**
   - Expose new Tauri commands (e.g., `analytics_shortest_path`, `report_capability_scorecard`).
   - Update TypeScript adapters/contracts to call commands with typed payloads.
3. **Renderer UX**
   - Expand `MainView` (overview tab) with KPI cards, capability heatmap, diff legends, scenario comparisons.
   - Add reporting exports (CSV/PDF placeholder) triggered from UI; ensure PII redaction and scenario context.
4. **Caching & performance**
   - Cache analytics outputs per commit to meet latency requirements (<100 ms UI updates, <300 ms worker jobs where specified).

### Definition of Done

- Renderer invokes analytics/reporting commands via IPC; results populate UI + exports without placeholder data.
- Documentation (README/UX guides) includes screenshots and usage instructions.
- PII redaction tests confirm reports contain safe data only.

### Testing & Quality

- Rust unit/integration tests for each analytics job with golden results; record performance metrics in logs.
- Vitest component tests & accessibility checks (capability grid, timeline charts).
- Optional Playwright flow verifying user can run report, download export, and view conflict sets.

### Commit & Tracking Guidance

- Commit per algorithm or UI module to keep diffs reviewable (e.g., `feat(analytics): add shortest path job`).
- Include screenshots/GIFs in PR descriptions for UI changes.
- Update CHANGELOG and ROADMAP milestones as features land.

## WS-E — Process & Quality Guardrails

**Objective:** Institutionalize Definition of Done, CI, and tracking so future work remains aligned with architecture.

### Tasks

1. **Issue hygiene**
   - Enforce DoD template on all `status/in-progress` issues via `pnpm run issues:dod`.
   - Automate project sync with `pnpm run issues:project` in CI or pre-push hook.
2. **CI coverage**
   - Ensure `pnpm run ci` runs on feature branches; fail fast on lint/test gaps.
   - Add dataset/import + schema validation steps to CI pipeline.
3. **Documentation & ADRs**
   - Record key decisions (storage format, schema versioning, reporting architecture) as ADRs under `docs/adr/`.
4. **Release gating**
   - Update release checklist to include dataset regression, analytics SLO verification, and PII redaction tests.

### Definition of Done

- Every PR references tracked issue with completed DoD checklist.
- CI pipeline enforces new validation steps and publishes coverage/artifacts needed by Sonar.
- ADRs exist for each architectural change; docs cross-link to plan outcomes.

### Testing & Quality

- Periodic dry-run: `pnpm run ci` locally + `cargo test` before any push.
- Validate hooks (pre-commit, pre-push) stay deterministic and fast.

### Commit & Tracking Guidance

- Commit updates to tooling/docs as separate PRs to simplify review.
- Tag releases once all workstreams’ DoD items close; verify via `pnpm run issues:project`.

## 3. Timeline (Indicative)

| Week       | Focus                                           |
| ---------- | ----------------------------------------------- |
| 1–2        | WS-A storage implementation & migration tooling |
| 3–4        | WS-B meta-model registry + validation           |
| 5–6        | WS-C dataset import + seeding                   |
| 7–8        | WS-D analytics jobs backend                     |
| 9–10       | WS-D reporting UI/exports                       |
| Continuous | WS-E process guardrails, ADRs, CI enhancements  |

Adjust based on issue sizing; break down large tasks using `pnpm run issues:split`.

## 4. Reporting & Governance

- **Status cadence:** Weekly architecture sync reviewing progress per workstream; update plan document as milestones complete.
- **Metrics:** Track `state_at()` latency, schema validation failure rate, dataset import duration, analytics job runtimes.
- **Risk log:** Maintain in `docs/issues/` mirroring GitHub issues for transparency.

## 5. Next Actions

1. Raise GitHub issues per workstream with this plan linked in the description.
2. Run `pnpm run issues:start <issue>` for WS-A to create working branch and checklist.
3. Begin WS-A storage refactor following steps above; update this document with actual dates as phases complete.
