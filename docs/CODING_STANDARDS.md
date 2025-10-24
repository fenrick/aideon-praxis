# Coding Standards (v2)

This is the single source of truth for code quality, testing, tooling, and
boundaries across the Aideon Praxis monorepo.

- Stacks: Node 24 (TS/React), Python 3.13/3.14 (worker)
- Monorepo: Yarn 4 workspaces; uv is the single source of truth for Python
  tooling
- Runtime posture: server‑only worker over UDS HTTP; no JSON‑RPC in the app;
  no renderer HTTP

## Architecture & Boundaries

- Modules & Layers
  - Renderer (React): UI only; never accesses local process APIs directly.
  - Main (Tauri host): IPC commands + local orchestration; no backend logic in renderer.
  - Worker (Python): analytics/ML/time‑slicing; exposes versioned HTTP over UDS.
- Contracts between layers
  - Renderer ↔ Main: typed preload bridge only.
  - Main ↔ Worker: versioned HTTP API over UDS.
  - Shared types encouraged in TS via dedicated package when needed; avoid
    circular deps. For cross‑language payloads, use OpenAPI (JSON Schema) as the
    source of truth.
- Contract Versioning
  - Version HTTP routes with `/api/v{n}` and embed `X-API-Version` in responses.
  - Changes follow semver:
    - patch/minor: additive, backward compatible
    - major: breaking; provide deprecation window and dual‑serve old version
  - Maintain a changelog of API changes (docs/ or OpenAPI description changes).

## Tooling & Performance at Scale

- Caching: enable dependency and build caches in CI for Yarn and uv.
- Incrementality:
  - TypeScript: use projectReferences and/or path aliases for workspace packages.
  - Tests: prefer package‑scoped test runs; use changed‑files filters when
    practical.
- Parallelism: run JS/TS and Python checks in parallel CI jobs where possible.
- Slow tests: quarantine and track with an issue; do not disable gates.

## Quality Gates

- Coverage targets (Node/TS and Python) on new/changed code:
  - Lines ≥ 80%
  - Branches ≥ 80%
  - Functions ≥ 80%
- Exceptions: generated code and build artifacts are excluded; justify any
  additional exclusions with a comment and an issue reference.
- Flaky tests: quarantine behind a tag and open an issue; fixing flakiness has
  higher priority than adding more tests.
- SonarQube
  - New code is measured against `main` (see `sonar.new_code.referenceBranch`)
  - CI waits for Sonar Quality Gate; failing the gate blocks merges

## TypeScript / React

- Tooling: ESLint + Prettier; Vitest for unit tests
- Environment: Node 24, Yarn 4; strict TS config
- Rules
  - No inline rule suppressions (no `eslint-disable`, `ts-ignore`, etc.).
    If absolutely necessary, require an issue reference and a TODO explaining
    removal criteria.
  - No backend‑specific logic in the renderer; IPC only via preload bridge
  - Sanitise/validate data that crosses the preload boundary; avoid leaking
    privileged data into renderer state
  - Keep code paths single and explicit; the app speaks to the worker over UDS
    HTTP only
- Coverage
  - Run: `yarn test:coverage`
  - Add targeted, focused tests; it is acceptable to export clearly named
    test‑only helpers (e.g., `__test__`) to improve branch coverage when it does
    not affect runtime
- Monorepo build health
  - Prefer TS projectReferences and/or path aliases for shared packages
  - Avoid deep imports across package boundaries; publish explicit entrypoints

## Python (Worker)

- Tooling: uv, Ruff + Black, Mypy (strict), Pyright
- Environment: Python 3.13 or 3.14
- Commands (via `scripts/uvpy`)
  - `yarn py:lint` — Ruff + Black check
  - `yarn py:format` — Ruff --fix + Black write
  - `yarn py:typecheck` — Mypy strict
  - `yarn py:pyright` — Pyright strict
  - `yarn py:test:cov` — Pytest with branch coverage (`--cov-branch`)
- Rules
  - Server exposes versioned HTTP endpoints over UDS; no open TCP ports in
    desktop mode
  - Prefer fast, deterministic unit tests; patch event loops or inject doubles
    to cover branches without opening sockets
- Interface & Headers
  - Include `X-API-Version` and `X-Request-Id` in responses; accept
    `X-Client-Version` in requests for diagnostics
  - Define error codes and payload shapes in OpenAPI; avoid ad‑hoc strings
- Cloud/server mode (if enabled by ADR)
  - TLS required; authentication/authorization required
  - Document limits/timeouts and retry/backoff policies for outbound calls
- Integration tests
  - Add a minimal integration test suite for UDS HTTP on CI‑supported OSes when
    practical; keep unit tests the main guardrail

## Commit Hygiene

Run these locally before every commit (CI enforces the same):

- App: `yarn format` → `yarn lint:fix` → `yarn typecheck` → `yarn test:coverage`
- Worker: `yarn py:format` → `yarn py:lint` → `yarn py:typecheck` →
  `yarn py:pyright` → `yarn py:test:cov`
- Coverage gates must be met on new/changed code in both app and worker
- No rule suppressions; refactor to satisfy linters and analyzers
- Conventional Commits are required; use `feat|fix|chore|ci|docs|test|refactor|perf|style`
- Pre‑commit hooks should run only on changed files; use `--no-verify` only with
  justification and follow‑up issue

## CI & Sonar

- CI uses Yarn 4 and uv; Pyright runs after `yarn py:sync` to ensure the worker
  venv is present
- Sonar analyzes both Node/TS and Python; coverage reports are uploaded from
  Vitest (lcov) and Pytest (XML). CI waits for the Sonar Quality Gate
- Fail‑fast ordering in CI: lint/type before unit tests; heavier jobs (coverage,
  integration) after quick gates pass
- Cache Yarn/uv artifacts; prefer parallel jobs for app/worker

## Security & Boundaries

- No renderer HTTP; renderer ↔ host via IPC only
- Desktop: no open TCP ports; UDS HTTP between host and worker
- PII: redact by default on exports/APIs; add tests where applicable
- Dependencies: review regularly; avoid unvetted libraries; lock through Yarn
  and uv; prefer pinned dev‑tool versions
- Secrets: never hard‑code; provide via env/config; CI scans for secrets
- Threat modeling: required for new public interfaces or boundary changes

## Version & Governance

- Ownership: standards are owned by maintainers; propose changes via PR tagged
  `docs(standards)`.
- Versioning: this document is versioned; record notable changes in PRs and
  changelog.
- Exceptions: document and time‑limit any deviation with issue links and a plan
  to converge.

## References

- Commands: `docs/commands.md`
- Practices & guardrails: `AGENTS.md`
- Contributor workflow: `CONTRIBUTING.md`
