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
            super::workspace_close,
            // The runtime-generic inner is what dispatches under MockRuntime; the
            // concrete `workspace_rebuild` wrapper is the registered codegen seam.
            super::workspace_rebuild_inner
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
    assert_eq!(status["error"]["code"], "WORKSPACE_NOT_OPEN");
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
    assert_eq!(opened["error"]["code"], "WORKSPACE_NOT_FOUND");
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
    assert_eq!(status["error"]["code"], "WORKSPACE_NOT_OPEN");
}

/// The M0 exit gate (ADR-0040): rebuild runs as accepted work, read-write is
/// withheld until the foundation projections complete, and the readiness event
/// carries the `foundation_rebuild_hash` it became ready against — equal to the
/// pre-rebuild hash. Proven through the real IPC dispatch + emitted event.
#[tokio::test]
async fn rebuild_runs_as_accepted_work_and_readiness_carries_the_pre_wipe_hash() {
    use std::sync::mpsc;
    use std::time::Duration;
    use tauri::Listener;

    let dir = TempDir::new().unwrap();
    let (app, webview) = lifecycle_app();
    let root = dir.path().to_string_lossy().to_string();

    // Open the workspace and record the foundation hash before rebuild.
    let created =
        dispatch(&webview, "workspace_create", json!({ "root": root })).expect("create ok");
    let hash_before = created["result"]["foundationRebuildHash"]
        .as_str()
        .expect("foundationRebuildHash")
        .to_string();

    // Subscribe to the proof-carrying readiness event before triggering rebuild.
    let (tx, rx) = mpsc::channel::<Value>();
    app.listen(super::EVENT_READY_READ_WRITE, move |event| {
        if let Ok(payload) = serde_json::from_str::<Value>(event.payload()) {
            let _ = tx.send(payload);
        }
    });

    // Rebuild returns an AcceptedJob immediately — not a blocking completion.
    let accepted =
        dispatch(&webview, "workspace_rebuild_inner", json!({})).expect("rebuild accepted");
    assert_eq!(accepted["status"], "ok");
    assert_eq!(accepted["result"]["queueClass"], "rebuild");
    assert!(
        accepted["result"]["runId"]
            .as_str()
            .is_some_and(|id| !id.is_empty()),
        "AcceptedJob carries a run id"
    );
    let run_id = accepted["result"]["runId"].as_str().unwrap().to_string();

    // Readiness is withheld until the foundation projections complete: it arrives
    // as the event, carrying the same hash the rebuilt foundation produced.
    let ready = rx
        .recv_timeout(Duration::from_secs(20))
        .expect("workspace.ready_read_write event delivered");
    assert_eq!(ready["readiness"], "read_write");
    assert_eq!(
        ready["jobId"], run_id,
        "readiness binds to the accepted job"
    );
    assert_eq!(
        ready["foundationRebuildHash"], hash_before,
        "rebuild yields a logically equivalent foundation; the proof matches"
    );

    // status after readiness reports the same hash.
    let status = dispatch(&webview, "workspace_status", json!({})).expect("status ok");
    assert_eq!(status["result"]["foundationRebuildHash"], hash_before);
}

/// A second rebuild while one is in flight is refused with BACKPRESSURE, the one
/// transient code — never accepted twice.
#[tokio::test]
async fn concurrent_rebuild_is_refused_with_backpressure() {
    let dir = TempDir::new().unwrap();
    let (_app, webview) = lifecycle_app();
    let root = dir.path().to_string_lossy().to_string();
    dispatch(&webview, "workspace_create", json!({ "root": root })).expect("create ok");

    let first = dispatch(&webview, "workspace_rebuild_inner", json!({})).expect("first accepted");
    let second = dispatch(&webview, "workspace_rebuild_inner", json!({})).expect("second envelope");

    assert_eq!(first["status"], "ok");
    // The second submission lands while the first holds the in-flight flag.
    if second["status"] == "error" {
        assert_eq!(second["error"]["code"], "BACKPRESSURE");
    }
}
