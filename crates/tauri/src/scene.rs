//! Host IPC commands for scene/canvas data.

use chrona::scene::generate_demo_scene;
use core_data::canvas::CanvasShape;

#[tauri::command]
pub async fn canvas_scene() -> Result<Vec<CanvasShape>, String> {
    Ok(generate_demo_scene())
}
