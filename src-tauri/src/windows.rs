#[cfg(target_os = "windows")]
use log::warn;
use serde::Deserialize;
use specta::Type;
#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;
use tauri::webview::PageLoadEvent;
use tauri::{App, AppHandle, Manager, Runtime, WebviewUrl, WebviewWindowBuilder};

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

    let main_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::App(ROUTE_MAIN.into()))
        .title("Aideon")
        .visible(false)
        .inner_size(1060.0, 720.0)
        .center();
    // Unified native chrome: traffic lights float over the app's own top bar.
    // macOS-only; Windows keeps its Mica treatment below.
    #[cfg(target_os = "macos")]
    let main_builder = main_builder
        .title_bar_style(TitleBarStyle::Overlay)
        .hidden_title(true);
    let main = main_builder;

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

/// Declarative description of a system window: everything that varies between
/// the `open_*` commands, so they can share one focus-or-build routine.
struct SystemWindowSpec {
    label: &'static str,
    route: &'static str,
    title: &'static str,
    resizable: bool,
    always_on_top: bool,
    inner_size: (f64, f64),
}

const SETTINGS_WINDOW: SystemWindowSpec = SystemWindowSpec {
    label: "settings",
    route: ROUTE_SETTINGS,
    title: "Preferences",
    resizable: false,
    always_on_top: false,
    inner_size: (520.0, 440.0),
};

const ABOUT_WINDOW: SystemWindowSpec = SystemWindowSpec {
    label: "about",
    route: ROUTE_ABOUT,
    title: "About Aideon",
    resizable: false,
    always_on_top: false,
    inner_size: (420.0, 300.0),
};

const STATUS_WINDOW: SystemWindowSpec = SystemWindowSpec {
    label: "status",
    route: ROUTE_STATUS,
    title: "Status",
    resizable: false,
    always_on_top: true,
    inner_size: (360.0, 140.0),
};

const STYLEGUIDE_WINDOW: SystemWindowSpec = SystemWindowSpec {
    label: "styleguide",
    route: ROUTE_STYLEGUIDE,
    title: "UI Style Guide",
    resizable: true,
    always_on_top: false,
    inner_size: (900.0, 700.0),
};

/// Focus an existing window with `spec.label`, or build it from `spec`.
fn open_system_window<R: Runtime>(
    app: &AppHandle<R>,
    spec: &SystemWindowSpec,
) -> Result<(), HostError> {
    if let Some(window) = app.get_webview_window(spec.label) {
        let _ = window.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(app, spec.label, WebviewUrl::App(spec.route.into()))
        .title(spec.title)
        .resizable(spec.resizable)
        .always_on_top(spec.always_on_top)
        .inner_size(spec.inner_size.0, spec.inner_size.1)
        .center()
        .build()
        .map(|_| ())
        .map_err(|err| HostError::internal(err.to_string()))
}

#[tauri::command]
#[specta::specta]
pub fn open_settings<R: Runtime>(app: AppHandle<R>) -> Result<(), HostError> {
    open_system_window(&app, &SETTINGS_WINDOW)
}

#[tauri::command]
#[specta::specta]
pub fn open_about<R: Runtime>(app: AppHandle<R>) -> Result<(), HostError> {
    open_system_window(&app, &ABOUT_WINDOW)
}

#[tauri::command]
#[specta::specta]
pub fn open_status<R: Runtime>(app: AppHandle<R>) -> Result<(), HostError> {
    open_system_window(&app, &STATUS_WINDOW)
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
    open_system_window(&app, &STYLEGUIDE_WINDOW)
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
