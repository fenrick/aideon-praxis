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
use std::time::Instant;
use tauri::State;

use crate::ipc::{EmptyPayload, HostError, IpcRequest, IpcResponse, ipc_handle};
use crate::worker::WorkerState;

#[tauri::command]
/// Handle a renderer request for `Temporal.StateAt`, delegating to the worker engine.
///
/// The handler logs the request for traceability and forwards the typed DTOs
/// untouched so the transport format stays stable regardless of runtime.
pub async fn temporal_state_at(
    state: State<'_, WorkerState>,
    payload: StateAtArgs,
) -> Result<StateAtResult, HostError> {
    temporal_state_at_inner(state.engine(), payload).await
}

/// Namespaced + requestId-wrapped temporal state query.
#[tauri::command(rename = "chrona.temporal.state_at")]
pub async fn chrona_temporal_state_at(
    state: State<'_, WorkerState>,
    request: IpcRequest<StateAtArgs>,
) -> Result<IpcResponse<StateAtResult>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(request_id, temporal_state_at_inner(state.engine(), payload)).await)
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

#[tauri::command]
/// Compute diff summary statistics between two plateaus or timestamps.
pub async fn temporal_diff(
    state: State<'_, WorkerState>,
    payload: DiffArgs,
) -> Result<DiffSummary, HostError> {
    temporal_diff_inner(state.engine(), payload).await
}

/// Namespaced + requestId-wrapped diff summary query.
#[tauri::command(rename = "chrona.temporal.diff")]
pub async fn chrona_temporal_diff(
    state: State<'_, WorkerState>,
    request: IpcRequest<DiffArgs>,
) -> Result<IpcResponse<DiffSummary>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(request_id, temporal_diff_inner(state.engine(), payload)).await)
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

#[tauri::command]
pub async fn commit_changes(
    state: State<'_, WorkerState>,
    payload: CommitChangesRequest,
) -> Result<CommitChangesResponse, HostError> {
    let id = commit_changes_inner(state.engine(), payload).await?;
    Ok(CommitChangesResponse { id })
}

/// Namespaced + requestId-wrapped commit application command.
#[tauri::command(rename = "chrona.temporal.commit_changes")]
pub async fn chrona_temporal_commit_changes(
    state: State<'_, WorkerState>,
    request: IpcRequest<CommitChangesRequest>,
) -> Result<IpcResponse<CommitChangesResponse>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(request_id, commit_changes(state, payload)).await)
}

#[derive(Debug, Deserialize)]
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

#[tauri::command]
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
#[tauri::command(rename = "chrona.temporal.list_commits")]
pub async fn chrona_temporal_list_commits(
    state: State<'_, WorkerState>,
    request: IpcRequest<ListCommitsPayload>,
) -> Result<IpcResponse<ListCommitsResponse>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(request_id, list_commits(state, payload.branch)).await)
}

async fn list_commits_inner(
    engine: &aideon_chrona::TemporalEngine,
    branch: String,
) -> Result<Vec<CommitSummary>, HostError> {
    engine.list_commits(branch).await.map_err(host_error)
}

#[tauri::command]
pub async fn create_branch(
    state: State<'_, WorkerState>,
    payload: CreateBranchRequest,
) -> Result<BranchInfo, HostError> {
    create_branch_inner(state.engine(), payload).await
}

/// Namespaced + requestId-wrapped branch creation command.
#[tauri::command(rename = "chrona.temporal.create_branch")]
pub async fn chrona_temporal_create_branch(
    state: State<'_, WorkerState>,
    request: IpcRequest<CreateBranchRequest>,
) -> Result<IpcResponse<BranchInfo>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(request_id, create_branch_inner(state.engine(), payload)).await)
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

#[tauri::command]
pub async fn list_branches(
    state: State<'_, WorkerState>,
) -> Result<ListBranchesResponse, HostError> {
    Ok(list_branches_inner(state.engine()).await)
}

