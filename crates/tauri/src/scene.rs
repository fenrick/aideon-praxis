//! Host IPC commands for scene/canvas data.

use chrona::scene::generate_demo_scene;
use continuum::{FileSnapshotStore, SnapshotStore};
use core_data::canvas::{CanvasLayoutSaveRequest, CanvasShape};
use log::info;

/// Return a raw scene for the canvas. The renderer performs layout when needed.
#[tauri::command]
pub async fn canvas_scene(as_of: Option<String>) -> Result<Vec<CanvasShape>, String> {
    info!("host: canvas_scene requested as_of={:?}", as_of);
    // Return raw scene primitives; renderer performs layout via elkjs by default.
    let shapes = generate_demo_scene();
    info!("host: canvas_scene returning {} shapes (raw)", shapes.len());
    Ok(shapes)
}

/// Resolve the on-disk path used to persist a canvas layout snapshot for a document and asOf.
fn canvas_store_key(doc_id: &str, as_of: &str) -> String {
    format!("canvas/{}/layout-{}.json", doc_id, as_of)
}

/// Persist a canvas layout snapshot (geometry, z-order, grouping) for a document and asOf.
#[tauri::command]
pub async fn canvas_save_layout(payload: CanvasLayoutSaveRequest) -> Result<(), String> {
    info!(
        "host: canvas_save_layout doc_id={} as_of={} nodes={} edges={} groups={}",
        payload.doc_id,
        payload.as_of,
        payload.nodes.len(),
        payload.edges.len(),
        payload.groups.len()
    );
    let base = dirs::data_dir()
        .ok_or_else(|| "no data dir".to_string())?
        .join("AideonPraxis");
    let store = FileSnapshotStore::new(base.clone());
    let key = canvas_store_key(&payload.doc_id, &payload.as_of);
    let json = serde_json::to_vec_pretty(&payload).map_err(|e| format!("serialize failed: {e}"))?;
    store.put(&key, &json)?;
    info!("host: canvas_save_layout wrote {}/{}", base.display(), key);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::canvas_store_key;
    #[test]
    fn store_key_is_stable() {
        let key = canvas_store_key("doc1", "2025-01-01");
        assert_eq!(key, "canvas/doc1/layout-2025-01-01.json");
    }
}
