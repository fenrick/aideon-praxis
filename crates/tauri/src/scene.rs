//! Host IPC commands for scene/canvas data.

use chrona::scene::generate_demo_scene;
use core_data::canvas::{CanvasLayoutSaveRequest, CanvasShape};
use log::info;
use std::{fs, path::PathBuf};

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
fn canvas_store_path(doc_id: &str, as_of: &str) -> Result<PathBuf, String> {
    // Store under OS data dir, namespaced by app id
    let base = dirs::data_dir().ok_or_else(|| "no data dir".to_string())?;
    let path = base
        .join("AideonPraxis")
        .join("canvas")
        .join(doc_id)
        .join(format!("layout-{}.json", as_of));
    Ok(path)
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
    let path = canvas_store_path(&payload.doc_id, &payload.as_of)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("create_dir_all failed: {e}"))?;
    }
    let json = serde_json::to_vec_pretty(&payload).map_err(|e| format!("serialize failed: {e}"))?;
    fs::write(&path, json).map_err(|e| format!("write failed: {e}"))?;
    info!("host: canvas_save_layout wrote {}", path.display());
    Ok(())
}
