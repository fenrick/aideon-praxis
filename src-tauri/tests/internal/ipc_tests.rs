use super::*;
use serde_json::json;

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
fn ipc_response_err_serializes_stable_error_envelope() {
    let response: IpcResponse<()> = IpcResponse::err("req-2", HostError::invalid_input("bad"));
    let value = serde_json::to_value(&response).expect("serialize IpcResponse");
    assert_eq!(
        value,
        json!({
            "requestId": "req-2",
            "status": "error",
            "error": {
                "code": "invalid_input",
                "message": "bad",
                "details": {}
            }
        })
    );
}
