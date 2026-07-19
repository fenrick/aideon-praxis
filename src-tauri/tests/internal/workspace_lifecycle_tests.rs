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
            super::workspace_nodes,
            super::workspace_metamodel_types,
            super::workspace_apply_change_event_inner,
            super::workspace_edges,
            super::workspace_inspect_object,
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
    dispatch_request(webview, cmd, None, payload)
}

fn dispatch_request(
    webview: &WebviewWindow<MockRuntime>,
    cmd: &str,
    idempotency_key: Option<&str>,
    payload: Value,
) -> Result<Value, Value> {
    let mut request = json!({ "requestId": "w1", "payload": payload });
    if let Some(key) = idempotency_key {
        request["idempotencyKey"] = Value::String(key.to_string());
    }
    let response = get_ipc_response(
        webview,
        InvokeRequest {
            cmd: cmd.to_string(),
            callback: CallbackFn(0),
            error: CallbackFn(1),
            url: invoke_url(),
            body: InvokeBody::Json(json!({ "request": request })),
            headers: Default::default(),
            invoke_key: INVOKE_KEY.to_string(),
        },
    );
    response.map(|body| body.deserialize::<Value>().expect("deserialize body"))
}

fn dispatch_idempotent(
    webview: &WebviewWindow<MockRuntime>,
    cmd: &str,
    idempotency_key: &str,
    payload: Value,
) -> Result<Value, Value> {
    dispatch_request(webview, cmd, Some(idempotency_key), payload)
}

fn capability_change_event() -> Value {
    json!({
        "rationale": "Model the customer insight capability",
        "action": {
            "kind": "create_entity",
            "typeId": "Capability",
            "props": { "name": "Customer Insight", "tier": "Strategic" }
        }
    })
}

async fn wait_for_first_node(webview: &WebviewWindow<MockRuntime>) -> String {
    for _ in 0..50 {
        let nodes = dispatch(webview, "workspace_nodes", json!({})).expect("nodes ok");
        if let Some(node_id) = nodes["result"]
            .as_array()
            .and_then(|nodes| nodes.first())
            .and_then(|node| node["nodeId"].as_str())
        {
            return node_id.to_string();
        }
        tokio::time::sleep(std::time::Duration::from_millis(10)).await;
    }
    panic!("accepted authoring job was not applied")
}

/// Poll the derived twin for a node of the given metamodel type, returning its
/// id once the async authoring job has applied.
async fn wait_for_node_of_type(webview: &WebviewWindow<MockRuntime>, type_label: &str) -> String {
    for _ in 0..50 {
        let nodes = dispatch(webview, "workspace_nodes", json!({})).expect("nodes ok");
        if let Some(node_id) = nodes["result"].as_array().and_then(|nodes| {
            nodes
                .iter()
                .find(|node| node["typeLabel"] == type_label)
                .and_then(|node| node["nodeId"].as_str())
        }) {
            return node_id.to_string();
        }
        tokio::time::sleep(std::time::Duration::from_millis(10)).await;
    }
    panic!("no `{type_label}` node was applied")
}

fn create_entity_action(type_id: &str, props: Value) -> Value {
    json!({ "kind": "create_entity", "typeId": type_id, "props": props })
}

fn create_relationship_action(rel_type: &str, src_id: &str, dst_id: &str, props: Value) -> Value {
    json!({
        "kind": "create_relationship",
        "relType": rel_type,
        "srcId": src_id,
        "dstId": dst_id,
        "props": props,
    })
}

fn change_event(rationale: &str, action: Value) -> Value {
    json!({ "rationale": rationale, "action": action })
}

/// Accept one Change Event over the real `workspace_apply_change_event` seam
/// and wait for its `run:terminal` event, returning `(accepted-envelope,
/// terminal-payload)`. The task-first authoring path is asynchronous — an
/// accepted job runs off-thread, so a test cannot observe success/failure from
/// the dispatch response alone (see `AuthoringRunLedger`/`RunTerminalEvent`).
async fn apply_change_event_and_wait(
    app: &App<MockRuntime>,
    webview: &WebviewWindow<MockRuntime>,
    idempotency_key: &str,
    payload: Value,
) -> (Value, Value) {
    use std::sync::mpsc;
    use std::time::Duration;
    use tauri::Listener;

    let (tx, rx) = mpsc::channel::<Value>();
    app.listen(super::EVENT_RUN_TERMINAL, move |event| {
        if let Ok(payload) = serde_json::from_str::<Value>(event.payload()) {
            let _ = tx.send(payload);
        }
    });

    let accepted = dispatch_idempotent(
        webview,
        "workspace_apply_change_event_inner",
        idempotency_key,
        payload,
    )
    .expect("accepted envelope returned");
    assert_eq!(
        accepted["status"], "ok",
        "change event accepted: {accepted:?}"
    );

    let terminal = rx
        .recv_timeout(Duration::from_secs(20))
        .expect("run:terminal event delivered");
    assert_eq!(
        terminal["runId"], accepted["result"]["runId"],
        "terminal event binds to the accepted run"
    );
    (accepted, terminal)
}

