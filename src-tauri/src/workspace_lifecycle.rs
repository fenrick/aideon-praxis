//! M0 workspace-lifecycle commands: create / open / close / status through the
//! typed host boundary. The host owns the single open [`Engine`] and all OS
//! access; the renderer crosses via typed IPC only. Long rebuilds run as
//! accepted work — added in a later increment ([workspace-lifecycle](../../docs/05-modules/host/workspace-lifecycle.md)).

use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use aideon_engine::{
    EdgeRecord, Engine, MetaTypeInfo, NodeRecord, ObjectInspection, PropertyDelta, ResolvedEntity,
    StoreError, Viewpoint, WorkspaceStatus,
};
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::{AppHandle, Emitter, Runtime, State};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::ipc::{EmptyPayload, HostError, IpcRequest, IpcResponse};
use crate::jobs::{
    AcceptedJob, EVENT_LIFECYCLE_CHANGED, EVENT_READY_READ_WRITE, EVENT_RUN_TERMINAL,
    LifecycleState, RunTerminalEvent, WorkspaceLifecycleEvent, WorkspaceReadinessEvent,
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
    /// True while a task-first authoring job holds the single writer.
    authoring: Arc<AtomicBool>,
    /// Session deduplication index for accepted authoring intent keys.
    accepted_authoring: Arc<Mutex<HashMap<String, AcceptedAuthoring>>>,
}

#[derive(Clone)]
struct AcceptedAuthoring {
    job: AcceptedJob,
    payload: ApplyChangeEventPayload,
}

/// One task-first authoring action accepted by the M1 host seam.
#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Type)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ChangeEventAction {
    CreateEntity(CreateEntityAction),
    CreateRelationship(CreateRelationshipAction),
}

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateEntityAction {
    pub type_id: String,
    #[serde(default)]
    pub props: std::collections::HashMap<String, String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateRelationshipAction {
    pub rel_type: String,
    pub src_id: String,
    pub dst_id: String,
    #[serde(default)]
    pub props: std::collections::HashMap<String, String>,
}

/// Accepted Change Event submission. The rationale becomes canonical metadata.
#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ApplyChangeEventPayload {
    pub rationale: String,
    pub action: ChangeEventAction,
}

/// Shared-inspector lookup at the active viewpoint.
#[derive(Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct InspectObjectPayload {
    pub object_id: String,
    pub viewpoint: Viewpoint,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AuthoringRunLedger {
    run_id: String,
    queue_class: &'static str,
    idempotency_key: String,
    accepted_at: String,
    status: &'static str,
    error_code: Option<String>,
}

fn write_run_ledger(path: &Path, ledger: &AuthoringRunLedger) -> std::io::Result<()> {
    let parent = path.parent().expect("run ledger has a parent");
    fs::create_dir_all(parent)?;
    let temp = parent.join(format!(".run-{}.tmp", Uuid::new_v4()));
    let bytes = serde_json::to_vec(ledger).map_err(std::io::Error::other)?;
    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temp)?;
    file.write_all(&bytes)?;
    file.sync_all()?;
    fs::rename(&temp, path)?;
    OpenOptions::new().read(true).open(parent)?.sync_all()?;
    Ok(())
}

struct AuthoringJobContext<R: Runtime> {
    app: AppHandle<R>,
    open: Arc<Mutex<Option<Engine>>>,
    authoring: Arc<AtomicBool>,
    run_id: String,
    correlation_id: String,
    ledger_path: PathBuf,
    accepted_at: String,
    idempotency_key: String,
}

fn spawn_authoring<R: Runtime>(context: AuthoringJobContext<R>, payload: ApplyChangeEventPayload) {
    tauri::async_runtime::spawn(async move {
        let result = apply_authoring(&context.open, payload).await;
        finish_authoring(context, result);
    });
}

