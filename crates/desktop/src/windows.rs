#[cfg(target_os = "windows")]
use log::warn;
use serde::Deserialize;
use tauri::{App, AppHandle, Manager, Runtime, WebviewUrl, WebviewWindowBuilder};

use crate::ipc::{HostError, IpcRequest, IpcResponse};

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
        .build()
        .map_err(to_string)?;

    let main = WebviewWindowBuilder::new(app, "main", WebviewUrl::App(ROUTE_MAIN.into()))
        .title("Aideon")
        .visible(false)
        .inner_size(1060.0, 720.0)
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
pub fn open_styleguide<R: Runtime>(app: AppHandle<R>) -> Result<(), HostError> {
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

#[derive(Debug, Deserialize)]
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
#[tauri::command(rename = "system.window.open")]
pub fn system_window_open<R: Runtime>(
    app: AppHandle<R>,
    request: IpcRequest<OpenWindowPayload>,
) -> Result<IpcResponse<()>, HostError> {
    let request_id = request.request_id;
    let response = match parse_window_target(&request.payload.window) {
        Ok(SystemWindowTarget::Settings) => match open_settings(app) {
            Ok(()) => IpcResponse::ok(request_id, ()),
            Err(err) => IpcResponse::err(request_id, err),
        },
        Ok(SystemWindowTarget::About) => match open_about(app) {
            Ok(()) => IpcResponse::ok(request_id, ()),
            Err(err) => IpcResponse::err(request_id, err),
        },
        Ok(SystemWindowTarget::Status) => match open_status(app) {
            Ok(()) => IpcResponse::ok(request_id, ()),
            Err(err) => IpcResponse::err(request_id, err),
        },
        Ok(SystemWindowTarget::Styleguide) => match open_styleguide(app) {
            Ok(()) => IpcResponse::ok(request_id, ()),
            Err(err) => IpcResponse::err(request_id, err),
        },
        Err(err) => IpcResponse::err(request_id, err),
    };
    Ok(response)
}

fn to_string<E: std::fmt::Display>(error: E) -> String {
    error.to_string()
}

#[cfg(test)]
#[path = "../tests/windows_tests.rs"]
mod tests;
