//! Host-side temporal commands bridging renderer IPC calls to the worker engine.
//!
//! These commands remain thin so that all business logic stays within the worker
//! crate, reinforcing the boundary guidance spelled out in `AGENTS.md`.

use aideon_praxis::praxis::meta::MetaModelDocument;
use aideon_praxis::praxis::temporal::{
    BranchInfo, CommitChangesRequest, CommitChangesResponse, CommitSummary, CreateBranchRequest,
    DiffArgs, DiffSummary, ListBranchesResponse, ListCommitsResponse, MergeRequest, MergeResponse,
    StateAtArgs, StateAtResult, TopologyDeltaArgs, TopologyDeltaResult,
};
use aideon_praxis::praxis::{PraxisError, PraxisErrorCode};
use log::{debug, error, info};
use serde::Deserialize;
use specta::Type;
use std::time::Instant;
use tauri::State;

use crate::ipc::{EmptyPayload, HostError, IpcRequest, IpcResponse};
use crate::telemetry::command_envelope;
use crate::worker::WorkerState;

/// Namespaced + requestId-wrapped temporal state query.
#[tauri::command]
#[specta::specta]
pub async fn chrona_temporal_state_at(
    state: State<'_, WorkerState>,
    request: IpcRequest<StateAtArgs>,
) -> Result<IpcResponse<StateAtResult>, HostError> {
    Ok(
        command_envelope("chrona_temporal_state_at", request, |payload| {
            temporal_state_at_inner(state.engine(), payload)
        })
        .await,
    )
}

async fn temporal_state_at_inner(
    engine: &aideon_chrona::TemporalEngine,
    payload: StateAtArgs,
) -> Result<StateAtResult, HostError> {
    info!("host: temporal_state_at received");
    debug!("host: temporal_state_at payload={:?}", payload);

    let started = Instant::now();
    let output = engine.state_at(payload.clone()).await.map_err(host_error)?;
    let elapsed = started.elapsed();
    info!(
        "host: temporal_state_at ok nodes={} edges={} elapsed_ms={}",
        output.nodes,
        output.edges,
        elapsed.as_millis()
    );
    debug!("host: temporal_state_at completed result={:?}", output);
    Ok(output)
}

/// Namespaced + requestId-wrapped diff summary query.
#[tauri::command]
#[specta::specta]
pub async fn chrona_temporal_diff(
    state: State<'_, WorkerState>,
    request: IpcRequest<DiffArgs>,
) -> Result<IpcResponse<DiffSummary>, HostError> {
    Ok(
        command_envelope("chrona_temporal_diff", request, |payload| {
            temporal_diff_inner(state.engine(), payload)
        })
        .await,
    )
}

async fn temporal_diff_inner(
    engine: &aideon_chrona::TemporalEngine,
    payload: DiffArgs,
) -> Result<DiffSummary, HostError> {
    info!("host: temporal_diff received");
    debug!(
        "host: temporal_diff params from={:?} to={:?} scope={:?}",
        payload.from, payload.to, payload.scope
    );
    let summary = engine
        .diff_summary(payload.clone())
        .await
        .map_err(host_error)?;
    info!(
        "host: temporal_diff counts node_adds={} node_mods={} node_dels={} edge_adds={} edge_mods={} edge_dels={}",
        summary.node_adds,
        summary.node_mods,
        summary.node_dels,
        summary.edge_adds,
        summary.edge_mods,
        summary.edge_dels
    );
    debug!("host: temporal_diff completed summary={:?}", summary);
    Ok(summary)
}

async fn commit_changes(
    state: State<'_, WorkerState>,
    payload: CommitChangesRequest,
) -> Result<CommitChangesResponse, HostError> {
    let id = commit_changes_inner(state.engine(), payload).await?;
    Ok(CommitChangesResponse { id })
}

/// Namespaced + requestId-wrapped commit application command.
#[tauri::command]
#[specta::specta]
pub async fn chrona_temporal_commit_changes(
    state: State<'_, WorkerState>,
    request: IpcRequest<CommitChangesRequest>,
) -> Result<IpcResponse<CommitChangesResponse>, HostError> {
    Ok(
        command_envelope("chrona_temporal_commit_changes", request, |payload| {
            commit_changes(state, payload)
        })
        .await,
    )
}

#[derive(Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ListCommitsPayload {
    pub branch: String,
}

async fn commit_changes_inner(
    engine: &aideon_chrona::TemporalEngine,
    payload: CommitChangesRequest,
) -> Result<String, HostError> {
    engine.commit(payload).await.map_err(host_error)
}

pub async fn list_commits(
    state: State<'_, WorkerState>,
    branch: String,
) -> Result<ListCommitsResponse, HostError> {
    let commits = list_commits_inner(state.engine(), branch.clone()).await?;
    debug!(
        "host: list_commits branch={} count={}",
        branch,
        commits.len()
    );
    Ok(ListCommitsResponse { commits })
}

