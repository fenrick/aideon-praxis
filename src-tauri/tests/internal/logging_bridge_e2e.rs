use crate::ipc::HostError;
use crate::telemetry::{
    command_completed, command_failed, command_invoked, job_completed, job_failed, job_started,
};
use logtest::Logger;
use serde_json::Value;
use std::time::Duration;

fn drain_records(logger: &mut Logger, count: usize) -> Vec<Value> {
    let mut entries = Vec::new();
    for _ in 0..count {
        let record = logger
            .pop()
            .expect("expected log entry for telemetry milestone");
        let payload: Value =
            serde_json::from_str(record.args()).expect("structured log payload should parse");
        entries.push(payload);
    }
    entries
}

#[test]
fn telemetry_bridge_records_milestones() {
    let mut logger = Logger::start();

    command_invoked("setup:init", "corr-id");
    command_completed("setup:init", "corr-id", Duration::from_millis(312));
    let error = HostError::internal("failing to migrate");
    command_failed(
        "setup:init",
        "corr-id",
        &error,
        Some(Duration::from_millis(19)),
    );

    job_started("backend_setup", "corr-id");
    job_completed("backend_setup", "corr-id", Duration::from_millis(120));
    job_failed(
        "backend_setup",
        "corr-id",
        "migration_error",
        "migration aborted",
    );

    let payloads = drain_records(&mut logger, 6);

    assert_eq!(payloads[0]["event_name"], "command_invoked");
    assert_eq!(payloads[0]["syslog.severity"], 6);
    assert_eq!(payloads[0]["component"], "core");

    assert_eq!(payloads[1]["event_name"], "command_completed");
    assert!(payloads[1]["duration_ms"].is_number());
    assert_eq!(payloads[1]["correlation_id"], "corr-id");

    assert_eq!(payloads[2]["event_name"], "command_failed");
    assert_eq!(payloads[2]["error.kind"], "INTERNAL_ERROR");
    assert_eq!(payloads[2]["error.message"], "failing to migrate");

    assert_eq!(payloads[3]["event_name"], "job_started");
    assert_eq!(payloads[3]["job"], "backend_setup");

    assert_eq!(payloads[4]["event_name"], "job_completed");
    assert!(payloads[4]["duration_ms"].is_number());

    assert_eq!(payloads[5]["event_name"], "job_failed");
    assert_eq!(payloads[5]["error.kind"], "migration_error");
    assert_eq!(payloads[5]["error.message"], "migration aborted");
}
