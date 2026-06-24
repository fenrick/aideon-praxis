//! Shape guards for the accepted-work envelopes. The behavioural proof (rebuild
//! runs as accepted work and readiness carries the foundation hash) lives in the
//! Tier-1 dispatch test; these pin the contract shapes the renderer relies on.

use super::*;

#[test]
fn accepted_rebuild_job_carries_class_and_ledger_ref() {
    let job = AcceptedJob::rebuild(
        "run_1".to_string(),
        "corr_1".to_string(),
        "2026-01-01T00:00:00Z".to_string(),
    );
    assert_eq!(job.queue_class, WorkQueueClass::Rebuild);
    assert_eq!(job.idempotency_key, "corr_1");
    assert_eq!(job.ledger_ref, "ops/runs/run_1/run.json");
}

#[test]
fn readiness_event_is_an_integrity_claim_with_the_hash_attached() {
    let event = WorkspaceReadinessEvent::read_write(
        "ws".to_string(),
        "job".to_string(),
        "a".repeat(64),
        "gen".to_string(),
        "corr".to_string(),
    );
    assert_eq!(event.readiness, "read_write");
    assert_eq!(event.foundation_rebuild_hash.len(), 64);
    assert_eq!(event.job_id, "job");
    assert_eq!(event.correlation_id, "corr");
}
