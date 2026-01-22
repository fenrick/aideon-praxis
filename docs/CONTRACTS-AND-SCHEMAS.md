# Contracts and Schemas

## Principle

Contracts are shared across renderer, host, and engines. **No ad-hoc DTOs** or duplicate payload
shapes in feature code.

---

## IPC naming

All IPC command names are snake_case (dots are not supported by the bridge).

---

## Event contracts (host → renderer)

The host publishes a small set of **snake_case** events to keep the renderer responsive without polling.
Events are part of the cross-boundary contract and must be versioned and tested like commands.

### Event naming

- Event names are snake_case identifiers (no dots).
- Event payloads are JSON objects (no positional args).
- Event payloads must be forward-compatible (additive changes only).

### Event envelope (recommended)

The renderer should treat events as a typed envelope with a stable shape:

```json
{
  "event": "job_updated",
  "emitted_at": "RFC3339 timestamp",
  "payload": {
    /* event-specific */
  }
}
```

### Canonical events (v1)

**Setup and lifecycle**

- `setup_backend_ready` payload `{}` — host finished backend setup.
- `setup_frontend_ready_ack` payload `{}` — host acknowledged frontend readiness.
- `setup_progress` payload `{ phase }` — host setup progress update (`starting`, `migrating`, `failed`, ...).
- `setup_failed` payload `{ code, message }` — host setup failed; UI should surface diagnostics and provide a Status/recovery path.
- `setup_seed_summary` payload `{ datasetVersion, metamodelVersion }` — host reports the baseline dataset and schema version that backed the first-run seed.
- `workspace_opened` payload `{ workspace_id }`
- `workspace_closed` payload `{ workspace_id }`

**Shell and menu**

- `shell_command` payload `{ command, payload? }` — host requests a shell-level action (menus, shortcuts).

#### Shell command ids (v1)

Shell commands are ids carried inside the `shell_command` event payload.

- `toggle_navigation` payload `{}` — toggle the desktop sidebar.
- `toggle_inspector` payload `{}` — toggle the inspector panel.
- `open_command_palette` payload `{}` — open the command palette.
- `file_print` payload `{}` — request print of the current surface.
- `file_open` payload `{ path }` — request opening a file path selected by the host file picker.
- `file_save_as` payload `{ path }` — request saving to a file path selected by the host file picker.

**Jobs**

- `job_updated` payload `{ job }`
- `job_completed` payload `{ job_id, result_ref?, error? }`

**Model and integrity**

- `model_changed` payload `{ scope, reason? }`
- `integrity_warning` payload `{ rule_id, message, entity_ids[] }`
- `analytics_updated` payload `{ artefact_ids[] }`

**Future**

- `sync_updated` payload `{ status, message?, progress? }`

### Contract discipline

- Event names should be snapshotted (similar to `docs/contracts/ipc-manifest.json`) and covered by contract tests.
- Changes to event names or payloads must update:
  - host emitters,
  - renderer subscriptions and DTOs,
  - contract docs/tests.

### System commands (host → renderer)

- `system_factory_reset` payload `{ confirmation }` — clears `AideonPraxis` storage per `tauri::App::path().app_data_dir()` and requires the literal confirmation token `CONFIRM-FACTORY-RESET`. This command must only be exposed via a `workspace_admin` capability and should be wired into the Status/diagnostics surface for recovery scenarios.

---

## Where contracts live

- **TypeScript (renderer/adapters):** `app/AideonDesktop/src/dtos` is the canonical renderer-side
  contract surface for shared DTOs. Praxis view/task contracts currently live in
  `app/AideonDesktop/src/workspaces/praxis/praxis-api.ts` and are re-exported via
  `app/AideonDesktop/src/workspaces/praxis/types.ts`.
- **Rust (host/engines):** DTOs live in the host and engine crates and are exposed via typed IPC and
  trait interfaces.
- **Host IPC envelopes:** `crates/desktop/src/ipc.rs` defines the canonical request/response
  envelopes (`IpcRequest { requestId, payload }`, `IpcResponse { requestId, status, result?, error? }`)
  and the stable `HostError { code, message }` shape that is mapped into `IpcResponse.error`
  (including `details` for debug context).

