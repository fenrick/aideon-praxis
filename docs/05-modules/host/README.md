# Host — Tauri Runtime

The Host (`src-tauri`) is the Tauri v2 runtime that forms the sole security boundary between the renderer and every engine in the Aideon Desktop process.

---

## Responsibilities

The host owns:

- **Windowing** — create, label, size, style, and focus all windows; apply platform-native chrome (Mica on Windows, correct titlebar on macOS).
- **Security and capability enforcement** — declare Tauri capabilities, scope permissions per window, default-deny all IPC, gate every command through a named permission.
- **IPC façade** — validate and dispatch typed commands; return stable error envelopes; never leak raw Rust error strings to the renderer.
- **Workspace lifecycle** — open, validate, and coordinate workspace teardown; own filesystem path resolution.
- **Job orchestration** — run long work asynchronously, emit typed progress events, support cancellation.
- **Event distribution** — push host → renderer events (job updates, model changes, integrity warnings) over the Tauri event bus.
- **Engine wiring** — hold trait-object references to Praxis/Chrona, Mneme, and future engines; route commands and jobs to the correct engine; keep engines unaware of each other.
- **Splash gating** — block main window display until both backend initialisation and renderer readiness signals are received.

The host is **not** responsible for domain logic, analytics, graph traversal, or rendering. All of those live in the engine crates.

---

## Process Model

```
┌─────────────────────────────────────────────┐
│ Renderer (TypeScript / React)                │
│ No filesystem. No DB. No network.            │
└───────────────────┬─────────────────────────┘
                    │ Tauri IPC — capability-gated, typed
┌───────────────────┴─────────────────────────┐
│ Host  (src-tauri)                       │
│  windows · setup · ipc · workspace · jobs   │
│  health · events · scene · temporal bridge  │
└───────────────────┬─────────────────────────┘
                    │ Trait calls — in-process
┌───────────────────┴─────────────────────────┐
│ Engines (separate crates)                    │
│  Mneme · Praxis/Chrona · Metis · Continuum  │
└─────────────────────────────────────────────┘
```

**Hard invariants**

- The renderer never touches storage, the filesystem, or the network directly.
- No local HTTP server. No open TCP ports in desktop mode.
- Engines never import the host crate.
- The host wires engines at startup via trait objects; it never calls engine internals by concrete type from IPC handlers.

---

## Security Boundary

### Tauri Capabilities and Permissions

Capabilities are declared in `src-tauri/capabilities/default.json` and cover all six window labels (`splash`, `main`, `settings`, `about`, `status`, `styleguide`). The active permission set is the `appcommands` bundle defined in `src-tauri/permissions/appcommands.toml`.

Every IPC command must appear in `appcommands.toml`; absent commands are denied at the Tauri layer before the Rust handler is reached.

| Capability plugin | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `core:default`    | Window, webview, app, event primitives         |
| `appcommands`     | Full Aideon command surface (see tables below) |
| `log:default`     | Structured logging from renderer               |
| `dialog:default`  | Native file/confirmation dialogs               |
| `opener:default`  | Open files or URLs in the OS default handler   |

### Content Security Policy

Production builds enforce a strict CSP. Remote assets are forbidden. Dev-only exceptions exist only in debug builds. The renderer must not add `<script>` tags or dynamic imports from external origins.

### Filesystem Access

The renderer never receives filesystem paths. The host resolves workspace storage roots per OS:

| Platform | Root                                         |
| -------- | -------------------------------------------- |
| macOS    | `~/Library/Application Support/AideonPraxis` |
| Windows  | `%APPDATA%\AideonPraxis`                     |
| Linux    | `~/.local/share/aideon`                      |

The `AIDEON_TEST_DATA_DIR` environment variable overrides the root in test and CI contexts.

---

## IPC Envelope Contract

All commands accept a single `IpcRequest<T>` argument and return `IpcResponse<U>` or `Result<IpcResponse<U>, HostError>`. The envelope is defined in `src-tauri/src/ipc.rs`.

**Request**

```json
{
  "requestId": "uuid",
  "payload": {
    /* command-specific */
  }
}
```

**Response — success**

```json
{
  "requestId": "uuid",
  "status": "ok",
  "result": {
    /* ... */
  }
}
```

**Response — error**

```json
{
  "requestId": "uuid",
  "status": "error",
  "error": { "code": "snake_case_stable_id", "message": "human text", "details": {} }
}
```

Rules:

- `requestId` always round-trips.
- `code` is stable and machine-readable across releases.
- Rust error internals never appear raw in `message`.
- All fields serialise as `camelCase`.

---

## Command Surface

Commands are registered in `src-tauri/src/app.rs` via `tauri::generate_handler!` and explicitly allowed in `permissions/appcommands.toml`. The full set is grouped below by domain.

### System

