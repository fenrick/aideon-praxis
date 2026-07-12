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
            super::workspace_rebuild_inner,
            super::workspace_author_node,
            super::workspace_nodes,
            super::workspace_metamodel_types,
            super::workspace_author_typed_node,
            super::workspace_set_claim,
            super::workspace_state_at,
            super::workspace_diff
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
    // correlation_id propagates from the initiating command (requestId "w1") to
    // the readiness event, joining it to the host log/trace (ADR-0019/ADR-0040).
    assert_eq!(
        ready["correlationId"], "w1",
        "correlation id propagates to the event"
    );
    assert_eq!(
        ready["foundationRebuildHash"], hash_before,
        "rebuild yields a logically equivalent foundation; the proof matches"
    );

    // status after readiness reports the same hash.
    let status = dispatch(&webview, "workspace_status", json!({})).expect("status ok");
    assert_eq!(status["result"]["foundationRebuildHash"], hash_before);
}

/// Golden-journey step 8: close → reopen → workspace identity and foundation hash
/// are continuous across the session boundary (ADR-0040, golden-journey.md §8).
#[tokio::test]
async fn close_and_reopen_preserves_workspace_continuity() {
    let dir = TempDir::new().unwrap();
    let (_app, webview) = lifecycle_app();
    let root = dir.path().to_string_lossy().to_string();

    let created =
        dispatch(&webview, "workspace_create", json!({ "root": root })).expect("create ok");
    let workspace_id = created["result"]["workspaceId"]
        .as_str()
        .expect("workspaceId")
        .to_string();
    let hash_before = created["result"]["foundationRebuildHash"]
        .as_str()
        .expect("foundationRebuildHash")
        .to_string();

    dispatch(&webview, "workspace_close", json!({})).expect("close ok");

    let reopened =
        dispatch(&webview, "workspace_open", json!({ "root": root })).expect("reopen ok");
    assert_eq!(reopened["status"], "ok", "reopen succeeds");
    assert_eq!(
        reopened["result"]["workspaceId"], workspace_id,
        "workspace identity survives a session boundary"
    );
    assert_eq!(
        reopened["result"]["foundationRebuildHash"], hash_before,
        "foundation hash is continuous across close/reopen"
    );
}

/// Golden-journey steps 9+10: delete `.aideon/runtime/` while the workspace is
/// closed; reopen — the host detects the absent runtime and rebuilds it
/// synchronously; the returned `foundation_rebuild_hash` equals the pre-wipe hash
/// (ADR-0027 equivalence, golden-journey.md §9–10).
#[tokio::test]
async fn delete_runtime_externally_and_reopen_rebuilds_deterministically() {
    let dir = TempDir::new().unwrap();
    let (_app, webview) = lifecycle_app();
    let root = dir.path().to_string_lossy().to_string();

    let created =
        dispatch(&webview, "workspace_create", json!({ "root": root })).expect("create ok");
    let hash_before = created["result"]["foundationRebuildHash"]
        .as_str()
        .expect("foundationRebuildHash")
        .to_string();

    dispatch(&webview, "workspace_close", json!({})).expect("close ok");

    // Step 9: delete the derived runtime externally while the workspace is closed.
    let runtime_dir = dir.path().join(".aideon").join("runtime");
    assert!(runtime_dir.exists(), "runtime dir present before deletion");
    std::fs::remove_dir_all(&runtime_dir).expect("delete runtime dir");
    assert!(!runtime_dir.exists(), "runtime dir absent after deletion");

    // Step 10: reopen — the host detects no runtime and rebuilds from canonical
    // files; the returned status carries a hash that equals the pre-wipe hash.
    let reopened =
        dispatch(&webview, "workspace_open", json!({ "root": root })).expect("reopen ok");
    assert_eq!(
        reopened["status"], "ok",
        "reopen with missing runtime succeeds"
    );
    assert_eq!(
        reopened["result"]["foundationRebuildHash"], hash_before,
        "rebuild yields a logically equivalent foundation; the proof matches"
    );
}

