## ADR-0001: Migrate Electron/Node host to Tauri (Rust)

- Status: Proposed
- Date: 2025-10-22
- Issue: #95

### Context

We currently run an Electron host (Node main process) with a React renderer and a Python worker
sidecar for analytics/time-slicing. We want a smaller footprint and stronger default isolation
without rewriting the UI or worker.

### Decision

Adopt Tauri (Rust) for the desktop host while keeping:

- React UI (system webview; no Node in renderer)
- Python worker as a supervised sidecar over UDS/Named Pipes

IPC is re-plumbed: renderer ↔ host via Tauri `invoke`/events; host ↔ worker via UDS/Named Pipes
behind a Compute Facade. Packaging/signing handled via Tauri.

### Rationale

- Lower memory/disk footprint than Electron
- Stronger process isolation and capabilities model
- No rewrite of UI or worker; adapters remain interface-driven

### Constraints / Guardrails

- Time-first twin semantics unchanged (`state_at`, snapshots, plan events)
- Strict boundaries (renderer ↔ host via typed bridge; host ↔ worker via RPC over pipes/UDS)
- No renderer HTTP; no open TCP ports in desktop mode

### Rollout Plan (tracked via child issues)

1. Scaffold Tauri host crate (packages/host) [no UI wiring]
2. Add Rust toolchain config and CI checks (fmt/clippy) [no packaging]
3. Add preflight script to validate toolchain (corepack, rustup, uv, tauri)
4. Update docs (getting-started) and CODEOWNERS
5. Prepare UI bridge wrapper for Tauri `invoke` (feature-gated)
6. Worker packaging scaffold (PyInstaller) as Tauri external bin
7. Capabilities/CSP manifest and security notes
8. Progressive CI: build+test per-platform; packaging later

### Alternatives Considered

- Keep Electron: higher footprint, weaker defaults vs. Tauri; no security win
- Rewrite worker in Rust: higher cost and risk; out of scope

### Consequences

- Adds Rust toolchain to contributors and CI
- Clearer capability boundaries; simpler host lifecycle
