# ADR-0006: Tauri Trust Boundary and Typed IPC

- Status: Accepted
- Date: 2026-06-10
- Depends-On: ADR-0001

## Context

Aideon Desktop ships as a Tauri v2 app: a WebView renderer, a typed IPC seam, and a Rust core. A pure web/API
architecture can justify a local HTTP server; a desktop-first workspace product should not — a local server adds process
complexity, a second trust boundary, and port/policy friction. Tauri's model makes the trust split explicit: Rust has
full system access; the WebView gets only what is exposed through IPC; capabilities and permissions decide which windows
may call which commands.

The renderer is a presentation layer, not a durable store. It consumes read projections and dispatches commands; it
never owns data.

## Governance Framing

- **Decision type:** Invariant (renderer is untrusted; Rust owns side effects) + stable seam (the command surface and
  error envelope).
- **Known future pressure:** more commands; long-running jobs; multiple windows; hosted sync.
- **What stays stable:** Rust owns the wire shape; the renderer consumes generated types; capabilities are scoped per
  window; long work uses accepted-work + events.
- **What is provisional:** the specific Rust→TS type-generation tool.
- **What is deferred:** hosted auth (bearer/JWKS) as an adapter, not the desktop default; per-window capability set
  definitions.
- **Why hard to reverse:** the IPC surface and error envelope are public contracts consumed across the boundary.

## Decision

- **The renderer gets product capabilities, not host capabilities.** All workspace IO, object access, indexing,
  traversal, watch ingestion, rebuilds, export/import and sync stay in Rust. The renderer calls narrow commands
  (`open_workspace`, `append_ops`, `graph_slice`, `resolve_facts`, `attach_blob`, `rebuild`, `export_package`,
  `import_package`, `sync_apply`). No raw recursive filesystem access, shell execution, or plugin powers unless a narrow
  case justifies it.
- **No local HTTP server as the primary seam.** Communication is Tauri commands + events.
- **Rust owns the wire shape; TypeScript consumes generated types.** Request/response models are defined in Rust with
  `serde`; TS types are generated during build. A stable error envelope carries machine-readable codes
  (`WORKSPACE_NOT_FOUND`, `WORKSPACE_LOCKED`, `SCHEMA_TOO_NEW`, `CONFLICT_RECORDED`, `BACKPRESSURE`, ...).
- **Long-running work is accepted-work, not a synchronous call.** Commands return an `AcceptedJob`; progress arrives via
  typed events (rebuilds, imports, re-indexing, large blob ingestion, sync). Same lifecycle semantics as an async
  accepted pattern — no HTTP.
- **Backpressure is explicit.** A saturated write queue returns `BACKPRESSURE`; the UI shows a queued state instead of
  pretending the write landed.
- **File-watching is a hint.** Watch canonical roots (`manifest.json`, `model/ops/`, `model/schema/`, `objects/`),
  ignore `.aideon/runtime/`, debounce, then re-read to validate.

## Consequences

- The desktop UI is a static React bundle packaged into Tauri, not a server-rendered shell. The existing `src/` renderer
  is treated as the design-system/interaction seed.
- The desktop default is a local single-user auth context with no browser session. A hosted auth adapter (bearer/JWKS)
  is a deployment variant, not the primary model.
- Security relies on capability scoping plus, for sharing, **filtered exports** and (later) encryption — role metadata
  inside a cleartext workspace is policy, not enforcement.
- The accepted-work contract is specified in
  [`../04-contracts/ACCEPTED-WORK-AND-EVENTS.md`](../04-contracts/ACCEPTED-WORK-AND-EVENTS.md).
- The command surface is documented in [`../05-modules/host/README.md`](../05-modules/host/README.md).
