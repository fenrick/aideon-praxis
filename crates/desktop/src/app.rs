//! Tauri application setup and lifecycle management.

use std::sync::Mutex;
use std::time::Duration;
use tauri::async_runtime::spawn;
use tokio::time::sleep;

use crate::menu::{build_menu, handle_menu_event};
use crate::setup::{SetupState, emit_setup_progress, run_backend_setup};
use crate::windows::create_windows;
use tauri_plugin_log::log::LevelFilter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let log_level = log_level();
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .clear_targets()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .level(log_level)
                .build(),
        )
        .manage(Mutex::new(SetupState::new()))
        .setup(|app| {
            build_menu(app)?;

            app.on_menu_event(move |app, event| {
                handle_menu_event(app, event);
            });

            create_windows(app)?;
            emit_setup_progress(app.handle(), "starting");

            let app_handle = app.handle().clone();
            spawn(async move {
                sleep(Duration::from_millis(120)).await;
                if let Err(error) = run_backend_setup(app_handle).await {
                    log::error!(
                        "host: backend setup failed: {} ({})",
                        error.message,
                        error.code
                    );
                }
            });

            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            crate::setup::system_setup_complete,
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
            crate::mneme::mneme_store_upsert_metamodel_batch,
            crate::mneme::mneme_store_compile_effective_schema,
            crate::mneme::mneme_store_get_effective_schema,
            crate::mneme::mneme_store_list_edge_type_rules,
            crate::mneme::mneme_store_create_node,
            crate::mneme::mneme_store_create_edge,
            crate::mneme::mneme_store_set_edge_existence_interval,
            crate::mneme::mneme_store_tombstone_entity,
            crate::mneme::mneme_store_set_property_interval,
            crate::mneme::mneme_store_clear_property_interval,
            crate::mneme::mneme_store_or_set_update,
            crate::mneme::mneme_store_counter_update,
            crate::mneme::mneme_store_read_entity_at_time,
            crate::mneme::mneme_store_traverse_at_time,
            crate::mneme::mneme_store_list_entities,
            crate::mneme::mneme_store_get_changes_since,
            crate::mneme::mneme_store_subscribe_partition,
            crate::mneme::mneme_store_unsubscribe_partition,
            crate::mneme::mneme_store_get_projection_edges,
            crate::mneme::mneme_store_get_graph_degree_stats,
            crate::mneme::mneme_store_get_graph_edge_type_counts,
            crate::mneme::mneme_store_store_pagerank_scores,
            crate::mneme::mneme_store_get_pagerank_scores,
            crate::mneme::mneme_store_export_ops,
            crate::mneme::mneme_store_ingest_ops,
            crate::mneme::mneme_store_get_partition_head,
            crate::mneme::mneme_store_create_scenario,
            crate::mneme::mneme_store_delete_scenario,
            crate::mneme::mneme_store_export_ops_stream,
            crate::mneme::mneme_store_import_ops_stream,
            crate::mneme::mneme_store_export_snapshot_stream,
            crate::mneme::mneme_store_import_snapshot_stream,
            crate::mneme::mneme_store_upsert_validation_rules,
            crate::mneme::mneme_store_list_validation_rules,
            crate::mneme::mneme_store_upsert_computed_rules,
            crate::mneme::mneme_store_list_computed_rules,
            crate::mneme::mneme_store_upsert_computed_cache,
            crate::mneme::mneme_store_list_computed_cache,
            crate::mneme::mneme_store_trigger_rebuild_effective_schema,
            crate::mneme::mneme_store_trigger_refresh_integrity,
            crate::mneme::mneme_store_trigger_refresh_analytics_projections,
            crate::mneme::mneme_store_trigger_retention,
            crate::mneme::mneme_store_trigger_compaction,
            crate::mneme::mneme_store_run_processing_worker,
            crate::mneme::mneme_store_list_jobs,
            crate::mneme::mneme_store_get_integrity_head,
            crate::mneme::mneme_store_get_last_schema_compile,
            crate::mneme::mneme_store_list_failed_jobs,
            crate::mneme::mneme_store_get_schema_manifest,
            crate::mneme::mneme_store_explain_resolution,
            crate::mneme::mneme_store_explain_traversal,
            crate::windows::system_window_open,
            crate::workspace::workspace_projects_list,
            crate::workspace::workspace_templates_list,
            crate::workspace::workspace_templates_save,
            crate::setup::system_setup_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn log_level() -> LevelFilter {
    if cfg!(debug_assertions) {
        LevelFilter::Debug
    } else {
        LevelFilter::Info
    }
}

#[cfg(test)]
#[path = "../tests/internal/app_tests.rs"]
mod tests;
