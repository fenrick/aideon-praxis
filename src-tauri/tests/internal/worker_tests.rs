use super::WorkerState;
use aideon_chrona::TemporalEngine;

#[tokio::test]
async fn worker_state_health_is_ok() {
    let engine = TemporalEngine::new().await.expect("engine");
    let state = WorkerState::new(engine);
    let health = state.health();
    assert!(health.ok);
    assert!(health.timestamp_ms > 0);
}
