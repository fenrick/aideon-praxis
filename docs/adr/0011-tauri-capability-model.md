# ADR-0011: Tauri Capability Model for Praxis Host

## Status

Accepted

## Context

The Tauri-based Praxis Host must enforce strict boundaries between renderer, host, and worker while
remaining portable across desktop platforms. We need a clear capability model that:

- Prevents the renderer from accessing the filesystem, network, or processes directly.
- Keeps desktop mode offline by default (no open TCP ports).
- Provides a single configuration path for permissions as we introduce server mode and additional
  windows.

## Decision

Adopt a **capability-driven model** for the Praxis Host with these rules:

- Capabilities are defined in per-window configuration and referenced from `tauri.conf.json`.
- Only minimal capabilities are enabled in desktop mode:
  - File access limited to app cache/config directories (e.g., `fs-read-app-data`).
  - Local IPC for worker RPC (e.g., `uds-ipc`), no open TCP ports.
  - Optional capabilities (e.g., clipboard) are disabled by default.
- All Tauri commands must be **explicitly exposed** via allowlists; no blanket “allow everything”
  configurations.
- CSP remains strict with no remote HTTP origins; the renderer cannot fetch arbitrary URLs.

## Consequences

- Contributors modifying host capabilities must do so through capability files and manifests, not ad
  hoc code.
- Desktop mode remains offline by default; server mode introduces network capabilities only where
  explicitly allowed and scoped.
- Security checks and tests should assert deny-by-default behaviour for file, process, and network
  access.

## References

- `docs/tauri-capabilities.md` – implementation details and next steps
- `Architecture-Boundary.md` – host/renderer/worker security boundaries

