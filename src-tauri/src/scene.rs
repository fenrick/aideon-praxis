//! Host IPC commands for scene/canvas data.

use aideon_chrona::scene::generate_demo_scene;
use aideon_praxis::continuum::{FileSnapshotStore, SnapshotStore};
use aideon_praxis::praxis::canvas::{CanvasLayoutGetRequest, CanvasLayoutSaveRequest, CanvasShape};
use aideon_praxis::praxis::graph_layout::{GraphLayoutGetRequest, GraphLayoutSaveRequest};
use log::info;
use serde::Deserialize;

use crate::ipc::{HostError, IpcRequest, IpcResponse};

/// Return a raw scene for the canvas. The renderer performs layout when needed.
#[tauri::command]
pub async fn canvas_scene(as_of: Option<String>) -> Result<Vec<CanvasShape>, HostError> {
    info!("host: canvas_scene requested as_of={:?}", as_of);
    // Return raw scene primitives; renderer performs layout via elkjs by default.
    let shapes = generate_demo_scene();
    info!("host: canvas_scene returning {} shapes (raw)", shapes.len());
    Ok(shapes)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasScenePayload {
    #[serde(default)]
    pub as_of: Option<String>,
}

/// Namespaced + requestId-wrapped canvas scene query.
#[tauri::command]
pub async fn praxis_canvas_get_scene(
    request: IpcRequest<CanvasScenePayload>,
) -> Result<IpcResponse<Vec<CanvasShape>>, HostError> {
    crate::telemetry::respond_with_request(
        "praxis_canvas_get_scene",
        request,
        |payload| async move { canvas_scene(payload.as_of).await },
    )
    .await
}

/// Reduce an identifier into a safe path segment (no separators).
fn safe_segment(input: &str) -> String {
    const MAX_LEN: usize = 160;
    let mut out = String::with_capacity(input.len().min(MAX_LEN));
    for ch in input.chars().take(MAX_LEN) {
        if ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.') {
            out.push(ch);
        } else {
            out.push('_');
        }
    }
    if out.is_empty() { "_".into() } else { out }
}

/// Resolve the on-disk key used to persist a canvas layout snapshot for a document and time context.
fn canvas_store_key(
    doc_id: &str,
    as_of: &str,
    scenario: Option<&str>,
    layer: Option<&str>,
) -> String {
    let doc_id = safe_segment(doc_id);
    let as_of = safe_segment(as_of);
    let scenario = scenario.and_then(|value| {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(safe_segment(trimmed))
        }
    });
    let layer = layer.and_then(|value| {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(safe_segment(trimmed))
        }
    });

    let mut path = format!("canvas/{doc_id}");
    if let Some(scenario) = scenario {
        path.push_str(&format!("/scenario-{scenario}"));
    }
    if let Some(layer) = layer {
        path.push_str(&format!("/layer-{layer}"));
    }
    path.push_str(&format!("/layout-{as_of}.json"));
    path
}

/// Resolve the on-disk key used to persist a graph layout snapshot.
fn graph_layout_store_key(
    doc_id: &str,
    widget_id: &str,
    as_of: &str,
    scenario: Option<&str>,
    layer: Option<&str>,
) -> String {
    let doc_id = safe_segment(doc_id);
    let widget_id = safe_segment(widget_id);
    let as_of = safe_segment(as_of);
    let scenario = scenario.and_then(|value| {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(safe_segment(trimmed))
        }
    });
    let layer = layer.and_then(|value| {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(safe_segment(trimmed))
        }
    });

    let mut path = format!("graph/{doc_id}/widget-{widget_id}");
    if let Some(scenario) = scenario {
        path.push_str(&format!("/scenario-{scenario}"));
    }
    if let Some(layer) = layer {
        path.push_str(&format!("/layer-{layer}"));
    }
    path.push_str(&format!("/layout-{as_of}.json"));
    path
}

fn canvas_snapshot_base() -> Result<std::path::PathBuf, HostError> {
    if let Ok(value) = std::env::var("AIDEON_TEST_DATA_DIR") {
        return Ok(std::path::PathBuf::from(value));
    }
    Ok(dirs::data_dir()
        .ok_or_else(|| HostError::internal("no data dir"))?
        .join("AideonPraxis"))
}

fn is_missing_snapshot_error(message: &str) -> bool {
    message.contains("os error 2") || message.contains("No such file")
}

/// Persist a canvas layout snapshot (geometry, z-order, grouping) for a document and asOf.
#[tauri::command]
pub async fn canvas_save_layout(payload: CanvasLayoutSaveRequest) -> Result<(), HostError> {
    info!(
        "host: canvas_save_layout doc_id={} as_of={} nodes={} edges={} groups={}",
        payload.doc_id,
        payload.as_of,
        payload.nodes.len(),
        payload.edges.len(),
        payload.groups.len()
    );
    let base = canvas_snapshot_base()?;
    let store = FileSnapshotStore::new(base.clone());
    let key = canvas_store_key(
        &payload.doc_id,
        &payload.as_of,
        payload.scenario.as_deref(),
        payload.layer.as_deref(),
    );
    let json = serde_json::to_vec_pretty(&payload)
        .map_err(|e| HostError::internal(format!("serialize failed: {e}")))?;
    store
        .put(&key, &json)
        .map_err(|e| HostError::internal(e.to_string()))?;
    info!("host: canvas_save_layout wrote {}/{}", base.display(), key);
    Ok(())
}

