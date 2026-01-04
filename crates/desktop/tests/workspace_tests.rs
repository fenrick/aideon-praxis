use super::*;

#[tokio::test]
async fn list_projects_returns_default_payload() {
    let projects = list_projects().await.expect("projects");
    assert_eq!(projects.len(), 1);
    assert_eq!(projects[0].id, "default-project");
    assert!(!projects[0].scenarios.is_empty());
}

#[tokio::test]
async fn projects_list_wraps_request_id() {
    let response = workspace_projects_list(IpcRequest {
        request_id: "req-1".to_string(),
        payload: EmptyPayload {},
    })
    .await
    .expect("projects list");
    assert_eq!(response.request_id, "req-1");
    assert_eq!(response.status, "ok");
    assert!(response.result.unwrap().len() == 1);
}

#[tokio::test]
async fn templates_list_is_empty_and_wrapped() {
    let templates = list_templates().await.expect("templates");
    assert!(templates.is_empty());

    let response = workspace_templates_list(IpcRequest {
        request_id: "req-2".to_string(),
        payload: EmptyPayload {},
    })
    .await
    .expect("templates list");
    assert_eq!(response.request_id, "req-2");
    assert_eq!(response.status, "ok");
    assert!(response.result.unwrap().is_empty());
}
