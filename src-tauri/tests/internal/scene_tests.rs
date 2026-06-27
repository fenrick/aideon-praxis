use super::*;
use crate::ipc::IpcRequest;
use aideon_praxis::praxis::canvas::CanvasNode;
use aideon_praxis::praxis::graph_layout::GraphLayoutNode;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

fn env_lock() -> &'static tokio::sync::Mutex<()> {
    crate::test_support::env_lock()
}

fn ipc_request<T>(payload: T) -> IpcRequest<T> {
    use std::sync::atomic::{AtomicU32, Ordering};
    static COUNTER: AtomicU32 = AtomicU32::new(1);
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    IpcRequest {
        request_id: format!("req-{id}"),
        payload,
    }
}

#[test]
fn store_key_is_stable() {
    let key = canvas_store_key("doc1", "2025-01-01", Some("main"), None);
    assert_eq!(key, "canvas/doc1/scenario-main/layout-2025-01-01.json");
}

#[test]
fn safe_segment_sanitizes_inputs() {
    assert_eq!(safe_segment(""), "_");
    assert_eq!(safe_segment("ok-name"), "ok-name");
    assert_eq!(safe_segment("bad/segment"), "bad_segment");
    assert_eq!(safe_segment("spaces are bad"), "spaces_are_bad");
}

#[test]
fn store_key_trims_blank_segments() {
    let key = canvas_store_key("doc1", "2025-01-01", Some(" "), Some(""));
    assert_eq!(key, "canvas/doc1/layout-2025-01-01.json");
}

#[test]
fn graph_layout_key_is_stable() {
    let key = graph_layout_store_key("doc1", "widget1", "2025-01-01", Some("main"), None);
    assert_eq!(
        key,
        "graph/doc1/widget-widget1/scenario-main/layout-2025-01-01.json"
    );
}

#[test]
fn missing_snapshot_error_detection() {
    assert!(is_missing_snapshot_error("os error 2"));
    assert!(is_missing_snapshot_error("No such file or directory"));
    assert!(!is_missing_snapshot_error("permission denied"));
}

#[tokio::test]
async fn canvas_scene_returns_shapes() {
    let shapes = canvas_scene(None).await.unwrap();
    assert!(!shapes.is_empty());
}

#[tokio::test]
async fn canvas_layout_roundtrips() {
    let _guard = env_lock().lock().await;
    let base = std::env::temp_dir().join(format!(
        "aideon-test-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis()
    ));
    unsafe {
        std::env::set_var("AIDEON_TEST_DATA_DIR", base.to_string_lossy().to_string());
    }

    let payload = CanvasLayoutSaveRequest {
        doc_id: "doc-a".into(),
        as_of: "commit-1".into(),
        scenario: Some("main".into()),
        layer: None,
        nodes: vec![CanvasNode {
            id: "w1".into(),
            type_id: "widget".into(),
            x: 10.0,
            y: 20.0,
            w: 100.0,
            h: 50.0,
            z: 0,
            label: None,
            group_id: None,
        }],
        edges: vec![],
        groups: vec![],
    };

    canvas_save_layout(payload.clone()).await.unwrap();

    let loaded = canvas_get_layout(CanvasLayoutGetRequest {
        doc_id: payload.doc_id.clone(),
        as_of: payload.as_of.clone(),
        scenario: payload.scenario.clone(),
        layer: payload.layer.clone(),
    })
    .await
    .unwrap();

    assert_eq!(loaded, Some(payload));

    let _ = fs::remove_dir_all(base);
    unsafe {
        std::env::remove_var("AIDEON_TEST_DATA_DIR");
    }
}

#[tokio::test]
async fn canvas_get_layout_returns_none_when_missing() {
    let _guard = env_lock().lock().await;
    let base = std::env::temp_dir().join("aideon-missing-snapshot");
    let _ = fs::remove_dir_all(&base);
    unsafe {
        std::env::set_var("AIDEON_TEST_DATA_DIR", base.to_string_lossy().to_string());
    }

    let response = canvas_get_layout(CanvasLayoutGetRequest {
        doc_id: "missing-doc".into(),
        as_of: "missing".into(),
        scenario: None,
        layer: None,
    })
    .await
    .expect("missing layout");

    assert!(response.is_none());

    let _ = fs::remove_dir_all(base);
    unsafe {
        std::env::remove_var("AIDEON_TEST_DATA_DIR");
    }
}