---

## Versioning policy (commands + events)

This repository treats IPC commands and host→renderer events as **public API**.

- **Additive-first:** adding new fields to payloads and results is allowed; removing or renaming is not.
- **Stable identifiers:** command names, event names, and `HostError.code` values are stable identifiers.
- **Schema snapshots:** manifests under `docs/contracts/` are the canonical, reviewed snapshots.
  - `schemaVersion` is bumped when the snapshot format changes (not for every new entry).
- **Deprecation:** if an identifier must change, keep the old one as an alias for at least one
  release and update docs + tests to cover both during the window.

## Contract change workflow (required)

When you change a cross-boundary contract (command, event, or DTO shape), do all of the following in the same change:

1. Update the Rust implementation (host/engine structs and handlers).
2. Update the TS mirror (renderer DTOs and adapters).
3. Update contract docs in this file (including payload keys where applicable).
4. Regenerate snapshots:
   - `cargo run -p aideon_xtask -- ipc-manifest`
   - `cargo run -p aideon_xtask -- event-manifest`
   - `cargo run -p aideon_xtask -- shell-command-manifest`
5. Update/extend contract tests (Rust + TypeScript) to prevent drift.
6. Ensure errors remain stable (`HostError.code` and `IpcResponse` envelope shape).

## Synchronization model

- DTOs are mirrored manually with **contract tests** in both stacks.
- Rust structs define field names and casing; TS mirrors must match exactly.
- Error envelopes are structured and stable; changes require tests + doc updates.
  - Desktop host errors must preserve `code` (stable identifier) and `message` (user-facing text).
  - `IpcResponse.error.details` is for debug context and should default to `{}`.
- Host IPC command names are snapshotted in `docs/contracts/ipc-manifest.json`, generated by
  `cargo run -p aideon_xtask -- ipc-manifest` and enforced by Rust + TypeScript contract tests.

---

## Contract artifacts (repo snapshots)

This repository keeps small, generated contract artifacts under `docs/contracts/` to make contract
drift visible in code review and enforceable in CI.

### IPC manifest

- File: `docs/contracts/ipc-manifest.json`
- Contents: the authoritative list of host IPC command names exposed to the renderer.
- Generation: `cargo run -p aideon_xtask -- ipc-manifest`
- Rule: every renderer-side invocation must target a command present in this manifest.

### Event manifest

- File: `docs/contracts/event-manifest.json`
- Contents: the authoritative list of host → renderer event names and their payload schema keys.
- Generation (target): `cargo run -p aideon_xtask -- event-manifest`
- Rule: renderer subscriptions must target only events present in this manifest.

### Shell command manifest

- File: `docs/contracts/shell-command-manifest.json`
- Contents: the authoritative list of host `shell_command` ids and their payload schema keys.
- Generation (target): `cargo run -p aideon_xtask -- shell-command-manifest`
- Rule: renderer-side handling must only target command ids present in this manifest.

### Update discipline

- When a command or event changes, update:
  - the implementation,
  - DTOs on both sides,
  - contract tests,
  - manifests under `docs/contracts/`.

---

## How to change a contract

1. Update the Rust DTOs in the relevant host/engine crate.
2. Mirror the shape in `app/AideonDesktop/src/dtos`.
3. Update IPC handlers and adapters.
4. Extend contract tests (Rust + TypeScript).
5. Update the affected module README/DESIGN docs (examples: `crates/desktop/DESIGN.md`, `crates/praxis/DESIGN.md`, `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`).

---

## Canvas layout persistence (Praxis workspace)

Canvas layout geometry is persisted by the host (desktop mode) and keyed by time context.

- TS DTOs: `app/AideonDesktop/src/dtos/canvas.ts`
- Rust DTOs: `crates/praxis/src/canvas.rs`
- IPC commands:
  - `praxis_canvas_get_layout` payload `CanvasLayoutGetRequest { docId, asOf, scenario?, layer? }` → `CanvasLayoutSnapshot | null`
  - `praxis_canvas_save_layout` payload `CanvasLayoutSnapshot { docId, asOf, scenario?, layer?, nodes[], edges[], groups[] }` → `()`

