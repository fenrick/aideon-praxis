//! Host-level health commands exposed to the renderer.

use crate::worker::WorkerState;
use aideon_praxis::mneme::WorkerHealth;
use log::{debug, info};
use tauri::State;

use crate::ipc::{EmptyPayload, HostError, IpcRequest, IpcResponse};

#[tauri::command]
/// Return the current worker health snapshot.
pub async fn worker_health(state: State<'_, WorkerState>) -> Result<WorkerHealth, HostError> {
    info!("host: worker_health requested");
    let snapshot = health_snapshot(state.inner());
    debug!(
        "host: worker_health responding ok={} timestamp={}",
        snapshot.ok, snapshot.timestamp_ms
    );
    Ok(snapshot)
}

/// Namespaced + requestId-wrapped worker health command.
#[tauri::command(rename = "system.worker.health")]
pub async fn system_worker_health(
    state: State<'_, WorkerState>,
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<WorkerHealth>, HostError> {
    let request_id = request.request_id;
    let snapshot = health_snapshot(state.inner());
    Ok(IpcResponse::ok(request_id, snapshot))
}

fn health_snapshot(state: &WorkerState) -> WorkerHealth {
    state.health()
}

#[cfg(test)]
#[path = "../tests/health_tests.rs"]
mod tests;
