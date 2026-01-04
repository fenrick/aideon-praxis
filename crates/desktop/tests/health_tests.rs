use super::health_snapshot;
use crate::worker::WorkerState;
use aideon_chrona::TemporalEngine;
use aideon_praxis::mneme::open_store;
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