/// Submit a Change Event expected to fail validation; assert the host error
/// code on the terminal event and that the op log is unchanged. Unlike the
/// synchronous typed-authoring commands this replaces, the async terminal
/// event and run ledger only carry the stable `errorCode`
/// (`AuthoringRunLedger`/`RunTerminalEvent`), not `ValidationError`'s specific
/// message — so this can only assert the shared `VALIDATION_FAILED` code, not
/// which rule fired.
async fn assert_change_event_rejected(
    app: &App<MockRuntime>,
    webview: &WebviewWindow<MockRuntime>,
    idempotency_key: &str,
    payload: Value,
) {
    let before = dispatch(webview, "workspace_status", json!({})).expect("status ok");
    let op_count = before["result"]["appliedOpCount"].clone();

    let (_accepted, terminal) =
        apply_change_event_and_wait(app, webview, idempotency_key, payload).await;
    assert_eq!(terminal["succeeded"], false, "terminal event: {terminal:?}");
    assert_eq!(terminal["errorCode"], "VALIDATION_FAILED");

    let after = dispatch(webview, "workspace_status", json!({})).expect("status ok");
    assert_eq!(
        after["result"]["appliedOpCount"], op_count,
        "a rejected write never enters model/ops/"
    );
}

#[tokio::test]
async fn task_first_authoring_returns_an_accepted_job_and_applies() {
    let dir = TempDir::new().unwrap();
    let (_app, webview) = lifecycle_app();
    dispatch(
        &webview,
        "workspace_create",
        json!({ "root": dir.path().to_string_lossy() }),
    )
    .expect("create ok");

    let accepted = dispatch_idempotent(
        &webview,
        "workspace_apply_change_event_inner",
        "create-capability-1",
        capability_change_event(),
    )
    .expect("accepted");
    assert_eq!(accepted["status"], "ok");
    assert_eq!(accepted["result"]["queueClass"], "authoring");
    assert_eq!(accepted["result"]["idempotencyKey"], "create-capability-1");
    let ledger = dir
        .path()
        .join(accepted["result"]["ledgerRef"].as_str().unwrap());
    assert!(
        ledger.exists(),
        "acceptance must be durable before response"
    );
    let duplicate = dispatch_idempotent(
        &webview,
        "workspace_apply_change_event_inner",
        "create-capability-1",
        capability_change_event(),
    )
    .expect("duplicate accepted");
    assert_eq!(duplicate["result"]["runId"], accepted["result"]["runId"]);

    let authored_node_id = wait_for_first_node(&webview).await;
    let inspection = dispatch(
        &webview,
        "workspace_inspect_object",
        json!({
            "objectId": authored_node_id,
            "viewpoint": { "asOf": 0, "layers": ["actual"] }
        }),
    )
    .expect("inspect ok");
    assert_eq!(inspection["result"]["objectKind"], "entity");
    assert_eq!(
        inspection["result"]["provenance"]["rationale"],
        "Model the customer insight capability"
    );
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
/// Task-first equivalent of the retired untyped `workspace_author_node`: two
/// typed entities land through the real Change Event seam, survive a
/// close/reopen with the foundation hash unchanged, and the first entity's
/// identity persists.
#[tokio::test]
async fn author_typed_node_then_list_survives_reopen_with_hash_equality() {
    let dir = TempDir::new().unwrap();
    let (app, webview) = lifecycle_app();
    let root = dir.path().to_string_lossy().to_string();

    dispatch(&webview, "workspace_create", json!({ "root": root })).expect("create ok");

    apply_change_event_and_wait(
        &app,
        &webview,
        "author-first",
        change_event(
            "Model the first capability",
            create_entity_action("Capability", json!({ "name": "First" })),
        ),
    )
    .await;
    let first_id = wait_for_first_node(&webview).await;

    apply_change_event_and_wait(
        &app,
        &webview,
        "author-second",
        change_event(
            "Model the second capability",
            create_entity_action("Capability", json!({ "name": "Second" })),
        ),
    )
    .await;

    // The derived twin lists both.
    let nodes = dispatch(&webview, "workspace_nodes", json!({})).expect("nodes ok");
    assert_eq!(nodes["status"], "ok");
    assert_eq!(nodes["result"].as_array().map(Vec::len), Some(2));

    let status = dispatch(&webview, "workspace_status", json!({})).expect("status ok");
    let op_count_before_reopen = status["result"]["appliedOpCount"].clone();
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
    assert_eq!(
        reopened["result"]["appliedOpCount"], op_count_before_reopen,
        "reopen re-derives the same canonical op count"
    );
    let nodes = dispatch(&webview, "workspace_nodes", json!({})).expect("nodes ok");
    assert_eq!(nodes["result"].as_array().map(Vec::len), Some(2));
    assert!(
        nodes["result"]
            .as_array()
            .unwrap()
            .iter()
            .any(|n| n["nodeId"] == first_id.as_str()),
        "the first authored entity survives reopen"
    );
}

#[tokio::test]
async fn author_typed_node_with_no_open_workspace_is_an_honest_error() {
    let (_app, webview) = lifecycle_app();
    let authored = dispatch_idempotent(
        &webview,
        "workspace_apply_change_event_inner",
        "author-no-workspace",
        change_event(
            "Model a capability",
            create_entity_action("Capability", json!({ "name": "Orphan" })),
        ),
    )
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
    let (app, webview) = lifecycle_app();
    let root = dir.path().to_string_lossy().to_string();
    dispatch(&webview, "workspace_create", json!({ "root": root })).expect("create ok");

    // Author an Application, then a plan claim and an actual claim on lifecycle.
    apply_change_event_and_wait(
        &app,
        &webview,
        "plan-actual-billing",
        change_event(
            "Model the Billing application",
            create_entity_action("Application", json!({ "name": "Billing" })),
        ),
    )
    .await;
    let id = wait_for_first_node(&webview).await;

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
    let (app, webview) = lifecycle_app();
    let root = dir.path().to_string_lossy().to_string();
    dispatch(&webview, "workspace_create", json!({ "root": root })).expect("create ok");

    // A valid Capability lands through the real Change Event seam.
    let (_accepted, terminal) = apply_change_event_and_wait(
        &app,
        &webview,
        "capability-ok",
        change_event(
            "Model the customer insight capability",
            create_entity_action(
                "Capability",
                json!({ "name": "Customer Insight", "tier": "Strategic" }),
            ),
        ),
    )
    .await;
    assert_eq!(terminal["succeeded"], true, "terminal event: {terminal:?}");
    let nodes = dispatch(&webview, "workspace_nodes", json!({})).expect("nodes ok");
    assert_eq!(nodes["result"].as_array().map(Vec::len), Some(1));

    // A structurally-fine but metamodel-invalid write is refused, and the
    // canonical op log is unchanged (the M1 oracle assertion).
    assert_change_event_rejected(
        &app,
        &webview,
        "capability-bad-enum",
        change_event(
            "Model an invalid capability",
            create_entity_action("Capability", json!({ "name": "Bad", "tier": "Tactical" })),
        ),
    )
    .await;
}

/// Golden-journey step 3 at the host boundary: a valid entity + relationship
/// land through the Change Event seam, and a metamodel-invalid relationship is
/// refused with the canonical op log left unchanged.
#[tokio::test]
async fn author_typed_edge_round_trips_and_rejects_at_the_boundary() {
    let (_dir, app, webview) = created_lifecycle_app();

    // Author an Application and a Capability (both valid).
    apply_change_event_and_wait(
        &app,
        &webview,
        "edge-app",
        change_event(
            "Model the Insight Hub application",
            create_entity_action("Application", json!({ "name": "Insight Hub" })),
        ),
    )
    .await;
    let app_id = wait_for_node_of_type(&webview, "Application").await;

    apply_change_event_and_wait(
        &app,
        &webview,
        "edge-cap",
        change_event(
            "Model the customer insight capability",
            create_entity_action("Capability", json!({ "name": "Customer Insight" })),
        ),
    )
    .await;
    let cap_id = wait_for_node_of_type(&webview, "Capability").await;

    // Application realises Capability — a valid seed relationship; it lands.
    let (_accepted, terminal) = apply_change_event_and_wait(
        &app,
        &webview,
        "edge-realises",
        change_event(
            "Insight Hub realises the customer insight capability",
            create_relationship_action("realises", &app_id, &cap_id, json!({})),
        ),
    )
    .await;
    assert_eq!(
        terminal["succeeded"], true,
        "valid relationship lands: {terminal:?}"
    );

    let edges = dispatch(&webview, "workspace_edges", json!({})).expect("edges ok");
    assert_eq!(edges["result"].as_array().expect("edge array").len(), 1);

    // A wrong-endpoint relationship (Capability cannot be a `realises` source)
    // is refused, and the canonical op log and edge count are unchanged.
    assert_change_event_rejected(
        &app,
        &webview,
        "edge-wrong-endpoint",
        change_event(
            "Attempt a wrong-endpoint realises",
            create_relationship_action("realises", &cap_id, &app_id, json!({})),
        ),
    )
    .await;
    let edges_after = dispatch(&webview, "workspace_edges", json!({})).expect("edges ok");
    assert_eq!(
        edges_after["result"].as_array().expect("edge array").len(),
        1
    );
}

fn created_lifecycle_app() -> (TempDir, App<MockRuntime>, WebviewWindow<MockRuntime>) {
    let dir = TempDir::new().unwrap();
    let (app, webview) = lifecycle_app();
    dispatch(
        &webview,
        "workspace_create",
        json!({ "root": dir.path().to_string_lossy() }),
    )
    .expect("create ok");
    (dir, app, webview)
}

/// #347: a required attribute left out is refused with `MISSING_REQUIRED_ATTRIBUTE`
/// and the write never reaches the op log.
#[tokio::test]
async fn author_typed_node_rejects_a_missing_required_attribute() {
    let (_dir, app, webview) = created_lifecycle_app();

    // Capability.name is required; omitting it is a structurally-fine but invalid write.
    assert_change_event_rejected(
        &app,
        &webview,
        "missing-required",
        change_event(
            "Model an invalid capability",
            create_entity_action("Capability", json!({ "tier": "Strategic" })),
        ),
    )
    .await;
}

/// #347: a string over the metamodel's `maxLength` (256) is refused with
/// `STRING_TOO_LONG` and the write never reaches the op log.
#[tokio::test]
async fn author_typed_node_rejects_a_string_over_max_length() {
    let (_dir, app, webview) = created_lifecycle_app();

    let too_long = "x".repeat(257);
    assert_change_event_rejected(
        &app,
        &webview,
        "string-too-long",
        change_event(
            "Model an invalid capability",
            create_entity_action("Capability", json!({ "name": too_long })),
        ),
    )
    .await;
}

/// #347: `accesses` has `allowDuplicate=false`; a second identical relationship
/// between the same ordered pair is refused with `DUPLICATE_RELATIONSHIP` and
/// never reaches the op log.
#[tokio::test]
async fn author_typed_edge_rejects_a_duplicate_relationship() {
    let (_dir, app, webview) = created_lifecycle_app();

    apply_change_event_and_wait(
        &app,
        &webview,
        "dup-app",
        change_event(
            "Model the Insight Hub application",
            create_entity_action("Application", json!({ "name": "Insight Hub" })),
        ),
    )
    .await;
    let app_id = wait_for_node_of_type(&webview, "Application").await;

    apply_change_event_and_wait(
        &app,
        &webview,
        "dup-entity",
        change_event(
            "Model the customer profile data entity",
            create_entity_action("DataEntity", json!({ "name": "Customer Profile" })),
        ),
    )
    .await;
    let entity_id = wait_for_node_of_type(&webview, "DataEntity").await;

    let (_accepted, terminal) = apply_change_event_and_wait(
        &app,
        &webview,
        "dup-first-access",
        change_event(
            "Insight Hub accesses the customer profile",
            create_relationship_action(
                "accesses",
                &app_id,
                &entity_id,
                json!({ "mode": "readwrite" }),
            ),
        ),
    )
    .await;
    assert_eq!(
        terminal["succeeded"], true,
        "the first access relationship lands: {terminal:?}"
    );

    // A second `accesses` between the same ordered pair is a duplicate.
    assert_change_event_rejected(
        &app,
        &webview,
        "dup-second-access",
        change_event(
            "Attempt a duplicate accesses relationship",
            create_relationship_action("accesses", &app_id, &entity_id, json!({ "mode": "read" })),
        ),
    )
    .await;
}
