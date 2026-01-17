# Testing Strategy

## Purpose

Describe how we test Aideon Suite across renderer, host, and engine crates. Module-specific detail
lives in module README/DESIGN docs (examples: `crates/desktop/DESIGN.md`, `crates/praxis/DESIGN.md`, `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`).

---

## Coverage targets

- TS/React: >= 80% lines/branches/functions/statements on new code.
- Rust: host >= 80%, engines >= 90% where applicable.

Coverage failures are hard gates in CI.

---

## Required layers

- **Rust unit + integration tests** (engines + host)
- **TS/React component and adapter tests**
- **Contract tests** for DTO parity
- **E2E smoke** for critical flows (where configured)
- **E2E command coverage** for all IPC commands listed in `docs/contracts/ipc-manifest.json` via
  Tauri WebDriver specs under `tests/e2e/specs/`.

---

## Common commands

- `pnpm run node:test`
- `pnpm run node:test:coverage`
- `pnpm run node:typecheck`
- `pnpm run host:lint && pnpm run host:check`
- `cargo test --all --all-targets`
- `pnpm run host:coverage` (requires `cargo-llvm-cov`)
- `pnpm run node:e2e` (requires `tauri-driver`; runs on Linux/Windows, skips macOS by default)
- `pnpm run webdriver:test` (requires `tauri-driver`; runs Tauri WebDriver smoke tests)
- `pnpm run webdriver:test:headless` (Linux headless runner via `xvfb-run`)

## E2E prerequisites (Tauri)

- Install the driver: `cargo install tauri-driver` (or set `TAURI_E2E_DRIVER_PATH`).
- Linux (Ubuntu 24.04): install WebKit driver on PATH (e.g., `sudo apt install webkit2gtk-driver`).

---

## Rules

- Update tests whenever behavior or DTO shapes change.
- Prefer deterministic tests (fixed seeds for graph data).
- Validate boundary rules (no renderer HTTP, no ports in desktop mode).
- Node/Vitest tests that touch Tauri IPC or window APIs must use the official mocks
  (`mockIPC`, `mockWindows`, `clearMocks`) from `@tauri-apps/api/mocks`.
- Every command listed in `docs/contracts/ipc-manifest.json` must have a test that exercises its
  Tauri command wrapper (request/response envelope) and asserts the response shape for at least one
  realistic scenario.
