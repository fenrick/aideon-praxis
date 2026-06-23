//! M0 workspace-lifecycle commands: create / open / close / status through the
//! typed host boundary. The host owns the single open [`Engine`] and all OS
//! access; the renderer crosses via typed IPC only. Long rebuilds run as
//! accepted work — added in a later increment ([workspace-lifecycle](../../docs/05-modules/host/workspace-lifecycle.md)).

use aideon_engine::{Engine, StoreError, WorkspaceStatus};
use serde::Deserialize;
use tauri::State;
use tokio::sync::Mutex;

use crate::ipc::{EmptyPayload, HostError, IpcRequest, IpcResponse};
use crate::telemetry::command_envelope;

/// Holds the single open workspace for the session — the host's single-writer
/// hold on the canonical material.
#[derive(Default)]
pub struct WorkspaceManager {
    open: Mutex<Option<Engine>>,
}

/// Payload for create/open: the host-resolved workspace root.
#[derive(Debug, Deserialize)]
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

#[cfg(test)]
#[path = "../tests/internal/workspace_lifecycle_tests.rs"]
mod tests;