async fn apply_authoring(
    open: &Mutex<Option<Engine>>,
    payload: ApplyChangeEventPayload,
) -> Result<(), HostError> {
    let mut guard = open.lock().await;
    let engine = guard
        .as_mut()
        .ok_or_else(|| HostError::new("WORKSPACE_NOT_OPEN", "no workspace is open"))?;
    let ApplyChangeEventPayload { rationale, action } = payload;
    match action {
        ChangeEventAction::CreateEntity(CreateEntityAction { type_id, props }) => engine
            .author_typed_node_with_rationale(&type_id, string_props(props), rationale)
            .map(|_| ())
            .map_err(map_store_error),
        ChangeEventAction::CreateRelationship(CreateRelationshipAction {
            rel_type,
            src_id,
            dst_id,
            props,
        }) => engine
            .author_typed_edge_with_rationale(
                aideon_engine::TypedEdgeRequest {
                    rel_type: &rel_type,
                    src_id: &src_id,
                    dst_id: &dst_id,
                    props: string_props(props),
                },
                rationale,
            )
            .map(|_| ())
            .map_err(map_store_error),
    }
}

fn finish_authoring<R: Runtime>(context: AuthoringJobContext<R>, result: Result<(), HostError>) {
    let error_code = result.as_ref().err().map(|error| error.code.to_string());
    let status = if result.is_ok() {
        "succeeded"
    } else {
        "failed"
    };
    let _ = write_run_ledger(
        &context.ledger_path,
        &AuthoringRunLedger {
            run_id: context.run_id.clone(),
            queue_class: "authoring",
            idempotency_key: context.idempotency_key,
            accepted_at: context.accepted_at,
            status,
            error_code: error_code.clone(),
        },
    );
    let _ = context.app.emit(
        EVENT_RUN_TERMINAL,
        RunTerminalEvent {
            run_id: context.run_id,
            correlation_id: context.correlation_id,
            succeeded: result.is_ok(),
            error_code,
        },
    );
    context.authoring.store(false, Ordering::SeqCst);
}

fn string_props(props: std::collections::HashMap<String, String>) -> serde_json::Value {
    serde_json::Value::Object(
        props
            .into_iter()
            .map(|(key, value)| (key, serde_json::Value::String(value)))
            .collect(),
    )
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
            "WORKSPACE_LOCKED",
            "the workspace is open in another process",
        ),
        StoreError::WorkspaceFormatTooNew { .. } => {
            HostError::new("WORKSPACE_FORMAT_TOO_NEW", error.to_string())
        }
        StoreError::SchemaTooNew { .. } => HostError::new("SCHEMA_TOO_NEW", error.to_string()),
        StoreError::UnsupportedFeature(_) => {
            HostError::new("UNSUPPORTED_FEATURE", error.to_string())
        }
        StoreError::ForeignPartition { .. } => {
            HostError::new("FOREIGN_PARTITION", error.to_string())
        }
        StoreError::ScenarioUnsupported => {
            HostError::new("SCENARIO_UNSUPPORTED", error.to_string())
        }
        StoreError::IdentityCollision { .. } => {
            HostError::new("IDENTITY_COLLISION", error.to_string())
        }
        StoreError::Corruption(_) => HostError::new("WORKSPACE_CORRUPT", error.to_string()),
        // The validation message is authored to be safe to surface (no path/PII).
        StoreError::Validation { .. } => HostError::new("VALIDATION_FAILED", error.to_string()),
        StoreError::Io(io) if io.kind() == std::io::ErrorKind::NotFound => {
            HostError::new("WORKSPACE_NOT_FOUND", "workspace not found")
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
                .ok_or_else(|| HostError::new("WORKSPACE_NOT_OPEN", "no workspace is open"))?;
            engine.status().map_err(map_store_error)
        })
        .await,
    )
}