/// Load a canvas layout snapshot (if any) for a document and time context.
#[tauri::command]
pub async fn canvas_get_layout(
    payload: CanvasLayoutGetRequest,
) -> Result<Option<CanvasLayoutSaveRequest>, HostError> {
    info!(
        "host: canvas_get_layout doc_id={} as_of={} scenario={:?} layer={:?}",
        payload.doc_id, payload.as_of, payload.scenario, payload.layer
    );
    let base = canvas_snapshot_base()?;
    let store = FileSnapshotStore::new(base.clone());
    let key = canvas_store_key(
        &payload.doc_id,
        &payload.as_of,
        payload.scenario.as_deref(),
        payload.layer.as_deref(),
    );

    match store.get(&key) {
        Ok(bytes) => {
            let layout = serde_json::from_slice::<CanvasLayoutSaveRequest>(&bytes)
                .map_err(|e| HostError::internal(format!("deserialize failed: {e}")))?;
            Ok(Some(layout))
        }
        Err(message) if is_missing_snapshot_error(&message) => Ok(None),
        Err(message) => Err(HostError::internal(message)),
    }
}

/// Persist a graph layout snapshot for a specific widget in a document.
#[tauri::command]
pub async fn graph_layout_save(payload: GraphLayoutSaveRequest) -> Result<(), HostError> {
    info!(
        "host: graph_layout_save doc_id={} widget_id={} as_of={} nodes={}",
        payload.doc_id,
        payload.widget_id,
        payload.as_of,
        payload.nodes.len()
    );
    let base = canvas_snapshot_base()?;
    let store = FileSnapshotStore::new(base.clone());
    let key = graph_layout_store_key(
        &payload.doc_id,
        &payload.widget_id,
        &payload.as_of,
        payload.scenario.as_deref(),
        payload.layer.as_deref(),
    );
    let json = serde_json::to_vec_pretty(&payload)
        .map_err(|e| HostError::internal(format!("serialize failed: {e}")))?;
    store
        .put(&key, &json)
        .map_err(|e| HostError::internal(e.to_string()))?;
    info!("host: graph_layout_save wrote {}/{}", base.display(), key);
    Ok(())
}

/// Load a graph layout snapshot for a specific widget (if available).
#[tauri::command]
pub async fn graph_layout_get(
    payload: GraphLayoutGetRequest,
) -> Result<Option<GraphLayoutSaveRequest>, HostError> {
    info!(
        "host: graph_layout_get doc_id={} widget_id={} as_of={} scenario={:?} layer={:?}",
        payload.doc_id, payload.widget_id, payload.as_of, payload.scenario, payload.layer
    );
    let base = canvas_snapshot_base()?;
    let store = FileSnapshotStore::new(base.clone());
    let key = graph_layout_store_key(
        &payload.doc_id,
        &payload.widget_id,
        &payload.as_of,
        payload.scenario.as_deref(),
        payload.layer.as_deref(),
    );

    match store.get(&key) {
        Ok(bytes) => {
            let layout = serde_json::from_slice::<GraphLayoutSaveRequest>(&bytes)
                .map_err(|e| HostError::internal(format!("deserialize failed: {e}")))?;
            Ok(Some(layout))
        }
        Err(message) if is_missing_snapshot_error(&message) => Ok(None),
        Err(message) => Err(HostError::internal(message)),
    }
}

/// Namespaced + requestId-wrapped graph layout load command.
#[tauri::command]
pub async fn praxis_graph_layout_get(
    request: IpcRequest<GraphLayoutGetRequest>,
) -> Result<IpcResponse<Option<GraphLayoutSaveRequest>>, HostError> {
    crate::telemetry::respond_with_request(
        "praxis_graph_layout_get",
        request,
        |payload| async move { graph_layout_get(payload).await },
    )
    .await
}

/// Namespaced + requestId-wrapped graph layout persistence command.
#[tauri::command]
pub async fn praxis_graph_layout_save(
    request: IpcRequest<GraphLayoutSaveRequest>,
) -> Result<IpcResponse<()>, HostError> {
    crate::telemetry::respond_with_request(
        "praxis_graph_layout_save",
        request,
        |payload| async move { graph_layout_save(payload).await },
    )
    .await
}

/// Namespaced + requestId-wrapped canvas layout load command.
#[tauri::command]
pub async fn praxis_canvas_get_layout(
    request: IpcRequest<CanvasLayoutGetRequest>,
) -> Result<IpcResponse<Option<CanvasLayoutSaveRequest>>, HostError> {
    crate::telemetry::respond_with_request(
        "praxis_canvas_get_layout",
        request,
        |payload| async move { canvas_get_layout(payload).await },
    )
    .await
}

/// Namespaced + requestId-wrapped canvas layout persistence command.
#[tauri::command]
pub async fn praxis_canvas_save_layout(
    request: IpcRequest<CanvasLayoutSaveRequest>,
) -> Result<IpcResponse<()>, HostError> {
    crate::telemetry::respond_with_request(
        "praxis_canvas_save_layout",
        request,
        |payload| async move { canvas_save_layout(payload).await },
    )
    .await
}

#[cfg(test)]
#[path = "../tests/internal/scene_tests.rs"]
mod tests;
