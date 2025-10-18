# Architecture & Boundaries

This document describes how the codebase implements the guardrails in `AGENTS.md` and where boundaries are enforced.

## Layers

- App (Electron host + React renderer)
  - Host entry: `packages/app/src/main.ts` (CommonJS). Security hardened: `contextIsolation: true`,
    `nodeIntegration: false`, CSP in renderer.
  - Preload bridge: `packages/app/src/preload.ts` exposes a minimal, typed API (`window.aideon.version`). No backend logic.
  - Renderer: `packages/app/src/renderer/*` uses only the preload bridge and adapters.

- Adapters (TypeScript interfaces)
  - `packages/adapters/src/index.ts` defines `GraphAdapter`, `StorageAdapter`, and `WorkerClient` interfaces.
    No backend specifics.

- Worker (Python sidecar)
  - Module: `packages/worker/src/aideon_worker/*` with `Temporal.StateAt` stub.
  - CLI: `aideon_worker.cli` runs over stdio (pipes/UDS only in desktop). No TCP ports in desktop mode.

## Boundaries & Security

- Renderer has no direct Node or backend access.
- Host ↔ Renderer: preload IPC only; strict CSP applied in HTML.
- Host ↔ Worker: spawned child process; stdio messages; no open ports in desktop mode.
- PII: No export code currently; future exports must include redaction tests.

## Packaging

- The Python worker is embedded into the Electron app using `extraResources` (see `packages/app/electron-builder.yml`).
- In dev, the worker runs via `python -m aideon_worker.cli`.
- In packaged builds, the host spawns `resources/worker/aideon-worker[.exe]`.

## Time‑first design

- `Temporal.StateAt` stub exists (`aideon_worker.temporal.state_at`).
- Adapters expose `stateAt()` and `diff()` signatures.
- Future jobs (shortest path, centrality, impact) will be added under the worker with tests and SLO notes.

## Compliance checklist

- [x] No renderer HTTP
- [x] No open TCP ports in desktop mode
- [x] Minimal preload bridge
- [x] Worker sidecar only, RPC via stdio
- [x] Worker binary embedded in packaged installers
- [x] Version injection via semantic-release
