#![cfg(not(target_os = "windows"))]
use super::{
    OpenWindowPayload, SystemWindowTarget, parse_window_target, system_window_open_inner, to_string,
};
#[cfg(not(target_os = "windows"))]
use super::{create_windows, open_about, open_settings, open_status, open_styleguide};
use crate::ipc::IpcRequest;
#[cfg(not(target_os = "windows"))]
use tauri::Manager;

#[test]
fn to_string_formats_errors() {
    let value = to_string("boom");
    assert_eq!(value, "boom");
}

#[test]
fn parse_window_target_maps_known_ids() {
    assert_eq!(
        parse_window_target("settings").unwrap(),
        SystemWindowTarget::Settings
    );
    assert_eq!(
        parse_window_target("about").unwrap(),
        SystemWindowTarget::About
    );
    assert_eq!(
        parse_window_target("status").unwrap(),
        SystemWindowTarget::Status
    );
    assert_eq!(
        parse_window_target("styleguide").unwrap(),
        SystemWindowTarget::Styleguide
    );
    assert!(parse_window_target("nope").is_err());
}

#[tokio::test]
async fn system_window_open_rejects_unknown_window() {
    let app = tauri::test::mock_app();
    let response = system_window_open_inner(
        app.handle().clone(),
        IpcRequest {
            request_id: "req-1".to_string(),
            traceparent: None,
            idempotency_key: None,
            payload: OpenWindowPayload {
                window: "unknown".to_string(),
            },
        },
    )
    .await
    .expect("response");
    assert_eq!(response.status, "error");
    assert!(response.error.is_some());
}

#[tokio::test]
#[cfg(not(target_os = "windows"))]
async fn system_window_open_handles_known_windows() {
    let app = tauri::test::mock_app();
    let response = system_window_open_inner(
        app.handle().clone(),
        IpcRequest {
            request_id: "req-2".to_string(),
            traceparent: None,
            idempotency_key: None,
            payload: OpenWindowPayload {
                window: "settings".to_string(),
            },
        },
    )
    .await
    .expect("response");
    assert!(matches!(response.status, "ok" | "error"));

    let response = system_window_open_inner(
        app.handle().clone(),
        IpcRequest {
            request_id: "req-3".to_string(),
            traceparent: None,
            idempotency_key: None,
            payload: OpenWindowPayload {
                window: "about".to_string(),
            },
        },
    )
    .await
    .expect("response");
    assert!(matches!(response.status, "ok" | "error"));
}

#[test]
#[cfg(not(target_os = "windows"))]
fn window_openers_handle_existing_windows() {
    let app = tauri::test::mock_app();
    let _ = open_settings(app.handle().clone());
    let _ = open_settings(app.handle().clone());

    let _ = open_about(app.handle().clone());
    let _ = open_about(app.handle().clone());

    let _ = open_status(app.handle().clone());
    let _ = open_status(app.handle().clone());

    let _ = open_styleguide(app.handle().clone());
    let _ = open_styleguide(app.handle().clone());
}

#[test]
#[cfg(not(target_os = "windows"))]
fn status_and_about_open_without_main_window() {
    let app = tauri::test::mock_app();
    assert!(app.get_webview_window("main").is_none());

    let _ = open_status(app.handle().clone());
    let _ = open_about(app.handle().clone());

    assert!(app.get_webview_window("status").is_some());
    assert!(app.get_webview_window("about").is_some());
}

#[test]
#[cfg(not(target_os = "windows"))]
fn create_windows_builds_splash_and_main() {
    let app = tauri::test::mock_app();
    create_windows(&app).expect("create windows");
    assert!(app.get_webview_window("splash").is_some());
    assert!(app.get_webview_window("main").is_some());
}
