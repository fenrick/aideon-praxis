use crate::ipc::{HostError, IpcRequest};
use crate::telemetry::{
    command_completed, command_envelope, command_failed, command_invoked, job_completed,
    job_failed, job_started,
};
use logtest::Logger;
use serde_json::Value;
use serial_test::serial;
use std::sync::OnceLock;
use std::time::Duration;

/// Initialize logtest exactly once for the process.
///
/// `log::set_logger` is permanent — calling `Logger::start()` a second time
/// panics. All logtest tests share this handle so only the first call
/// sets the global logger; subsequent callers construct the unit-struct handle
/// directly (logtest stores events in a global queue, not the handle).
pub(super) fn start_logger_once() -> Logger {
    static INIT: OnceLock<()> = OnceLock::new();
    INIT.get_or_init(|| {
        Logger::start();
    });
    // Logger is a unit struct — constructing it directly reuses the already-
    // registered global logger without calling set_logger again.
    Logger
}

/// Drain log records from `logger`, keeping only entries that match `keep`.
/// Stops when it has collected `count` matching entries or has consumed
/// `guard * count` records without reaching the target (avoid infinite spin).
fn drain_filtered(logger: &mut Logger, count: usize, keep: impl Fn(&Value) -> bool) -> Vec<Value> {
    let mut out = Vec::with_capacity(count);
    let mut scanned = 0usize;
    let limit = count.max(1) * 64;
    while out.len() < count && scanned < limit {
        match logger.pop() {
            Some(record) => {
                scanned += 1;
                if let Ok(payload) = serde_json::from_str::<Value>(record.args())
                    && keep(&payload)
                {
                    out.push(payload);
                }
            }
            None => break,
        }
    }
    out
}

// Use names that are unique across the test suite so parallel test runs
// cannot interleave records from the inline `telemetry_tests` module with
// records from these E2E tests.
const BRIDGE_CMD: &str = "e2e:bridge_init";
const BRIDGE_JOB: &str = "e2e_bridge_worker";
const LC_CMD: &str = "e2e:lc_rebuild";
const LC_JOB: &str = "e2e_lc_worker";

#[test]
#[serial(logtest)]
fn telemetry_bridge_records_milestones() {
    let mut logger = start_logger_once();

    command_invoked(BRIDGE_CMD, "corr-id");
    command_completed(BRIDGE_CMD, "corr-id", Duration::from_millis(312));
    let error = HostError::internal("failing to migrate");
    command_failed(
        BRIDGE_CMD,
        "corr-id",
        &error,
        Some(Duration::from_millis(19)),
    );

    job_started(BRIDGE_JOB, "corr-id");
    job_completed(BRIDGE_JOB, "corr-id", Duration::from_millis(120));
    job_failed(
        BRIDGE_JOB,
        "corr-id",
        "migration_error",
        "migration aborted",
    );

    let payloads = drain_filtered(&mut logger, 6, |p| {
        p["command"] == BRIDGE_CMD || p["job"] == BRIDGE_JOB
    });
    assert_eq!(
        payloads.len(),
        6,
        "expected six telemetry milestones, captured {}",
        payloads.len()
    );

    assert_eq!(payloads[0]["event_name"], "command_invoked");
    // Per-command lifecycle is DEBUG (severity 7); failures remain ERROR.
    assert_eq!(payloads[0]["syslog.severity"], 7);
    assert_eq!(payloads[0]["component"], "core");

    assert_eq!(payloads[1]["event_name"], "command_completed");
    assert!(payloads[1]["duration_ms"].is_number());
    assert_eq!(payloads[1]["correlation_id"], "corr-id");

    assert_eq!(payloads[2]["event_name"], "command_failed");
    assert_eq!(payloads[2]["error.kind"], "INTERNAL_ERROR");
    assert_eq!(payloads[2]["error.message"], "failing to migrate");

    assert_eq!(payloads[3]["event_name"], "job_started");
    assert_eq!(payloads[3]["job"], BRIDGE_JOB);

    assert_eq!(payloads[4]["event_name"], "job_completed");
    assert!(payloads[4]["duration_ms"].is_number());

    assert_eq!(payloads[5]["event_name"], "job_failed");
    assert_eq!(payloads[5]["error.kind"], "migration_error");
    assert_eq!(payloads[5]["error.message"], "migration aborted");
}

// ── M0 correlation-id baseline proofs (#367) ─────────────────────────────────

/// Prove that every telemetry event in a lifecycle workflow carries the
/// same `correlation_id`, so a consumer can reconstruct the full trace by
/// filtering on that single field (ADR-0019 §13 release gate).
#[test]
#[serial(logtest)]
fn lifecycle_workflow_log_entries_all_share_correlation_id() {
    let mut logger = start_logger_once();
    let cid = "lifecycle-cid-01";

    // Simulate: host receives command → spawns job → job completes → command done.
    command_invoked(LC_CMD, cid);
    job_started(LC_JOB, cid);
    job_completed(LC_JOB, cid, Duration::from_millis(45));
    command_completed(LC_CMD, cid, Duration::from_millis(50));

    let entries = drain_filtered(&mut logger, 4, |p| {
        p["command"] == LC_CMD || p["job"] == LC_JOB
    });
    assert_eq!(
        entries.len(),
        4,
        "expected 4 lifecycle entries, got {}",
        entries.len()
    );

    for (i, entry) in entries.iter().enumerate() {
        assert_eq!(
            entry["correlation_id"],
            cid,
            "entry {i} ({event}) should carry correlation_id {cid}",
            event = entry["event_name"]
        );
    }
    // Entries arrive in emission order — verify the ordering is preserved.
    assert_eq!(entries[0]["event_name"], "command_invoked");
    assert_eq!(entries[1]["event_name"], "job_started");
    assert_eq!(entries[2]["event_name"], "job_completed");
    assert_eq!(entries[3]["event_name"], "command_completed");
}

/// Prove that when a workflow fails, the RFC-9457 error envelope carries
/// the same `correlation_id` (= `requestId`) as the originating request.
#[tokio::test]
async fn failed_workflow_error_envelope_carries_request_correlation_id() {
    let request = IpcRequest {
        request_id: "req-fail-01".to_string(),
        traceparent: None,
        idempotency_key: None,
        payload: (),
    };
    let response: crate::ipc::IpcResponse<()> =
        command_envelope("workspace:rebuild", request, |_| async {
            Err::<(), HostError>(HostError::internal("rebuild aborted"))
        })
        .await;

    assert_eq!(response.status, "error");
    let err = response.error.expect("error present on failed workflow");
    assert_eq!(
        err.correlation_id, "req-fail-01",
        "RFC-9457 correlationId must match the originating requestId"
    );
}
