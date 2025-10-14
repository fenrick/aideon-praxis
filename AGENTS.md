# AGENTS.md

Guide for AI coding assistants (e.g., Claude, GPT/Codex) contributing to the Aideon Praxis repository.

## Purpose

Set clear guardrails and output conventions so AI agents make **safe, incremental, reviewable** changes that respect our **time‑first, graph‑native** architecture and security posture.

## Who this is for

- AI pair‑programmers generating or refactoring code, tests, and docs.
- Tools that open pull requests or propose patches.

## Core principles (do not break)

- **Time‑first digital twin:** `state_at()`, snapshots, scenarios, Plan Events, plateaus/gaps are authoritative.
- **Local‑first, cloud‑ready:** Desktop works offline; server mode is a config switch, not a fork.
- **Strict boundaries:** Renderer ↔ Host via preload IPC; Host ↔ Worker via pipes/UDS RPC. No DB‑specific logic in the renderer.
- **Security by default:** No renderer HTTP; no open TCP ports in desktop mode; PII redaction on exports; least privilege.
- **Adapters, not entanglement:** Graph, Storage, Worker are interface‑driven. Backends swap without UI change.

## Repository boundaries (monorepo)

- `packages/app` — Electron host (Node) + React UI (renderer). Preload exposes a minimal, typed bridge.
- `packages/adapters` — `GraphAdapter`, `StorageAdapter`, `WorkerClient` (TypeScript). No backend specifics in UI.
- `packages/worker` — Python 3.11 sidecar (analytics/ML, time‑slicing, topology, TCO). RPC server only.
- `packages/docs` — C4 diagrams, meta‑model, viewpoints, ADRs.

Never cross these boundaries with imports or side‑effects.

## Task menu for agents (allowed)

- Scaffolding modules, views, adapters, or worker jobs inside the correct package.
- Implementing time‑slicing UI (AS‑OF slider), Plan Event handling, plateau/diff exports.
- Analytics in the worker (shortest path, centrality, impact, topology deltas) with tests and metrics.
- Connectors via Continuum scheduler (e.g., CMDB), CSV wizard features, PII redaction, encryption‑at‑rest.
- Docs: README, CONTRIBUTING, ROADMAP, Architecture‑Boundary, ADRs, C4 diagrams‑as‑code.

Not allowed without ADR:

- Meta‑model changes, RPC protocol changes, security posture changes, opening network ports, sending data to external LLMs.

## Output contract (must follow in every proposal/PR)

Provide your response in the following sections, in this order. Keep explanations concise.

1. PLAN

- Bulleted list of files to create/modify, with one‑line reasons.

2. PATCH

- Unified diff (unidiff) from repo root with correct paths. Only include changed hunks.

3. TESTS

- What tests you add/modify, how to run them, and expected assertions.

4. RUN

- Commands to build/test/lint locally (TS + Python). Include any data generation steps.

5. CHECKS

- Security: confirm no renderer HTTP, no new network ports, PII redaction respected.
- Boundaries: confirm no backend logic in renderer; worker uses RPC only.
- Performance: note expected impact; reference SLOs if relevant.

6. NOTES

- Trade‑offs, alternatives rejected, follow‑ups (issues to file).

If you need input, first emit a **short PLAN with questions**; otherwise proceed with sensible defaults consistent with this guide.

## Coding standards

### TypeScript / React (packages/app, packages/adapters)

- Node 20+, React 18. Strict TS config; ESLint + Prettier.
- Electron renderer **no NodeIntegration**; `contextIsolation: true`; strict CSP; preload exposes typed methods only.
- Never embed backend‑specific queries in renderer; call adapters or host APIs.

### Python (packages/worker)

- Python 3.11, type hints everywhere, `ruff` + `black` style.
- Pure worker process: RPC server over pipes/UDS, no open TCP ports in desktop mode.
- Use pandas/pyarrow for Arrow payloads when large; avoid heavy deps unless needed.

### Docs

- Markdown, markdownlint clean (no heading jumps; 2‑space nested bullets).
- Diagrams‑as‑code preferred (Structurizr DSL, Mermaid, PlantUML) stored under `docs/c4/`.

