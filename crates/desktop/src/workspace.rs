//! Minimal workspace navigation commands used by the renderer shell.
//!
//! M0 only requires that the host exposes stable, typed IPC surfaces and that the
//! renderer can discover basic navigation scaffolding without hardcoding backend paths.

use aideon_praxis::continuum::{FileSnapshotStore, SnapshotStore};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::future::Future;
use std::time::Instant;
use tauri::State;

use crate::ipc::{EmptyPayload, HostError, IpcRequest, IpcResponse};
use crate::praxis_api::ScenarioSummary;
use crate::telemetry::{command_completed, command_failed, command_invoked};
use crate::worker::WorkerState;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectPayload {
    pub id: String,
    pub name: String,
    pub scenarios: Vec<ScenarioSummary>,
}

/// List projects for the active workspace.
///
/// M0 scaffolding: returns a single default project with scenarios sourced from the temporal
/// engine branches.
#[tauri::command]
pub async fn list_projects(
    state: State<'_, WorkerState>,
) -> Result<Vec<ProjectPayload>, HostError> {
    let scenarios = crate::praxis_api::praxis_list_scenarios_inner(state.engine()).await?;
    Ok(vec![ProjectPayload {
        id: "default-project".into(),
        name: "Praxis Workspace".into(),
        scenarios,
    }])
}

