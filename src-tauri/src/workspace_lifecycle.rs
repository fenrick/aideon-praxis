//! M0 workspace-lifecycle commands: create / open / close / status through the
//! typed host boundary. The host owns the single open [`Engine`] and all OS
//! access; the renderer crosses via typed IPC only. Long rebuilds run as
//! accepted work — added in a later increment ([workspace-lifecycle](../../docs/05-modules/host/workspace-lifecycle.md)).

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use aideon_engine::{Engine, StoreError, WorkspaceStatus};
use serde::Deserialize;
use specta::Type;
use tauri::{AppHandle, Emitter, Runtime, State};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::ipc::{EmptyPayload, HostError, IpcRequest, IpcResponse};
use crate::jobs::{
    AcceptedJob, EVENT_LIFECYCLE_CHANGED, EVENT_READY_READ_WRITE, LifecycleState,
    WorkspaceLifecycleEvent, WorkspaceReadinessEvent,
};
use crate::telemetry::command_envelope;

/// Holds the single open workspace for the session — the host's single-writer
/// hold on the canonical material. The engine lives behind an `Arc<Mutex<…>>` so
/// the rebuild job can run off the IPC call thread.
#[derive(Default, Clone)]
pub struct WorkspaceManager {
    open: Arc<Mutex<Option<Engine>>>,
    /// True while a rebuild job is in flight — the M0 backpressure signal.
    rebuilding: Arc<AtomicBool>,
}

/// ISO-8601 acceptance timestamp for an accepted job.
fn now_iso() -> String {
    time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_default()
}

/// Announce a lifecycle state transition to the workspace window.
fn emit_lifecycle<R: Runtime>(
    app: &AppHandle<R>,
    workspace_id: String,
    state: LifecycleState,
    job_id: Option<String>,
    error_code: Option<String>,
    correlation_id: String,
) {
    let _ = app.emit(
        EVENT_LIFECYCLE_CHANGED,
        WorkspaceLifecycleEvent {
            workspace_id,
            state,
            job_id,
            error_code,
            correlation_id,
        },
    );
}

/// Run the foundation rebuild off the IPC call: wipe the derived runtime, replay
/// canonical material, and only then publish proof-carrying read-write
/// readiness. A rebuild failure leaves the workspace closed (canonical files
/// untouched) and transitions to recovery, never read-write ([ADR-0040]).
fn spawn_rebuild<R: Runtime>(
    app: AppHandle<R>,
    open: Arc<Mutex<Option<Engine>>>,
    rebuilding: Arc<AtomicBool>,
    run_id: String,
    correlation_id: String,
) {
    tauri::async_runtime::spawn(async move {
        let mut guard = open.lock().await;
        let engine = match guard.take() {
            Some(engine) => engine,
            None => {
                rebuilding.store(false, Ordering::SeqCst);
                return;
            }
        };
        let workspace_id = engine
            .status()
            .map(|status| status.workspace_id)
            .unwrap_or_default();
        emit_lifecycle(
            &app,
            workspace_id.clone(),
            LifecycleState::Rebuilding,
            Some(run_id.clone()),
            None,
            correlation_id.clone(),
        );

        match engine.rebuild() {
            Ok(rebuilt) => {
                let status = rebuilt.status();
                *guard = Some(rebuilt);
                drop(guard);
                match status {
                    Ok(status) => {
                        // Proof-carrying readiness: the event carries the hash
                        // the rebuilt foundation became ready against.
                        let _ = app.emit(
                            EVENT_READY_READ_WRITE,
                            WorkspaceReadinessEvent::read_write(
                                status.workspace_id.clone(),
                                run_id.clone(),
                                status.foundation_rebuild_hash,
                                Uuid::new_v4().to_string(),
                                correlation_id.clone(),
                            ),
                        );
                        emit_lifecycle(
                            &app,
                            status.workspace_id,
                            LifecycleState::ReadyReadWrite,
                            Some(run_id),
                            None,
                            correlation_id,
                        );
                    }
                    Err(error) => {
                        let mapped = map_store_error(error);
                        emit_lifecycle(
                            &app,
                            workspace_id,
                            LifecycleState::RecoveryReadOnly,
                            Some(run_id),
                            Some(mapped.code.to_string()),
                            correlation_id,
                        );
                    }
                }
            }
            Err(error) => {
                // `rebuild` consumed the engine; the workspace is now closed.
                drop(guard);
                let mapped = map_store_error(error);
                emit_lifecycle(
                    &app,
                    workspace_id,
                    LifecycleState::RecoveryReadOnly,
                    Some(run_id),
                    Some(mapped.code.to_string()),
                    correlation_id,
                );
            }
        }
        rebuilding.store(false, Ordering::SeqCst);
    });
}

/// Payload for create/open: the host-resolved workspace root.
#[derive(Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct OpenWorkspacePayload {
    pub root: String,
}

