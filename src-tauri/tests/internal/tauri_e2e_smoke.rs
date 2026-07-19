#[cfg(not(target_os = "windows"))]
use {
    crate::ipc::IpcRequest,
    crate::temporal::chrona_temporal_state_at,
    crate::windows::{OpenWindowPayload, create_windows, system_window_open_inner},
    crate::worker::WorkerState,
    aideon_chrona::TemporalEngine,
    aideon_praxis::praxis::temporal::StateAtArgs,
    tauri::{Manager, test::MockRuntime},
};

#[cfg(not(target_os = "windows"))]
fn assert_window_route(app: &tauri::App<MockRuntime>, window: &str, route: &str) {
    let webview = app.get_webview_window(window).expect("window exists");
    let url = webview.url().expect("window url");
    assert!(
        url.path().ends_with(route),
        "expected {window} route, got {url}"
    );
}

#[cfg(not(target_os = "windows"))]
fn assert_main_route(app: &tauri::App<MockRuntime>) {
    let main = app.get_webview_window("main").expect("main window");
    let url = main.url().expect("main url");
    let path = url.path();
    assert!(
        path.is_empty()
            || matches!(path, "/" | "/index.html")
            || path.ends_with("/index.html")
            || url.as_str() == "tauri://localhost",
        "expected main route, got {url}"
    );
}

#[cfg(not(target_os = "windows"))]
async fn open_window(app: &tauri::App<MockRuntime>, window: &str) {
    let response = system_window_open_inner(
        app.handle().clone(),
        IpcRequest {
            request_id: format!("req-{window}"),
            traceparent: None,
            idempotency_key: None,
            payload: OpenWindowPayload {
                window: window.to_string(),
            },
        },
    )
    .await
    .expect("window response");
    assert_eq!(response.status, "ok");
}

#[cfg(not(target_os = "windows"))]
async fn assert_temporal_state(app: &tauri::App<MockRuntime>) {
    let response = chrona_temporal_state_at(
        app.state::<WorkerState>(),
        IpcRequest {
            request_id: "req-state-at".to_string(),
            traceparent: None,
            idempotency_key: None,
            payload: StateAtArgs::new("main".to_string(), Some("main".to_string()), None, None),
        },
    )
    .await
    .expect("state_at response");
    assert_eq!(response.status, "ok");
    let result = response.result.expect("state_at result");
    assert!(!result.commit_id.is_empty());
    assert_eq!(result.scenario.as_deref(), Some("main"));
}

#[tokio::test]
#[cfg(not(target_os = "windows"))]
async fn tauri_routes_and_ipc_smoke() {
    let engine = TemporalEngine::new().await.expect("engine");
    let state = WorkerState::new(engine);

    let app = tauri::test::mock_app();
    app.manage(state);
    create_windows(&app).expect("create windows");

    assert_window_route(&app, "splash", "/splash/");
    assert_main_route(&app);
    for (window, route) in [
        ("settings", "/settings/"),
        ("status", "/status/"),
        ("styleguide", "/styleguide/"),
        ("about", "/about/"),
    ] {
        open_window(&app, window).await;
        assert_window_route(&app, window, route);
    }
    assert_temporal_state(&app).await;
}
