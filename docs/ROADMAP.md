# Aideon Praxis — Staged Implementation Roadmap

**Date:** 2025-10-14 **Goal:** Deliver a local-first, graph-native EA platform (Tauri + Python
worker) that treats **time as a first-class dimension** (bitemporal + Plan Events), with a clean
path to server mode.

## Guiding Principles

- Clear separation: Tauri/Rust host & OS integration; Python worker for analytics/ML via RPC.
- Swap-friendly adapters: Graph, Storage, RPC are interfaces with reference impls.
- Security by default: hardened IPC, PII redaction, least privilege.
- Cloud-ready: Same components run local or remote by configuration.
- Small, valuable increments: every phase has acceptance and exit checks.

## Milestones

### M0 — Foundations (Weeks 1–2)

#### Outcomes

- Monorepo, CI for TS/Python, pre-commit, CODEOWNERS.
- Tauri capabilities baseline (no renderer HTTP, strict CSP, least-privilege plugins).
- ADRs for RPC and adapter boundaries.
- Interfaces: `GraphAdapter`, `StorageAdapter`, `WorkerClient`.

#### Acceptance

- `yarn test` and `pytest` green on macOS/Windows/Linux.
- App shell launches with secured preload.
- ADRs merged.

### M1 — Local App MVP (Weeks 3–6)

#### Outcomes

- React renderer, preload API, in-memory GraphAdapter + file store (JSON/SQLite).
- CSV import wizard v1 with mapping and de-dupe.
- Viewpoints: Capability Map, Service Portfolio, Motivation.
- Opt-in encryption-at-rest.

#### Acceptance

- Create/edit entities, save/reopen.
- Import sample CSV → validated entities.
- Views render from the same graph model.

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