/// Namespaced + requestId-wrapped branch list query.
#[tauri::command(rename = "chrona.temporal.list_branches")]
pub async fn chrona_temporal_list_branches(
    state: State<'_, WorkerState>,
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<ListBranchesResponse>, HostError> {
    let request_id = request.request_id;
    Ok(IpcResponse::ok(
        request_id,
        list_branches_inner(state.engine()).await,
    ))
}

async fn list_branches_inner(engine: &aideon_chrona::TemporalEngine) -> ListBranchesResponse {
    engine.list_branches().await
}

#[tauri::command]
pub async fn merge_branches(
    state: State<'_, WorkerState>,
    payload: MergeRequest,
) -> Result<MergeResponse, HostError> {
    merge_branches_inner(state.engine(), payload).await
}

/// Namespaced + requestId-wrapped branch merge command.
#[tauri::command(rename = "chrona.temporal.merge_branches")]
pub async fn chrona_temporal_merge_branches(
    state: State<'_, WorkerState>,
    request: IpcRequest<MergeRequest>,
) -> Result<IpcResponse<MergeResponse>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(request_id, merge_branches_inner(state.engine(), payload)).await)
}

async fn merge_branches_inner(
    engine: &aideon_chrona::TemporalEngine,
    payload: MergeRequest,
) -> Result<MergeResponse, HostError> {
    engine.merge(payload).await.map_err(host_error)
}

#[tauri::command]
pub async fn topology_delta(
    state: State<'_, WorkerState>,
    payload: TopologyDeltaArgs,
) -> Result<TopologyDeltaResult, HostError> {
    topology_delta_inner(state.engine(), payload).await
}

/// Namespaced + requestId-wrapped topology delta query.
#[tauri::command(rename = "chrona.temporal.topology_delta")]
pub async fn chrona_temporal_topology_delta(
    state: State<'_, WorkerState>,
    request: IpcRequest<TopologyDeltaArgs>,
) -> Result<IpcResponse<TopologyDeltaResult>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(request_id, topology_delta_inner(state.engine(), payload)).await)
}

async fn topology_delta_inner(
    engine: &aideon_chrona::TemporalEngine,
    payload: TopologyDeltaArgs,
) -> Result<TopologyDeltaResult, HostError> {
    engine.topology_delta(payload).await.map_err(host_error)
}

#[tauri::command]
pub async fn temporal_metamodel_get(
    state: State<'_, WorkerState>,
) -> Result<MetaModelDocument, HostError> {
    Ok(temporal_metamodel_get_inner(state.engine()).await)
}

/// Namespaced + requestId-wrapped metamodel query.
#[tauri::command(rename = "praxis.metamodel.get")]
pub async fn praxis_metamodel_get(
    state: State<'_, WorkerState>,
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<MetaModelDocument>, HostError> {
    let request_id = request.request_id;
    Ok(IpcResponse::ok(
        request_id,
        temporal_metamodel_get_inner(state.engine()).await,
    ))
}

async fn temporal_metamodel_get_inner(engine: &aideon_chrona::TemporalEngine) -> MetaModelDocument {
    engine.meta_model().await
}

pub(crate) fn host_error(error: PraxisError) -> HostError {
    let code = match error.code() {
        PraxisErrorCode::UnknownBranch => "unknown_branch",
        PraxisErrorCode::UnknownCommit => "unknown_commit",
        PraxisErrorCode::ConcurrencyConflict => "concurrency_conflict",
        PraxisErrorCode::ValidationFailed => "validation_failed",
        PraxisErrorCode::IntegrityViolation => "integrity_violation",
        PraxisErrorCode::MergeConflict => "merge_conflict",
    };
    error!("host: praxis error code={} detail={error}", code);
    HostError::new(code, error.to_string())
}

#[cfg(test)]
#[path = "../tests/temporal_tests.rs"]
mod tests;