## Contracts snapshot (reference only)

### Worker jobs (types)

- `Analytics.ShortestPath { from, to, maxHops }`
- `Analytics.Centrality { algorithm: degree|betweenness, scope }`
- `Analytics.Impact { seedRefs[], filters{} }`
- `Temporal.StateAt { asOf, scenario?, confidence? }`
- `Temporal.Diff { from: plateauId|date, to: plateauId|date, scope? }`
- `Temporal.TopologyDelta { from, to }`
- `Finance.TCO { scope, asOf, scenario?, policies? }`

### Time APIs (desktop read‑only; server read/write)

- `GET /graph?as_of=YYYY‑MM‑DD&scenario=&confidence=`
- `GET /diff?from=...&to=...`
- `GET /topology_delta?from=...&to=...`
- `GET /tco?scope=...&as_of=...&scenario=...`

### Minimal PlanEvent schema (do not change without ADR)

- `id, name, effective_at, confidence, source{ work_package?, priority? }, effects[]`
- `effects[]` items: `{ op: create|update|delete|link|unlink, target_ref, payload }`

## Security & privacy rules

- No renderer HTTP; renderer ↔ host via IPC only.
- Desktop mode: no open TCP ports; localhost APIs are host‑bound and read‑only.
- PII: deny‑by‑default on exports/APIs; redaction checked in tests where applicable.
- Do not call external LLMs or telemetry endpoints; if necessary, stub behind host with explicit allowlist.

## Performance & SLO gates

- `state_at()` p95 ≤ 250ms at 50k/200k (warm).
- `diff(plateauA, plateauB)` ≤ 1s at 50k/200k; SVG compare ≤ 2s (500 items).
- Shortest path (≤6 hops) p95 ≤ 300ms; betweenness (50k) ≤ 90s batch.

Changes that could affect these must include a note in CHECKS and, when possible, a quick benchmark.

## Testing guidance

- TS: unit tests for adapters, preload bridges, UI state; avoid DOM‑heavy tests unless needed.
- Python: unit tests for algorithms and RPC handlers; deterministic seeds for graph gens.
- Golden datasets: provide small synthetic graphs for 5k/50k nodes to assert performance envelopes.
- Add tests for PII redaction and role filtering where functions touch exports.

## CI expectations

- Lint + tests pass for TS and Python on macOS/Windows/Linux.
- For large algorithms, mark perf tests as optional but runnable locally; capture metrics in logs.

## Versioning & migrations

- Schema is forward‑only. Provide migration scripts and bump `schemaVersion`.
- Snapshots are immutable; scenarios branch and merge; no history rewrites.

## Issues and PR workflow

- Use milestone (M0–M6), labels (`type/*`, `area/*`, `module/*`, `priority/*`).
- Conventional Commits in PR title and commits (e.g., `feat(time): add plateau diff endpoint`).
- Link to ADRs when changing boundaries, protocols, or the meta‑model.

## When to ask vs. when to proceed

- Ask (emit a short PLAN + questions) if:
  - Requirements conflict with guardrails; the change touches security, RPC, or meta‑model.
  - A dependency is ambiguous or unavailable.
- Proceed with defaults if:
  - The task is a local refactor or additive feature within a package and follows this guide.

## Example response template (use this shape)

PLAN

- Create packages/worker/jobs/topology_delta.py to compute centrality deltas.
- Expose `Temporal.TopologyDelta` in RPC server and WorkerClient.
- Add UI action behind feature flag to request topology delta and display summary.

PATCH

- Unified diffs here, paths from repo root.

TESTS

- New unit tests for topology_delta; fixtures for small and medium graphs.

RUN

- yarn test && yarn lint && yarn typecheck
- pytest -q packages/worker && ruff check packages/worker

CHECKS

- No renderer HTTP added; no new network ports; adapters unchanged in renderer.
- PII redaction unaffected. Expected p95 unchanged; added memoisation in worker.

NOTES

- Next: add SVG compare export and benchmark on 50k/200k dataset.
