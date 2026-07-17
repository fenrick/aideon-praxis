//! Host IPC commands for scene/canvas data.

use aideon_chrona::scene::generate_demo_scene;
use aideon_continuum::{FileSnapshotStore, SnapshotStore};
use aideon_praxis::praxis::canvas::{CanvasLayoutGetRequest, CanvasLayoutSaveRequest, CanvasShape};
use aideon_praxis::praxis::graph_layout::{GraphLayoutGetRequest, GraphLayoutSaveRequest};
use log::info;
use serde::Deserialize;
use specta::Type;

use crate::ipc::{HostError, IpcRequest, IpcResponse, is_missing_snapshot_error};

/// Return a raw scene for the canvas. The renderer performs layout when needed.
#[tauri::command]
#[specta::specta]
pub async fn canvas_scene(as_of: Option<String>) -> Result<Vec<CanvasShape>, HostError> {
    info!("host: canvas_scene requested as_of={:?}", as_of);
    // Return raw scene primitives; renderer performs layout via elkjs by default.
    let shapes = generate_demo_scene();
    info!("host: canvas_scene returning {} shapes (raw)", shapes.len());
    Ok(shapes)
}

#[derive(Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CanvasScenePayload {
    #[serde(default)]
    pub as_of: Option<String>,
}

/// Namespaced + requestId-wrapped canvas scene query.
#[tauri::command]
#[specta::specta]
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

/// Sanitise an optional identifier, treating blank values as absent.
fn optional_segment(value: Option<&str>) -> Option<String> {
    value.and_then(|value| {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(safe_segment(trimmed))
        }
    })
}

/// Append the time-context suffix (`scenario-`, `layer-`, `layout-<asOf>.json`) shared by all layout keys.
fn push_layout_suffix(path: &mut String, as_of: &str, scenario: Option<&str>, layer: Option<&str>) {
    if let Some(scenario) = optional_segment(scenario) {
        path.push_str(&format!("/scenario-{scenario}"));
    }
    if let Some(layer) = optional_segment(layer) {
        path.push_str(&format!("/layer-{layer}"));
    }
    path.push_str(&format!("/layout-{}.json", safe_segment(as_of)));
}

