use super::*;
use aideon_praxis::praxis::canvas::CanvasNode;
use std::fs;
use std::sync::OnceLock;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::Mutex;

static ENV_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

fn env_lock() -> &'static Mutex<()> {
    ENV_LOCK.get_or_init(|| Mutex::new(()))
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