/// Map a storage error to the stable host error catalogue (M0 start of #287).
/// Known, user-actionable errors keep a stable code + safe message; internal /
/// unclassified errors map to `internal_error`, which the command envelope
/// redacts before it reaches the renderer.
pub(crate) fn map_store_error(error: StoreError) -> HostError {
    match &error {
        StoreError::WorkspaceLocked => HostError::new(
            "workspace_locked",
            "the workspace is open in another process",
        ),
        StoreError::WorkspaceFormatTooNew { .. } => {
            HostError::new("workspace_format_too_new", error.to_string())
        }
        StoreError::SchemaTooNew { .. } => HostError::new("schema_too_new", error.to_string()),
        StoreError::UnsupportedFeature(_) => {
            HostError::new("unsupported_feature", error.to_string())
        }
        StoreError::ForeignPartition { .. } => {
            HostError::new("foreign_partition", error.to_string())
        }
        StoreError::ScenarioUnsupported => {
            HostError::new("scenario_unsupported", error.to_string())
        }
        StoreError::IdentityCollision { .. } => {
            HostError::new("identity_collision", error.to_string())
        }
        StoreError::Corruption(_) => HostError::new("workspace_corrupt", error.to_string()),
        StoreError::Io(io) if io.kind() == std::io::ErrorKind::NotFound => {
            HostError::new("workspace_not_found", "workspace not found")
        }
        // Internal / unclassified — detail stays in logs; the envelope redacts.
        StoreError::Io(_) | StoreError::Core(_) | StoreError::Runtime(_) | StoreError::Json(_) => {
            HostError::internal(error.to_string())
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn workspace_create(
    manager: State<'_, WorkspaceManager>,
    request: IpcRequest<OpenWorkspacePayload>,
) -> Result<IpcResponse<WorkspaceStatus>, HostError> {
    Ok(
        command_envelope("workspace_create", request, |payload| async move {
            let engine = Engine::create(&payload.root, None).map_err(map_store_error)?;
            let status = engine.status().map_err(map_store_error)?;
            *manager.open.lock().await = Some(engine);
            Ok(status)
        })
        .await,
    )
}

#[tauri::command]
#[specta::specta]
pub async fn workspace_open(
    manager: State<'_, WorkspaceManager>,
    request: IpcRequest<OpenWorkspacePayload>,
) -> Result<IpcResponse<WorkspaceStatus>, HostError> {
    Ok(
        command_envelope("workspace_open", request, |payload| async move {
            let engine = Engine::open(&payload.root).map_err(map_store_error)?;
            let status = engine.status().map_err(map_store_error)?;
            *manager.open.lock().await = Some(engine);
            Ok(status)
        })
        .await,
    )
}

#[tauri::command]
#[specta::specta]
pub async fn workspace_status(
    manager: State<'_, WorkspaceManager>,
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<WorkspaceStatus>, HostError> {
    Ok(
        command_envelope("workspace_status", request, |_payload| async move {
            let guard = manager.open.lock().await;
            let engine = guard
                .as_ref()
                .ok_or_else(|| HostError::new("workspace_not_open", "no workspace is open"))?;
            engine.status().map_err(map_store_error)
        })
        .await,
    )
}

#[tauri::command]
#[specta::specta]
pub async fn workspace_close(
    manager: State<'_, WorkspaceManager>,
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<()>, HostError> {
    Ok(
        command_envelope("workspace_close", request, |_payload| async move {
            *manager.open.lock().await = None;
            Ok(())
        })
        .await,
    )
}

/// Rebuild the derived foundation runtime as accepted work ([ADR-0040]).
/// Returns an [`AcceptedJob`] immediately (never a blocking response); the
/// rebuild runs off-thread and publishes proof-carrying readiness when the
/// foundation projections complete. Read-write is withheld until then.
#[tauri::command]
#[specta::specta]
pub async fn workspace_rebuild(
    app: AppHandle,
    manager: State<'_, WorkspaceManager>,
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<AcceptedJob>, HostError> {
    workspace_rebuild_inner(app, manager, request).await
}

/// Generic over the runtime so the rebuild flow (and its emitted lifecycle /
/// readiness events) is dispatch-testable under `MockRuntime`; the registered
/// `workspace_rebuild` is the concrete-`Wry` wrapper for the codegen seam.
#[tauri::command]
pub async fn workspace_rebuild_inner<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, WorkspaceManager>,
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<AcceptedJob>, HostError> {
    let correlation_id = request.request_id.clone();
    Ok(
        command_envelope("workspace_rebuild", request, move |_payload| async move {
            if manager.open.lock().await.is_none() {
                return Err(HostError::new("workspace_not_open", "no workspace is open"));
            }
            // Backpressure: M0 admits a single rebuild at a time.
            if manager.rebuilding.swap(true, Ordering::SeqCst) {
                return Err(HostError::new(
                    "BACKPRESSURE",
                    "a workspace rebuild is already running",
                ));
            }
            let run_id = Uuid::new_v4().to_string();
            let accepted = AcceptedJob::rebuild(run_id.clone(), correlation_id.clone(), now_iso());
            spawn_rebuild(
                app.clone(),
                manager.open.clone(),
                manager.rebuilding.clone(),
                run_id,
                correlation_id.clone(),
            );
            Ok(accepted)
        })
        .await,
    )
}

#[cfg(test)]
#[path = "../tests/internal/workspace_lifecycle_tests.rs"]
mod tests;
