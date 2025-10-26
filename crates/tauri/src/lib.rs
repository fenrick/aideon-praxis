//! Aideon Praxis Tauri host entrypoint and IPC commands.
//!
//! Responsibilities:
//! - Show a splashscreen while performing host/worker setup.
//! - Spawn and health-check the Python worker over Unix Domain Socket (UDS).
//! - Expose minimal, typed Tauri commands used by the renderer (no backend
//!   logic in the renderer).
//! - Keep boundaries strict: renderer ↔ host via IPC; host ↔ worker via UDS.
//!
//! Notes:
//! - Desktop mode opens no TCP ports; the worker is reachable only through a
//!   filesystem socket path stored in [`worker::WorkerState`].
//! - We prefer simple, testable helpers over complex setup flows to align with
//!   the splashscreen guide and keep startup deterministic.
//!
//! Design Decisions:
//! - Use a single `invoke_handler` listing to avoid command registration
//!   conflicts when adding features like the splashscreen handler.
//! - Inject shared state via `tauri::State` instead of repeated `AppHandle`
//!   lookups to make commands easier to test and reason about.
//! - Prefer Unix Domain Sockets over TCP for the worker in desktop mode to
//!   preserve the "no open ports" security posture and simplify firewalling.
//! - Poll worker readiness via `/ping` with a short timeout to fail fast during
//!   startup; keep the timeout conservative (5s) so the splashscreen doesn't
//!   appear stuck.

mod menu;
mod setup;
mod temporal;
mod windows;
mod worker;

use std::sync::Mutex;

use tauri::async_runtime::spawn;

use crate::menu::build_menu;
use crate::setup::{get_setup_state, run_backend_setup, set_complete, SetupState};
use crate::temporal::temporal_state_at;
use crate::windows::{create_windows, open_about, open_settings, open_status};

/// Simple sample command used by tests and smoke checks.
#[tauri::command]
fn greet(name: String) -> String {
    format!("Hello {name} from Rust!")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .clear_targets()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .build(),
        )
        .manage(Mutex::new(SetupState::new()))
        .setup(|app| {
            build_menu(app)?;

            app.on_menu_event(|app, event| match event.id().as_ref() {
                "about" => {
                    let _ = open_about(app.clone());
                }
                "preferences" => {
                    let _ = open_settings(app.clone());
                }
                "help.about" => {
                    let _ = open_about(app.clone());
                }
                "file.quit" => {
                    app.exit(0);
                }
                _ => {}
            });

            create_windows(app)?;

            let app_handle = app.handle().clone();
            spawn(async move {
                if let Err(error) = run_backend_setup(app_handle).await {
                    log::error!("host: backend setup failed: {error}");
                }
            });

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            set_complete,
            temporal_state_at,
            open_about,
            open_settings,
            open_status,
            get_setup_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
