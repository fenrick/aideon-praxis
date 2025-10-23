# AGENTS.md

Guide for AI coding assistants (e.g., Claude, GPT/Codex) contributing to the Aideon Praxis
repository.

## Purpose

Set clear guardrails and output conventions so AI agents make **safe, incremental, reviewable**
changes that respect our **time‑first, graph‑native** architecture and security posture.

## Who this is for

- AI pair‑programmers generating or refactoring code, tests, and docs.
- Tools that open pull requests or propose patches.

## Core principles (do not break)

- **Time‑first digital twin:** `state_at()`, snapshots, scenarios, Plan Events, plateaus/gaps are
  authoritative.
- **Local‑first, cloud‑ready:** Desktop works offline; server mode is a config switch, not a fork.
- **Strict boundaries:** Renderer ↔ Host via preload IPC; Host ↔ Worker via pipes/UDS RPC. No
  DB‑specific logic in the renderer.
- **Security by default:** No renderer HTTP; no open TCP ports in desktop mode; PII redaction on
  exports; least privilege.
- **Adapters, not entanglement:** Graph, Storage, Worker are interface‑driven. Backends swap without
  UI change.

## Repository boundaries (monorepo)

- `packages/app` — Electron host (Node) + React UI (renderer). Preload exposes a minimal, typed
  bridge.
- `packages/adapters` — `GraphAdapter`, `StorageAdapter`, `WorkerClient` (TypeScript). No backend
  specifics in UI.
- `packages/worker` — Python 3.13 sidecar (analytics/ML, time‑slicing, topology, TCO). RPC server
  only.
- `packages/docs` — C4 diagrams, meta‑model, viewpoints, ADRs.

Never cross these boundaries with imports or side‑effects.

## Task menu for agents (allowed)

- Scaffolding modules, views, adapters, or worker jobs inside the correct package.
- Implementing time‑slicing UI (AS‑OF slider), Plan Event handling, plateau/diff exports.
- Analytics in the worker (shortest path, centrality, impact, topology deltas) with tests and
  metrics.
- Connectors via Continuum scheduler (e.g., CMDB), CSV wizard features, PII redaction,
  encryption‑at‑rest.
- Docs: README, CONTRIBUTING, ROADMAP, Architecture‑Boundary, ADRs, C4 diagrams‑as‑code.

## Issue & Project Tracking (GitHub is master)

- Source of truth is GitHub issues and a Projects v2 board. Local Markdown under `docs/issues/` is a mirror only.
- Use the provided CLI helpers (backed by `gh`) to keep tracking tight:
  - `yarn issues:start <#>`: assign yourself, add `status/in-progress`, create local branch `issue-#/slug`, sync to Project, mirror docs.
  - `yarn issues:split <parent#> --items "Subtask A" "Subtask B"` (or `--file tasks.txt`): creates linked secondary issues, updates parent checklist, syncs/mirrors.
  - `yarn issues:project` (or `:dry`): ensure all repo issues are on the configured Project and set its `Status` from labels per `.env` mapping.
  - `yarn issues:dod`: ensures a “Definition of Done” section exists on all `status/in-progress` issues.
  - `yarn issues:linkify`: comments on issues with links to recent PRs.
  - `yarn issues:backfill [--since YYYY-MM-DD] [--close]`: comments on issues referenced in commits on `main`; with `--close` will close issues referenced by Fixes/Closes/Resolves.
  - `yarn issues:mirror`: refresh local docs/issues from GitHub; pre‑push enforces freshness via `issues:mirror:check`.

### Environment

Copy `.env.example` to `.env` and set:

- `AIDEON_GH_REPO=owner/repo`
- `AIDEON_GH_PROJECT_OWNER=<org_or_user>`
- `AIDEON_GH_PROJECT_NUMBER=<number>`
- `AIDEON_GH_STATUS_FIELD=Status`
- `AIDEON_GH_STATUS_MAP={"status/todo":"Todo","status/in-progress":"In Progress","status/blocked":"Blocked","status/done":"Done"}`

Token scopes required: `repo`, `project`, `read:project`, and `read:org` if the project is under an organization. Token may be stored in `.env` (not committed). The `.aideon/` local cache and mirrors are ignored via `.gitignore`.

### Definition of Done (DoD)

For any item labeled `status/in-progress`, ensure the issue body contains this section (added via `yarn issues:dod`):

- CI: lint, typecheck, unit tests updated
- Docs: user & dev docs updated (README/ADR/CHANGELOG)
- Security: renderer IPC boundaries respected; no new ports
- Performance: SLO notes or benches if applicable
- UX: matches GitHub‑inspired style (light/dark)
- Packaging: macOS build verified (DMG/ZIP)
- Tracking: PRs linked; Project Status updated; local mirror refreshed

