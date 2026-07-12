# Getting Started (Developer Setup)

How to set up a reproducible local development environment for Aideon Desktop — the renderer, the Rust host, and the
engines — and run the same checks CI runs. This guide is for a developer joining the repository; it covers setup and
everyday workflows, not architecture (see [ARCHITECTURE-BOUNDARY.md](../01-architecture/ARCHITECTURE-BOUNDARY.md)) or
the rules code is held to (see [CODING-STANDARDS.md](./CODING-STANDARDS.md)).

---

## Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone and install](#2-clone-and-install)
3. [Run in development](#3-run-in-development)
4. [Common commands](#4-common-commands)
5. [Quality checks (local CI parity)](#5-quality-checks-local-ci-parity)
6. [Environment variables](#6-environment-variables)
7. [Reproducible environments (devcontainer / Nix)](#7-reproducible-environments-devcontainer--nix)
8. [Troubleshooting](#8-troubleshooting)
9. [Related documents](#related-documents)

---

## 1. Prerequisites

| Tool                | Version               | Notes                                                                         |
| ------------------- | --------------------- | ----------------------------------------------------------------------------- |
| Node.js             | 24                    | The renderer toolchain.                                                       |
| pnpm                | 10                    | Installed via Corepack (`corepack enable`); do not install globally with npm. |
| Rust                | stable (2024 edition) | Installed via `rustup`; the host and engines.                                 |
| `rustfmt`, `clippy` | matching toolchain    | `rustup component add rustfmt clippy`. CI requires both.                      |
| GitHub CLI (`gh`)   | latest                | Only if you use the issue helpers.                                            |
| `tauri-driver`      | latest                | Optional, for E2E: `cargo install tauri-driver --locked`.                     |

Platform build dependencies for Tauri (WebKitGTK on Linux, the Xcode command-line tools on macOS, the WebView2 runtime
on Windows) must be present; see the [Tauri prerequisites](#8-troubleshooting) note if a build fails.

---

## 2. Clone and install

```bash
git clone https://github.com/fenrick/aideon-desktop.git
cd aideon-desktop

corepack enable
corepack prepare pnpm@10 --activate
pnpm install
```

`pnpm install` installs the JS/TS workspace; the Cargo workspace builds on first `cargo`/`pnpm tauri` invocation.

---

## 3. Run in development

Use two terminals:

```bash
# Terminal A: renderer
pnpm run node:dev

# Terminal B: host (Tauri)
pnpm tauri dev
```

Notes:

- Dev builds may use a local dev server; packaged builds load local assets and require no network ports.
- The desktop baseline security rules still apply in dev: the renderer calls the host via typed IPC and must not do
  ad-hoc HTTP ([ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md),
  [security/](./security/README.md)).

---

## 4. Common commands

| Task                            | Command                                                               |
| ------------------------------- | --------------------------------------------------------------------- |
| Dev (renderer)                  | `pnpm run node:dev`                                                   |
| Dev (host)                      | `pnpm tauri dev`                                                      |
| Build (renderer assets)         | `pnpm run node:build`                                                 |
| Build (desktop bundle)          | `pnpm tauri build`                                                    |
| Lint (renderer)                 | `pnpm run node:lint` · fix: `pnpm run node:lint:fix`                  |
| Format (renderer)               | `pnpm run node:format`                                                |
| Typecheck (renderer)            | `pnpm run node:typecheck`                                             |
| Test (renderer)                 | `pnpm run node:test` · coverage: `pnpm run node:test:coverage`        |
| Lint / check (host)             | `pnpm run host:lint` · `pnpm run host:check`                          |
| Format (host)                   | `pnpm run host:format`                                                |
| Test (host + engines)           | `cargo test --all --all-targets` · coverage: `pnpm run host:coverage` |
| Full gate (TS + Rust)           | `pnpm run ci`                                                         |
| WebDriver E2E (Tauri)           | `pnpm run webdriver:test`                                             |
| WebDriver E2E (headless, Linux) | `pnpm run webdriver:test:headless`                                    |

For the full script list, run `pnpm -w run` and see the root `package.json`. Test layers and their commands are detailed
in [TESTING-STRATEGY.md](./TESTING-STRATEGY.md).

---

## 5. Quality checks (local CI parity)

CI runs the same gates a developer can run locally. Running `pnpm run ci` before pushing avoids the round-trip of a
remote failure; the gate ordering mirrors CI (lint/type before tests, heavier jobs after).

```bash
# Renderer
pnpm run node:format
pnpm run node:lint:fix
pnpm run node:typecheck
pnpm run node:test:coverage

# Host and engines
pnpm run host:format
pnpm run host:lint          # cargo clippy --all-targets -- -D warnings
pnpm run host:check
cargo test --all --all-targets

# Or the whole gate at once
pnpm run ci
```

Parity with CI:

- The **coverage thresholds** are the [CODING-STANDARDS.md §16](./CODING-STANDARDS.md#16-quality-gates) targets and fail
  the build below them — there is no local-only leniency.
- Clippy runs with `-D warnings` in CI; `pnpm run host:lint` uses the same flag, so a clean local lint is a clean CI
  lint.
- Sonar's Quality Gate runs only in CI (it measures new code against `main`); everything else reproduces locally.
- Pre-commit hooks run the changed-file subset of these gates; `pnpm run ci` runs the full set.

---

## 6. Environment variables

The application reads configuration from the environment in a single composition layer
([CODING-STANDARDS.md §12](./CODING-STANDARDS.md#12-typescript--react--renderer-conventions)); the variables below are
the ones a developer sets locally. None is a secret, and none is required for a default desktop run — secrets live in
the OS key store, never in environment files ([security/secrets-and-keys.md](./security/secrets-and-keys.md)).

| Variable                | Scope | Purpose                                                                                                         | Default              |
| ----------------------- | ----- | --------------------------------------------------------------------------------------------------------------- | -------------------- |
| `RUST_LOG`              | Host  | Log filter for the `tracing`/`log` facade (e.g. `info`, `aideon=debug`).                                        | `info`               |
| `RUST_BACKTRACE`        | Host  | `1` or `full` to capture a backtrace on panic during debugging.                                                 | unset                |
| `AIDEON_LOG_FORMAT`     | Host  | `ndjson` (default) or `pretty` for human-readable local logs ([LOGGING_FRAMEWORK.md](../LOGGING_FRAMEWORK.md)). | `ndjson`             |
| `TAURI_E2E_DRIVER_PATH` | E2E   | Path to `tauri-driver` if not on `PATH`.                                                                        | resolved from `PATH` |
| `CI`                    | CI    | Set by the CI runner; gates treat its presence as non-interactive.                                              | unset locally        |

Rules:

- **No secret is read from the environment for normal operation.** A hosted/sync adapter that needs a token retrieves it
  from the OS key store, not an env var ([SECURITY](./security/secrets-and-keys.md)).
- Environment branching in the renderer uses build-time `import.meta.env` flags, not ad-hoc globals; config is validated
  with a schema at startup and the process crashes fast on invalid config
  ([CODING-STANDARDS.md §12](./CODING-STANDARDS.md#12-typescript--react--renderer-conventions)).
- A `.env` file (if used) is for non-secret local convenience only and is git-ignored.

---

## 7. Reproducible environments (devcontainer / Nix)

A pinned toolchain removes "works on my machine" drift; the gates in §5 assume Node 24, pnpm 10, and a current stable
Rust. Two optional routes to a reproducible setup, both **design intent** — a checked-in devcontainer/Nix definition is
a planned convenience, not yet present in the repository:

- **Dev Containers.** A `.devcontainer/devcontainer.json` pinning the Node, pnpm, and Rust versions, plus the Tauri
  Linux build dependencies (WebKitGTK), gives VS Code and GitHub Codespaces a one-command environment that matches CI.
  Until it lands, replicate the [prerequisites](#1-prerequisites) table.
- **Nix.** A `flake.nix` dev shell (`nix develop`) pinning the same toolchain and system libraries gives a hermetic,
  reproducible shell on any Nix host, which is the closest local match to the CI image.

Either route should pin the **same** versions the [prerequisites](#1-prerequisites) table names, so a contributor's
local gate result equals CI's. When one is added, this section links it and the prerequisites table points to it as the
recommended path.

---

## 8. Troubleshooting

- **Rust toolchain missing:** install `rustup` and run `rustup default stable`; then
  `rustup component add rustfmt clippy`.
- **Tauri build failures:** confirm the system build dependencies for your OS (WebKitGTK on Linux, Xcode CLT on macOS,
  WebView2 on Windows); retry with `pnpm tauri dev`. The [Tauri prerequisites guide](https://v2.tauri.app) lists per-OS
  packages.
- **Clippy fails locally but not in your editor:** CI uses `-D warnings`; run `pnpm run host:lint` to reproduce the
  strict gate.
- **Coverage gate fails on changed code:** run `pnpm run node:test:coverage` / `pnpm run host:coverage` and check the
  per-file report; the thresholds are in [CODING-STANDARDS.md §16](./CODING-STANDARDS.md#16-quality-gates).
- **WebDriver failures on Linux:** install `webkit2gtk-driver` and `xvfb`; ensure `tauri-driver` is on `PATH` (or set
  `TAURI_E2E_DRIVER_PATH`); run the headless variant `pnpm run webdriver:test:headless`.
- **A flaky test blocks you:** quarantine it behind a tag and open an issue rather than disabling the gate
  ([TESTING-STRATEGY.md](./TESTING-STRATEGY.md)).

---

## Related documents

| Document                                                             | What it covers                                                          |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [Coding Standards](./CODING-STANDARDS.md)                            | The rules the local gates enforce.                                      |
| [Testing Strategy](./TESTING-STRATEGY.md)                            | The test layers and the commands that run them.                         |
| [Architecture Boundary](../01-architecture/ARCHITECTURE-BOUNDARY.md) | The system shape this environment runs.                                 |
| [Security standard](./security/README.md)                            | Why no secret lives in an env file, and the boundary dev still honours. |
| [LOGGING_FRAMEWORK.md](../LOGGING_FRAMEWORK.md)                      | The log format `RUST_LOG`/`AIDEON_LOG_FORMAT` control.                  |
| [CONTRIBUTING.md](../../CONTRIBUTING.md)                             | Contributor workflow and PR conventions.                                |