| Command                 | Purpose                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| `system_setup_complete` | Renderer signals a splash task complete (`"frontend"` or `"backend"`) |
| `system_setup_state`    | Query the current setup phase                                         |
| `system_worker_health`  | Return engine health snapshot (`WorkerHealth`)                        |
| `system_window_open`    | Open a named window by its stable label                               |

### Workspace

| Command                    | Purpose                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| `workspace_projects_list`  | List projects for the active workspace (includes scenario summaries) |
| `workspace_templates_list` | List canvas templates persisted by the host                          |
| `workspace_templates_save` | Persist a canvas template; host is the source of truth               |

### Chrona — Temporal Engine

These commands bridge the renderer to the `TemporalEngine` inside `aideon_chrona`. All accept `IpcRequest<T>` and return `IpcResponse<U>`.

| Command                          | Purpose                                           |
| -------------------------------- | ------------------------------------------------- |
| `chrona_temporal_state_at`       | Resolve graph snapshot at a commit ref / scenario |
| `chrona_temporal_diff`           | Compute a diff summary between two commit refs    |
| `chrona_temporal_commit_changes` | Commit a `ChangeSet` and return a `CommitId`      |
| `chrona_temporal_list_commits`   | List commits on a branch                          |
| `chrona_temporal_create_branch`  | Create a named scenario branch                    |
| `chrona_temporal_list_branches`  | List all scenario branches                        |
| `chrona_temporal_merge_branches` | Merge one branch into another                     |
| `chrona_temporal_topology_delta` | Compute topology delta between two snapshots      |
| `praxis_metamodel_get`           | Retrieve the active metamodel document            |

### Praxis — Artefacts and Tasks

| Command                             | Purpose                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `praxis_artefact_execute_graph`     | Execute a `GraphViewDefinition` → `GraphViewModel`                      |
| `praxis_artefact_execute_catalogue` | Execute a `CatalogueViewDefinition` → `CatalogueViewModel`              |
| `praxis_artefact_execute_matrix`    | Execute a `MatrixViewDefinition` → `MatrixViewModel`                    |
| `praxis_artefact_execute_chart`     | Execute a `ChartViewDefinition` → `ChartViewModel`                      |
| `praxis_task_apply_operations`      | Apply a batch of `PraxisOperation`s and commit → `OperationBatchResult` |
| `praxis_scenario_list`              | List scenarios as `ScenarioSummary` items                               |
| `praxis_canvas_get_scene`           | Load a canvas scene document                                            |
| `praxis_canvas_get_layout`          | Load a canvas layout document                                           |
| `praxis_canvas_save_layout`         | Persist canvas layout changes                                           |
| `praxis_graph_layout_get`           | Retrieve a stored graph layout                                          |
| `praxis_graph_layout_save`          | Save a graph layout                                                     |

### Mneme — Graph Store Writes

| Command                                        | Purpose                                         |
| ---------------------------------------------- | ----------------------------------------------- |
| `mneme_store_upsert_metamodel_batch`           | Write a `MetamodelBatch` to the store           |
| `mneme_store_compile_effective_schema`         | Compile the effective schema for a type         |
| `mneme_store_trigger_rebuild_effective_schema` | Trigger a full schema rebuild job               |
| `mneme_store_create_node`                      | Create a graph node                             |
| `mneme_store_create_edge`                      | Create a graph edge                             |
| `mneme_store_set_edge_existence_interval`      | Set valid-time interval on an edge              |
| `mneme_store_tombstone_entity`                 | Soft-delete an entity                           |
| `mneme_store_set_property_interval`            | Set a property value over a valid-time interval |
| `mneme_store_clear_property_interval`          | Remove a property interval                      |
| `mneme_store_or_set_update`                    | OR-set CRDT update on a property                |
| `mneme_store_counter_update`                   | Counter CRDT update on a property               |
| `mneme_store_upsert_validation_rules`          | Write validation rule set                       |
| `mneme_store_upsert_computed_rules`            | Write computed rule set                         |
| `mneme_store_upsert_computed_cache`            | Persist computed cache entries                  |
| `mneme_store_store_pagerank_scores`            | Write PageRank results                          |
| `mneme_store_create_scenario`                  | Create a Mneme scenario                         |
| `mneme_store_delete_scenario`                  | Delete a Mneme scenario                         |
| `mneme_store_ingest_ops`                       | Ingest a batch of raw ops                       |

### Mneme — Graph Store Reads and Queries

