use crate::ipc::{HostError, IpcRequest, IpcResponse};
use crate::logging::LoggingContextDto;
use crate::logging::get_logging_context;
use crate::metrics::{
    MetricsSnapshot, record_command_duration, record_command_failure, record_job_duration,
    record_job_failure, snapshot,
};
use serde_json::json;
use std::future::Future;
use std::time::{Duration, Instant};

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
    record_command_duration(command, duration);
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
    record_command_failure(command);
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
    record_job_duration(job, duration);
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
    record_job_failure(job);
}

pub async fn record_command<FutureType, Value>(
    command: &str,
    correlation_id: &str,
    future: FutureType,
) -> Result<Value, HostError>
where
    FutureType: Future<Output = Result<Value, HostError>>,
{
    command_invoked(command, correlation_id);
    let started = Instant::now();
    match future.await {
        Ok(value) => {
            command_completed(command, correlation_id, started.elapsed());
            Ok(value)
        }
        Err(error) => {
            command_failed(command, correlation_id, &error, Some(started.elapsed()));
            Err(error)
        }
    }
}

/// The one command envelope: unpack the request, stamp `correlation_id` +
/// telemetry, run the handler, wrap success, and map errors to the stable IPC
/// envelope. Every host command delegates through this so envelope behaviour
/// lives in one place. Internal/unclassified errors are redacted on the way
/// out; known domain errors keep their stable code and safe message.
pub async fn command_envelope<Req, Res, F, Fut>(
    command: &'static str,
    request: IpcRequest<Req>,
    handler: F,
) -> IpcResponse<Res>
where
    F: FnOnce(Req) -> Fut,
    Fut: Future<Output = Result<Res, HostError>>,
{
    let correlation_id = request.request_id.clone();
    // Validate traceparent before the handler runs (ADR-0019). Invalid values
    // return an envelope error; the raw value is not echoed back.
    if let Err(err) = request.validate_traceparent() {
        return IpcResponse::err(correlation_id, err);
    }
    match record_command(command, &correlation_id, handler(request.payload)).await {
        Ok(payload) => IpcResponse::ok(correlation_id, payload),
        // `record_command` has already logged the raw error; redact before it
        // crosses the boundary so internal detail never reaches the renderer.
        Err(error) => IpcResponse::err(correlation_id, redact_external(error)),
    }
}

/// Stable, non-sensitive message returned for internal/unclassified errors.
const INTERNAL_ERROR_MESSAGE: &str = "An internal error occurred.";

/// Redact an error for the renderer. Known, user-actionable errors keep their
/// stable code and safe message; internal/unclassified errors keep their code
/// but get a generic message — the raw detail stays in the logs only.
fn redact_external(error: HostError) -> HostError {
    if error.code == "INTERNAL_ERROR" {
        HostError::new(error.code, INTERNAL_ERROR_MESSAGE)
    } else {
        error
    }
}

pub async fn respond_with_request<P, ResultType, Handler, HandlerFuture>(
    command: &'static str,
    request: IpcRequest<P>,
    handler: Handler,
) -> Result<IpcResponse<ResultType>, HostError>
where
    Handler: FnOnce(P) -> HandlerFuture,
    HandlerFuture: Future<Output = Result<ResultType, HostError>>,
{
    Ok(command_envelope(command, request, handler).await)
}

#[tauri::command]
#[specta::specta]
pub fn system_logging_context() -> std::result::Result<LoggingContextDto, String> {
    command_invoked("system_logging_context", "logging_context");
    let start = Instant::now();
    let result = get_logging_context();
    match &result {
        Ok(_) => command_completed("system_logging_context", "logging_context", start.elapsed()),
        Err(err) => command_failed(
            "system_logging_context",
            "logging_context",
            &HostError::internal(err.clone()),
            Some(start.elapsed()),
        ),
    }
    result
}

#[tauri::command]
#[specta::specta]
pub fn system_metrics_snapshot() -> MetricsSnapshot {
    command_invoked("system_metrics_snapshot", "metrics");
    let start = Instant::now();
    let snapshot = snapshot();
    command_completed("system_metrics_snapshot", "metrics", start.elapsed());
    snapshot
}

#[cfg(test)]
#[path = "../tests/internal/logging_bridge_e2e.rs"]
mod logging_bridge_e2e;

#[cfg(test)]
mod telemetry_tests {
    use super::*;
    use crate::ipc::IpcRequest;
    use serde_json::Value;
    use serial_test::serial;

    #[tokio::test]
    async fn respond_with_request_wraps_success() {
        let request = IpcRequest {
            request_id: "req-ok".to_string(),
            traceparent: None,
            payload: "payload".to_string(),
        };

        let response = respond_with_request::<String, usize, _, _>(
            "telemetry_success",
            request,
            |payload: String| async move { Ok::<usize, HostError>(payload.len()) },
        )
        .await
        .expect("should complete");

        assert_eq!(response.status, "ok");
        assert_eq!(response.result, Some(7));
    }