/// Namespaced + requestId-wrapped commit list query.
#[tauri::command]
#[specta::specta]
pub async fn chrona_temporal_list_commits(
    state: State<'_, WorkerState>,
    request: IpcRequest<ListCommitsPayload>,
) -> Result<IpcResponse<ListCommitsResponse>, HostError> {
    Ok(
        command_envelope("chrona_temporal_list_commits", request, |payload| {
            list_commits(state, payload.branch)
        })
        .await,
    )
}

async fn list_commits_inner(
    engine: &aideon_chrona::TemporalEngine,
    branch: String,
) -> Result<Vec<CommitSummary>, HostError> {
    engine.list_commits(branch).await.map_err(host_error)
}

/// Namespaced + requestId-wrapped branch creation command.
#[tauri::command]
#[specta::specta]
pub async fn chrona_temporal_create_branch(
    state: State<'_, WorkerState>,
    request: IpcRequest<CreateBranchRequest>,
) -> Result<IpcResponse<BranchInfo>, HostError> {
    Ok(
        command_envelope("chrona_temporal_create_branch", request, |payload| {
            create_branch_inner(state.engine(), payload)
        })
        .await,
    )
}

async fn create_branch_inner(
    engine: &aideon_chrona::TemporalEngine,
    payload: CreateBranchRequest,
) -> Result<BranchInfo, HostError> {
    engine
        .create_branch(payload.name.clone(), payload.from.clone())
        .await
        .map_err(host_error)
}

/// Namespaced + requestId-wrapped branch list query.
#[tauri::command]
#[specta::specta]
pub async fn chrona_temporal_list_branches(
    state: State<'_, WorkerState>,
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<ListBranchesResponse>, HostError> {
    Ok(command_envelope(
        "chrona_temporal_list_branches",
        request,
        |_payload| async move { Ok::<_, HostError>(list_branches_inner(state.engine()).await) },
    )
    .await)
}

async fn list_branches_inner(engine: &aideon_chrona::TemporalEngine) -> ListBranchesResponse {
    engine.list_branches().await
}

/// Namespaced + requestId-wrapped branch merge command.
#[tauri::command]
#[specta::specta]
pub async fn chrona_temporal_merge_branches(
    state: State<'_, WorkerState>,
    request: IpcRequest<MergeRequest>,
) -> Result<IpcResponse<MergeResponse>, HostError> {
    Ok(
        command_envelope("chrona_temporal_merge_branches", request, |payload| {
            merge_branches_inner(state.engine(), payload)
        })
        .await,
    )
}

async fn merge_branches_inner(
    engine: &aideon_chrona::TemporalEngine,
    payload: MergeRequest,
) -> Result<MergeResponse, HostError> {
    engine.merge(payload).await.map_err(host_error)
}

/// Namespaced + requestId-wrapped topology delta query.
#[tauri::command]
#[specta::specta]
pub async fn chrona_temporal_topology_delta(
    state: State<'_, WorkerState>,
    request: IpcRequest<TopologyDeltaArgs>,
) -> Result<IpcResponse<TopologyDeltaResult>, HostError> {
    Ok(
        command_envelope("chrona_temporal_topology_delta", request, |payload| {
            topology_delta_inner(state.engine(), payload)
        })
        .await,
    )
}

async fn topology_delta_inner(
    engine: &aideon_chrona::TemporalEngine,
    payload: TopologyDeltaArgs,
) -> Result<TopologyDeltaResult, HostError> {
    engine.topology_delta(payload).await.map_err(host_error)
}

/// Namespaced + requestId-wrapped metamodel query.
#[tauri::command]
#[specta::specta]
pub async fn praxis_metamodel_get(
    state: State<'_, WorkerState>,
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<MetaModelDocument>, HostError> {
    Ok(
        command_envelope("praxis_metamodel_get", request, |_payload| async move {
            Ok::<_, HostError>(temporal_metamodel_get_inner(state.engine()).await)
        })
        .await,
    )
}

async fn temporal_metamodel_get_inner(engine: &aideon_chrona::TemporalEngine) -> MetaModelDocument {
    engine.meta_model().await
}

pub(crate) fn host_error(error: PraxisError) -> HostError {
    let code = match error.code() {
        PraxisErrorCode::UnknownBranch => "UNKNOWN_BRANCH",
        PraxisErrorCode::UnknownCommit => "UNKNOWN_COMMIT",
        PraxisErrorCode::ConcurrencyConflict => "CONCURRENCY_CONFLICT",
        PraxisErrorCode::ValidationFailed => "VALIDATION_FAILED",
        PraxisErrorCode::IntegrityViolation => "INTEGRITY_VIOLATION",
        PraxisErrorCode::MergeConflict => "MERGE_CONFLICT",
    };
    error!("host: praxis error code={} detail={error}", code);
    HostError::new(code, error.to_string())
}

#[cfg(test)]
#[path = "../tests/internal/temporal_tests.rs"]
mod tests;
