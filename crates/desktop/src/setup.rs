use std::sync::Mutex;
use std::time::{Duration, Instant};

use log::{error, info, warn};
use serde::Deserialize;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, Runtime, State, Wry};

use crate::contracts::{
    EVENT_SETUP_BACKEND_READY, EVENT_SETUP_FRONTEND_READY_ACK, EVENT_SETUP_PROGRESS,
};
use crate::ipc::{EmptyPayload, HostError, IpcRequest, IpcResponse};
use crate::worker::init_temporal;

pub struct SetupState {
    frontend_task: bool,
    backend_task: bool,
    started_at: Instant,
    close_scheduled: bool,
}

impl SetupState {
    pub fn new() -> Self {
        Self {
            frontend_task: false,
            backend_task: false,
            started_at: Instant::now(),
            close_scheduled: false,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SetupTask {
    Frontend,
    Backend,
}

fn parse_task(task: &str) -> Option<SetupTask> {
    match task {
        "frontend" => Some(SetupTask::Frontend),
        "backend" => Some(SetupTask::Backend),
        _ => None,
    }
}

fn mark_complete(state: &mut SetupState, task: SetupTask) {
    match task {
        SetupTask::Frontend => state.frontend_task = true,
        SetupTask::Backend => state.backend_task = true,
    }
}

fn emit_setup_event<R: Runtime>(app: &AppHandle<R>, event: &str, payload: serde_json::Value) {
    for window_id in ["splash", "main"] {
        if let Some(window) = app.get_webview_window(window_id) {
            let _ = window.emit(event, payload.clone());
        }
    }
}

pub fn emit_setup_progress<R: Runtime>(app: &AppHandle<R>, phase: &'static str) {
    emit_setup_event(app, EVENT_SETUP_PROGRESS, serde_json::json!({ "phase": phase }));
}

fn all_complete(state: &SetupState) -> bool {
    state.backend_task && state.frontend_task
}

fn close_delay(state: &SetupState) -> Duration {
    const MIN_SPLASH: Duration = Duration::from_secs(3);
    let elapsed = state.started_at.elapsed();
    MIN_SPLASH.checked_sub(elapsed).unwrap_or_default()
}

#[derive(Serialize)]
pub struct SetupFlags {
    frontend: bool,
    backend: bool,
}

#[tauri::command]
pub async fn set_complete<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, Mutex<SetupState>>,
    task: String,
) -> Result<(), HostError> {
    let mut state_lock = state.lock().unwrap();

    let parsed = parse_task(task.as_str()).ok_or_else(|| {
        warn!("host: set_complete called with invalid task '{task}'");
        HostError::invalid_input("invalid task")
    })?;
    let was_frontend = state_lock.frontend_task;
    let was_backend = state_lock.backend_task;
    info!(
        "host: set_complete({task}) frontend={} backend={}",
        state_lock.frontend_task, state_lock.backend_task
    );
    mark_complete(&mut state_lock, parsed);

    match parsed {
        SetupTask::Backend if !was_backend => emit_setup_event(&app, EVENT_SETUP_BACKEND_READY, serde_json::json!({})),
        SetupTask::Frontend if !was_frontend => {
            emit_setup_event(&app, EVENT_SETUP_FRONTEND_READY_ACK, serde_json::json!({}));
        }
        _ => {}
    }

    if all_complete(&state_lock) && !state_lock.close_scheduled {
        state_lock.close_scheduled = true;
        let delay = close_delay(&state_lock);
        info!(
            "host: setup complete; showing main window after {:?} delay",
            delay
        );
        let app_handle = app.clone();
        tauri::async_runtime::spawn(async move {
            if !delay.is_zero() {
                tokio::time::sleep(delay).await;
            }
            if let Some(splash) = app_handle.get_webview_window("splash") {
                let _ = splash.close();
            }
            if let Some(main_window) = app_handle.get_webview_window("main") {
                if let Err(error) = main_window.show() {
                    warn!("host: failed showing main window: {error}");
                }
                let _ = main_window.set_focus();
            } else {
                warn!("host: main window not found when completing setup");
            }
        });
    }

    Ok(())
}

#[tauri::command]
pub fn get_setup_state(state: State<'_, Mutex<SetupState>>) -> Result<SetupFlags, HostError> {
    let state = state.lock().unwrap();
    Ok(SetupFlags {
        frontend: state.frontend_task,
        backend: state.backend_task,
    })
}

pub async fn run_backend_setup(app: AppHandle<Wry>) -> Result<(), HostError> {
    info!("host: backend setup started");
    init_temporal(&app).await.map_err(HostError::internal)?;

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

    info!("host: backend setup marked complete");
    Ok(())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetupCompletePayload {
    pub task: String,
}

/// Namespaced + requestId-wrapped setup completion signal.
#[tauri::command]
pub async fn system_setup_complete<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, Mutex<SetupState>>,
    request: IpcRequest<SetupCompletePayload>,
) -> Result<IpcResponse<()>, HostError> {
    let request_id = request.request_id;
    let response = match set_complete(app, state, request.payload.task).await {
        Ok(()) => IpcResponse::ok(request_id, ()),
        Err(err) => IpcResponse::err(request_id, err),
    };
    Ok(response)
}

/// Namespaced + requestId-wrapped setup state query.
#[tauri::command]
pub fn system_setup_state(
    state: State<'_, Mutex<SetupState>>,
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<SetupFlags>, HostError> {
    let request_id = request.request_id;
    let response = match get_setup_state(state) {
        Ok(flags) => IpcResponse::ok(request_id, flags),
        Err(err) => IpcResponse::err(request_id, err),
    };
    Ok(response)
}

#[cfg(test)]
#[path = "../tests/internal/setup_tests.rs"]
mod tests;