/// List the seed metamodel's authorable entity types and their attributes —
/// the palette the renderer offers ([golden-journey] step 2). Read-only; needs
/// no open workspace since the metamodel is embedded at build time.
#[tauri::command]
#[specta::specta]
pub async fn workspace_metamodel_types(
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<Vec<MetaTypeInfo>>, HostError> {
    Ok(command_envelope(
        "workspace_metamodel_types",
        request,
        |_payload| async move { Ok(Engine::metamodel_types_embedded()) },
    )
    .await)
}

/// Accept one task-first Change Event for background execution.
#[tauri::command]
#[specta::specta]
pub async fn workspace_apply_change_event(
    app: AppHandle,
    manager: State<'_, WorkspaceManager>,
    request: IpcRequest<ApplyChangeEventPayload>,
) -> Result<IpcResponse<AcceptedJob>, HostError> {
    workspace_apply_change_event_inner(app, manager, request).await
}

/// Runtime-generic implementation used by the real command and dispatch tests.
#[tauri::command]
pub async fn workspace_apply_change_event_inner<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, WorkspaceManager>,
    request: IpcRequest<ApplyChangeEventPayload>,
) -> Result<IpcResponse<AcceptedJob>, HostError> {
    let idempotency_key = request.idempotency_key.clone();
    let correlation_id = request.request_id.clone();
    Ok(command_envelope(
        "workspace_apply_change_event",
        request,
        move |payload| async move {
            let idempotency_key = idempotency_key
                .filter(|key| !key.trim().is_empty())
                .ok_or_else(|| {
                    HostError::new(
                        "VALIDATION_FAILED",
                        "idempotencyKey is required for Change Event authoring",
                    )
                })?;
            let mut accepted_jobs = manager.accepted_authoring.lock().await;
            if let Some(accepted) = accepted_jobs.get(&idempotency_key) {
                if accepted.payload != payload {
                    return Err(HostError::new(
                        "IDENTITY_COLLISION",
                        "idempotencyKey was already used for different authoring work",
                    ));
                }
                return Ok(accepted.job.clone());
            }
            let workspace_root = manager
                .open
                .lock()
                .await
                .as_ref()
                .map(|engine| engine.workspace_root().to_path_buf())
                .ok_or_else(|| HostError::new("WORKSPACE_NOT_OPEN", "no workspace is open"))?;
            if manager.authoring.swap(true, Ordering::SeqCst) {
                return Err(HostError::new(
                    "BACKPRESSURE",
                    "an authoring task is already running",
                ));
            }
            let run_id = Uuid::new_v4().to_string();
            let accepted_at = now_iso();
            let accepted = AcceptedJob::authoring(
                run_id.clone(),
                idempotency_key.clone(),
                accepted_at.clone(),
            );
            let ledger_path = workspace_root.join(&accepted.ledger_ref);
            if let Err(error) = write_run_ledger(
                &ledger_path,
                &AuthoringRunLedger {
                    run_id: run_id.clone(),
                    queue_class: "authoring",
                    idempotency_key: idempotency_key.clone(),
                    accepted_at: accepted_at.clone(),
                    status: "accepted",
                    error_code: None,
                },
            ) {
                manager.authoring.store(false, Ordering::SeqCst);
                return Err(HostError::internal(format!(
                    "write authoring ledger: {error}"
                )));
            }
            accepted_jobs.insert(
                accepted.idempotency_key.clone(),
                AcceptedAuthoring {
                    job: accepted.clone(),
                    payload: payload.clone(),
                },
            );
            drop(accepted_jobs);
            spawn_authoring(
                AuthoringJobContext {
                    app,
                    open: manager.open.clone(),
                    authoring: manager.authoring.clone(),
                    run_id,
                    correlation_id,
                    ledger_path,
                    accepted_at,
                    idempotency_key,
                },
                payload,
            );
            Ok(accepted)
        },
    )
    .await)
}

/// The projected relationship listing — the derived twin edge view.
#[tauri::command]
#[specta::specta]
pub async fn workspace_edges(
    manager: State<'_, WorkspaceManager>,
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<Vec<EdgeRecord>>, HostError> {
    Ok(
        command_envelope("workspace_edges", request, |_payload| async move {
            let guard = manager.open.lock().await;
            let engine = guard
                .as_ref()
                .ok_or_else(|| HostError::new("WORKSPACE_NOT_OPEN", "no workspace is open"))?;
            engine.edges().map_err(map_store_error)
        })
        .await,
    )
}

/// Inspect one entity or relationship with resolved values and provenance.
#[tauri::command]
#[specta::specta]
pub async fn workspace_inspect_object(
    manager: State<'_, WorkspaceManager>,
    request: IpcRequest<InspectObjectPayload>,
) -> Result<IpcResponse<ObjectInspection>, HostError> {
    Ok(
        command_envelope("workspace_inspect_object", request, |payload| async move {
            let guard = manager.open.lock().await;
            let engine = guard
                .as_ref()
                .ok_or_else(|| HostError::new("WORKSPACE_NOT_OPEN", "no workspace is open"))?;
            engine
                .inspect_object(&payload.object_id, &payload.viewpoint)
                .map_err(map_store_error)
        })
        .await,
    )
}

/// Payload for asserting one plan/actual claim at a valid time ([golden-journey]
/// step 4).
#[derive(Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SetClaimPayload {
    pub entity_id: String,
    pub type_id: String,
    pub attribute: String,
    pub value: String,
    /// `"plan"` or `"actual"`.
    pub layer: String,
    pub valid_from: i64,
    pub valid_to: Option<i64>,
}

