#![cfg(not(target_os = "windows"))]
use super::{health_snapshot, system_worker_health, worker_health};
use crate::worker::WorkerState;
use aideon_chrona::TemporalEngine;
use aideon_praxis::mneme::open_store;
use tauri::Manager;
use tempfile::tempdir;

#[tokio::test]
async fn health_snapshot_returns_healthy_state() {
    let dir = tempdir().expect("tempdir");
    let mneme = open_store(dir.path()).await.expect("open store");
    let engine = TemporalEngine::new().await.expect("engine");
    let state = WorkerState::new(engine, mneme);
    let snapshot = health_snapshot(&state);
    assert!(snapshot.ok);
    assert!(snapshot.timestamp_ms > 0);
}

#[tokio::test]
async fn health_commands_return_ipc_envelope() {
    let dir = tempdir().expect("tempdir");
    let mneme = open_store(dir.path()).await.expect("open store");
    let engine = TemporalEngine::new().await.expect("engine");
    let state = WorkerState::new(engine, mneme);

    let app = tauri::test::mock_app();
    app.manage(state);
    let state = app.state::<WorkerState>();

    let snapshot = worker_health(state.clone()).await.expect("health");
    assert!(snapshot.ok);

    let response = system_worker_health(
        state,
        crate::ipc::IpcRequest {
            request_id: "req-1".to_string(),
            payload: crate::ipc::EmptyPayload {},
        },
    )
    .await
    .expect("system health");
    assert_eq!(response.status, "ok");
}
