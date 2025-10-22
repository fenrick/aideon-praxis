#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use tauri::{AppHandle, Builder};

#[derive(Serialize)]
struct StateAtPayload {
    asOf: String,
    scenario: Option<String>,
    confidence: Option<f64>,
    nodes: u64,
    edges: u64,
}

#[tauri::command]
async fn temporal_state_at(
    _app: AppHandle,
    as_of: String,
    scenario: Option<String>,
    confidence: Option<f64>,
) -> Result<StateAtPayload, String> {
    // Placeholder implementation; returns a minimal shape so the UI can render under Tauri.
    Ok(StateAtPayload {
        asOf: as_of,
        scenario,
        confidence,
        nodes: 0,
        edges: 0,
    })
}

fn main() {
    Builder::default()
        .invoke_handler(tauri::generate_handler![temporal_state_at])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
