# AGENTS.md

Guide for AI coding assistants (e.g., Claude, GPT/Codex) contributing to the Aideon Praxis
repository.

## Purpose

Set clear guardrails and output conventions so AI agents make **safe, incremental, reviewable**
changes that respect our **time‑first, graph‑native** architecture and security posture.

> **Scope:** These instructions apply exclusively to the `aideon-praxis` codebase. Do not spend time optimising for downstream consumers, SDKs, or hypothetical adopters outside this repository unless explicitly directed in a task.

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

- `app/praxis-desktop` — Svelte renderer bundle consumed by the Tauri host (typed IPC bridge only).
- `app/praxis-adapters` — `GraphAdapter`, `StorageAdapter`, `WorkerClient` (TypeScript). No backend specifics in UI.
- `crates/praxis-host` — Tauri host (Rust) exposing the typed command/event surface.
- `crates/{praxis-engine,chrona-visualization,metis-analytics,continuum-orchestrator}` — Rust domain crates (graph, time, analytics,
  orchestration) scoped to host/worker logic.
- `crates/mneme-core` — Aideon Mneme persistence layer (commits, refs, snapshots) powering SQLITE/other
  storage backends via a shared API.
- `docs/` — C4 diagrams, meta‑model, viewpoints, ADRs.

Never cross these boundaries with imports or side‑effects.

## Task menu for agents (allowed)

- Scaffolding modules, views, adapters, or worker jobs inside the correct package.
- Implementing time‑slicing UI (AS‑OF slider), Plan Event handling, plateau/diff exports.
- Analytics in the Rust worker crates (Chrona/Metis) with tests and metrics.
- Connectors via Continuum scheduler (e.g., CMDB), CSV wizard features, PII redaction,
  encryption‑at‑rest.
- Docs: README, CONTRIBUTING, ROADMAP, Architecture‑Boundary, ADRs, C4 diagrams‑as‑code.

## Issue & Project Tracking (GitHub is master)

- Source of truth is GitHub issues and a Projects v2 board. Local Markdown under `docs/issues/` is a mirror only.
- Use the provided CLI helpers (backed by `gh`) to keep tracking tight:
  - `pnpm run issues:start <#>`: assign yourself, add `status/in-progress`, create local branch `issue-#/slug`, sync to Project, mirror docs.
  - `pnpm run issues:split <parent#> --items "Subtask A" "Subtask B"` (or `--file tasks.txt`): creates linked secondary issues, updates parent checklist, syncs/mirrors.
  - `pnpm run issues:project` (or `:dry`): ensure all repo issues are on the configured Project and set its `Status` from labels per `.env` mapping.
  - `pnpm run issues:dod`: ensures a “Definition of Done” section exists on all `status/in-progress` issues.
  - `pnpm run issues:linkify`: comments on issues with links to recent PRs.
  - `pnpm run issues:backfill [--since YYYY-MM-DD] [--close]`: comments on issues referenced in commits on `main`; with `--close` will close issues referenced by Fixes/Closes/Resolves.
  - `pnpm run issues:mirror`: refresh local docs/issues from GitHub; pre‑push enforces freshness via `issues:mirror:check`.

### Environment

Remember that this is a desktop application: everything runs inside packaged binaries on Windows/macOS/Linux, so you must resolve settings and state paths via the platform conventions (AppData, Application Support, XDG directories) or Tauri-provided helpers. Do not assume arbitrary files can be created next to the binary; rely on the APIs that expose the correct directories for config/state instead of hardcoding repo-relative paths once delivered.

The Tauri stack already ships with helpers that are safe to use in these environments: the `tauri-plugin-fs` plugin (file system helpers), `tauri-plugin-dialog` (choose files/directories, prompts), `tauri-plugin-window-state` (persist size/position), etc. Reach for these plugins instead of rolling your own file handling when wiring renderer/host logic so you benefit from the packaged, multiplatform behavior they expose.

Copy `.env.example` to `.env` and set:

- `AIDEON_GH_REPO=owner/repo`
- `AIDEON_GH_PROJECT_OWNER=<org_or_user>`
- `AIDEON_GH_PROJECT_NUMBER=<number>`
- `AIDEON_GH_STATUS_FIELD=Status`
- `AIDEON_GH_STATUS_MAP={"status/todo":"Todo","status/in-progress":"In Progress","status/blocked":"Blocked","status/done":"Done"}`

Token scopes required: `repo`, `project`, `read:project`, and `read:org` if the project is under an organization. Token may be stored in `.env` (not committed). The `.aideon/` local cache and mirrors are ignored via `.gitignore`.

### Definition of Done (DoD)

For any item labeled `status/in-progress`, ensure the issue body contains this section (added via `pnpm run issues:dod`):

