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
