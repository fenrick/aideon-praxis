# Process and trust boundary

The host's process model, the hard invariants that hold across it, and why the renderer is untrusted. For a reader who needs the shape of the boundary before any of its mechanisms.

The decisions that fix this boundary are [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) (the Tauri trust boundary and typed IPC) and [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md) (the STRIDE threat model and ASVS verification).

---

## The process model

```text
┌─────────────────────────────────────────────┐
│ Renderer (TypeScript / React)                │
│ No filesystem. No DB. No network.            │
└───────────────────┬─────────────────────────┘
                    │ Tauri IPC — capability-gated, typed
┌───────────────────┴─────────────────────────┐
│ Host (src-tauri / aideon_desktop)            │
│  windows · setup · ipc · workspace · jobs    │
│  health · events · scene · temporal bridge   │
└───────────────────┬─────────────────────────┘
                    │ Trait calls — in-process, via the engine harness
┌───────────────────┴─────────────────────────┐
│ Engines (separate crates)                    │
│  Mneme · Praxis · Chrona · Metis · Continuum │
└─────────────────────────────────────────────┘
```

_The three layers: an untrusted renderer, the host as trust boundary and composition root, and the engines behind their traits._

---

## The hard invariants

These hold without exception and are verified at release:

- **The renderer never touches storage, the filesystem, or the network directly.** It consumes read projections and dispatches commands; it owns no durable data ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).
- **No local HTTP server. No open TCP ports in desktop mode.** Communication is Tauri commands and events only — there is no second trust boundary to defend.
- **Engines never import the host crate.** Modules depend on contracts and on Mneme; the host depends on them, via the [engine harness](../engine/README.md), never the reverse ([boundaries](./boundaries.md)).
- **The host wires engines at startup via trait objects.** It never calls engine internals by concrete type from an IPC handler ([engine wiring](./engine-wiring.md)).
- **Rust owns the wire shape.** Request/response models are defined in Rust with `serde`; the renderer consumes generated types ([IPC command surface](./ipc-command-surface.md)).

---

## Why the renderer is untrusted

A WebView can run code an attacker influenced — a tampered asset, an injected script, a hostile import that became page content. Treating it as untrusted means none of that can reach the filesystem, the store, or the network, because the renderer has no capability to do so: all workspace IO, object access, traversal, rebuilds, and export/import stay in Rust ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). The renderer gets **product** capabilities (narrow, named commands), not **host** capabilities (raw filesystem, shell, plugins).

This is the load-bearing control across the STRIDE threat model: the renderer-untrusted invariant is what closes most of _Tampering_, _Information disclosure_, and _Elevation of privilege_ at the seam ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)). Untrusted input is deny-by-default: an import file is treated as hostile, validated against the metamodel, and surfaced as `Awaiting review` rather than executed.

---

## The trade-off named

Making Rust own every side effect closes a door: the renderer cannot do anything useful locally without a round-trip to the host. Interactive work that a pure web app would do in the browser — re-slicing data, reading a file — costs an IPC command here. The architecture accepts that latency and that command surface in exchange for a single, defensible trust boundary with no second server to secure, and a renderer that, however compromised, cannot reach the data or the disk.

---

## Related documents

| Document                                                                 | What it covers                                 |
| ------------------------------------------------------------------------ | ---------------------------------------------- |
| [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) | The Tauri trust boundary and typed IPC.        |
| [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)           | The STRIDE threat model and ASVS verification. |
| [Capabilities and CSP](./capabilities-and-csp.md)                        | The mechanisms that enforce the boundary.      |
| [IPC command surface](./ipc-command-surface.md)                          | The typed seam across the boundary.            |
| [Architecture boundary](../../01-architecture/ARCHITECTURE-BOUNDARY.md)  | The corpus-wide boundary rules.                |
| [SECURITY.md](../../02-standards/SECURITY.md)                            | The per-concern ASVS control mapping.          |