| Command                                  | Purpose                                                          |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `mneme_store_read_entity_at_time`        | Read entity state at a valid-time / HLC                          |
| `mneme_store_traverse_at_time`           | Traverse edges from an entity at a valid-time                    |
| `mneme_store_list_entities`              | List entities with filters, pagination, valid-time               |
| `mneme_store_get_projection_edges`       | Retrieve projection edges for analytics                          |
| `mneme_store_get_graph_degree_stats`     | Degree statistics for an entity set                              |
| `mneme_store_get_graph_edge_type_counts` | Edge-type frequency counts                                       |
| `mneme_store_get_changes_since`          | Ordered change feed from a sequence number                       |
| `mneme_store_subscribe_partition`        | Open a live change-event subscription; returns `subscription_id` |
| `mneme_store_unsubscribe_partition`      | Cancel a live subscription                                       |
| `mneme_store_get_partition_head`         | Current partition sequence head                                  |
| `mneme_store_get_effective_schema`       | Read compiled effective schema                                   |
| `mneme_store_list_edge_type_rules`       | List edge-type validation rules                                  |
| `mneme_store_get_pagerank_scores`        | Read stored PageRank results                                     |
| `mneme_store_list_validation_rules`      | List validation rules                                            |
| `mneme_store_list_computed_rules`        | List computed rules                                              |
| `mneme_store_list_computed_cache`        | Read computed cache entries                                      |
| `mneme_store_get_integrity_head`         | Current integrity head snapshot                                  |
| `mneme_store_get_last_schema_compile`    | Timestamp/version of last schema compile                         |
| `mneme_store_get_schema_manifest`        | Full schema manifest                                             |
| `mneme_store_explain_resolution`         | Explain fact resolution for a property                           |
| `mneme_store_explain_traversal`          | Explain path traversal                                           |
| `mneme_store_list_jobs`                  | List running and completed processing jobs                       |
| `mneme_store_list_failed_jobs`           | List failed processing jobs                                      |

### Mneme — Export and Import

Long-running export and import operations return immediately with a job reference and emit typed progress events. See [Accepted Work and Events](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md).

| Command                              | Purpose                                 |
| ------------------------------------ | --------------------------------------- |
| `mneme_store_export_ops`             | Export a bounded ops range              |
| `mneme_store_export_ops_stream`      | Stream full ops log as a background job |
| `mneme_store_import_ops_stream`      | Replay an ops stream into the store     |
| `mneme_store_export_snapshot_stream` | Stream a full snapshot export           |
| `mneme_store_import_snapshot_stream` | Import a snapshot stream                |

### Mneme — Processing Triggers

Each trigger enqueues a background processing job; the command returns immediately.

| Command                                             | Purpose                             |
| --------------------------------------------------- | ----------------------------------- |
| `mneme_store_trigger_refresh_integrity`             | Recompute integrity check results   |
| `mneme_store_trigger_refresh_analytics_projections` | Refresh analytics projection cache  |
| `mneme_store_trigger_retention`                     | Apply retention policy              |
| `mneme_store_trigger_compaction`                    | Compact the event log               |
| `mneme_store_run_processing_worker`                 | Manually tick the processing worker |

---

## Accepted Work and Backpressure

Any operation that can exceed ~200–500 ms or performs heavy disk I/O is an **accepted job**: the command enqueues the work and returns immediately. The renderer receives typed progress events over the Tauri event bus and polls job state via `mneme_store_list_jobs`.

When the host is saturated it returns `BACKPRESSURE` rather than queuing unboundedly. The renderer surfaces this to the user rather than silently retrying.

See [Accepted Work and Events](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) for the full event and job-state schema.

---

## Engine Wiring

The host holds engine trait objects in `WorkerState` (managed Tauri state):

- `WorkerState::engine()` → `&TemporalEngine` (Praxis / Chrona)
- `WorkerState::mneme()` → the Mneme store handle

IPC handlers receive `State<'_, WorkerState>` from Tauri and call `state.engine()` or `state.mneme()` to reach the correct engine. Handlers are thin: they validate the request envelope, delegate to an `_inner` function, and map errors to `HostError`.

Engine lifecycle follows the hooks pattern documented in `src-tauri/DESIGN.md` sections 32–33: `on_host_start`, `on_workspace_open`, `on_workspace_close`, `on_host_shutdown`. The host orchestrates multi-engine workflows as single jobs; the renderer sees one progress stream and one result.

---

## Workspace Lifecycle

The host is the sole authority over workspace paths, locks, and state transitions. The renderer never sees a filesystem path.

```
App start
  └─ setup.rs: run_backend_setup()
       ├─ initialise engines (WorkerState)
       ├─ signal backend ready
       └─ await frontend ready signal

Workspace open
  ├─ resolve storage root (OS data dir / AIDEON_TEST_DATA_DIR)
  ├─ acquire workspace lock
  ├─ validate schema version
  ├─ run migration job if required (blocks workspace use until complete)
  └─ emit workspace_opened event

Workspace close
  ├─ cancel active subscriptions
  ├─ drain in-flight jobs
  ├─ flush engine state
  └─ emit workspace_closed event
```

If schema migration fails the workspace opens in read-only recovery mode. The Status window remains usable and surfaces diagnostics. Raw data export is available from recovery mode.

