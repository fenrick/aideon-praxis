# Praxis Host – Aideon Suite module

## Purpose

Praxis Host is the Tauri-based desktop host for Aideon Suite. It owns window management, OS
integration, capabilities, and the typed IPC surface that connects React/Svelte renderers to the
Rust engines.

## Responsibilities

- Configure Tauri windows, capabilities, and CSP for the desktop app.
- Expose typed commands that wrap Praxis Engine, Chrona, Metis, Continuum, and Mneme traits.
- Enforce security posture: no renderer HTTP, no open TCP ports in desktop mode, least-privilege FS.

## Relationships

- **Depends on:** Engine crates (Praxis Engine, Chrona Visualisation, Metis Analytics, Continuum Orchestrator, Mneme Core).
- **Used by:** Praxis Canvas and Praxis Desktop via IPC (`@tauri-apps/api` from the renderer side).

## Running and testing

- Dev (with Tauri CLI): `pnpm tauri dev`
- Rust checks (workspace): `pnpm run host:lint && pnpm run host:check`
- Rust tests (host only): `cargo test -p aideon_praxis_host`

See `docs/getting-started.md` for host + renderer dev workflow.

## Design and architecture

Host/renderer boundaries, capabilities, and time-first engine contracts are described in
`Architecture-Boundary.md`. Host security and capabilities are further detailed in
`docs/tauri-capabilities.md` and `docs/tauri-client-server-pivot.md`.

## Related global docs

- Architecture and layering: `Architecture-Boundary.md`
- Tauri capabilities and pivot: `docs/tauri-capabilities.md`, `docs/tauri-client-server-pivot.md`
- Coding standards: `docs/CODING_STANDARDS.md`
- Testing strategy: `docs/testing-strategy.md`
