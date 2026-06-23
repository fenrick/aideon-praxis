// The IPC surface is registered via `collect_commands!` in `bindings.rs`
// (ADR-0039): the same builder both registers the handlers and generates the
// TypeScript client, so this guards that the required commands are in that one
// source of truth.
const BINDINGS_RS: &str = include_str!("../src/bindings.rs");

#[test]
fn app_registers_core_ipc_commands() {
    let required = [
        "crate::setup::system_setup_complete",
        "crate::windows::system_window_open",
        "crate::health::system_worker_health",
        "crate::workspace::workspace_projects_list",
        "crate::workspace::workspace_templates_list",
        "crate::workspace::workspace_templates_save",
        "crate::temporal::praxis_metamodel_get",
        "crate::scene::praxis_canvas_get_layout",
        "crate::scene::praxis_canvas_save_layout",
        "crate::scene::praxis_graph_layout_get",
        "crate::scene::praxis_graph_layout_save",
        "crate::praxis_api::praxis_artefact_execute_graph",
        "crate::praxis_api::praxis_artefact_execute_catalogue",
        "crate::praxis_api::praxis_artefact_execute_matrix",
        "crate::praxis_api::praxis_artefact_execute_chart",
        "crate::praxis_api::praxis_task_apply_operations",
        "crate::praxis_api::praxis_scenario_list",
        "crate::temporal::chrona_temporal_state_at",
        "crate::temporal::chrona_temporal_diff",
        "crate::temporal::chrona_temporal_topology_delta",
        "crate::temporal::chrona_temporal_commit_changes",
        "crate::temporal::chrona_temporal_list_commits",
        "crate::temporal::chrona_temporal_list_branches",
        "crate::temporal::chrona_temporal_create_branch",
        "crate::temporal::chrona_temporal_merge_branches",
    ];

    for path in required {
        assert!(
            BINDINGS_RS.contains(path),
            "bindings.rs missing required collected command: {path}"
        );
    }
}
