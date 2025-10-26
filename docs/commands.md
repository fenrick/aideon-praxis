# pnpm Command Guide

This guide lists the common pnpm scripts for Aideon Praxis and how they map to JS/TS and Rust
engine tasks. Use these for local dev and CI to keep things consistent across layers.

## JS/TS (app + adapters)

- `pnpm tauri dev` — Run Tauri app in dev mode (no renderer HTTP server).
- `pnpm run node:build` — Build renderer bundles.
- `pnpm run node:lint` — ESLint on TS/JS sources.
- `pnpm run node:lint:fix` — ESLint with `--fix`.
- `pnpm run node:typecheck` — TypeScript project references build.
- `pnpm run node:test` — Unit tests (Vitest) for the app.
- `pnpm run node:test:coverage` — App tests with coverage reports.
- `pnpm run node:format` — Prettier write.
- `pnpm run node:format:check` — Prettier check.

## Rust workspace (host + domain crates)

- `pnpm run host:format` — `cargo fmt` across the Rust workspace.
- `pnpm run host:format:check` — format check only.
- `pnpm run host:lint` — `cargo clippy --all-targets -- -D warnings` for the Tauri host + crates.
- `pnpm run host:check` — `cargo check` sanity pass.
- `pnpm run host:ci` — Aggregated Rust pipeline (clean → fix → lint → check → format).

## Packaging

- `pnpm run tauri:build` — Builds the Tauri app bundle.

## CI Aggregate

- `pnpm run ci` — Runs a superset: app lint/type/tests + Rust lint/check pipeline.

## Notes

- Rust engines run in-process during dev. Remote/server adapters will follow the same contracts.
  Quality & Coverage

- Targets: Lines ≥ 80%, Branches ≥ 80%, Functions ≥ 80% on new code.
- Verify locally:
  - App (JS/TS): `pnpm run node:test:coverage`
  - Rust crates: `cargo test --all --all-targets`
    See `docs/CODING_STANDARDS.md` for the full standards and CI rules.