#[tokio::test]
async fn graph_layout_roundtrips() {
    let _guard = env_lock().lock().await;
    let base = std::env::temp_dir().join(format!(
        "aideon-graph-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis()
    ));
    unsafe {
        std::env::set_var("AIDEON_TEST_DATA_DIR", base.to_string_lossy().to_string());
    }

    let payload = GraphLayoutSaveRequest {
        doc_id: "doc-a".into(),
        widget_id: "widget-1".into(),
        as_of: "commit-1".into(),
        scenario: None,
        layer: None,
        nodes: vec![GraphLayoutNode {
            id: "n1".into(),
            x: 12.0,
            y: 24.0,
        }],
    };

    graph_layout_save(payload.clone()).await.unwrap();

    let loaded = graph_layout_get(GraphLayoutGetRequest {
        doc_id: payload.doc_id.clone(),
        widget_id: payload.widget_id.clone(),
        as_of: payload.as_of.clone(),
        scenario: payload.scenario.clone(),
        layer: payload.layer.clone(),
    })
    .await
    .unwrap();

    assert_eq!(loaded, Some(payload));

    let _ = fs::remove_dir_all(base);
    unsafe {
        std::env::remove_var("AIDEON_TEST_DATA_DIR");
    }
}

#[tokio::test]
async fn praxis_scene_wrappers_cover_ipc_surface() {
    let _guard = env_lock().lock().await;
    let dir = tempfile::tempdir().expect("tempdir");
    let base = dir.path().to_path_buf();
    unsafe {
        std::env::set_var("AIDEON_TEST_DATA_DIR", base.to_string_lossy().to_string());
    }

    let canvas_payload = CanvasLayoutSaveRequest {
        doc_id: "doc-ipc".into(),
        as_of: "commit-1".into(),
        scenario: Some("main".into()),
        layer: None,
        nodes: vec![CanvasNode {
            id: "w1".into(),
            type_id: "widget".into(),
            x: 10.0,
            y: 20.0,
            w: 100.0,
            h: 50.0,
            z: 0,
            label: None,
            group_id: None,
        }],
        edges: vec![],
        groups: vec![],
    };

    let response = praxis_canvas_save_layout(ipc_request(canvas_payload.clone()))
        .await
        .expect("canvas save");
    assert_eq!(response.status, "ok");

    let response = praxis_canvas_get_layout(ipc_request(CanvasLayoutGetRequest {
        doc_id: canvas_payload.doc_id.clone(),
        as_of: canvas_payload.as_of.clone(),
        scenario: canvas_payload.scenario.clone(),
        layer: canvas_payload.layer.clone(),
    }))
    .await
    .expect("canvas get");
    assert_eq!(response.status, "ok");
    assert_eq!(response.result, Some(Some(canvas_payload)));

    let graph_payload = GraphLayoutSaveRequest {
        doc_id: "doc-ipc".into(),
        widget_id: "widget-1".into(),
        as_of: "commit-1".into(),
        scenario: None,
        layer: None,
        nodes: vec![GraphLayoutNode {
            id: "n1".into(),
            x: 12.0,
            y: 24.0,
        }],
    };

    let response = praxis_graph_layout_save(ipc_request(graph_payload.clone()))
        .await
        .expect("graph save");
    assert_eq!(response.status, "ok");

    let response = praxis_graph_layout_get(ipc_request(GraphLayoutGetRequest {
        doc_id: graph_payload.doc_id.clone(),
        widget_id: graph_payload.widget_id.clone(),
        as_of: graph_payload.as_of.clone(),
        scenario: graph_payload.scenario.clone(),
        layer: graph_payload.layer.clone(),
    }))
    .await
    .expect("graph get");
    assert_eq!(response.status, "ok");
    assert_eq!(response.result, Some(Some(graph_payload)));

    let response = praxis_canvas_get_scene(ipc_request(CanvasScenePayload { as_of: None }))
        .await
        .expect("scene get");
    assert_eq!(response.status, "ok");
    assert!(!response.result.unwrap_or_default().is_empty());

    unsafe {
        std::env::remove_var("AIDEON_TEST_DATA_DIR");
    }
}
