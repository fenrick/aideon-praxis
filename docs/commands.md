# Yarn Command Guide

This guide lists the common yarn scripts for Aideon Praxis and how they map to JS/TS and Python
worker tasks. Use these for local dev and CI to keep things consistent across layers.

## JS/TS (app + adapters)

- `yarn dev` — Run Electron app in dev mode (no renderer HTTP server).
- `yarn build` — Build app (renderer + main/preload bundles).
- `yarn lint` — ESLint on TS/JS sources.
- `yarn lint:fix` — ESLint with `--fix`.
- `yarn typecheck` — TypeScript project references build.
- `yarn test` — Unit tests (Vitest) for app.
- `yarn test:coverage` — App tests with coverage reports.
- `yarn format` — Prettier write.
- `yarn format:check` — Prettier check.

## Python Worker (uv-based)

- `yarn py:sync` — Sync venv with uv (installs dev group).
- `yarn py:lint` — Ruff + Black (check-only).
- `yarn py:format` — Ruff --fix + Black write.
- `yarn py:typecheck` — Mypy (PEP 621 config in `packages/worker/pyproject.toml`).
- `yarn py:pyright` — Pyright static checks.
- `yarn py:sec` — Bandit scan (skip tests).
- `yarn py:deadcode` — Vulture dead code.
- `yarn py:test` — Pytest for the worker.
- `yarn py:test:cov` — Pytest with coverage XML at `packages/worker/coverage.xml`.

Quick start:

```bash
uv venv .venv
yarn py:sync
```

## Packaging

- `yarn worker:bundle` — Builds the Python worker binary (PyInstaller) used in packaged apps.
- `yarn package` — Bundles worker, then packages Electron app with electron-builder.

## CI Aggregate

- `yarn ci` — Runs a superset: app lint/type/tests + worker lint/type/security/tests.

## Notes

- The dev Electron app spawns the Python worker via `python3 -m aideon_worker.cli` using
  `PYTHONPATH`; a venv is recommended but not required.
- Packaged apps embed the worker binary; no Python/venv is required on end-user systems.
  Quality & Coverage

- Targets: Lines ≥ 80%, Branches ≥ 80%, Functions ≥ 80% on new code.
- Verify locally:
  - App (JS/TS): `yarn test:coverage`
  - Worker (Python): `yarn py:test:cov` (includes branch coverage)
    See `docs/CODING_STANDARDS.md` for the full standards and CI rules.