## Graph layout persistence (Praxis graph widget)

Graph widget node geometry is persisted by the host and keyed by time context plus widget id.

- TS DTOs: `app/AideonDesktop/src/dtos/graph-layout.ts`
- Rust DTOs: `crates/praxis/src/graph_layout.rs`
- IPC commands:
  - `praxis_graph_layout_get` payload `GraphLayoutGetRequest { docId, widgetId, asOf, scenario?, layer? }` → `GraphLayoutSnapshot | null`
  - `praxis_graph_layout_save` payload `GraphLayoutSnapshot { docId, widgetId, asOf, scenario?, layer?, nodes[] }` → `()`

## Praxis artefact execution (views)

Artefact execution requests carry explicit time context (valid time + optional scenario + layer).

- TS contracts: `app/AideonDesktop/src/workspaces/praxis/praxis-api.ts`
- Host IPC commands:
  - `praxis_artefact_execute_graph` payload `GraphViewDefinition { id, name, kind, asOf, layout?, scenario?, layer?, confidence?, filters?, scope? }` → `GraphViewModel`
  - `praxis_artefact_execute_catalogue` payload `CatalogueViewDefinition { id, name, kind, asOf, scenario?, layer?, confidence?, filters?, columns[], limit? }` → `CatalogueViewModel`
  - `praxis_artefact_execute_matrix` payload `MatrixViewDefinition { id, name, kind, asOf, rowType, columnType, relationship?, scenario?, layer?, confidence?, filters? }` → `MatrixViewModel`
  - `praxis_artefact_execute_chart` payload `ChartViewDefinition { id, name, kind, asOf, chartType, measure, dimension?, scenario?, layer?, confidence?, filters? }` → `ChartViewModel`
- `ViewMetadata`: `{ id, name, asOf, scenario?, layer?, fetchedAt, source }`

## Praxis task operations (apply_operations)

Praxis task operations mutate the twin through explicit task payloads.

- TS contracts: `app/AideonDesktop/src/workspaces/praxis/praxis-api.ts`
- Host IPC commands:
  - `praxis_task_apply_operations` payload `{ branch?, operations: PraxisOperation[] }` → `OperationBatchResult`
- `PraxisOperation` (discriminated union):
  - `{ kind: 'createNode', node: TwinNode }`
  - `{ kind: 'updateNode', node: TwinNode }`
  - `{ kind: 'deleteNode', nodeId: string }`
  - `{ kind: 'createEdge', edge: TwinEdge }`
  - `{ kind: 'updateEdge', edge: TwinEdge }`
  - `{ kind: 'deleteEdge', edgeId: string }`
- `TwinNode`: `{ id, type?, props? }`
- `TwinEdge`: `{ id?, from, to, type?, directed?, props? }`

## Workspace templates (Praxis)

Workspace templates are persisted by the host and returned to the renderer for canvas composition.
The host seeds a default template set on first run so the renderer always has initial artefacts.

- TS contracts: `app/AideonDesktop/src/workspaces/praxis/domain-data.ts` (payloads) and
  `app/AideonDesktop/src/workspaces/praxis/templates` (template shapes).
- Host IPC commands:
  - `workspace_templates_list` payload `{}` → `TemplatePayload[]`
  - `workspace_templates_save` payload `TemplatePayload` → `TemplatePayload`
- `TemplatePayload`:
  - `id`, `documentId`, `name`, `description`, `widgets[]`
  - `widgets[]` items: `{ id, title, size?, kind, view }` where `view` is the widget view definition.

## Workspace projects and scenarios (Praxis)

Projects and scenario summaries are surfaced via the host to seed workspace navigation.

- TS contracts: `app/AideonDesktop/src/workspaces/praxis/domain-data.ts` and
  `app/AideonDesktop/src/workspaces/praxis/praxis-api.ts`
- Host IPC commands:
  - `workspace_projects_list` payload `{}` → `ProjectSummary[]`
  - `praxis_scenario_list` payload `{}` → `ScenarioSummary[]`