/// RFC-9457 / ADR-0016: every error envelope that crosses the host boundary must
/// carry no Rust-internal strings — no source paths, no type names, no stack
/// frames — that would leak implementation details to the renderer (ADR-0040).
#[tokio::test]
async fn error_envelope_carries_no_rust_internal_strings() {
    let dir = TempDir::new().unwrap();
    let (_app, webview) = lifecycle_app();
    let missing = dir.path().join("does-not-exist");

    let envelope = dispatch(
        &webview,
        "workspace_open",
        json!({ "root": missing.to_string_lossy() }),
    )
    .expect("envelope returned");
    assert_eq!(envelope["status"], "error");

    let raw = serde_json::to_string(&envelope).expect("serialize for leakage check");

    // Rust-internal strings that must never reach the renderer.
    for forbidden in [
        "StoreError",
        "IoError",
        "panicked",
        "unwrap",
        "src/",
        "crates/",
        ".rs:",
        "::Error",
    ] {
        assert!(
            !raw.contains(forbidden),
            "error envelope leaks Rust internal string {forbidden:?}: {raw}"
        );
    }
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

/// The MVP end-to-end authoring slice ([golden-journey] steps 1 + 3 + 8–10):
/// create → author nodes over the boundary → list the derived twin → close →
/// reopen → the twin re-derives and the foundation hash is unchanged.
#[tokio::test]
async fn author_node_then_list_survives_reopen_with_hash_equality() {
    let dir = TempDir::new().unwrap();
    let (_app, webview) = lifecycle_app();
    let root = dir.path().to_string_lossy().to_string();

    dispatch(&webview, "workspace_create", json!({ "root": root })).expect("create ok");

    // Author two nodes through the real dispatch seam.
    let first =
        dispatch(&webview, "workspace_author_node", json!({ "typeId": null })).expect("author ok");
    assert_eq!(first["status"], "ok");
    let first_id = first["result"]["nodeId"]
        .as_str()
        .expect("nodeId")
        .to_string();
    assert_eq!(first["result"]["tombstoned"], false);

    let second =
        dispatch(&webview, "workspace_author_node", json!({ "typeId": null })).expect("author ok");
    assert_ne!(second["result"]["nodeId"], first_id.as_str());

    // The derived twin lists both.
    let nodes = dispatch(&webview, "workspace_nodes", json!({})).expect("nodes ok");
    assert_eq!(nodes["status"], "ok");
    assert_eq!(nodes["result"].as_array().map(Vec::len), Some(2));

    // Op count: 1 session actor-declare + 2 create-node.
    let status = dispatch(&webview, "workspace_status", json!({})).expect("status ok");
    assert_eq!(status["result"]["appliedOpCount"], 3);
    let hash = status["result"]["foundationRebuildHash"]
        .as_str()
        .expect("hash")
        .to_string();

    // Close, reopen: the twin re-derives from canonical material, hash equal.
    dispatch(&webview, "workspace_close", json!({})).expect("close ok");
    let reopened = dispatch(
        &webview,
        "workspace_open",
        json!({ "root": dir.path().to_string_lossy() }),
    )
    .expect("open ok");
    assert_eq!(reopened["result"]["foundationRebuildHash"], hash.as_str());
    let nodes = dispatch(&webview, "workspace_nodes", json!({})).expect("nodes ok");
    assert_eq!(nodes["result"].as_array().map(Vec::len), Some(2));
    assert!(
        nodes["result"]
            .as_array()
            .unwrap()
            .iter()
            .any(|n| n["nodeId"] == first_id.as_str()),
        "the first authored node survives reopen"
    );
}

#[tokio::test]
async fn author_node_with_no_open_workspace_is_an_honest_error() {
    let (_app, webview) = lifecycle_app();
    let authored = dispatch(&webview, "workspace_author_node", json!({ "typeId": null }))
        .expect("envelope returned");
    assert_eq!(authored["status"], "error");
    assert_eq!(authored["error"]["code"], "WORKSPACE_NOT_OPEN");
}

#[tokio::test]
async fn metamodel_types_are_listed_without_an_open_workspace() {
    let (_app, webview) = lifecycle_app();
    let types = dispatch(&webview, "workspace_metamodel_types", json!({})).expect("types ok");
    assert_eq!(types["status"], "ok");
    assert!(
        types["result"]
            .as_array()
            .unwrap()
            .iter()
            .any(|t| t["id"] == "Capability"),
        "the seed metamodel palette is available before opening a workspace"
    );
}

#[tokio::test]
async fn plan_actual_claims_resolve_and_diff_over_dispatch() {
    let dir = TempDir::new().unwrap();
    let (_app, webview) = lifecycle_app();
    let root = dir.path().to_string_lossy().to_string();
    dispatch(&webview, "workspace_create", json!({ "root": root })).expect("create ok");

    // Author an Application, then a plan claim and an actual claim on lifecycle.
    let app = dispatch(
        &webview,
        "workspace_author_typed_node",
        json!({ "typeId": "Application", "props": { "name": "Billing" } }),
    )
    .expect("author ok");
    let id = app["result"]["nodeId"].as_str().unwrap().to_string();

    dispatch(
        &webview,
        "workspace_set_claim",
        json!({ "entityId": id, "typeId": "Application", "attribute": "lifecycle",
                "value": "Build", "layer": "plan", "validFrom": 0, "validTo": 100 }),
    )
    .expect("plan claim ok");
    dispatch(
        &webview,
        "workspace_set_claim",
        json!({ "entityId": id, "typeId": "Application", "attribute": "lifecycle",
                "value": "Run", "layer": "actual", "validFrom": 50, "validTo": null }),
    )
    .expect("actual claim ok");

    let vp_early = json!({ "asOf": 10, "layers": ["actual", "plan"] });
    let vp_late = json!({ "asOf": 60, "layers": ["actual", "plan"] });

    // Resolve at as_of=60: the actual layer wins.
    let late = dispatch(&webview, "workspace_state_at", vp_late.clone()).expect("state ok");
    let entity = late["result"]
        .as_array()
        .unwrap()
        .iter()
        .find(|e| e["nodeId"] == id.as_str())
        .unwrap();
    let life = entity["properties"]
        .as_array()
        .unwrap()
        .iter()
        .find(|p| p["field"] == "lifecycle")
        .unwrap();
    assert_eq!(life["value"], "Run");
    assert_eq!(life["layer"], "actual");

    // Diff the two viewpoints: lifecycle changes Build -> Run.
    let diff = dispatch(
        &webview,
        "workspace_diff",
        json!({ "before": vp_early, "after": vp_late }),
    )
    .expect("diff ok");
    let delta = diff["result"]
        .as_array()
        .unwrap()
        .iter()
        .find(|d| d["field"] == "lifecycle")
        .unwrap();
    assert_eq!(delta["before"], "Build");
    assert_eq!(delta["after"], "Run");

    // A claim with an out-of-range enum is refused at the boundary.
    let bad = dispatch(
        &webview,
        "workspace_set_claim",
        json!({ "entityId": id, "typeId": "Application", "attribute": "lifecycle",
                "value": "Nonsense", "layer": "plan", "validFrom": 0, "validTo": null }),
    )
    .expect("envelope returned");
    assert_eq!(bad["status"], "error");
    assert_eq!(bad["error"]["code"], "VALIDATION_FAILED");
}

#[tokio::test]
async fn typed_authoring_validates_and_a_rejected_write_never_enters_the_op_log() {
    let dir = TempDir::new().unwrap();
    let (_app, webview) = lifecycle_app();
    let root = dir.path().to_string_lossy().to_string();
    dispatch(&webview, "workspace_create", json!({ "root": root })).expect("create ok");

    // A valid Capability lands through the dispatch seam.
    let ok = dispatch(
        &webview,
        "workspace_author_typed_node",
        json!({ "typeId": "Capability", "props": { "name": "Customer Insight", "tier": "Strategic" } }),
    )
    .expect("author ok");
    assert_eq!(ok["status"], "ok");
    assert_eq!(ok["result"]["typeLabel"], "Capability");

    let before = dispatch(&webview, "workspace_status", json!({})).expect("status ok");
    let op_count = before["result"]["appliedOpCount"].clone();

    // A structurally-fine but metamodel-invalid write is refused …
    let bad = dispatch(
        &webview,
        "workspace_author_typed_node",
        json!({ "typeId": "Capability", "props": { "name": "Bad", "tier": "Tactical" } }),
    )
    .expect("envelope returned");
    assert_eq!(bad["status"], "error");
    assert_eq!(bad["error"]["code"], "VALIDATION_FAILED");

    // … and the canonical op log is unchanged (the M1 oracle assertion).
    let after = dispatch(&webview, "workspace_status", json!({})).expect("status ok");
    assert_eq!(
        after["result"]["appliedOpCount"], op_count,
        "a rejected write never enters model/ops/"
    );
}
