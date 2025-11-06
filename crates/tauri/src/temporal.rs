//! Host-side temporal commands bridging renderer IPC calls to the worker engine.
//!
//! These commands remain thin so that all business logic stays within the worker
//! crate, reinforcing the boundary guidance spelled out in `AGENTS.md`.

use aideon::core_data::temporal::{
    BranchInfo, CommitChangesRequest, CommitChangesResponse, CreateBranchRequest, DiffArgs,
    DiffSummary, ListBranchesResponse, ListCommitsResponse, MergeRequest, MergeResponse,
    StateAtArgs, StateAtResult, TopologyDeltaArgs, TopologyDeltaResult,
};
use aideon::praxis::{PraxisError, PraxisErrorCode};
use log::{debug, error, info};
use serde::Serialize;
use std::time::Instant;
use tauri::State;

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
    info!("host: temporal_state_at received");
    debug!("host: temporal_state_at payload={:?}", payload);
    let worker_state = state.inner();

    let started = Instant::now();
    let engine = worker_state.engine();
    let output = engine.state_at(payload.clone()).map_err(host_error)?;
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
    info!("host: temporal_diff received");
    debug!(
        "host: temporal_diff params from={:?} to={:?} scope={:?}",
        payload.from, payload.to, payload.scope
    );
    let engine = state.engine();
    let summary = engine.diff_summary(payload.clone()).map_err(host_error)?;
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
    let engine = state.engine();
    let id = engine.commit(payload).map_err(host_error)?;
    Ok(CommitChangesResponse { id })
}

#[tauri::command]
pub async fn list_commits(
    state: State<'_, WorkerState>,
    branch: String,
) -> Result<ListCommitsResponse, HostError> {
    let engine = state.engine();
    let commits = engine.list_commits(branch.clone()).map_err(host_error)?;
    debug!(
        "host: list_commits branch={} count={}",
        branch,
        commits.len()
    );
    Ok(ListCommitsResponse { commits })
}

#[tauri::command]
pub async fn create_branch(
    state: State<'_, WorkerState>,
    payload: CreateBranchRequest,
) -> Result<BranchInfo, HostError> {
    let engine = state.engine();
    let info = engine
        .create_branch(payload.name.clone(), payload.from.clone())
        .map_err(host_error)?;
    Ok(info)
}

#[tauri::command]
pub async fn list_branches(
    state: State<'_, WorkerState>,
) -> Result<ListBranchesResponse, HostError> {
    let engine = state.engine();
    Ok(engine.list_branches())
}

#[tauri::command]
pub async fn merge_branches(
    state: State<'_, WorkerState>,
    payload: MergeRequest,
) -> Result<MergeResponse, HostError> {
    let engine = state.engine();
    engine.merge(payload).map_err(host_error)
}

#[tauri::command]
pub async fn topology_delta(
    state: State<'_, WorkerState>,
    payload: TopologyDeltaArgs,
) -> Result<TopologyDeltaResult, HostError> {
    let engine = state.engine();
    engine.topology_delta(payload).map_err(host_error)
}

#[derive(Debug, Serialize)]
pub struct HostError {
    code: &'static str,
    message: String,
}

fn host_error(error: PraxisError) -> HostError {
    let code = match error.code() {
        PraxisErrorCode::UnknownBranch => "unknown_branch",
        PraxisErrorCode::UnknownCommit => "unknown_commit",
        PraxisErrorCode::ConcurrencyConflict => "concurrency_conflict",
        PraxisErrorCode::ValidationFailed => "validation_failed",
        PraxisErrorCode::IntegrityViolation => "integrity_violation",
        PraxisErrorCode::MergeConflict => "merge_conflict",
    };
    error!("host: praxis error code={} detail={error}", code);
    HostError {
        code,
        message: error.to_string(),
    }
}
