#[cfg(target_os = "windows")]
use log::warn;
use serde::Deserialize;
use specta::Type;
use tauri::webview::PageLoadEvent;
use tauri::{App, AppHandle, Manager, Runtime, TitleBarStyle, WebviewUrl, WebviewWindowBuilder};

use crate::ipc::{HostError, IpcRequest, IpcResponse};
use crate::setup::{SetupState, set_complete};
use crate::telemetry::respond_with_request;

const ROUTE_SPLASH: &str = "splash/";
const ROUTE_MAIN: &str = "index.html";
const ROUTE_STATUS: &str = "status/";
const ROUTE_SETTINGS: &str = "settings/";
const ROUTE_ABOUT: &str = "about/";
const ROUTE_STYLEGUIDE: &str = "styleguide/";

pub fn create_windows<R: Runtime>(app: &App<R>) -> Result<(), String> {
    WebviewWindowBuilder::new(app, "splash", WebviewUrl::App(ROUTE_SPLASH.into()))
        .title("Aideon — Loading")
        .resizable(false)
        .decorations(false)
        .inner_size(520.0, 320.0)
        .center()
        .on_page_load(|window, payload| {
            if payload.event() != PageLoadEvent::Finished {
                return;
            }
            let app = window.app_handle().clone();
            tauri::async_runtime::spawn(async move {
                let state = app.state::<std::sync::Mutex<SetupState>>();
                let app_for_call = app.clone();
                if let Err(error) = set_complete(app_for_call, state, "frontend".to_string()).await
                {
                    log::warn!("host: set_complete frontend failed: {error}");
                }
            });
        })
        .build()
        .map_err(to_string)?;

    let main = WebviewWindowBuilder::new(app, "main", WebviewUrl::App(ROUTE_MAIN.into()))
        .title("Aideon")
        .visible(false)
        .inner_size(1060.0, 720.0)
        // Unified native chrome: the traffic lights float over the app's own
        // top bar (one titlebar, not two). The window title is hidden so the
        // app draws its own breadcrumb/toolbar edge-to-edge from y=0. No-op on
        // non-macOS; Windows keeps its Mica treatment below.
        .title_bar_style(TitleBarStyle::Overlay)
        .hidden_title(true)
        .center();

    #[cfg(target_os = "windows")]
    let main_window = main.build().map_err(to_string)?;
    #[cfg(not(target_os = "windows"))]
    {
        main.build().map_err(to_string)?;
    }

    #[cfg(target_os = "windows")]
    {
        if let Err(error) = window_vibrancy::apply_mica(&main_window, Some(true)) {
            warn!("host: failed to apply mica: {error}");
        }
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn open_settings<R: Runtime>(app: AppHandle<R>) -> Result<(), HostError> {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, "settings", WebviewUrl::App(ROUTE_SETTINGS.into()))
        .title("Preferences")
        .resizable(false)
        .inner_size(520.0, 440.0)
        .center()
        .build()
        .map(|_| ())
        .map_err(|err| HostError::internal(err.to_string()))
}

#[tauri::command]
#[specta::specta]
pub fn open_about<R: Runtime>(app: AppHandle<R>) -> Result<(), HostError> {
    if let Some(window) = app.get_webview_window("about") {
        let _ = window.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, "about", WebviewUrl::App(ROUTE_ABOUT.into()))
        .title("About Aideon")
        .resizable(false)
        .inner_size(420.0, 300.0)
        .center()
        .build()
        .map(|_| ())
        .map_err(|err| HostError::internal(err.to_string()))
}

#[tauri::command]
#[specta::specta]
pub fn open_status<R: Runtime>(app: AppHandle<R>) -> Result<(), HostError> {
    if let Some(window) = app.get_webview_window("status") {
        let _ = window.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, "status", WebviewUrl::App(ROUTE_STATUS.into()))
        .title("Status")
        .resizable(false)
        .always_on_top(true)
        .inner_size(360.0, 140.0)
        .center()
        .build()
        .map(|_| ())
        .map_err(|err| HostError::internal(err.to_string()))
}

#[tauri::command]
#[specta::specta]
pub fn open_styleguide<R: Runtime>(app: AppHandle<R>) -> Result<(), HostError> {
    if !cfg!(debug_assertions) {
        return Err(HostError::new(
            "forbidden",
            "styleguide is only available in development builds",
        ));
    }
    log::info!("host: open_styleguide requested");
    if let Some(window) = app.get_webview_window("styleguide") {
        let _ = window.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, "styleguide", WebviewUrl::App(ROUTE_STYLEGUIDE.into()))
        .title("UI Style Guide")
        .resizable(true)
        .inner_size(900.0, 700.0)
        .center()
        .build()
        .map(|_| ())
        .map_err(|err| HostError::internal(err.to_string()))
}

#[derive(Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct OpenWindowPayload {
    pub window: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SystemWindowTarget {
    Settings,
    About,
    Status,
    Styleguide,
}

fn parse_window_target(value: &str) -> Result<SystemWindowTarget, HostError> {
    match value {
        "settings" => Ok(SystemWindowTarget::Settings),
        "about" => Ok(SystemWindowTarget::About),
        "status" => Ok(SystemWindowTarget::Status),
        "styleguide" => Ok(SystemWindowTarget::Styleguide),
        unknown => Err(HostError::invalid_input(format!(
            "unknown window '{unknown}'"
        ))),
    }
}

/// Namespaced + requestId-wrapped window open command.
async fn run_system_window_open<R: Runtime>(
    app: AppHandle<R>,
    payload: OpenWindowPayload,
) -> Result<(), HostError> {
    match parse_window_target(&payload.window) {
        Ok(SystemWindowTarget::Settings) => open_settings(app),
        Ok(SystemWindowTarget::About) => open_about(app),
        Ok(SystemWindowTarget::Status) => open_status(app),
        Ok(SystemWindowTarget::Styleguide) => open_styleguide(app),
        Err(err) => Err(err),
    }
}

/// The registered command is concrete over `tauri::Wry` (the codegen seam
/// cannot collect a runtime-generic command); the generic `_inner` keeps the
/// behaviour testable under `MockRuntime`.
#[tauri::command]
#[specta::specta]
pub async fn system_window_open(
    app: AppHandle,
    request: IpcRequest<OpenWindowPayload>,
) -> Result<IpcResponse<()>, HostError> {
    system_window_open_inner(app, request).await
}

pub(crate) async fn system_window_open_inner<R: Runtime>(
    app: AppHandle<R>,
    request: IpcRequest<OpenWindowPayload>,
) -> Result<IpcResponse<()>, HostError> {
    respond_with_request("system_window_open", request, move |payload| {
        let app = app.clone();
        async move { run_system_window_open(app, payload).await }
    })
    .await
}

fn to_string<E: std::fmt::Display>(error: E) -> String {
    error.to_string()
}

#[cfg(test)]
#[path = "../tests/internal/windows_tests.rs"]
mod tests;
