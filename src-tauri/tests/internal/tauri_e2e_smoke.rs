#[cfg(not(target_os = "windows"))]
use {
    crate::ipc::IpcRequest,
    crate::temporal::chrona_temporal_state_at,
    crate::windows::{OpenWindowPayload, create_windows, system_window_open},
    crate::worker::WorkerState,
    aideon_chrona::TemporalEngine,
    aideon_praxis::praxis::temporal::StateAtArgs,
    tauri::Manager,
};

#[tokio::test]
#[cfg(not(target_os = "windows"))]
async fn tauri_routes_and_ipc_smoke() {
    let engine = TemporalEngine::new().await.expect("engine");
    let state = WorkerState::new(engine);

    let app = tauri::test::mock_app();
    app.manage(state);
    create_windows(&app).expect("create windows");

    let splash = app.get_webview_window("splash").expect("splash window");
    let splash_url = splash.url().expect("splash url");
    assert!(
        splash_url.path().ends_with("/splash/"),
        "expected splash route, got {splash_url}"
    );

    let main = app.get_webview_window("main").expect("main window");
    let main_url = main.url().expect("main url");
    let main_path = main_url.path();
    assert!(
        main_path.is_empty()
            || matches!(main_path, "/" | "/index.html")
            || main_path.ends_with("/index.html")
            || main_url.as_str() == "tauri://localhost",
        "expected main route, got {main_url}"
    );

    let response = system_window_open(
        app.handle().clone(),
        IpcRequest {
            request_id: "req-settings".to_string(),
            payload: OpenWindowPayload {
                window: "settings".to_string(),
            },
        },
    )
    .await
    .expect("settings response");
    assert_eq!(response.status, "ok");
    let settings = app.get_webview_window("settings").expect("settings window");
    let settings_url = settings.url().expect("settings url");
    assert!(
        settings_url.path().ends_with("/settings/"),
        "expected settings route, got {settings_url}"
    );

    let response = system_window_open(
        app.handle().clone(),
        IpcRequest {
            request_id: "req-status".to_string(),
            payload: OpenWindowPayload {
                window: "status".to_string(),
            },
        },
    )
    .await
    .expect("status response");
    assert_eq!(response.status, "ok");
    let status = app.get_webview_window("status").expect("status window");
    let status_url = status.url().expect("status url");
    assert!(
        status_url.path().ends_with("/status/"),
        "expected status route, got {status_url}"
    );

    let state = app.state::<WorkerState>();
    let response = chrona_temporal_state_at(
        state,
        IpcRequest {
            request_id: "req-state-at".to_string(),
            payload: StateAtArgs::new("main".to_string(), Some("main".to_string()), None, None),
        },
    )
    .await
    .expect("state_at response");
    assert_eq!(response.status, "ok");
    let result = response.result.expect("state_at result");
    assert!(!result.commit_id.is_empty());
    assert_eq!(result.scenario.as_deref(), Some("main"));

    let response = system_window_open(
        app.handle().clone(),
        IpcRequest {
            request_id: "req-styleguide".to_string(),
            payload: OpenWindowPayload {
                window: "styleguide".to_string(),
            },
        },
    )
    .await
    .expect("styleguide response");
    assert_eq!(response.status, "ok");
    let styleguide = app
        .get_webview_window("styleguide")
        .expect("styleguide window");
    let styleguide_url = styleguide.url().expect("styleguide url");
    assert!(
        styleguide_url.path().ends_with("/styleguide/"),
        "expected styleguide route, got {styleguide_url}"
    );

    let response = system_window_open(
        app.handle().clone(),
        IpcRequest {
            request_id: "req-about".to_string(),
            payload: OpenWindowPayload {
                window: "about".to_string(),
            },
        },
    )
    .await
    .expect("about response");
    assert_eq!(response.status, "ok");
    let about = app.get_webview_window("about").expect("about window");
    let about_url = about.url().expect("about url");
    assert!(
        about_url.path().ends_with("/about/"),
        "expected about route, got {about_url}"
    );
}
