use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use log::{error, info, warn};
use serde::Deserialize;
use serde::Serialize;
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager, Runtime, State, Wry};

use crate::contracts::{
    EVENT_SETUP_BACKEND_READY, EVENT_SETUP_FAILED, EVENT_SETUP_FRONTEND_READY_ACK,
    EVENT_SETUP_PROGRESS, EVENT_SETUP_SEED_SUMMARY,
};
use crate::ipc::{EmptyPayload, HostError, IpcRequest, IpcResponse};
use crate::log_event;
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
    log_event!(
        severity = 5,
        component = "core",
        event = "setup_progress",
        message = "setup progress update",
        correlation_id = "setup",
        metadata = json!({ "phase": phase })
    );
    emit_setup_event(
        app,
        EVENT_SETUP_PROGRESS,
        serde_json::json!({ "phase": phase }),
    );
}

pub fn emit_setup_failed<R: Runtime>(app: &AppHandle<R>, error: &HostError) {
    log_event!(
        severity = 3,
        component = "core",
        event = "setup_failed",
        message = "setup failure",
        correlation_id = "setup",
        metadata = json!({ "code": error.code, "message": error.message })
    );
    emit_setup_event(
        app,
        EVENT_SETUP_FAILED,
        serde_json::json!({ "code": error.code, "message": error.message }),
    );
}

#[allow(dead_code)]
fn storage_root_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, HostError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|err| HostError::internal(err.to_string()))?;
    Ok(app_data_dir.join("AideonPraxis"))
}

#[allow(dead_code)]
pub(crate) async fn clear_storage_root(root: PathBuf) -> Result<(), HostError> {
    if root.exists() {
        tokio::fs::remove_dir_all(&root)
            .await
            .map_err(|err| HostError::internal(err.to_string()))?;
    }
    Ok(())
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

#[derive(Debug)]
pub struct SetupSeedSummary {
    pub dataset_version: String,
    pub metamodel_version: String,
}

pub fn emit_setup_seed_summary<R: Runtime>(app: &AppHandle<R>, summary: &SetupSeedSummary) {
    log_event!(
        severity = 5,
        component = "core",
        event = "setup_seed_summary",
        message = "setup seed summary recorded",
        correlation_id = "setup",
        metadata = json!({
            "dataset_version": summary.dataset_version,
            "metamodel_version": summary.metamodel_version,
        })
    );
    emit_setup_event(
        app,
        EVENT_SETUP_SEED_SUMMARY,
        serde_json::json!({
            "datasetVersion": summary.dataset_version,
            "metamodelVersion": summary.metamodel_version,
        }),
    );
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
        SetupTask::Backend if !was_backend => {
            emit_setup_event(&app, EVENT_SETUP_BACKEND_READY, serde_json::json!({}))
        }
        SetupTask::Frontend if !was_frontend => {
            emit_setup_event(&app, EVENT_SETUP_FRONTEND_READY_ACK, serde_json::json!({}));
        }
        _ => {}
    }

    if all_complete(&state_lock) && !state_lock.close_scheduled {
        state_lock.close_scheduled = true;
        log_event!(
            severity = 6,
            component = "core",
            event = "app_ready",
            message = "Setup complete and UI ready",
            correlation_id = "setup",
            metadata = json!({ "phase": "ready" })
        );
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
    if let Err(message) = init_temporal(&app).await {
        let error = HostError::internal(message);
        emit_setup_progress(&app, "failed");
        emit_setup_failed(&app, &error);
        return Err(error);
    }

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

#[allow(dead_code)]
const FACTORY_RESET_CONFIRMATION: &str = "CONFIRM-FACTORY-RESET";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct FactoryResetPayload {
    pub confirmation: String,
}

#[allow(dead_code)]
async fn perform_factory_reset<R: Runtime>(
    app: AppHandle<R>,
    request: &IpcRequest<FactoryResetPayload>,
) -> Result<(), HostError> {
    if request.payload.confirmation != FACTORY_RESET_CONFIRMATION {
        return Err(HostError::invalid_input(
            "factory reset requires explicit confirmation",
        ));
    }
    let storage_root = storage_root_path(&app)?;
    clear_storage_root(storage_root).await?;
    info!(
        "host: factory reset completed (request id: {})",
        request.request_id
    );
    Ok(())
}

/// Namespaced + requestId-wrapped factory reset command.
#[tauri::command]
#[allow(dead_code)]
pub async fn system_factory_reset<R: Runtime>(
    app: AppHandle<R>,
    request: IpcRequest<FactoryResetPayload>,
) -> Result<IpcResponse<()>, HostError> {
    let request_id = request.request_id.clone();
    let response = match perform_factory_reset(app, &request).await {
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
