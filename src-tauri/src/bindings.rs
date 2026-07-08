//! The single source of the typed IPC surface ([ADR-0039]): the Rust
//! `#[tauri::command]`s are authoritative and the TypeScript client is generated
//! from this one builder. The app mounts this builder's `invoke_handler` (so the
//! registered surface and the generated surface cannot drift), and the export
//! test writes the client the renderer imports.
//!
//! [ADR-0039]: ../../docs/06-adrs/ADR-0039-typed-ipc-codegen-over-hand-maintained-manifests.md

#[cfg(test)]
use specta_typescript::{BigIntExportBehavior, Typescript};
use tauri_specta::{Builder, collect_commands, collect_events};

/// Build the typed IPC surface on the real app runtime (`tauri::Wry`). Some
/// commands are generic over the runtime; pinning the builder to `Wry` lets
/// `collect_commands!` monomorphise them. Codegen export is type-only, so the
/// concrete runtime here does not constrain the generated client.
pub fn ipc_builder() -> Builder<tauri::Wry> {
    Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            crate::setup::system_setup_complete,
            crate::setup::system_setup_state,
            crate::health::system_worker_health,
            crate::temporal::chrona_temporal_state_at,
            crate::temporal::chrona_temporal_diff,
            crate::temporal::chrona_temporal_commit_changes,
            crate::temporal::chrona_temporal_list_commits,
            crate::temporal::chrona_temporal_create_branch,
            crate::temporal::chrona_temporal_list_branches,
            crate::temporal::chrona_temporal_merge_branches,
            crate::temporal::chrona_temporal_topology_delta,
            crate::temporal::praxis_metamodel_get,
            crate::scene::praxis_canvas_get_scene,
            crate::scene::praxis_canvas_get_layout,
            crate::scene::praxis_canvas_save_layout,
            crate::scene::praxis_graph_layout_get,
            crate::scene::praxis_graph_layout_save,
            crate::praxis_api::praxis_artefact_execute_graph,
            crate::praxis_api::praxis_artefact_execute_catalogue,
            crate::praxis_api::praxis_artefact_execute_matrix,
            crate::praxis_api::praxis_artefact_execute_chart,
            crate::praxis_api::praxis_task_apply_operations,
            crate::praxis_api::praxis_scenario_list,
            crate::windows::system_window_open,
            crate::workspace::workspace_projects_list,
            crate::workspace::workspace_templates_list,
            crate::workspace::workspace_templates_save,
            crate::workspace_lifecycle::workspace_create,
            crate::workspace_lifecycle::workspace_open,
            crate::workspace_lifecycle::workspace_status,
            crate::workspace_lifecycle::workspace_close,
            crate::workspace_lifecycle::workspace_rebuild,
            crate::workspace_lifecycle::workspace_author_node,
            crate::workspace_lifecycle::workspace_nodes,
            crate::telemetry::system_logging_context,
            crate::telemetry::system_metrics_snapshot,
        ])
        .events(collect_events![
            crate::jobs::WorkspaceLifecycleEvent,
            crate::jobs::WorkspaceReadinessEvent,
        ])
}

/// The one TypeScript exporter configuration, used by the codegen test that
/// regenerates the committed client. `u64`/`i64` counts are emitted as JS
/// `number` — matching the JSON wire (serde renders them as numbers) and the
/// realistic count ranges; full-range coordinates and HLC values are carried as
/// decimal strings in their DTOs, so no precision is lost here.
#[cfg(test)]
pub fn typescript() -> Typescript {
    Typescript::default().bigint(BigIntExportBehavior::Number)
}

#[cfg(test)]
#[path = "../tests/internal/bindings_tests.rs"]
mod tests;
