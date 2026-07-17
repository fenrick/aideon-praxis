//! Minimal workspace navigation commands used by the renderer shell.
//!
//! M0 only requires that the host exposes stable, typed IPC surfaces and that the
//! renderer can discover basic navigation scaffolding without hardcoding backend paths.

use aideon_continuum::{FileSnapshotStore, SnapshotStore};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use specta::Type;
use tauri::State;

use crate::ipc::{EmptyPayload, HostError, IpcRequest, IpcResponse, is_missing_snapshot_error};
use crate::praxis_api::ScenarioSummary;
use crate::telemetry::respond_with_request;
use crate::worker::WorkerState;

#[derive(Debug, Serialize, Type)]
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
#[specta::specta]
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
#[specta::specta]
pub async fn workspace_projects_list(
    state: State<'_, WorkerState>,
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<Vec<ProjectPayload>>, HostError> {
    respond_with_request("workspace_projects_list", request, move |_payload| {
        let state = state.clone();
        async move { list_projects(state).await }
    })
    .await
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TemplatePayload {
    pub id: String,
    pub document_id: String,
    pub name: String,
    pub description: String,
    pub widgets: Vec<TemplateWidgetPayload>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
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
#[specta::specta]
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
#[specta::specta]
pub async fn workspace_templates_list(
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<Vec<TemplatePayload>>, HostError> {
    respond_with_request("workspace_templates_list", request, |_payload| {
        list_templates()
    })
    .await
}

/// Persist a template snapshot so the host is the source of truth.
#[tauri::command]
#[specta::specta]
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
#[specta::specta]
pub async fn workspace_templates_save(
    request: IpcRequest<TemplatePayload>,
) -> Result<IpcResponse<TemplatePayload>, HostError> {
    respond_with_request("workspace_templates_save", request, save_template).await
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

/// Metadata for a template widget: `(id, title, size, kind)`.
type WidgetMeta = (&'static str, &'static str, &'static str, &'static str);

/// Build a single widget payload from its metadata and view.
fn widget(meta: WidgetMeta, view: Value) -> TemplateWidgetPayload {
    let (id, title, size, kind) = meta;
    TemplateWidgetPayload {
        id: id.into(),
        title: title.into(),
        size: Some(size.into()),
        kind: kind.into(),
        view,
    }
}

fn graph_overview_view() -> Value {
    json!({
        "id": "executive-overview",
        "name": "Executive Overview",
        "kind": "graph",
        "filters": {
            "nodeTypes": ["Capability", "Application"],
            "edgeTypes": ["depends_on", "supports"]
        }
    })
}

fn catalogue_base_view() -> Value {
    json!({
        "id": "capability-catalogue",
        "name": "Capability Catalogue",
        "kind": "catalogue",
        "columns": [
            { "id": "name", "label": "Name", "type": "string" },
            { "id": "owner", "label": "Owner", "type": "string" },
            { "id": "state", "label": "State", "type": "string" }
        ]
    })
}

fn matrix_base_view() -> Value {
    json!({
        "id": "capability-to-service",
        "name": "Capability to Service Matrix",
        "kind": "matrix",
        "rowType": "Capability",
        "columnType": "Service",
        "relationship": "depends_on"
    })
}

fn kpi_chart_view() -> Value {
    json!({
        "id": "kpi-operational",
        "name": "Operational KPIs",
        "kind": "chart",
        "chartType": "kpi",
        "measure": "Operational readiness"
    })
}

fn line_chart_view() -> Value {
    json!({
        "id": "velocity-line",
        "name": "Velocity trend",
        "kind": "chart",
        "chartType": "line",
        "measure": "Velocity"
    })
}

fn bar_chart_view() -> Value {
    json!({
        "id": "heatmap-bar",
        "name": "Capability maturity",
        "kind": "chart",
        "chartType": "bar",
        "measure": "Maturity"
    })
}

fn default_templates() -> Vec<TemplatePayload> {
    vec![
        TemplatePayload {
            id: "template-executive".into(),
            document_id: "canvasdoc-executive".into(),
            name: "Executive overview".into(),
            description: "Graph + KPI + catalogue snapshot for leadership reviews.".into(),
            widgets: vec![
                widget(
                    ("graph-overview", "Twin overview graph", "full", "graph"),
                    graph_overview_view(),
                ),
                widget(
                    ("kpi-services", "Critical services KPI", "half", "chart"),
                    kpi_chart_view(),
                ),
                widget(
                    ("velocity-line", "Velocity trend", "half", "chart"),
                    line_chart_view(),
                ),
                widget(
                    (
                        "catalogue-primary",
                        "Capability catalogue",
                        "full",
                        "catalogue",
                    ),
                    catalogue_base_view(),
                ),
            ],
        },
        TemplatePayload {
            id: "template-explorer".into(),
            document_id: "canvasdoc-explorer".into(),
            name: "Explorer workspace".into(),
            description: "Graph, matrix, and comparative chart for deeper analysis.".into(),
            widgets: vec![
                widget(
                    ("graph-explorer", "Explorer graph", "full", "graph"),
                    graph_overview_view(),
                ),
                widget(
                    (
                        "matrix-coverage",
                        "Capability to Service coverage",
                        "half",
                        "matrix",
                    ),
                    matrix_base_view(),
                ),
                widget(
                    ("maturity-bars", "Capability maturity", "half", "chart"),
                    bar_chart_view(),
                ),
                widget(
                    (
                        "catalogue-explorer",
                        "Capability rollup",
                        "full",
                        "catalogue",
                    ),
                    catalogue_base_view(),
                ),
            ],
        },
    ]
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

#[cfg(test)]
#[path = "../tests/internal/workspace_tests.rs"]
mod tests;