- CI: lint, typecheck, unit tests updated
- Docs: user & dev docs updated (README/ADR/CHANGELOG)
- Security: renderer IPC boundaries respected; no new ports
- Performance: SLO notes or benches if applicable
- UX: matches GitHub‑inspired style (light/dark)
- Packaging: macOS build verified (DMG/ZIP)
- Tracking: PRs linked; Project Status updated; local mirror refreshed

When finishing work:

- Check off each DoD item in the issue body.
- Add/confirm `status/done` label; ensure the Project Status reflects completion via `pnpm run issues:project`.
- If closed by PR merge (Fixes/Closes #N), verify the issue is closed; otherwise close with a comment referencing the commit.

### Breaking Down Large Work

- If an issue is larger than a single PR or small set of commits, create linked secondary issues:
  - Use `pnpm run issues:split <parent#> --items ...` to generate child issues.
  - Keep the parent issue as the coordination umbrella with a checklist linking to child issues.
  - Each child issue should reference the parent (`Parent: #<parent>`), inherit priority/area/module labels, and target the same milestone.
  - Each child should progress through `status/todo` → `status/in-progress` → `status/done` with PRs linked.

### Keeping Issues Aligned With Code

- On branch/PR creation: include `Fixes #<issue>` when appropriate so merges close issues automatically.
- For existing work already on `main`, backfill tracking:
  - `pnpm run issues:backfill --since <date>` to comment on referenced issues with commit details, optionally `--close` to close items resolved by commits.
  - `pnpm run issues:linkify` to ensure PRs are referenced from issues.
- After any merges to `main`: run `pnpm run issues:mirror` to update local docs. Pre‑push will block if mirror is stale.

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

- Commands to build/test/lint locally (TS + Rust). Include any data generation steps.

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

### TypeScript / React (app/praxis-desktop, app/praxis-adapters)

– Node 24, React 18. Strict TS config; ESLint + Prettier.

- Tauri renderer: no Node integration; `contextIsolation: true`; strict CSP; capabilities restrict
  plugin access. The host exposes typed commands only.
- Never embed backend‑specific queries in renderer; call adapters or host APIs.

Lint/Format discipline

- Do not disable lint rules in code (no inline `eslint-disable`, `ts-ignore`, etc.).
- Refactor code to satisfy linters and static analysis rather than suppressing warnings.
- Use check-only hooks locally; CI enforces the same rules.

### Code quality

- Coverage targets (Node/TS and Rust): Lines ≥ 80%, Branches ≥ 80%, Functions ≥ 80% on new code; overall should trend upward.
- Sonar: `sonar.new_code.referenceBranch=main` configured; CI waits for the Sonar Quality Gate before merging.
- Keep code paths single and explicit (server-only worker over UDS) to reduce maintenance cost.
  - It is acceptable to expose test-only helpers (e.g., `__test__`) to raise branch coverage when they don’t affect runtime.

### Rust worker crates (crates/chrona-visualization, crates/metis-analytics, crates/praxis-engine, crates/continuum-orchestrator)

– Rust 2024 edition, `cargo fmt` + `cargo clippy --all-targets --all-features` clean.

- Keep execution logic behind traits so adapters can swap local vs remote implementations.
- Prefer streaming-friendly payloads (Arrow/bytes) over large JSON blobs when adding new APIs.

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
- Rust: unit tests/integration tests for host and domain crates (chrona/metis/praxis);
  deterministic seeds for graph generators.
- Golden datasets: provide small synthetic graphs for 5k/50k nodes to assert performance envelopes.
- Add tests for PII redaction and role filtering where functions touch exports.

## CI expectations

- Lint + tests pass for TS and Rust on macOS/Windows/Linux.
- For large algorithms, mark perf tests as optional but runnable locally; capture metrics in logs.
- Coverage gates: verify Node/TS via `pnpm run node:test:coverage` and Rust via
  `cargo test --all --all-targets` with coverage tooling when touching engine logic. Sonar Quality
  Gate must pass.

## Commit Hygiene (run before every commit)

- Ensure that code will pass the GitHub CI checks with:
- `pnpm run ci`
- this will check TypeScript/JS/Svelte and then Rust targets
  - executing formatting, linting, static analysis checks and then tests
  - it needs to be clean before any commits.
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

- Add `Temporal.TopologyDelta` trait to `crates/metis-analytics` with empty stub.
- Wire Tauri command to call the new trait via `WorkerState` adapter.
- Extend Svelte store to request topology delta and render placeholder counts.

PATCH

- Unified diffs here, paths from repo root.

- New unit tests for topology_delta stub in `crates/metis-analytics`; Vitest store smoke tests.

RUN

- pnpm run test && pnpm run lint && pnpm run typecheck
- cargo test --all --all-targets

CHECKS

- No renderer HTTP added; no new network ports; adapters unchanged in renderer.
- PII redaction unaffected. Expected p95 unchanged; added memoisation in worker.

NOTES

- Next: add SVG compare export and benchmark on 50k/200k dataset.