/// Namespaced + requestId-wrapped project list query.
#[tauri::command]
pub async fn workspace_projects_list(
    state: State<'_, WorkerState>,
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<Vec<ProjectPayload>>, HostError> {
    instrument_command(
        "workspace_projects_list",
        request.request_id,
        list_projects(state),
    )
    .await
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplatePayload {
    pub id: String,
    pub document_id: String,
    pub name: String,
    pub description: String,
    pub widgets: Vec<TemplateWidgetPayload>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateWidgetPayload {
    pub id: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,
    pub kind: String,
    pub view: Value,
}

/// List canvas templates stored/managed by the host.
#[tauri::command]
pub async fn list_templates() -> Result<Vec<TemplatePayload>, HostError> {
    let templates = load_templates()?;
    if !templates.is_empty() {
        return Ok(templates);
    }
    let defaults = default_templates();
    if defaults.is_empty() {
        return Ok(vec![]);
    }
    store_templates(&defaults)?;
    Ok(defaults)
}

/// Namespaced + requestId-wrapped template list query.
#[tauri::command]
pub async fn workspace_templates_list(
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<Vec<TemplatePayload>>, HostError> {
    instrument_command(
        "workspace_templates_list",
        request.request_id,
        list_templates(),
    )
    .await
}

/// Persist a template snapshot so the host is the source of truth.
#[tauri::command]
pub async fn save_template(payload: TemplatePayload) -> Result<TemplatePayload, HostError> {
    let trimmed_id = payload.id.trim();
    if trimmed_id.is_empty() {
        return Err(HostError::invalid_input("template id required"));
    }
    let trimmed_doc_id = payload.document_id.trim();
    if trimmed_doc_id.is_empty() {
        return Err(HostError::invalid_input("template documentId required"));
    }

    let mut templates = load_templates()?;
    if let Some(existing) = templates.iter_mut().find(|entry| entry.id == payload.id) {
        *existing = payload.clone();
    } else {
        templates.push(payload.clone());
    }

    store_templates(&templates)?;
    Ok(payload)
}

/// Namespaced + requestId-wrapped template save command.
#[tauri::command]
pub async fn workspace_templates_save(
    request: IpcRequest<TemplatePayload>,
) -> Result<IpcResponse<TemplatePayload>, HostError> {
    instrument_command(
        "workspace_templates_save",
        request.request_id,
        save_template(request.payload),
    )
    .await
}

fn workspace_snapshot_base() -> Result<std::path::PathBuf, HostError> {
    if let Ok(value) = std::env::var("AIDEON_TEST_DATA_DIR") {
        return Ok(std::path::PathBuf::from(value));
    }
    Ok(dirs::data_dir()
        .ok_or_else(|| HostError::internal("no data dir"))?
        .join("AideonPraxis"))
}

fn template_store_key() -> &'static str {
    "workspace/templates.json"
}

fn default_templates() -> Vec<TemplatePayload> {
    let graph_overview = json!({
        "id": "executive-overview",
        "name": "Executive Overview",
        "kind": "graph",
        "filters": {
            "nodeTypes": ["Capability", "Application"],
            "edgeTypes": ["depends_on", "supports"]
        }
    });
    let catalogue_base = json!({
        "id": "capability-catalogue",
        "name": "Capability Catalogue",
        "kind": "catalogue",
        "columns": [
            { "id": "name", "label": "Name", "type": "string" },
            { "id": "owner", "label": "Owner", "type": "string" },
            { "id": "state", "label": "State", "type": "string" }
        ]
    });
    let matrix_base = json!({
        "id": "capability-to-service",
        "name": "Capability to Service Matrix",
        "kind": "matrix",
        "rowType": "Capability",
        "columnType": "Service",
        "relationship": "depends_on"
    });
    let kpi_chart = json!({
        "id": "kpi-operational",
        "name": "Operational KPIs",
        "kind": "chart",
        "chartType": "kpi",
        "measure": "Operational readiness"
    });
    let line_chart = json!({
        "id": "velocity-line",
        "name": "Velocity trend",
        "kind": "chart",
        "chartType": "line",
        "measure": "Velocity"
    });
    let bar_chart = json!({
        "id": "heatmap-bar",
        "name": "Capability maturity",
        "kind": "chart",
        "chartType": "bar",
        "measure": "Maturity"
    });

    vec![
        TemplatePayload {
            id: "template-executive".into(),
            document_id: "canvasdoc-executive".into(),
            name: "Executive overview".into(),
            description: "Graph + KPI + catalogue snapshot for leadership reviews.".into(),
            widgets: vec![
                TemplateWidgetPayload {
                    id: "graph-overview".into(),
                    title: "Twin overview graph".into(),
                    size: Some("full".into()),
                    kind: "graph".into(),
                    view: graph_overview.clone(),
                },
                TemplateWidgetPayload {
                    id: "kpi-services".into(),
                    title: "Critical services KPI".into(),
                    size: Some("half".into()),
                    kind: "chart".into(),
                    view: kpi_chart.clone(),
                },
                TemplateWidgetPayload {
                    id: "velocity-line".into(),
                    title: "Velocity trend".into(),
                    size: Some("half".into()),
                    kind: "chart".into(),
                    view: line_chart.clone(),
                },
                TemplateWidgetPayload {
                    id: "catalogue-primary".into(),
                    title: "Capability catalogue".into(),
                    size: Some("full".into()),
                    kind: "catalogue".into(),
                    view: catalogue_base.clone(),
                },
            ],
        },
        TemplatePayload {
            id: "template-explorer".into(),
            document_id: "canvasdoc-explorer".into(),
            name: "Explorer workspace".into(),
            description: "Graph, matrix, and comparative chart for deeper analysis.".into(),
            widgets: vec![
                TemplateWidgetPayload {
                    id: "graph-explorer".into(),
                    title: "Explorer graph".into(),
                    size: Some("full".into()),
                    kind: "graph".into(),
                    view: graph_overview,
                },
                TemplateWidgetPayload {
                    id: "matrix-coverage".into(),
                    title: "Capability to Service coverage".into(),
                    size: Some("half".into()),
                    kind: "matrix".into(),
                    view: matrix_base,
                },
                TemplateWidgetPayload {
                    id: "maturity-bars".into(),
                    title: "Capability maturity".into(),
                    size: Some("half".into()),
                    kind: "chart".into(),
                    view: bar_chart,
                },
                TemplateWidgetPayload {
                    id: "catalogue-explorer".into(),
                    title: "Capability rollup".into(),
                    size: Some("full".into()),
                    kind: "catalogue".into(),
                    view: catalogue_base,
                },
            ],
        },
    ]
}

fn is_missing_snapshot_error(message: &str) -> bool {
    message.contains("os error 2") || message.contains("No such file")
}

fn load_templates() -> Result<Vec<TemplatePayload>, HostError> {
    let base = workspace_snapshot_base()?;
    let store = FileSnapshotStore::new(base);
    let key = template_store_key();
    match store.get(key) {
        Ok(bytes) => serde_json::from_slice::<Vec<TemplatePayload>>(&bytes)
            .map_err(|e| HostError::internal(format!("deserialize failed: {e}"))),
        Err(message) if is_missing_snapshot_error(&message) => Ok(vec![]),
        Err(message) => Err(HostError::internal(message)),
    }
}

fn store_templates(templates: &[TemplatePayload]) -> Result<(), HostError> {
    let base = workspace_snapshot_base()?;
    let store = FileSnapshotStore::new(base);
    let key = template_store_key();
    let json = serde_json::to_vec_pretty(templates)
        .map_err(|e| HostError::internal(format!("serialize failed: {e}")))?;
    store
        .put(key, &json)
        .map_err(|e| HostError::internal(e.to_string()))?;
    Ok(())
}

async fn instrument_command<T, Fut>(
    name: &'static str,
    request_id: String,
    fut: Fut,
) -> Result<IpcResponse<T>, HostError>
where
    Fut: Future<Output = Result<T, HostError>>,
{
    command_invoked(name, &request_id);
    let start = Instant::now();
    let result = fut.await;
    match &result {
        Ok(_) => command_completed(name, &request_id, start.elapsed()),
        Err(err) => command_failed(name, &request_id, err, Some(start.elapsed())),
    }
    let response = match result {
        Ok(value) => IpcResponse::ok(request_id, value),
        Err(err) => IpcResponse::err(request_id, err),
    };
    Ok(response)
}

#[cfg(test)]
#[path = "../tests/internal/workspace_tests.rs"]
mod tests;
