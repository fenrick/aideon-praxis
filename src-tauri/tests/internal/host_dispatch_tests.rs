//! Host command tests through the REAL IPC dispatch pipeline.
//!
//! These cross the same seam a renderer crosses — `invoke(command, { request })`
//! routed through `generate_handler!` and the Tauri invoke pipeline — rather than
//! calling the command function directly. They prove routing, body→`IpcRequest`
//! deserialisation, command execution, and envelope serialisation as one path.
//! (Per-window capability denial is NOT exercised here: `mock_context` does not
//! load the real capability set — that decision is Tier-2 / spike #329.)

use aideon_chrona::TemporalEngine;
use serde_json::{Value, json};
use tauri::ipc::{CallbackFn, InvokeBody};
use tauri::test::{INVOKE_KEY, get_ipc_response, mock_builder, mock_context, noop_assets};
use tauri::webview::InvokeRequest;
use tauri::{App, WebviewWindow, WebviewWindowBuilder};

use crate::worker::WorkerState;

fn invoke_url() -> tauri::Url {
    if cfg!(any(windows, target_os = "android")) {
        "http://tauri.localhost"
    } else {
        "tauri://localhost"
    }
    .parse()
    .expect("invoke url")
}

/// Build a mock app that registers the M0 host commands and manages a real
/// `WorkerState`, plus a `main` webview to dispatch against.
async fn dispatch_app() -> (
    App<tauri::test::MockRuntime>,
    WebviewWindow<tauri::test::MockRuntime>,
) {
    let engine = TemporalEngine::new().await.expect("engine init");
    let state = WorkerState::new(engine);
    let app = mock_builder()
        .invoke_handler(tauri::generate_handler![
            crate::health::system_worker_health
        ])
        .manage(state)
        .build(mock_context(noop_assets()))
        .expect("build mock app");
    let webview = WebviewWindowBuilder::new(&app, "main", Default::default())
        .build()
        .expect("build webview");
    (app, webview)
}

/// Dispatch a command the way the renderer does: `invoke(cmd, { request: { requestId, payload } })`.
fn dispatch(
    webview: &WebviewWindow<tauri::test::MockRuntime>,
    cmd: &str,
    payload: Value,
) -> Result<Value, Value> {
    let response = get_ipc_response(
        webview,
        InvokeRequest {
            cmd: cmd.to_string(),
            callback: CallbackFn(0),
            error: CallbackFn(1),
            url: invoke_url(),
            body: InvokeBody::Json(json!({ "request": { "requestId": "d1", "payload": payload } })),
            headers: Default::default(),
            invoke_key: INVOKE_KEY.to_string(),
        },
    );
    response.map(|body| body.deserialize::<Value>().expect("deserialize ok body"))
}

#[tokio::test]
async fn worker_health_round_trips_through_real_ipc_dispatch() {
    let (_app, webview) = dispatch_app().await;

    let value = dispatch(&webview, "system_worker_health", json!({})).expect("dispatch ok");

    // The renderer-facing envelope, produced by the real invoke pipeline.
    assert_eq!(value["status"], "ok");
    assert_eq!(value["requestId"], "d1");
    assert!(
        value.get("result").is_some(),
        "health result present: {value}"
    );
}

#[tokio::test]
async fn unknown_command_is_rejected_by_dispatch() {
    let (_app, webview) = dispatch_app().await;

    // Only reachable through real dispatch — a direct fn call cannot test routing.
    let error = dispatch(&webview, "command_that_does_not_exist", json!({}))
        .expect_err("unknown command must be rejected, not silently succeed");

    assert!(!error.is_null(), "rejection carries a reason: {error}");
}

#[tokio::test]
async fn malformed_request_body_is_rejected_by_dispatch() {
    let (_app, webview) = dispatch_app().await;

    // Body missing the `request` envelope the command expects — the boundary must
    // reject it (deserialisation error), not run the command on garbage.
    let response = get_ipc_response(
        &webview,
        InvokeRequest {
            cmd: "system_worker_health".to_string(),
            callback: CallbackFn(0),
            error: CallbackFn(1),
            url: invoke_url(),
            body: InvokeBody::Json(json!({ "unexpected": "shape" })),
            headers: Default::default(),
            invoke_key: INVOKE_KEY.to_string(),
        },
    );

    assert!(
        response.is_err(),
        "malformed body must fail at the boundary, got ok: {response:?}"
    );
}