/// Assert a slot value on a layer over a valid-time interval — a plan or actual
/// claim ([golden-journey] step 4). The value is validated against the
/// attribute's metamodel kind/enum before any operation is appended.
#[tauri::command]
#[specta::specta]
pub async fn workspace_set_claim(
    manager: State<'_, WorkspaceManager>,
    request: IpcRequest<SetClaimPayload>,
) -> Result<IpcResponse<()>, HostError> {
    Ok(
        command_envelope("workspace_set_claim", request, |payload| async move {
            let mut guard = manager.open.lock().await;
            let engine = guard
                .as_mut()
                .ok_or_else(|| HostError::new("WORKSPACE_NOT_OPEN", "no workspace is open"))?;
            engine
                .set_property_claim(aideon_engine::PropertyClaim {
                    entity_id: &payload.entity_id,
                    type_id: &payload.type_id,
                    attribute: &payload.attribute,
                    value: &payload.value,
                    layer: &payload.layer,
                    valid_from: payload.valid_from,
                    valid_to: payload.valid_to,
                })
                .map_err(map_store_error)
        })
        .await,
    )
}

/// Resolve the twin at a viewpoint — every entity with its slots' effective
/// values ([golden-journey] step 5).
#[tauri::command]
#[specta::specta]
pub async fn workspace_state_at(
    manager: State<'_, WorkspaceManager>,
    request: IpcRequest<Viewpoint>,
) -> Result<IpcResponse<Vec<ResolvedEntity>>, HostError> {
    Ok(
        command_envelope("workspace_state_at", request, |view| async move {
            let guard = manager.open.lock().await;
            let engine = guard
                .as_ref()
                .ok_or_else(|| HostError::new("WORKSPACE_NOT_OPEN", "no workspace is open"))?;
            engine.state_at(&view).map_err(map_store_error)
        })
        .await,
    )
}

/// Payload for a two-viewpoint diff ([golden-journey] step 6, [ADR-0008]).
#[derive(Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DiffPayload {
    pub before: Viewpoint,
    pub after: Viewpoint,
}

/// Compare the twin at two viewpoints, returning the slots whose resolved value
/// differs ([golden-journey] step 6).
#[tauri::command]
#[specta::specta]
pub async fn workspace_diff(
    manager: State<'_, WorkspaceManager>,
    request: IpcRequest<DiffPayload>,
) -> Result<IpcResponse<Vec<PropertyDelta>>, HostError> {
    Ok(
        command_envelope("workspace_diff", request, |payload| async move {
            let guard = manager.open.lock().await;
            let engine = guard
                .as_ref()
                .ok_or_else(|| HostError::new("WORKSPACE_NOT_OPEN", "no workspace is open"))?;
            engine
                .diff(&payload.before, &payload.after)
                .map_err(map_store_error)
        })
        .await,
    )
}

/// List the derived twin's projected nodes ([golden-journey] step 3 read-back).
#[tauri::command]
#[specta::specta]
pub async fn workspace_nodes(
    manager: State<'_, WorkspaceManager>,
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<Vec<NodeRecord>>, HostError> {
    Ok(
        command_envelope("workspace_nodes", request, |_payload| async move {
            let guard = manager.open.lock().await;
            let engine = guard
                .as_ref()
                .ok_or_else(|| HostError::new("WORKSPACE_NOT_OPEN", "no workspace is open"))?;
            engine.nodes().map_err(map_store_error)
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
                return Err(HostError::new("WORKSPACE_NOT_OPEN", "no workspace is open"));
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