    #[tokio::test]
    async fn command_envelope_wraps_success_and_echoes_request_id() {
        let request = IpcRequest {
            request_id: "req-1".to_string(),
            traceparent: None,
            payload: "payload".to_string(),
        };

        let response: IpcResponse<usize> =
            command_envelope("envelope_success", request, |payload: String| async move {
                Ok::<usize, HostError>(payload.len())
            })
            .await;

        assert_eq!(response.status, "ok");
        assert_eq!(response.result, Some(7));
        assert_eq!(response.request_id, "req-1");
    }

    #[tokio::test]
    async fn command_envelope_preserves_known_domain_error() {
        let request = IpcRequest {
            request_id: "req-e".to_string(),
            traceparent: None,
            payload: (),
        };

        let response: IpcResponse<()> =
            command_envelope("envelope_known_err", request, |_: ()| async move {
                Err::<(), HostError>(HostError::invalid_time("as_of is in the future"))
            })
            .await;

        assert_eq!(response.status, "error");
        let error = response.error.expect("error payload");
        assert_eq!(error.code, "INVALID_TIME");
        // Known, user-actionable error: message preserved, never redacted.
        assert_eq!(error.detail, "as_of is in the future");
    }

    #[tokio::test]
    async fn command_envelope_redacts_internal_error_message() {
        let request = IpcRequest {
            request_id: "req-i".to_string(),
            traceparent: None,
            payload: (),
        };

        let response: IpcResponse<()> =
            command_envelope("envelope_internal", request, |_: ()| async move {
                Err::<(), HostError>(HostError::internal(
                    "sqlite error at /Users/secret/db.sqlite: disk I/O failed",
                ))
            })
            .await;

        assert_eq!(response.status, "error");
        let error = response.error.expect("error payload");
        assert_eq!(error.code, "INTERNAL_ERROR");
        // Raw internal detail must not reach the renderer.
        assert!(
            !error.detail.contains("/Users/secret"),
            "leaked path: {}",
            error.detail
        );
        assert!(
            !error.detail.contains("sqlite"),
            "leaked detail: {}",
            error.detail
        );
        // A stable, safe, generic message instead.
        assert_eq!(error.detail, "An internal error occurred.");
    }

    #[tokio::test]
    async fn respond_with_request_wraps_failure() {
        let request = IpcRequest {
            request_id: "req-err".to_string(),
            traceparent: None,
            payload: (),
        };

        let response =
            respond_with_request::<(), (), _, _>(
                "telemetry_failure",
                request,
                |_payload: ()| async move {
                    Err::<(), HostError>(HostError::invalid_input("bad payload"))
                },
            )
            .await
            .expect("should return envelope");

        assert_eq!(response.status, "error");
        let error = response.error.expect("error payload");
        assert_eq!(error.code, "INVALID_INPUT");
    }

    #[tokio::test]
    async fn record_command_propagates_successful_result() {
        let result =
            record_command::<_, i32>("record_success", "corr-id", async { Ok(32i32) }).await;
        assert_eq!(result.unwrap(), 32);
    }

    #[tokio::test]
    async fn record_command_propagates_error() {
        let err = record_command::<_, ()>("record_failure", "corr-id", async {
            Err::<(), HostError>(HostError::internal("boom"))
        })
        .await
        .unwrap_err();

        assert_eq!(err.code, "INTERNAL_ERROR");
    }

    #[test]
    #[serial(logtest)]
    fn telemetry_logging_records_milestones() {
        let mut logger = super::logging_bridge_e2e::start_logger_once();
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

        // logtest captures the global log facade; under parallel test runs other tests can
        // interleave records. Drain everything this logger saw and keep only the events this
        // test emitted (unique command/job names), preserving emission order.
        let mut payloads = Vec::new();
        while let Some(record) = logger.pop() {
            let Ok(payload) = serde_json::from_str::<Value>(record.args()) else {
                continue;
            };
            if payload["command"] == "setup:init" || payload["job"] == "backend_setup" {
                payloads.push(payload);
            }
        }
        assert_eq!(
            payloads.len(),
            6,
            "expected six telemetry milestones, captured {}",
            payloads.len()
        );

        assert_eq!(payloads[0]["event_name"], "command_invoked");
        assert_eq!(payloads[0]["component"], "core");
        assert_eq!(payloads[1]["event_name"], "command_completed");
        assert!(payloads[1]["duration_ms"].is_number());
        assert_eq!(payloads[2]["event_name"], "command_failed");
        assert_eq!(payloads[2]["error.kind"], "INTERNAL_ERROR");
        assert_eq!(payloads[2]["error.message"], "failing to migrate");

        assert_eq!(payloads[3]["event_name"], "job_started");
        assert_eq!(payloads[3]["job"], "backend_setup");
        assert_eq!(payloads[4]["event_name"], "job_completed");
        assert!(payloads[4]["duration_ms"].is_number());
        assert_eq!(payloads[5]["event_name"], "job_failed");
        assert_eq!(payloads[5]["error.kind"], "migration_error");
    }
}
