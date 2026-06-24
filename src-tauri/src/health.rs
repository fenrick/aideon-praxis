//! Host-level health commands exposed to the renderer.

use crate::worker::{WorkerHealth, WorkerState};
#[cfg(test)]
use log::{debug, info};
use tauri::State;

use crate::ipc::{EmptyPayload, HostError, IpcRequest, IpcResponse};
use crate::telemetry::respond_with_request;

/// Return the current worker health snapshot.
#[cfg(test)]
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
#[tauri::command]
#[specta::specta]
pub async fn system_worker_health(
    state: State<'_, WorkerState>,
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<WorkerHealth>, HostError> {
    respond_with_request("system_worker_health", request, move |_payload| {
        let state = state.clone();
        async move { Ok(health_snapshot(state.inner())) }
    })
    .await
}

fn health_snapshot(state: &WorkerState) -> WorkerHealth {
    state.health()
}

#[cfg(test)]
#[path = "../tests/internal/health_tests.rs"]
mod tests;