Export and import flows are jobs: they stream data, include manifest metadata, and surface findings as job results. Import conflicts are visible in the post-import integrity report.

---

## Splash Gating

Startup completes only when both tasks signal completion:

| Task     | Signal                                                                            |
| -------- | --------------------------------------------------------------------------------- |
| Backend  | `run_backend_setup()` succeeds; calls `system_setup_complete { task: "backend" }` |
| Frontend | Renderer splash screen calls `system_setup_complete { task: "frontend" }`         |

`SetupState` (managed as a `Mutex<SetupState>`) tracks both flags. When both are true the splash window closes after a 3-second minimum display time and the main window becomes visible.

---

## Window Model

| Label        | Purpose                   |
| ------------ | ------------------------- |
| `splash`     | Startup gating screen     |
| `main`       | Primary workspace shell   |
| `settings`   | Preferences               |
| `status`     | Health, jobs, diagnostics |
| `about`      | Version, licences         |
| `styleguide` | UI development reference  |

Labels are stable and never change. The `system_window_open` command opens any window by label. Capabilities are granted to all six labels via `capabilities/default.json`.

---

## Event Bus (Host → Renderer)

The host emits Tauri events to the renderer without polling. Renderer adapters subscribe in one place.

| Event                                   | Payload         |
| --------------------------------------- | --------------- |
| `setup.backend_ready`                   | —               |
| `workspace_opened`                      | workspace id    |
| `workspace_closed`                      | workspace id    |
| `mneme_change_event` (per subscription) | `ChangeEvent`   |
| `job.updated`                           | job metadata    |
| `job.completed`                         | job result ref  |
| `integrity.warning`                     | rule + entities |

The renderer must tolerate missed events. Fallback polling is permitted only as a safety net, not the primary update mechanism.

---

## Module Layout (`src-tauri/src/`)

| File / Folder  | Responsibility                                                                 |
| -------------- | ------------------------------------------------------------------------------ |
| `app.rs`       | Tauri builder, plugin init, invoke handler registration, managed state setup   |
| `windows.rs`   | Window creation, labels, sizing, platform styling                              |
| `menu.rs`      | Native menu and accelerators                                                   |
| `setup.rs`     | Splash gating and backend initialisation state machine                         |
| `ipc.rs`       | Shared `IpcRequest`, `IpcResponse`, `HostError`, `ipc_handle`                  |
| `worker.rs`    | `WorkerState` — holds engine trait objects; exposes `.engine()` and `.mneme()` |
| `health.rs`    | `system_worker_health` — aggregated engine health snapshot                     |
| `temporal.rs`  | Chrona / Praxis temporal bridge commands                                       |
| `scene.rs`     | Canvas scene and layout commands                                               |
| `workspace.rs` | Workspace project and template commands                                        |
| `praxis_api/`  | Praxis artefact execution and task commands                                    |
| `mneme/`       | Mneme store commands (write, read, analytics, processing, export/import)       |

---

## Testing

| Layer                                                | What is tested                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| Rust unit                                            | `IpcRequest`/`IpcResponse` serde round-trips; `HostError` envelope stability   |
| Rust integration (`tests/internal/`)                 | Per-command correctness; CSP and window config; command registration parity    |
| Rust E2E smoke (`tests/internal/tauri_e2e_smoke.rs`) | Mock-app window route and IPC wiring (non-Windows only)                        |
| Node E2E (`tests/e2e/specs/tauri-smoke.e2e.mjs`)     | Real Rust commands through `tauri-driver` + WebdriverIO                        |
| TypeScript adapter                                   | `invoke` mock assertions for command name, payload shape, and response mapping |

The command registration test (`app_tests.rs`) fails if a command is removed or renamed from the `generate_handler!` list, providing a contract check against `appcommands.toml`.

---

## Related Documents

| Document                                                                   | What it covers                                          |
| -------------------------------------------------------------------------- | ------------------------------------------------------- |
| [ARCHITECTURE-BOUNDARY](../../01-architecture/ARCHITECTURE-BOUNDARY.md)    | Process boundary rules; renderer/host/engine separation |
| [MODULE-DEPENDENCY-MAP](../../01-architecture/MODULE-DEPENDENCY-MAP.md)    | Crate dependency graph                                  |
| [CONTRACTS-AND-SCHEMAS](../../04-contracts/CONTRACTS-AND-SCHEMAS.md)       | IPC envelope schema and DTO stability rules             |
| [ACCEPTED-WORK-AND-EVENTS](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) | Job model, progress events, backpressure                |
| [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)   | Decision: Tauri trust boundary and typed IPC            |
| [ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)         | Decision: deterministic package export                  |
| [SECURITY](../../02-standards/SECURITY.md)                                 | CSP, capability policy, filesystem boundary             |
