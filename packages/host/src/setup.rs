use std::sync::Mutex;
use std::time::Duration as StdDuration;

use log::{error, info, warn};
use serde::Serialize;
use tauri::{AppHandle, Manager, State, Wry};

use crate::worker::init_temporal;

#[derive(Default)]
pub struct SetupState {
    frontend_task: bool,
    backend_task: bool,
}

impl SetupState {
    pub fn new() -> Self {
        Self::default()
    }
}

#[derive(Serialize)]
pub struct SetupFlags {
    frontend: bool,
    backend: bool,
}

#[tauri::command]
pub async fn set_complete(
    app: AppHandle<Wry>,
    state: State<'_, Mutex<SetupState>>,
    task: String,
) -> Result<(), String> {
    let mut state_lock = state.lock().unwrap();

    match task.as_str() {
        "frontend" => {
            info!("host: set_complete(frontend)");
            state_lock.frontend_task = true;
        }
        "backend" => {
            info!("host: set_complete(backend)");
            state_lock.backend_task = true;
        }
        other => {
            warn!("host: set_complete called with invalid task '{other}'");
            return Err("invalid task".into());
        }
    }

    if state_lock.backend_task && state_lock.frontend_task {
        info!("host: setup complete; closing splash and showing main window");
        if let Some(splash) = app.get_webview_window("splash") {
            let _ = splash.close();
        }
        if let Some(main_window) = app.get_webview_window("main") {
            if let Err(error) = main_window.show() {
                warn!("host: failed showing main window: {error}");
            }
            let _ = main_window.set_focus();
        } else {
            warn!("host: main window not found when completing setup");
        }
    }

    Ok(())
}

#[tauri::command]
pub fn get_setup_state(state: State<'_, Mutex<SetupState>>) -> Result<SetupFlags, String> {
    let state = state.lock().unwrap();
    Ok(SetupFlags {
        frontend: state.frontend_task,
        backend: state.backend_task,
    })
}

pub async fn run_backend_setup(app: AppHandle<Wry>) -> Result<(), String> {
    init_temporal(&app).await?;

    info!("Performing really heavy backend setup task...");
    tokio::time::sleep(StdDuration::from_secs(3)).await;
    info!("Backend setup task completed!");

    if let Err(error_message) = set_complete(
        app.clone(),
        app.state::<Mutex<SetupState>>(),
        "backend".to_string(),
    )
    .await
    {
        error!("host: set_complete backend failed: {error_message}");
        return Err(error_message);
    }

    Ok(())
}
