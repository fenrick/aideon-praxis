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

/// Document, widget, and time-context coordinates that identify a layout snapshot.
///
/// A `None` `widget_id` denotes a canvas layout; `Some` denotes a graph-widget layout.
struct LayoutCoords<'a> {
    doc_id: &'a str,
    widget_id: Option<&'a str>,
    as_of: &'a str,
    scenario: Option<&'a str>,
    layer: Option<&'a str>,
}

impl LayoutCoords<'_> {
    /// Resolve the on-disk key used to persist this layout snapshot.
    fn store_key(&self) -> String {
        let mut path = match self.widget_id {
            Some(widget_id) => format!(
                "graph/{}/widget-{}",
                safe_segment(self.doc_id),
                safe_segment(widget_id)
            ),
            None => format!("canvas/{}", safe_segment(self.doc_id)),
        };
        push_layout_suffix(&mut path, self.as_of, self.scenario, self.layer);
        path
    }
}

/// Resolve the on-disk snapshot key for a layout request payload.
trait StoreKey {
    fn store_key(&self) -> String;
}

/// Implement [`StoreKey`] for a layout request by projecting it onto [`LayoutCoords`].
///
/// Pass `widget = <field>` for graph requests that carry a widget id; omit it for canvas requests.
macro_rules! impl_store_key {
    ($req:ty $(, widget = $widget:ident)?) => {
        impl StoreKey for $req {
            fn store_key(&self) -> String {
                LayoutCoords {
                    doc_id: &self.doc_id,
                    widget_id: impl_store_key!(@widget self $(, $widget)?),
                    as_of: &self.as_of,
                    scenario: self.scenario.as_deref(),
                    layer: self.layer.as_deref(),
                }
                .store_key()
            }
        }
    };
    (@widget $self:ident) => {
        None
    };
    (@widget $self:ident, $widget:ident) => {
        Some(&$self.$widget)
    };
}

impl_store_key!(CanvasLayoutSaveRequest);
impl_store_key!(CanvasLayoutGetRequest);
impl_store_key!(GraphLayoutSaveRequest, widget = widget_id);
impl_store_key!(GraphLayoutGetRequest, widget = widget_id);

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
    write_snapshot(&payload.store_key(), &payload)
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
    read_snapshot(&payload.store_key())
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
    write_snapshot(&payload.store_key(), &payload)
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
    read_snapshot(&payload.store_key())
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
