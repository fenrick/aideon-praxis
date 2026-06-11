use super::WorkerState;
use aideon_chrona::TemporalEngine;
use aideon_praxis::mneme::open_store;
use tempfile::tempdir;
use tokio::sync::oneshot;

#[tokio::test]
async fn worker_state_health_is_ok() {
    let dir = tempdir().expect("tempdir");
    let mneme = open_store(dir.path()).await.expect("open mneme");
    let engine = TemporalEngine::new().await.expect("engine");
    let state = WorkerState::new(engine, mneme);
    let health = state.health();
    assert!(health.ok);
    assert!(health.timestamp_ms > 0);
}

#[tokio::test]
async fn subscriptions_can_register_and_cancel() {
    let dir = tempdir().expect("tempdir");
    let mneme = open_store(dir.path()).await.expect("open mneme");
    let engine = TemporalEngine::new().await.expect("engine");
    let state = WorkerState::new(engine, mneme);
    let (tx, _rx) = oneshot::channel();

    state.register_subscription("sub-1".into(), tx).await;
    assert!(state.cancel_subscription("sub-1").await);
    assert!(!state.cancel_subscription("sub-1").await);
}
