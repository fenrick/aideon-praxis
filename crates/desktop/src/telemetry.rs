use crate::ipc::HostError;
use serde_json::json;
use std::time::Duration;

pub fn command_invoked(command: &str, correlation_id: &str) {
    crate::log_event!(
        severity = 6,
        component = "core",
        event = "command_invoked",
        message = "Command invocation received",
        correlation_id = correlation_id,
        metadata = json!({
            "command": command
        })
    );
}

pub fn command_completed(command: &str, correlation_id: &str, duration: Duration) {
    crate::log_event!(
        severity = 6,
        component = "core",
        event = "command_completed",
        message = "Command completed successfully",
        correlation_id = correlation_id,
        metadata = json!({
            "command": command,
            "duration_ms": duration.as_millis()
        })
    );
}

pub fn command_failed(
    command: &str,
    correlation_id: &str,
    error: &HostError,
    duration: Option<Duration>,
) {
    let mut payload = json!({
        "command": command,
        "error.kind": error.code,
        "error.message": error.message,
    });
    if let Some(duration) = duration {
        payload
            .as_object_mut()
            .unwrap()
            .insert("duration_ms".to_string(), json!(duration.as_millis()));
    }

    crate::log_event!(
        severity = 3,
        component = "core",
        event = "command_failed",
        message = "Command failed",
        correlation_id = correlation_id,
        metadata = payload
    );
}

pub fn job_started(job: &str, correlation_id: &str) {
    crate::log_event!(
        severity = 6,
        component = "core",
        event = "job_started",
        message = "Background job started",
        correlation_id = correlation_id,
        metadata = json!({ "job": job })
    );
}

pub fn job_completed(job: &str, correlation_id: &str, duration: Duration) {
    crate::log_event!(
        severity = 6,
        component = "core",
        event = "job_completed",
        message = "Background job completed",
        correlation_id = correlation_id,
        metadata = json!({
            "job": job,
            "duration_ms": duration.as_millis()
        })
    );
}

pub fn job_failed(job: &str, correlation_id: &str, kind: &str, message: &str) {
    crate::log_event!(
        severity = 3,
        component = "core",
        event = "job_failed",
        message = "Background job failed",
        correlation_id = correlation_id,
        metadata = json!({
            "job": job,
            "error.kind": kind,
            "error.message": message
        })
    );
}
