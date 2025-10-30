# Architecture & Boundaries

This document describes how the codebase implements the guardrails in `AGENTS.md` and where
boundaries are enforced.

## Layers

- Renderer (SvelteKit front end)
  - Built with SvelteKit; the Tauri host serves the built assets.
  - No Node integration; strict CSP enforced by Tauri (see `crates/tauri/tauri.conf.json`).
  - A minimal bridge lives at `globalThis.aideon` (installed by `src/lib/tauri-shim.ts`) and calls Tauri commands. No backend logic in renderer.
  - UI code lives under `app/desktop/src/lib/**` and talks only to adapters/host via IPC.

- Host (Tauri)
  - Rust entrypoint: `crates/tauri/src/lib.rs` creates windows at runtime and binds typed commands.
  - Security: capabilities and CSP configured in `crates/tauri/tauri.conf.json`. No open TCP ports in desktop mode.

- Adapters (TypeScript interfaces)
  - `app/adapters/src/index.ts` defines `GraphAdapter`, `StorageAdapter`, and `WorkerClient`
    interfaces. No backend specifics.

- Worker (Rust engine crates)
  - Modules: `crates/chrona`, `crates/praxis`, `crates/metis`, `crates/continuum` expose the
    computation traits consumed by the host.
  - The default desktop mode uses in-process adapters. Remote/server adapters will implement the
    same traits without changing the renderer contract.

## Boundaries & Security

- Renderer has no direct Node or backend access.
- Host ↔ Renderer: preload IPC only; strict CSP applied in HTML.
- Host ↔ Worker: in-process Rust traits today; future remote adapters must preserve the same
  command surface. No open ports in desktop mode.
- PII: No export code currently; future exports must include redaction tests.

## Packaging

- Rust engine crates are compiled into the host binary; no auxiliary worker bundle is required.
- Remote/server adapters will ship as separate binaries once implemented, controlled via config.

## Time‑first design

- `Temporal.StateAt` implemented as a stub in `chrona::TemporalEngine::state_at` and surfaced via `temporal_state_at` command.
- Canvas persists layout snapshots per `asOf` (and optional scenario) via `canvas_save_layout`; persistence boundary provided by `continuum::SnapshotStore` (file-backed in desktop mode).
- Future jobs (shortest path, centrality, impact) belong in the Rust engine crates with tests and SLO notes.

## Compliance checklist

- [x] No renderer HTTP
- [x] No open TCP ports in desktop mode
- [x] Minimal preload bridge
- [x] Worker logic executes in-process via Rust engine traits
- [x] No auxiliary worker binaries embedded
- [x] Version injection via semantic-release
