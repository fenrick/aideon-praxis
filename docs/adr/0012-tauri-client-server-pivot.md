# ADR-0012: Tauri Client–Server Pivot Strategy

## Status

Accepted

## Context

Aideon Suite starts as a local-first desktop app but must pivot to client–server mode without
rewriting the React (or legacy Svelte) UI. Tauri’s IPC model (Commands, Events, Channels) and
capabilities system provide a natural seam for this pivot. We need a clear strategy for how local
and remote modes share the same contracts and security posture.

## Decision

Treat Tauri Commands as the **internal RPC surface** and hide locality behind Rust adapters:

- Renderer always talks to a small TypeScript port (e.g., `praxisApi`), which calls Tauri Commands.
- Each command delegates to a Rust trait (e.g., `TemporalEngine`, `Analytics`, `TcoService`) with
  two implementations:
  - `LocalAdapter` (default) – calls in-process Rust modules.
  - `RemoteAdapter` (server mode) – calls a remote service over HTTP/2/WebSocket while preserving
    DTOs and semantics.
- Long-running or streaming work uses Channels (and optionally WebSockets on the Rust side) to
  deliver chunked results; Events are used only for light signals.
- Network capabilities are enabled only in server mode via Tauri capabilities and command scopes;
  desktop mode remains offline.

## Consequences

- The UI is insulated from locality; switching local↔remote is a config concern.
- Security remains aligned with Aideon guardrails (no renderer HTTP, deny-by-default, least
  privilege via capabilities and scopes).
- Engine traits and DTOs must remain stable across local and remote adapters; breaking changes
  require careful versioning and ADR updates.

## References

- `docs/tauri-client-server-pivot.md` – supporting notes and concrete guidance
- `Architecture-Boundary.md` – layering and adapter patterns
- ADRs `0002`, `0003` – RPC and adapter decisions