/// Resolve the on-disk key used to persist a canvas layout snapshot for a document and time context.
fn canvas_store_key(
    doc_id: &str,
    as_of: &str,
    scenario: Option<&str>,
    layer: Option<&str>,
) -> String {
    let mut path = format!("canvas/{}", safe_segment(doc_id));
    push_layout_suffix(&mut path, as_of, scenario, layer);
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
    let mut path = format!(
        "graph/{}/widget-{}",
        safe_segment(doc_id),
        safe_segment(widget_id)
    );
    push_layout_suffix(&mut path, as_of, scenario, layer);
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

/// Serialise a layout payload to pretty JSON and persist it under `key`.
fn write_snapshot<T: serde::Serialize>(key: &str, payload: &T) -> Result<(), HostError> {
    let base = canvas_snapshot_base()?;
    let store = FileSnapshotStore::new(base.clone());
    let json = serde_json::to_vec_pretty(payload)
        .map_err(|e| HostError::internal(format!("serialize failed: {e}")))?;
    store
        .put(key, &json)
        .map_err(|e| HostError::internal(e.to_string()))?;
    info!("host: snapshot wrote {}/{}", base.display(), key);
    Ok(())
}

/// Load and deserialise a layout snapshot, returning `None` when it does not exist.
fn read_snapshot<T: serde::de::DeserializeOwned>(key: &str) -> Result<Option<T>, HostError> {
    let base = canvas_snapshot_base()?;
    let store = FileSnapshotStore::new(base);
    match store.get(key) {
        Ok(bytes) => {
            let value = serde_json::from_slice::<T>(&bytes)
                .map_err(|e| HostError::internal(format!("deserialize failed: {e}")))?;
            Ok(Some(value))
        }
        Err(message) if is_missing_snapshot_error(&message) => Ok(None),
        Err(message) => Err(HostError::internal(message)),
    }
}

/// Persist a canvas layout snapshot (geometry, z-order, grouping) for a document and asOf.
#[tauri::command]
#[specta::specta]
pub async fn canvas_save_layout(payload: CanvasLayoutSaveRequest) -> Result<(), HostError> {
    info!(
        "host: canvas_save_layout doc_id={} as_of={} nodes={} edges={} groups={}",
        payload.doc_id,
        payload.as_of,
        payload.nodes.len(),
        payload.edges.len(),
        payload.groups.len()
    );
    let key = canvas_store_key(
        &payload.doc_id,
        &payload.as_of,
        payload.scenario.as_deref(),
        payload.layer.as_deref(),
    );
    write_snapshot(&key, &payload)
}

/// Load a canvas layout snapshot (if any) for a document and time context.
#[tauri::command]
#[specta::specta]
pub async fn canvas_get_layout(
    payload: CanvasLayoutGetRequest,
) -> Result<Option<CanvasLayoutSaveRequest>, HostError> {
    info!(
        "host: canvas_get_layout doc_id={} as_of={} scenario={:?} layer={:?}",
        payload.doc_id, payload.as_of, payload.scenario, payload.layer
    );
    let key = canvas_store_key(
        &payload.doc_id,
        &payload.as_of,
        payload.scenario.as_deref(),
        payload.layer.as_deref(),
    );
    read_snapshot(&key)
}

/// Persist a graph layout snapshot for a specific widget in a document.
#[tauri::command]
#[specta::specta]
pub async fn graph_layout_save(payload: GraphLayoutSaveRequest) -> Result<(), HostError> {
    info!(
        "host: graph_layout_save doc_id={} widget_id={} as_of={} nodes={}",
        payload.doc_id,
        payload.widget_id,
        payload.as_of,
        payload.nodes.len()
    );
    let key = graph_layout_store_key(
        &payload.doc_id,
        &payload.widget_id,
        &payload.as_of,
        payload.scenario.as_deref(),
        payload.layer.as_deref(),
    );
    write_snapshot(&key, &payload)
}

/// Load a graph layout snapshot for a specific widget (if available).
#[tauri::command]
#[specta::specta]
pub async fn graph_layout_get(
    payload: GraphLayoutGetRequest,
) -> Result<Option<GraphLayoutSaveRequest>, HostError> {
    info!(
        "host: graph_layout_get doc_id={} widget_id={} as_of={} scenario={:?} layer={:?}",
        payload.doc_id, payload.widget_id, payload.as_of, payload.scenario, payload.layer
    );
    let key = graph_layout_store_key(
        &payload.doc_id,
        &payload.widget_id,
        &payload.as_of,
        payload.scenario.as_deref(),
        payload.layer.as_deref(),
    );
    read_snapshot(&key)
}

/// Define a namespaced, requestId-wrapped Tauri command that delegates to a bare
/// handler through the shared telemetry envelope.
macro_rules! ipc_layout_command {
    ($(#[$meta:meta])* $name:ident, $req:ty, $resp:ty, $inner:ident) => {
        $(#[$meta])*
        #[tauri::command]
        #[specta::specta]
        pub async fn $name(
            request: IpcRequest<$req>,
        ) -> Result<IpcResponse<$resp>, HostError> {
            crate::telemetry::respond_with_request(
                stringify!($name),
                request,
                |payload| async move { $inner(payload).await },
            )
            .await
        }
    };
}

ipc_layout_command!(
    /// Namespaced + requestId-wrapped graph layout load command.
    praxis_graph_layout_get,
    GraphLayoutGetRequest,
    Option<GraphLayoutSaveRequest>,
    graph_layout_get
);

ipc_layout_command!(
    /// Namespaced + requestId-wrapped graph layout persistence command.
    praxis_graph_layout_save,
    GraphLayoutSaveRequest,
    (),
    graph_layout_save
);

ipc_layout_command!(
    /// Namespaced + requestId-wrapped canvas layout load command.
    praxis_canvas_get_layout,
    CanvasLayoutGetRequest,
    Option<CanvasLayoutSaveRequest>,
    canvas_get_layout
);

ipc_layout_command!(
    /// Namespaced + requestId-wrapped canvas layout persistence command.
    praxis_canvas_save_layout,
    CanvasLayoutSaveRequest,
    (),
    canvas_save_layout
);

#[cfg(test)]
#[path = "../tests/internal/scene_tests.rs"]
mod tests;