When finishing work:

- Check off each DoD item in the issue body.
- Add/confirm `status/done` label; ensure the Project Status reflects completion via `yarn issues:project`.
- If closed by PR merge (Fixes/Closes #N), verify the issue is closed; otherwise close with a comment referencing the commit.

### Breaking Down Large Work

- If an issue is larger than a single PR or small set of commits, create linked secondary issues:
  - Use `yarn issues:split <parent#> --items ...` to generate child issues.
  - Keep the parent issue as the coordination umbrella with a checklist linking to child issues.
  - Each child issue should reference the parent (`Parent: #<parent>`), inherit priority/area/module labels, and target the same milestone.
  - Each child should progress through `status/todo` → `status/in-progress` → `status/done` with PRs linked.

### Keeping Issues Aligned With Code

- On branch/PR creation: include `Fixes #<issue>` when appropriate so merges close issues automatically.
- For existing work already on `main`, backfill tracking:
  - `yarn issues:backfill --since <date>` to comment on referenced issues with commit details, optionally `--close` to close items resolved by commits.
  - `yarn issues:linkify` to ensure PRs are referenced from issues.
- After any merges to `main`: run `yarn issues:mirror` to update local docs. Pre‑push will block if mirror is stale.

### Hooks & Hygiene

- Pre‑commit: fast; runs formatters/linters only (no network).
- Pre‑push: runs `issues:mirror:check` and blocks if the local mirror is out‑of‑date vs GitHub.

Not allowed without ADR:

- Meta‑model changes, RPC protocol changes, security posture changes, opening network ports, sending
  data to external LLMs.

## Output contract (must follow in every proposal/PR)

Provide your response in the following sections, in this order. Keep explanations concise.

1. PLAN

- Bulleted list of files to create/modify, with one‑line reasons.

1. TESTS

- What tests you add/modify, how to run them, and expected assertions.

1. RUN

- Commands to build/test/lint locally (TS + Python). Include any data generation steps.

1. CHECKS

- Security: confirm no renderer HTTP, no new network ports, PII redaction respected.
- Boundaries: confirm no backend logic in renderer; worker uses RPC only.
- Performance: note expected impact; reference SLOs if relevant.

1. NOTES

- Trade‑offs, alternatives rejected, follow‑ups (issues to file).

If you need input, first emit a **short PLAN with questions**; otherwise proceed with sensible
defaults consistent with this guide.

## Coding standards

For the authoritative coding standards (quality gates, coverage targets,
tooling, and CI rules), see `docs/CODING_STANDARDS.md`.

### TypeScript / React (packages/app, packages/adapters)

– Node 24, React 18. Strict TS config; ESLint + Prettier.

- Electron renderer **no NodeIntegration**; `contextIsolation: true`; strict CSP; preload exposes
  typed methods only.
- Never embed backend‑specific queries in renderer; call adapters or host APIs.

Lint/Format discipline

- Do not disable lint rules in code (no inline `eslint-disable`, `ts-ignore`, etc.).
- Refactor code to satisfy linters and static analysis rather than suppressing warnings.
- Use check-only hooks locally; CI enforces the same rules.

### Code quality

- Coverage targets (Node/TS and Python): Lines ≥ 80%, Branches ≥ 80%, Functions ≥ 80% on new code; overall should trend upward.
- Sonar: `sonar.new_code.referenceBranch=main` configured; CI waits for the Sonar Quality Gate before merging.
- Keep code paths single and explicit (server-only worker over UDS) to reduce maintenance cost.
  - It is acceptable to expose test-only helpers (e.g., `__test__`) to raise branch coverage when they don’t affect runtime.

### Python (packages/worker)

– Python 3.13, type hints everywhere, `ruff` + `black` style.

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
- Do not call external LLMs or telemetry endpoints; if necessary, stub behind host with explicit
  allowlist.

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
- Coverage gates: verify Node/TS via `yarn test:coverage` and Python via `yarn py:test:cov` (branch coverage enabled). Sonar Quality Gate must pass.

## Commit Hygiene (run before every commit)

- Format and fix TypeScript/JS/MD via Prettier and ESLint:
  - `yarn format` (writes with Prettier)
  - `yarn lint --fix` or `yarn lint:fix` (applies ESLint fixes)
- Python (worker):
  - `yarn py:format` (Ruff --fix + Black write)
  - `yarn py:lint` (check-only)
  - `yarn py:typecheck` and `yarn py:pyright` (both must pass)
- Optional checks (non‑writing):
  - `yarn format:check` (JS/TS/MD) and `yarn py:test`
- Pre‑commit hook: this repo uses Husky to run the above automatically; keep the hook fast and
  deterministic.

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
