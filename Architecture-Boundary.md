# Architecture & Boundaries

This document describes how the codebase implements the guardrails in `AGENTS.md` and where
boundaries are enforced.

## Layers

- Renderer (Svelte front end)
  - Entry: `app/desktop/src/main.ts`. Security hardened: `contextIsolation: true`,
    `nodeIntegration: false`, strict CSP.
  - Preload bridge: `app/desktop/src/preload.ts` exposes a minimal, typed API (`window.aideon.*`).
    No backend logic inside the renderer bundle.
  - View layer code lives under `app/desktop/src/renderer/*` and talks only to adapters.

- Host (Tauri)
  - Rust entrypoint: `crates/tauri/src/main.rs` with command definitions in `crates/tauri/src/temporal.rs` etc.
  - Typed IPC only; capabilities and command scopes enforced by `crates/tauri/tauri.conf.json`.

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

- `Temporal.StateAt` stub exists (`chrona::TemporalEngine::state_at`).
- Adapters expose `stateAt()` and `diff()` signatures.
- Future jobs (shortest path, centrality, impact) belong in the Rust engine crates with tests and
  SLO notes.

## Compliance checklist

- [x] No renderer HTTP
- [x] No open TCP ports in desktop mode
- [x] Minimal preload bridge
- [x] Worker logic executes in-process via Rust engine traits
- [x] No auxiliary worker binaries embedded
- [x] Version injection via semantic-release
