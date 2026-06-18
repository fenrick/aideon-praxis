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

## The artefact-execution sandbox boundary

An [artefact](../../03-design/artefacts/README.md) executes in Praxis, in-process, never in the renderer ([artefact execution boundary](../../01-architecture/boundary/artefact-execution-boundary.md), [ADR-0033](../../06-adrs/ADR-0033-artefact-execution-model.md)). Its sandbox is the same engine boundary every engine sits behind: an executing artefact is a read of the twin, and it reaches only what an engine read may reach. The boundary is enforced by what the engine layer _can_ call, not by an opt-in policy the artefact author sets.

What an executing artefact **may** reach:

- **The resolved twin at its viewpoint**, through Mneme's read path ([IPC command surface](./ipc-command-surface.md), Mneme reads) — the facts, relationships, and slots the traversal needs.
- **Content-addressed blobs by hash**, where a result references bytes — but the bytes are not inlined; the renderer requests them through a separate command ([artefact execution boundary](../../01-architecture/boundary/artefact-execution-boundary.md), [blobs and integrity](../../02-standards/security/blobs-and-integrity.md)).
- **Bounded analytics from Metis**, where a result needs computed contributors ([explainability](../praxis/explainability.md)) — itself a deterministic, bounded engine read.

What an executing artefact **may not** reach:

- **The filesystem directly.** An engine resolves no OS path; path resolution is the host's alone ([capabilities and CSP](./capabilities-and-csp.md)), so an artefact cannot name a file to read or write.
- **The network.** No engine opens a socket; there is no local HTTP server and no open TCP port in desktop mode (the hard invariants, above). An artefact cannot exfiltrate or fetch.
- **The renderer or arbitrary IPC commands.** Execution flows host → engine via a trait object; an engine never calls back into the host crate or invokes a command ([boundaries](./boundaries.md)).
- **Continuum workers as a write path.** A long-running execution is an [accepted-work](../../04-contracts/accepted-work-and-events/README.md) job, but the job reads the twin and produces a result; it does not gain a side-effecting capability the synchronous path lacks. Artefacts are read-only ([ADR-0033](../../06-adrs/ADR-0033-artefact-execution-model.md)); an action artefact that proposes a write is **design intent, not built**, and when introduced routes through the same review path as any other suggestion ([intelligence and automation](../../03-design/artefacts/intelligence-and-automation.md)).
- **Third-party plugins.** The renderer holds product capabilities, not host capabilities (raw filesystem, shell, plugins) ([capabilities and CSP](./capabilities-and-csp.md)); an artefact result, being data the renderer interprets, carries no capability and cannot invoke a plugin.

The capability model enforces this without a per-artefact policy: because the renderer can only invoke the narrow named `praxis_artefact_execute_*` commands ([IPC command surface](./ipc-command-surface.md)), and those commands route to an engine that has no filesystem, network, or host-crate access, the set of things an artefact can reach is fixed by construction. There is no artefact-author knob that widens it. The threat-model analysis of this seam is owned by the [security standard](../../02-standards/security/threat-model.md) and the [capability-scoping](../../02-standards/security/capability-scoping.md) control; this section states the boundary, not the threats.

## The trade-off named

Making Rust own every side effect closes a door: the renderer cannot do anything useful locally without a round-trip to the host. Interactive work that a pure web app would do in the browser — re-slicing data, reading a file — costs an IPC command here. The architecture accepts that latency and that command surface in exchange for a single, defensible trust boundary with no second server to secure, and a renderer that, however compromised, cannot reach the data or the disk.

---

## Related documents

| Document                                                                                     | What it covers                                 |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)                     | The Tauri trust boundary and typed IPC.        |
| [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)                               | The STRIDE threat model and ASVS verification. |
| [Capabilities and CSP](./capabilities-and-csp.md)                                            | The mechanisms that enforce the boundary.      |
| [IPC command surface](./ipc-command-surface.md)                                              | The typed seam across the boundary.            |
| [ADR-0033](../../06-adrs/ADR-0033-artefact-execution-model.md)                               | The read-only artefact-execution model.        |
| [Artefact execution boundary](../../01-architecture/boundary/artefact-execution-boundary.md) | Where artefacts execute and why.               |
| [Architecture boundary](../../01-architecture/ARCHITECTURE-BOUNDARY.md)                      | The corpus-wide boundary rules.                |
| [SECURITY.md](../../02-standards/SECURITY.md)                                                | The per-concern ASVS control mapping.          |
