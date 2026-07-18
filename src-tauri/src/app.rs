//! Tauri application setup and lifecycle management.

use std::panic;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use tauri::async_runtime::spawn;
use tokio::time::sleep;

use crate::log_event;
use crate::logging;
use crate::menu::{build_menu, handle_menu_event};
use crate::session_marker;
use crate::setup::{SetupState, emit_setup_progress, run_backend_setup};
use crate::windows::create_windows;
use once_cell::sync::OnceCell;
use serde_json::json;
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_log::{Target, TargetKind, log::LevelFilter};
use uuid::Uuid;

static SESSION_MARKER_PATH: OnceCell<PathBuf> = OnceCell::new();

pub fn run() {
    // The typed IPC surface is generated from the Rust commands (ADR-0039):
    // this builder both registers the handlers and is the source the TypeScript
    // client is generated from, so the registered set and the generated set
    // cannot drift.
    let ipc = crate::bindings::ipc_builder();
    tauri::Builder::default()
        .plugin(logging_plugin(log_level()))
        .manage(Mutex::new(SetupState::new()))
        .manage(crate::workspace_lifecycle::WorkspaceManager::default())
        .setup(|app| bootstrap(app))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(ipc.invoke_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    log_event!(
        severity = 5,
        component = "core",
        event = "app_shutdown",
        message = "Application shutting down",
        correlation_id = "shutdown"
    );
    let _ = clear_registered_session_marker();
}

/// Builds the `tauri-plugin-log` plugin with the host's standard targets.
fn logging_plugin<R: Runtime>(level: LevelFilter) -> tauri::plugin::TauriPlugin<R> {
    tauri_plugin_log::Builder::new()
        .targets([
            Target::new(TargetKind::Stdout),
            Target::new(TargetKind::LogDir { file_name: None }),
            Target::new(TargetKind::Webview),
        ])
        .level(level)
        .build()
}

/// Wires the menu, session state, windows, and backend setup during startup.
fn bootstrap(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    build_menu(app)?;
    app.on_menu_event(|app, event| {
        handle_menu_event(app, event);
    });

    let handle = app.handle().clone();
    initialise_session(&handle);

    create_windows(app)?;
    emit_setup_progress(&handle, "starting");

    log_event!(
        severity = 6,
        component = "core",
        event = "app_ready",
        message = "UI is ready for interaction",
        correlation_id = "startup"
    );

    spawn_backend_setup(handle);
    Ok(())
}

/// Establishes a new logging session, installs the panic hook, and records the
/// startup markers (including any detected unclean shutdown).
fn initialise_session<R: Runtime>(handle: &AppHandle<R>) {
    let previous_session = detect_previous_session(handle);
    let session_id = Uuid::new_v4().to_string();
    let _ = logging::init_context(session_id.clone());
    install_panic_hook();

    if let Some(previous) = previous_session {
        log_crash_detected(&previous);
    }

    persist_session_marker(handle, &session_id);

    log_event!(
        severity = 5,
        component = "core",
        event = "app_start",
        message = "Application bootstrap starting",
        correlation_id = "startup"
    );
}

/// Records that a previous session ended without a clean shutdown.
fn log_crash_detected(previous: &session_marker::SessionMarker) {
    log_event!(
        severity = 1,
        component = "core",
        event = "app_crash_detected",
        message = "Detected a previous unclean shutdown",
        correlation_id = "startup",
        metadata = json!({
            "previous_session_id": previous.session_id,
            "previous_timestamp": previous.timestamp
        })
    );
}

/// Persists the marker for the current session so a later unclean shutdown can
/// be detected on the next launch.
fn persist_session_marker<R: Runtime>(handle: &AppHandle<R>, session_id: &str) {
    let Some(marker_path) = session_marker_path(handle) else {
        return;
    };
    register_session_marker_path(marker_path.clone());
    if let Err(error) = session_marker::persist_marker(&marker_path, session_id) {
        log::warn!(
            "host: failed to persist session marker {}: {}",
            marker_path.display(),
            error
        );
    }
}

/// Spawns the deferred backend setup task after a short delay.
fn spawn_backend_setup(handle: AppHandle) {
    spawn(async move {
        sleep(Duration::from_millis(120)).await;
        if let Err(error) = run_backend_setup(handle).await {
            log::error!(
                "host: backend setup failed: {} ({})",
                error.message,
                error.code
            );
        }
    });
}

fn detect_previous_session<R: Runtime>(
    app: &AppHandle<R>,
) -> Option<session_marker::SessionMarker> {
    session_marker_path(app).and_then(|path| session_marker::previous_marker(&path))
}

fn register_session_marker_path(path: PathBuf) {
    let _ = SESSION_MARKER_PATH.set(path);
}

fn registered_session_marker_path() -> Option<&'static PathBuf> {
    SESSION_MARKER_PATH.get()
}

fn clear_registered_session_marker() -> std::io::Result<()> {
    if let Some(path) = registered_session_marker_path() {
        session_marker::clear_marker(path)?;
    }
    Ok(())
}

fn session_marker_path<R: Runtime>(app: &AppHandle<R>) -> Option<PathBuf> {
    app.path()
        .app_log_dir()
        .ok()
        .map(|log_dir| session_marker::path_for_log_dir(&log_dir))
}

fn install_panic_hook() {
    let previous_hook = panic::take_hook();
    panic::set_hook(Box::new(move |info: &std::panic::PanicHookInfo| {
        let payload = info.payload();
        let message = payload
            .downcast_ref::<&str>()
            .copied()
            .or_else(|| payload.downcast_ref::<String>().map(|s| s.as_str()))
            .unwrap_or("panic");
        let location = info.location();
        let metadata = json!({
            "panic.thread": std::thread::current().name().unwrap_or("unnamed"),
            "panic.message": message,
            "panic.file": location
                .map(|loc: &std::panic::Location<'_>| loc.file())
                .unwrap_or("unknown"),
            "panic.line": location
                .map(|loc: &std::panic::Location<'_>| loc.line())
                .unwrap_or(0),
        });
        log_event!(
            severity = 0,
            component = "core",
            event = "panic",
            message = "Application panic detected",
            correlation_id = "panic",
            metadata = metadata
        );
        previous_hook(info);
    }));
}

fn log_level() -> LevelFilter {
    if cfg!(debug_assertions) {
        LevelFilter::Debug
    } else {
        LevelFilter::Info
    }
}

#[cfg(test)]
#[path = "../tests/internal/app_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "../tests/internal/host_dispatch_tests.rs"]
mod host_dispatch_tests;
