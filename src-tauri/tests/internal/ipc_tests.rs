use super::*;
use crate::telemetry::command_envelope;
use serde_json::json;

// ── traceparent envelope contract (ADR-0019 / #370) ──────────────────────────

#[tokio::test]
async fn invalid_traceparent_returns_envelope_error_without_echoing_raw_value() {
    let request = IpcRequest {
        request_id: "tp-bad".to_string(),
        traceparent: Some("not-w3c-format".to_string()),
        idempotency_key: None,
        payload: (),
    };
    let response: IpcResponse<()> =
        command_envelope("test_cmd", request, |_| async { Ok(()) }).await;
    assert_eq!(response.status, "error");
    let err = response.error.expect("error present");
    assert_eq!(err.code, "INVALID_TRACE_CONTEXT");
    // Raw invalid value must not be echoed back in detail or details.
    assert!(!err.detail.contains("not-w3c-format"));
    let details_str = err.details.to_string();
    assert!(!details_str.contains("not-w3c-format"));
}

#[tokio::test]
async fn valid_traceparent_proceeds_normally() {
    let request = IpcRequest {
        request_id: "tp-good".to_string(),
        traceparent: Some("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01".to_string()),
        idempotency_key: None,
        payload: (),
    };
    let response: IpcResponse<()> =
        command_envelope("test_cmd", request, |_| async { Ok(()) }).await;
    assert_eq!(response.status, "ok");
}

#[tokio::test]
async fn absent_traceparent_proceeds_normally() {
    let request = IpcRequest {
        request_id: "tp-none".to_string(),
        traceparent: None,
        idempotency_key: None,
        payload: (),
    };
    let response: IpcResponse<()> =
        command_envelope("test_cmd", request, |_| async { Ok(()) }).await;
    assert_eq!(response.status, "ok");
}

#[test]
fn traceparent_field_is_optional_in_deserialization() {
    // Envelope without traceparent field: deserializes with None.
    let without: IpcRequest<EmptyPayload> =
        serde_json::from_value(json!({ "requestId": "r1", "payload": {} }))
            .expect("decode without traceparent");
    assert!(without.traceparent.is_none());

    // Envelope with traceparent field: deserializes with Some.
    let with_tp: IpcRequest<EmptyPayload> = serde_json::from_value(json!({
        "requestId": "r2",
        "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
        "payload": {}
    }))
    .expect("decode with traceparent");
    assert!(with_tp.traceparent.is_some());
}

// ── original IPC tests ────────────────────────────────────────────────────────

#[test]
fn ipc_request_deserializes_camel_case_envelope() {
    let raw = json!({
        "requestId": "req-1",
        "payload": {}
    });
    let decoded: IpcRequest<EmptyPayload> = serde_json::from_value(raw).expect("decode IpcRequest");
    assert_eq!(decoded.request_id, "req-1");
}

#[test]
fn ipc_response_ok_serializes_camel_case_envelope() {
    let response = IpcResponse::ok("req-1", json!({ "value": 1 }));
    let value = serde_json::to_value(&response).expect("serialize IpcResponse");
    assert_eq!(
        value,
        json!({
            "requestId": "req-1",
            "status": "ok",
            "result": { "value": 1 }
        })
    );
}

#[test]
fn missing_snapshot_error_is_recognised() {
    // Absence of a derived snapshot is "no data yet", not a failure — one
    // shared predicate recognises it so scene + workspace don't each re-detect.
    assert!(is_missing_snapshot_error(
        "io error: No such file or directory (os error 2)"
    ));
    assert!(is_missing_snapshot_error("open failed: os error 2"));
    assert!(!is_missing_snapshot_error(
        "permission denied (os error 13)"
    ));
    assert!(!is_missing_snapshot_error("invalid utf-8 in segment"));
}

#[test]
fn ipc_response_err_serializes_rfc9457_problem_detail() {
    let response: IpcResponse<()> = IpcResponse::err("req-2", HostError::invalid_input("bad"));
    let value = serde_json::to_value(&response).expect("serialize IpcResponse");
    assert_eq!(
        value,
        json!({
            "requestId": "req-2",
            "status": "error",
            "error": {
                "type": "aideon:problem/invalid-input",
                "code": "INVALID_INPUT",
                "title": "Invalid input",
                "detail": "bad",
                "category": "validation",
                "recovery": "none",
                // The request id is the command's correlation id.
                "correlationId": "req-2",
                "details": {}
            }
        })
    );
}
