//! M0 workspace-lifecycle commands through the REAL IPC dispatch seam.
//! Behaviour is asserted at the boundary a renderer crosses, not by calling the
//! command functions directly.

use serde_json::{Value, json};
use tauri::ipc::{CallbackFn, InvokeBody};
use tauri::test::{
    INVOKE_KEY, MockRuntime, get_ipc_response, mock_builder, mock_context, noop_assets,
};
use tauri::webview::InvokeRequest;
use tauri::{App, WebviewWindow, WebviewWindowBuilder};
use tempfile::TempDir;

use super::WorkspaceManager;

fn invoke_url() -> tauri::Url {
    if cfg!(any(windows, target_os = "android")) {
        "http://tauri.localhost"
    } else {
        "tauri://localhost"
    }
    .parse()
    .expect("invoke url")
}

fn lifecycle_app() -> (App<MockRuntime>, WebviewWindow<MockRuntime>) {
    let app = mock_builder()
        .invoke_handler(tauri::generate_handler![
            super::workspace_create,
            super::workspace_open,
            super::workspace_status,
            super::workspace_close
        ])
        .manage(WorkspaceManager::default())
        .build(mock_context(noop_assets()))
        .expect("build mock app");
    let webview = WebviewWindowBuilder::new(&app, "main", Default::default())
        .build()
        .expect("build webview");
    (app, webview)
}

/// Dispatch like the renderer: `invoke(cmd, { request: { requestId, payload } })`.
fn dispatch(
    webview: &WebviewWindow<MockRuntime>,
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
            body: InvokeBody::Json(json!({ "request": { "requestId": "w1", "payload": payload } })),
            headers: Default::default(),
            invoke_key: INVOKE_KEY.to_string(),
        },
    );
    response.map(|body| body.deserialize::<Value>().expect("deserialize body"))
}

#[tokio::test]
async fn create_then_status_round_trips_through_dispatch() {
    let dir = TempDir::new().unwrap();
    let (_app, webview) = lifecycle_app();
    let root = dir.path().to_string_lossy().to_string();

    let created =
        dispatch(&webview, "workspace_create", json!({ "root": root })).expect("create ok");
    assert_eq!(created["status"], "ok");
    let workspace_id = created["result"]["workspaceId"]
        .as_str()
        .expect("workspaceId")
        .to_string();
    assert_eq!(
        created["result"]["foundationRebuildHash"]
            .as_str()
            .map(str::len),
        Some(64),
        "proof-carrying foundation hash present"
    );

    // status reads the same open workspace back over the boundary.
    let status = dispatch(&webview, "workspace_status", json!({})).expect("status ok");
    assert_eq!(status["status"], "ok");
    assert_eq!(status["result"]["workspaceId"], workspace_id);
}

#[tokio::test]
async fn status_with_no_open_workspace_is_an_honest_error() {
    let (_app, webview) = lifecycle_app();

    let status = dispatch(&webview, "workspace_status", json!({})).expect("envelope returned");
    assert_eq!(status["status"], "error");
    assert_eq!(status["error"]["code"], "workspace_not_open");
}

#[tokio::test]
async fn opening_a_missing_workspace_maps_to_workspace_not_found() {
    let dir = TempDir::new().unwrap();
    let missing = dir.path().join("does-not-exist");
    let (_app, webview) = lifecycle_app();

    let opened = dispatch(
        &webview,
        "workspace_open",
        json!({ "root": missing.to_string_lossy() }),
    )
    .expect("envelope returned");
    assert_eq!(opened["status"], "error");
    assert_eq!(opened["error"]["code"], "workspace_not_found");
}

#[tokio::test]
async fn close_then_status_reports_no_open_workspace() {
    let dir = TempDir::new().unwrap();
    let (_app, webview) = lifecycle_app();
    let root = dir.path().to_string_lossy().to_string();

    dispatch(&webview, "workspace_create", json!({ "root": root })).expect("create ok");
    dispatch(&webview, "workspace_close", json!({})).expect("close ok");

    let status = dispatch(&webview, "workspace_status", json!({})).expect("envelope returned");
    assert_eq!(status["status"], "error");
    assert_eq!(status["error"]["code"], "workspace_not_open");
}
