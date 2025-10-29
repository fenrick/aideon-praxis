//! Host IPC commands for scene/canvas data.

use chrona::scene::generate_demo_scene;
use core_data::canvas::CanvasShape;

#[tauri::command]
pub async fn canvas_scene(as_of: Option<String>) -> Result<Vec<CanvasShape>, String> {
    let _ = as_of; // placeholder for future time-aware scenes
    Ok(generate_demo_scene())
}
