# Aideon Suite — Staged Implementation Roadmap

## Purpose

Outline the forward-looking milestones and phases for Aideon Suite, showing how Praxis, Chrona,
Metis, Continuum, and Mneme evolve over time. This document focuses on **what** we plan to deliver
and in which stage, not on low-level architecture or design decisions.

**Date:** 2025-10-14  
**Goal:** Deliver **Aideon Suite**, a local-first, graph-native EA platform (Tauri + Python worker)
that treats **time as a first-class dimension** (bitemporal + Plan Events), with a clean path to
server mode. The current implementation focus is the **Praxis desktop module** (core digital twin),
with Chrona, Metis, Continuum, and Mneme evolving alongside it.

## Guiding Principles

- Clear separation: Tauri/Rust host & OS integration; engine crates (Praxis/Chrona/Metis/Continuum) behind typed traits.
- Swap-friendly adapters: Graph, Storage, RPC are interfaces with reference impls.
- Security by default: hardened IPC, PII redaction, least privilege.
- Cloud-ready: Same components run local or remote by configuration.
- Small, valuable increments: every phase has acceptance and exit checks.

## Milestones

### M0 — Foundations (Weeks 1–2)

#### Outcomes

- Monorepo, CI for TS and Rust, CODEOWNERS.
- Tauri capabilities baseline (no renderer HTTP, strict CSP, least-privilege plugins).
- ADRs for RPC and adapter boundaries.
- Interfaces: `GraphAdapter`, `StorageAdapter`, `WorkerClient`.

> **Renderer migration:** The legacy Svelte renderer has been removed. All roadmap items assume
> the React + React Flow canvas runtime described in `docs/DESIGN.md` and
> `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`. Any remaining Svelte references (primarily in
> mirrored historical issue docs) are informational only.

#### Acceptance

- `pnpm run node:test` green on macOS/Windows/Linux; Rust host `cargo fmt/clippy/check/test` clean.
- App shell launches with secured preload/IPC bridge; no renderer HTTP.
- ADRs merged (RPC and adapter boundaries).

### M1 — Local App MVP (Weeks 3–6)

#### Outcomes (updated)

- React + Tauri desktop shell (typed IPC); in-memory time-graph engine (commit/branch/diff) behind Tauri.
- Canvas with ELK layout, manual placement, save per asOf (JSON snapshots behind a traited store).
- Reference adapters (TS): dev in-memory adapter and IPC adapter for temporal calls.
- Pipeline hardening (coverage in CI, CSP checks, Sonar inputs).

#### Acceptance (updated)

- User can scrub time and switch branches (M1.1), edit graph and undo/redo (M1.2), commit, compare and merge (M1.3).
- CI: Node + Rust tests green; coverage ≥ 80% new code; CSP/windows test passes.

### M2 — Python Worker MVP (Weeks 7–10)

#### Outcomes

- Packaged Python worker; pipes/UDS RPC with per-launch token.
- Algorithms: shortest path, degree/betweenness, impact analysis.
- Arrow for large payloads; health and restart supervision.
- Perf baselines captured (SLOs).

#### Acceptance

- Worker jobs return deterministically; no open TCP ports.
- 50k-node centrality within target SLOs.

### M3 — Data Onboarding and Time APIs (Weeks 11–14)

#### Outcomes

- Snapshots and scenarios; local read APIs (GraphQL/REST) with PII redaction.
- Plan Events model (+ confidence) and `state_at()` materialisation.
- AS-OF slider, `POST /plateaus`, `GET /diff`, scenario compare export.
- CSV wizard v2: validation/rollback.

#### Acceptance

- Time-slicing works end-to-end; diff and compare exports.
- BI reads via localhost; redaction verified.

### M4 — Automation and Connector #1 (Weeks 15–18)

#### Outcomes

- Scheduler; CMDB connector (delta sync).
- Staleness metrics; freshness story mode.

#### Acceptance

- Scheduled syncs update changed items only; audit logs kept.
- Staleness dashboard active.

### M5 — Cloud/Server Mode (Weeks 19–24)

#### Outcomes

- Remote Graph/Worker endpoints (mTLS), config switch local↔remote.
- RBAC + optimistic locking + audit.
- Finance/TCO policies (inflation, FX, discount) and `GET /tco`.
- Landing Zone catalogue + conformance.

#### Acceptance

- Desktop targets local or remote without code changes.
- Concurrent edits resolve with clear UX.
- TCO scenario PV compare report generated.

### M6 — Docs and Extensibility (Weeks 25–28)

#### Outcomes

- Full C4 suite (DSL + exports), docs site build.
- Plugin hooks and examples.

#### Acceptance

- One-command docs site build; sample plugins pass tests.

## SLOs (v1 Targets)

- Cold start ≤ 3s; open workspace (≈50k/200k) ≤ 2s.
- `state_at()` p95 ≤ 250ms at 50k/200k (warm).
- `diff(plateauA, plateauB)` ≤ 1s at 50k/200k; export SVG compare ≤ 2s (500 items).
- Shortest path (≤6 hops) p95 ≤ 300ms; betweenness (50k) ≤ 90s batch.
- CSV import 50k rows ≤ 120s; UI p95 render ≤ 100ms.

## Non-Goals (MVP)

- Full OWL/SHACL reasoning, marketplace plugins, AR/VR, multi-tenant SaaS.

## Immediate Backlog (Prioritised)

1. Prove the pipeline and harden

- Persistence boundary (optional): keep `continuum::SnapshotStore` for canvas/layout data but rely on SQLite commits/nodes/edges plus `snapshot_tags` for temporal history instead of dumping JSON blobs.
- E2E contract tests: Vitest against mocked Tauri bridge with golden JSON snapshots for `stateAt()` and `commit()`.
- Coverage in CI: generate LCOV (Vitest) and Rust coverage (grcov); feed Sonar (ensure report paths).
- Security checks: assert CSP and window permission caps in a prod build test.
- Release dry run: produce dev artifacts for macOS/Windows/Linux; verify signing path (ad‑hoc certs locally acceptable).

2. Time & Scenarios (M1.1)

- Timebar (playhead/scrubber), commit ticks (tooltip), branch chips (switch), filters, compare toggle, status area for unsaved changes.
  Acceptance: scrub, hover commit info, switch branches, enter compare in ≤2 clicks.

3. Graph Edit & Inspect (M1.2)

- Canvas affordances (pan/zoom, snap-to-grid, lasso, drag handles to create edges), context actions, inspector panel, keyboard shortcuts.
  Acceptance: create two nodes, connect, edit labels, undo/redo in ≤30s.

4. Commit, Diff & Merge (M1.3)

- Commit drawer (message, tags, changed list), diff mode (overlay/split, badges, legend), merge flow (pick base/target, conflict tray, preview).
  Acceptance: create branch, edit, commit, compare to main, complete merge with a conflict.
