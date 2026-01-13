use super::*;
use crate::worker::WorkerState;
use aideon_chrona::TemporalEngine;
use aideon_praxis::mneme::open_store;
use serde_json::json;
use std::fs;
use std::sync::OnceLock;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;
use tempfile::tempdir;
use tokio::sync::Mutex;

static ENV_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

fn env_lock() -> &'static Mutex<()> {
    ENV_LOCK.get_or_init(|| Mutex::new(()))
}

#[tokio::test]
async fn list_projects_returns_default_payload() {
    let dir = tempdir().expect("tempdir");
    let mneme = open_store(dir.path()).await.expect("open store");
    let engine = TemporalEngine::new().await.expect("engine");
    let state = WorkerState::new(engine, mneme);
    let app = tauri::test::mock_app();
    app.manage(state);
    let state = app.state::<WorkerState>();

    let projects = list_projects(state).await.expect("projects");
    assert_eq!(projects.len(), 1);
    assert_eq!(projects[0].id, "default-project");
    assert!(!projects[0].scenarios.is_empty());
}

#[tokio::test]
async fn projects_list_wraps_request_id() {
    let dir = tempdir().expect("tempdir");
    let mneme = open_store(dir.path()).await.expect("open store");
    let engine = TemporalEngine::new().await.expect("engine");
    let state = WorkerState::new(engine, mneme);
    let app = tauri::test::mock_app();
    app.manage(state);
    let state = app.state::<WorkerState>();

    let response = workspace_projects_list(
        state,
        IpcRequest {
            request_id: "req-1".to_string(),
            payload: EmptyPayload {},
        },
    )
    .await
    .expect("projects list");
    assert_eq!(response.request_id, "req-1");
    assert_eq!(response.status, "ok");
    assert!(response.result.unwrap().len() == 1);
}

#[tokio::test]
async fn templates_list_is_bootstrapped_and_wrapped() {
    let _guard = env_lock().lock().await;
    let base = std::env::temp_dir().join(format!(
        "aideon-templates-list-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis()
    ));
    unsafe {
        std::env::set_var("AIDEON_TEST_DATA_DIR", base.to_string_lossy().to_string());
    }

    let templates = list_templates().await.expect("templates");
    assert!(!templates.is_empty());
    assert!(
        templates
            .iter()
            .any(|template| template.id == "template-executive")
    );

    let response = workspace_templates_list(IpcRequest {
        request_id: "req-2".to_string(),
        payload: EmptyPayload {},
    })
    .await
    .expect("templates list");
    assert_eq!(response.request_id, "req-2");
    assert_eq!(response.status, "ok");
    assert!(!response.result.unwrap().is_empty());

    let _ = fs::remove_dir_all(base);
    unsafe {
        std::env::remove_var("AIDEON_TEST_DATA_DIR");
    }
}

#[tokio::test]
async fn templates_save_roundtrips() {
    let _guard = env_lock().lock().await;
    let base = std::env::temp_dir().join(format!(
        "aideon-templates-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis()
    ));
    unsafe {
        std::env::set_var("AIDEON_TEST_DATA_DIR", base.to_string_lossy().to_string());
    }

    let payload = TemplatePayload {
        id: "template-1".into(),
        document_id: "canvasdoc-1".into(),
        name: "Executive overview".into(),
        description: "Saved from runtime".into(),
        widgets: vec![TemplateWidgetPayload {
            id: "graph-1".into(),
            title: "Graph".into(),
            size: Some("full".into()),
            kind: "graph".into(),
            view: json!({ "id": "graph-view", "kind": "graph" }),
        }],
    };

    let saved = save_template(payload.clone()).await.expect("save template");
    assert_eq!(saved.id, "template-1");

    let templates = list_templates().await.expect("list templates");
    assert!(templates.iter().any(|template| template.id == "template-1"));

    let response = workspace_templates_save(IpcRequest {
        request_id: "req-save".to_string(),
        payload,
    })
    .await
    .expect("templates save");
    assert_eq!(response.request_id, "req-save");
    assert_eq!(response.status, "ok");

    let _ = fs::remove_dir_all(base);
    unsafe {
        std::env::remove_var("AIDEON_TEST_DATA_DIR");
    }
}
