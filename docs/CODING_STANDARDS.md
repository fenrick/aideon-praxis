# Coding Standards

This document is the single source of truth for code quality, testing, and
tooling standards across the Aideon Praxis monorepo.

- Stacks: Node 24 (TS/React), Python 3.13/3.14 (worker)
- Repo: Yarn 4 workspaces, uv for Python tooling
- Architecture: server‑only worker over UDS HTTP; no JSON‑RPC in the app; no
  renderer HTTP

## Quality Gates

- Coverage targets (Node/TS and Python):
  - Lines ≥ 80%
  - Branches ≥ 80%
  - Functions ≥ 80%
- SonarQube
  - New code is measured against `main` (see `sonar.new_code.referenceBranch`)
  - CI waits for Sonar Quality Gate; failing the gate blocks merges

## TypeScript / React

- Tooling: ESLint + Prettier; Vitest for unit tests
- Environment: Node 24, Yarn 4; strict TS config
- Rules
  - No inline rule suppressions (no `eslint-disable`, `ts-ignore`, etc.)
  - No backend‑specific logic in the renderer; IPC only via preload bridge
  - Keep code paths single and explicit; the app speaks to the worker over UDS
    HTTP only
- Coverage
  - Run: `yarn test:coverage`
  - Add targeted, focused tests; it is acceptable to export clearly named
    test‑only helpers (e.g., `__test__`) to improve branch coverage when it does
    not affect runtime

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

## Commit Hygiene

Run these locally before every commit (CI enforces the same):

- App: `yarn format` → `yarn lint:fix` → `yarn typecheck` → `yarn test:coverage`
- Worker: `yarn py:format` → `yarn py:lint` → `yarn py:typecheck` →
  `yarn py:pyright` → `yarn py:test:cov`
- Coverage gates must be met on new/changed code in both app and worker
- No rule suppressions; refactor to satisfy linters and analyzers

## CI & Sonar

- CI uses Yarn 4 and uv; Pyright runs after `yarn py:sync` to ensure the worker
  venv is present
- Sonar analyzes both Node/TS and Python; coverage reports are uploaded from
  Vitest (lcov) and Pytest (XML). CI waits for the Sonar Quality Gate

## Security & Boundaries

- No renderer HTTP; renderer ↔ host via IPC only
- Desktop: no open TCP ports; UDS HTTP between host and worker
- PII: redact by default on exports/APIs; add tests where applicable

## References

- Commands: `docs/commands.md`
- Practices & guardrails: `AGENTS.md`
- Contributor workflow: `CONTRIBUTING.md`
