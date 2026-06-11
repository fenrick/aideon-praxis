# IPC command surface

The typed seam across the trust boundary: the request/response envelope, the error contract, and the registered commands grouped by domain. For a reader implementing or calling a command.

The envelope and DTO stability rules are the cross-module contract in [CONTRACTS-AND-SCHEMAS.md](../../04-contracts/CONTRACTS-AND-SCHEMAS.md); the error envelope is fixed by [ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md). This file is the host-facing view of the surface.

---

## The envelope

All commands accept a single `IpcRequest<T>` argument and return `IpcResponse<U>` or `Result<IpcResponse<U>, HostError>`. The envelope is defined in `src-tauri/src/ipc.rs`.

```json
// Request
{ "requestId": "uuid", "payload": { /* command-specific */ } }

// Response — success
{ "requestId": "uuid", "status": "ok", "result": { /* ... */ } }

// Response — error
{ "requestId": "uuid", "status": "error",
  "error": { "code": "snake_case_stable_id", "message": "human text", "details": {} } }
```

Rules, all of which are contract obligations:

- `requestId` always round-trips.
- `code` is stable and machine-readable across releases ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)).
- Rust error internals **must not** appear raw in `message` — a storage row reference or a panic string never crosses the boundary ([process and trust boundary](./process-and-trust-boundary.md)).
- All fields serialise as `camelCase`; Rust owns the wire shape and TypeScript consumes generated types ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).

The error envelope carries the failing command's `correlation_id`, so a UI error joins to host logs and the trace span ([observability](./observability.md), [ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)). A validation failure on any payload is a `validation`-category error — every payload is validated, deny-by-default ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)).

---

## Registration

Commands are registered in `src-tauri/src/app.rs` via `tauri::generate_handler!` and explicitly allowed in `permissions/appcommands.toml` ([capabilities and CSP](./capabilities-and-csp.md)). A command registration test (`app_tests.rs`) fails if a command is removed or renamed from the `generate_handler!` list, giving a contract check against `appcommands.toml`.

Handlers are thin: each validates the request envelope, delegates to an `_inner` function, and maps errors to `HostError`. Domain logic lives in the engines, reached through the [engine harness](../engine/README.md) — a handler routes to a trait object, never a concrete engine type.

---

## The command surface by domain

The surface is grouped by the engine or concern it faces. The full per-command tables are maintained alongside the handlers; the groups are:

| Group                            | Faces                             | Representative commands                                                                                                                                                                                                                                                            |
| -------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **System**                       | The host itself                   | `system_setup_complete`, `system_setup_state`, `system_worker_health`, `system_window_open`                                                                                                                                                                                        |
| **Workspace**                    | Workspace lifecycle and templates | `workspace_projects_list`, `workspace_templates_list`, `workspace_templates_save`                                                                                                                                                                                                  |
| **Chrona — temporal**            | The temporal engine               | `chrona_temporal_state_at`, `chrona_temporal_diff`, `chrona_temporal_commit_changes`, `chrona_temporal_list_commits`, `chrona_temporal_create_branch`, `chrona_temporal_list_branches`, `chrona_temporal_merge_branches`, `chrona_temporal_topology_delta`, `praxis_metamodel_get` |
| **Praxis — artefacts and tasks** | The semantic engine               | `praxis_artefact_execute_graph` / `_catalogue` / `_matrix` / `_chart`, `praxis_task_apply_operations`, `praxis_scenario_list`, `praxis_canvas_get_scene` / `_get_layout` / `_save_layout`, `praxis_graph_layout_get` / `_save`                                                     |
| **Mneme — writes**               | The store (write path)            | `mneme_store_create_node` / `_create_edge` / `_set_property_interval` / `_tombstone_entity`, `mneme_store_upsert_metamodel_batch`, `mneme_store_ingest_ops`, …                                                                                                                     |
| **Mneme — reads and queries**    | The store (read path)             | `mneme_store_read_entity_at_time`, `mneme_store_traverse_at_time`, `mneme_store_get_projection_edges`, `mneme_store_subscribe_partition`, `mneme_store_explain_resolution`, …                                                                                                      |
| **Mneme — export / import**      | The store (bulk)                  | `mneme_store_export_ops` / `_export_ops_stream` / `_import_ops_stream` / `_export_snapshot_stream` / `_import_snapshot_stream` — accepted-work jobs ([accepted work and backpressure](./accepted-work-and-backpressure.md))                                                        |
| **Mneme — processing triggers**  | The store (background)            | `mneme_store_trigger_refresh_integrity` / `_refresh_analytics_projections` / `_retention` / `_compaction` — each enqueues a job and returns immediately                                                                                                                            |

The command names are stable identifiers and a public contract surface. Long-running export, import, and processing commands return an `AcceptedJob` immediately rather than blocking ([accepted work and backpressure](./accepted-work-and-backpressure.md)).

---

## Related documents

| Document                                                              | What it covers                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------ |
| [Contracts and schemas](../../04-contracts/CONTRACTS-AND-SCHEMAS.md)  | The full IPC envelope schema and DTO stability rules.  |
| [ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)          | The RFC 9457 error envelope.                           |
| [Accepted work and backpressure](./accepted-work-and-backpressure.md) | Which commands run as jobs and how.                    |
| [Engine wiring](./engine-wiring.md)                                   | How a handler reaches the engine behind its trait.     |
| [Observability](./observability.md)                                   | The correlation and timeout contract around a command. |
| [Capabilities and CSP](./capabilities-and-csp.md)                     | How a command is allowed across the boundary.          |
