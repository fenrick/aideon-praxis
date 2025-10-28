//! Aideon Praxis Tauri host entrypoint and IPC commands.
//!
//! Responsibilities:
//! - Show a splashscreen while performing host/worker setup.
//! - Initialize the Rust temporal engine used by the renderer to exercise the
//!   time APIs.
//! - Expose minimal, typed Tauri commands used by the renderer (no backend
//!   logic in the renderer).
//! - Keep boundaries strict: renderer ↔ host via IPC; host ↔ worker modules via
//!   typed adapters.
//!
//! Notes:
//! - Desktop mode opens no TCP ports; execution happens in-process via Rust
//!   crates and can later swap to remote adapters without touching the UI.
//! - We prefer simple, testable helpers over complex setup flows to align with
//!   the splashscreen guide and keep startup deterministic.
//!
//! Design Decisions:
//! - Use a single `invoke_handler` listing to avoid command registration
//!   conflicts when adding features like the splashscreen handler.
//! - Inject shared state via `tauri::State` instead of repeated `AppHandle`
//!   lookups to make commands easier to test and reason about.
//! - Keep engines behind simple structs (`WorkerState`) so we can later inject
//!   adapters (local vs remote) without revisiting command bindings.

mod menu;
mod setup;
mod temporal;
mod windows;
mod worker;

use std::sync::Mutex;

pub use core_data::temporal::{StateAtArgs, StateAtResult};

use tauri::async_runtime::spawn;

use crate::menu::build_menu;
use crate::setup::{SetupState, get_setup_state, run_backend_setup, set_complete};
use crate::temporal::temporal_state_at;
use crate::windows::{create_windows, open_about, open_settings, open_status, open_styleguide};

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
                "debug.styleguide" => {
                    let _ = open_styleguide(app.clone());
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
        .invoke_handler(tauri::generate_handler![
            greet,
            set_complete,
            temporal_state_at,
            open_about,
            open_settings,
            open_status,
            open_styleguide,
            get_setup_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
