//! Minimal workspace navigation commands used by the renderer shell.
//!
//! M0 only requires that the host exposes stable, typed IPC surfaces and that the
//! renderer can discover basic navigation scaffolding without hardcoding backend paths.

use aideon_praxis::continuum::{FileSnapshotStore, SnapshotStore};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

use crate::ipc::{EmptyPayload, HostError, IpcRequest, IpcResponse};
use crate::praxis_api::ScenarioSummary;
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
#[tauri::command(rename = "workspace.projects.list")]
pub async fn workspace_projects_list(
    state: State<'_, WorkerState>,
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<Vec<ProjectPayload>>, HostError> {
    let request_id = request.request_id;
    let response = match list_projects(state).await {
        Ok(result) => IpcResponse::ok(request_id, result),
        Err(err) => IpcResponse::err(request_id, err),
    };
    Ok(response)
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
    load_templates()
}

/// Namespaced + requestId-wrapped template list query.
#[tauri::command(rename = "workspace.templates.list")]
pub async fn workspace_templates_list(
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<Vec<TemplatePayload>>, HostError> {
    let request_id = request.request_id;
    let response = match list_templates().await {
        Ok(result) => IpcResponse::ok(request_id, result),
        Err(err) => IpcResponse::err(request_id, err),
    };
    Ok(response)
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
#[tauri::command(rename = "workspace.templates.save")]
pub async fn workspace_templates_save(
    request: IpcRequest<TemplatePayload>,
) -> Result<IpcResponse<TemplatePayload>, HostError> {
    let request_id = request.request_id;
    let response = match save_template(request.payload).await {
        Ok(result) => IpcResponse::ok(request_id, result),
        Err(err) => IpcResponse::err(request_id, err),
    };
    Ok(response)
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

#[cfg(test)]
#[path = "../tests/internal/workspace_tests.rs"]
mod tests;
