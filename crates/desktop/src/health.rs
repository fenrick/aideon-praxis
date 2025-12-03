//! Host-level health commands exposed to the renderer.

use crate::worker::WorkerState;
use aideon_praxis_facade::mneme::WorkerHealth;
use log::{debug, info};
use tauri::State;

#[tauri::command]
/// Return the current worker health snapshot.
pub async fn worker_health(state: State<'_, WorkerState>) -> Result<WorkerHealth, String> {
    info!("host: worker_health requested");
    let snapshot = state.health();
    debug!(
        "host: worker_health responding ok={} timestamp={}",
        snapshot.ok, snapshot.timestamp_ms
    );
    Ok(snapshot)
}
