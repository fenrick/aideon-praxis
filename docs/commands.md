# Yarn Command Guide

This guide lists the common yarn scripts for Aideon Praxis and how they map to JS/TS and Python worker tasks. Use these for local dev and CI to keep things consistent across layers.

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

## Python Worker (pip-based)

- `yarn format:py` — Black write on `packages/worker`.
- `yarn format:py:check` — Black check.
- `yarn py:lint` — Ruff lint.
- `yarn py:lint:fix` — Ruff with `--fix`.
- `yarn py:typecheck` — Mypy (PEP 621 config in `pyproject.toml`).
- `yarn py:pyright` — Pyright type checking (TS-like analyzer).
- `yarn py:security` — Bandit scan (skip tests).
- `yarn py:deadcode` — Vulture dead code.
- `yarn py:test` — Pytest for the worker.
- `yarn py:test:cov` — Pytest with coverage XML at `packages/worker/coverage.xml`.

Installation for pip path:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e "packages/worker[dev]"
```

## Python Worker (uv-based local flow)

- `yarn py:uv:sync` — Sync venv with `uv` (installs dev group).
- `yarn py:uv:test` — Run pytest via `uv run`.
- `yarn py:uv:lint` — Ruff via `uv run`.
- `yarn py:uv:format:check` — Black check via `uv run`.
- `yarn py:uv:typecheck` — Mypy via `uv run`.
- `yarn py:uv:lock` — Refresh lock and export `requirements-dev.lock` for CI.

Installation for uv path:

```bash
uv venv .venv
cd packages/worker && uv sync --all-groups
```

## Packaging

- `yarn worker:bundle` — Builds the Python worker binary (PyInstaller) used in packaged apps.
- `yarn package` — Bundles worker, then packages Electron app with electron-builder.

## CI Aggregate

- `yarn ci` — Runs a superset: app lint/type/tests + worker lint/type/security/tests.

## Notes

- The dev Electron app spawns the Python worker via `python3 -m aideon_worker.cli` using `PYTHONPATH`; a venv is recommended but not required.
- Packaged apps embed the worker binary; no Python/venv is required on end-user systems.
