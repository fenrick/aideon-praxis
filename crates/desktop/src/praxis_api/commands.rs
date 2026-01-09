use aideon_chrona::TemporalEngine;
use aideon_praxis::PraxisError;
use aideon_praxis::temporal::{
    ChangeSet, CommitChangesRequest, CommitRef, EdgeTombstone, NodeTombstone,
};
use std::sync::Arc;
use tauri::State;

use crate::ipc::{EmptyPayload, HostError, IpcRequest, IpcResponse};
use crate::worker::WorkerState;

const DEFAULT_BRANCH: &str = "main";

#[tauri::command]
pub async fn praxis_graph_view(
    state: State<'_, WorkerState>,
    definition: GraphViewDefinition,
) -> Result<GraphViewModel, HostError> {
    praxis_graph_view_inner(state.engine(), definition).await
}

#[tauri::command(rename = "praxis.artefact.execute_graph")]
pub async fn praxis_artefact_graph_execute(
    state: State<'_, WorkerState>,
    request: IpcRequest<GraphViewDefinition>,
) -> Result<IpcResponse<GraphViewModel>, HostError> {
    Ok(praxis_artefact_graph_execute_inner(state.engine(), request).await)
}

#[tauri::command]
pub async fn praxis_catalogue_view(
    state: State<'_, WorkerState>,
    definition: CatalogueViewDefinition,
) -> Result<CatalogueViewModel, HostError> {
    praxis_catalogue_view_inner(state.engine(), definition).await
}

#[tauri::command(rename = "praxis.artefact.execute_catalogue")]
pub async fn praxis_artefact_catalogue_execute(
    state: State<'_, WorkerState>,
    request: IpcRequest<CatalogueViewDefinition>,
) -> Result<IpcResponse<CatalogueViewModel>, HostError> {
    Ok(praxis_artefact_catalogue_execute_inner(state.engine(), request).await)
}

#[tauri::command]
pub async fn praxis_matrix_view(
    state: State<'_, WorkerState>,
    definition: MatrixViewDefinition,
) -> Result<MatrixViewModel, HostError> {
    praxis_matrix_view_inner(state.engine(), definition).await
}

#[tauri::command(rename = "praxis.artefact.execute_matrix")]
pub async fn praxis_artefact_matrix_execute(
    state: State<'_, WorkerState>,
    request: IpcRequest<MatrixViewDefinition>,
) -> Result<IpcResponse<MatrixViewModel>, HostError> {
    Ok(praxis_artefact_matrix_execute_inner(state.engine(), request).await)
}

#[allow(dead_code)]
#[tauri::command]
pub async fn praxis_chart_view(
    state: State<'_, WorkerState>,
    definition: ChartViewDefinition,
) -> Result<ChartViewModel, HostError> {
    praxis_chart_view_inner(state.engine(), definition).await
}

#[tauri::command(rename = "praxis.artefact.execute_chart")]
pub async fn praxis_artefact_chart_execute(
    state: State<'_, WorkerState>,
    request: IpcRequest<ChartViewDefinition>,
) -> Result<IpcResponse<ChartViewModel>, HostError> {
    Ok(praxis_artefact_chart_execute_inner(state.engine(), request).await)
}

#[tauri::command]
pub async fn praxis_apply_operations(
    state: State<'_, WorkerState>,
    operations: Vec<PraxisOperation>,
) -> Result<OperationBatchResult, HostError> {
    praxis_apply_operations_inner(state.engine(), operations, None).await
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyOperationsPayload {
    #[serde(default)]
    pub branch: Option<String>,
    #[serde(default)]
    pub operations: Vec<PraxisOperation>,
}

#[tauri::command(rename = "praxis.task.apply_operations")]
pub async fn praxis_task_apply_operations(
    state: State<'_, WorkerState>,
    request: IpcRequest<ApplyOperationsPayload>,
) -> Result<IpcResponse<OperationBatchResult>, HostError> {
    Ok(praxis_task_apply_operations_inner(state.engine(), request).await)
}

#[tauri::command]
pub async fn praxis_list_scenarios(
    state: State<'_, WorkerState>,
) -> Result<Vec<ScenarioSummary>, HostError> {
    praxis_list_scenarios_inner(state.engine()).await
}

#[tauri::command(rename = "praxis.scenario.list")]
pub async fn praxis_scenario_list(
    state: State<'_, WorkerState>,
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<Vec<ScenarioSummary>>, HostError> {
    Ok(praxis_scenario_list_inner(state.engine(), request).await)
}

async fn praxis_graph_view_inner(
    engine: &TemporalEngine,
    definition: GraphViewDefinition,
) -> Result<GraphViewModel, HostError> {
    let (commit_id, snapshot, branch) =
        resolve_snapshot(engine, &definition.as_of, definition.scenario.as_deref()).await?;
    Ok(GraphViewModel::from_snapshot(
        definition,
        snapshot.as_ref(),
        &commit_id,
        &branch,
    ))
}

async fn praxis_artefact_graph_execute_inner(
    engine: &TemporalEngine,
    request: IpcRequest<GraphViewDefinition>,
) -> IpcResponse<GraphViewModel> {
    let request_id = request.request_id;
    match praxis_graph_view_inner(engine, request.payload).await {
        Ok(result) => IpcResponse::ok(request_id, result),
        Err(err) => IpcResponse::err(request_id, err),
    }
}

async fn praxis_catalogue_view_inner(
    engine: &TemporalEngine,
    definition: CatalogueViewDefinition,
) -> Result<CatalogueViewModel, HostError> {
    let (commit_id, snapshot, branch) =
        resolve_snapshot(engine, &definition.as_of, definition.scenario.as_deref()).await?;
    Ok(CatalogueViewModel::from_snapshot(
        definition,
        snapshot.as_ref(),
        &commit_id,
        &branch,
    ))
}

async fn praxis_artefact_catalogue_execute_inner(
    engine: &TemporalEngine,
    request: IpcRequest<CatalogueViewDefinition>,
) -> IpcResponse<CatalogueViewModel> {
    let request_id = request.request_id;
    match praxis_catalogue_view_inner(engine, request.payload).await {
        Ok(result) => IpcResponse::ok(request_id, result),
        Err(err) => IpcResponse::err(request_id, err),
    }
}

async fn praxis_matrix_view_inner(
    engine: &TemporalEngine,
    definition: MatrixViewDefinition,
) -> Result<MatrixViewModel, HostError> {
    let (commit_id, snapshot, branch) =
        resolve_snapshot(engine, &definition.as_of, definition.scenario.as_deref()).await?;
    Ok(MatrixViewModel::from_snapshot(
        definition,
        snapshot.as_ref(),
        &commit_id,
        &branch,
    ))
}

async fn praxis_artefact_matrix_execute_inner(
    engine: &TemporalEngine,
    request: IpcRequest<MatrixViewDefinition>,
) -> IpcResponse<MatrixViewModel> {
    let request_id = request.request_id;
    match praxis_matrix_view_inner(engine, request.payload).await {
        Ok(result) => IpcResponse::ok(request_id, result),
        Err(err) => IpcResponse::err(request_id, err),
    }
}

async fn praxis_chart_view_inner(
    engine: &TemporalEngine,
    definition: ChartViewDefinition,
) -> Result<ChartViewModel, HostError> {
    let (commit_id, snapshot, branch) =
        resolve_snapshot(engine, &definition.as_of, definition.scenario.as_deref()).await?;
    Ok(ChartViewModel::from_snapshot(
        definition,
        snapshot.as_ref(),
        &commit_id,
        &branch,
    ))
}

async fn praxis_artefact_chart_execute_inner(
    engine: &TemporalEngine,
    request: IpcRequest<ChartViewDefinition>,
) -> IpcResponse<ChartViewModel> {
    let request_id = request.request_id;
    match praxis_chart_view_inner(engine, request.payload).await {
        Ok(result) => IpcResponse::ok(request_id, result),
        Err(err) => IpcResponse::err(request_id, err),
    }
}

async fn praxis_apply_operations_inner(
    engine: &TemporalEngine,
    operations: Vec<PraxisOperation>,
    branch: Option<String>,
) -> Result<OperationBatchResult, HostError> {
    if operations.is_empty() {
        return Ok(OperationBatchResult::rejected("no operations supplied"));
    }

    let branch = branch.unwrap_or_else(|| DEFAULT_BRANCH.to_string());
    let snapshot = match engine
        .resolve_snapshot(
            CommitRef::Branch {
                branch: branch.clone(),
                at: None,
            },
            Some(branch.clone()),
        )
        .await
    {
        Ok((_commit, snapshot, _branch)) => snapshot,
        Err(_err) => Arc::new(GraphSnapshot::empty()),
    };

    let changes = change_set_from_operations(operations, snapshot.as_ref())?;
    if changes.is_empty() {
        return Ok(OperationBatchResult::rejected("no operations supplied"));
    }

    let request = CommitChangesRequest {
        branch,
        parent: None,
        author: Some("desktop".into()),
        time: None,
        message: "task: apply operations".into(),
        tags: vec!["ui".into()],
        changes,
    };
    let commit_id = engine.commit(request).await.map_err(praxis_host_error)?;
    Ok(OperationBatchResult::accepted(commit_id))
}

async fn praxis_task_apply_operations_inner(
    engine: &TemporalEngine,
    request: IpcRequest<ApplyOperationsPayload>,
) -> IpcResponse<OperationBatchResult> {
    let request_id = request.request_id;
    match praxis_apply_operations_inner(
        engine,
        request.payload.operations,
        request.payload.branch,
    )
    .await
    {
        Ok(result) => IpcResponse::ok(request_id, result),
        Err(err) => IpcResponse::err(request_id, err),
    }
}

pub(crate) async fn praxis_list_scenarios_inner(
    engine: &TemporalEngine,
) -> Result<Vec<ScenarioSummary>, HostError> {
    let branches = engine.list_branches().await.branches;
    let mut scenarios = Vec::with_capacity(branches.len());
    for branch in branches {
        let commits = engine
            .list_commits(branch.name.clone())
            .await
            .map_err(praxis_host_error)?;
        let updated_at = commits.last().and_then(|commit| commit.time.clone());
        scenarios.push(ScenarioSummary::from_branch(branch.name, updated_at));
    }
    Ok(scenarios)
}

async fn praxis_scenario_list_inner(
    engine: &TemporalEngine,
    request: IpcRequest<EmptyPayload>,
) -> IpcResponse<Vec<ScenarioSummary>> {
    let request_id = request.request_id;
    match praxis_list_scenarios_inner(engine).await {
        Ok(result) => IpcResponse::ok(request_id, result),
        Err(err) => IpcResponse::err(request_id, err),
    }
}

async fn resolve_snapshot(
    engine: &TemporalEngine,
    as_of: &str,
    scenario: Option<&str>,
) -> Result<(String, Arc<GraphSnapshot>, String), HostError> {
    engine
        .resolve_snapshot(
            CommitRef::Id(as_of.to_string()),
            scenario.map(|value| value.to_string()),
        )
        .await
        .map_err(praxis_host_error)
}

fn change_set_from_operations(
    operations: Vec<PraxisOperation>,
    snapshot: &GraphSnapshot,
) -> Result<ChangeSet, HostError> {
    let mut changes = ChangeSet::default();
    for operation in operations {
        match operation {
            PraxisOperation::CreateNode { node } => {
                let node_type = node
                    .r#type
                    .clone()
                    .ok_or_else(|| HostError::invalid_input("node type is required"))?;
                changes.node_creates.push(NodeVersion {
                    id: node.id,
                    r#type: Some(node_type),
                    props: node.props,
                });
            }
            PraxisOperation::UpdateNode { node } => {
                let existing = snapshot
                    .node(&node.id)
                    .ok_or_else(|| HostError::invalid_input("node missing for update"))?;
                let node_type = node.r#type.clone().or_else(|| existing.r#type.clone()).ok_or_else(
                    || HostError::invalid_input("node type is required"),
                )?;
                let merged_props = merge_props(existing.props.clone(), node.props);
                changes.node_updates.push(NodeVersion {
                    id: node.id,
                    r#type: Some(node_type),
                    props: merged_props,
                });
            }
            PraxisOperation::DeleteNode { node_id } => {
                changes.node_deletes.push(NodeTombstone { id: node_id });
            }
            PraxisOperation::CreateEdge { edge } => {
                let edge_type = edge
                    .r#type
                    .clone()
                    .ok_or_else(|| HostError::invalid_input("edge type is required"))?;
                changes.edge_creates.push(EdgeVersion {
                    id: edge.id,
                    from: edge.from,
                    to: edge.to,
                    r#type: Some(edge_type),
                    directed: edge.directed,
                    props: edge.props,
                });
            }
            PraxisOperation::UpdateEdge { edge } => {
                let existing = find_edge(snapshot, edge.id.as_deref(), &edge.from, &edge.to)
                    .ok_or_else(|| HostError::invalid_input("edge missing for update"))?;
                let edge_type = edge.r#type.clone().or_else(|| existing.r#type.clone()).ok_or_else(
                    || HostError::invalid_input("edge type is required"),
                )?;
                let merged_props = merge_props(existing.props.clone(), edge.props);
                changes.edge_updates.push(EdgeVersion {
                    id: edge.id.or_else(|| existing.id.clone()),
                    from: edge.from.clone(),
                    to: edge.to.clone(),
                    r#type: Some(edge_type),
                    directed: edge.directed.or(existing.directed),
                    props: merged_props,
                });
            }
            PraxisOperation::DeleteEdge { edge_id } => {
                let existing = snapshot
                    .edge_by_id(&edge_id)
                    .ok_or_else(|| HostError::invalid_input("edge missing for delete"))?;
                changes.edge_deletes.push(EdgeTombstone {
                    from: existing.from.clone(),
                    to: existing.to.clone(),
                });
            }
        }
    }
    Ok(changes)
}

fn find_edge<'a>(
    snapshot: &'a GraphSnapshot,
    edge_id: Option<&str>,
    from: &str,
    to: &str,
) -> Option<&'a EdgeVersion> {
    if let Some(id) = edge_id
        && let Some(edge) = snapshot.edge_by_id(id)
    {
        return Some(edge);
    }
    snapshot
        .edges()
        .find(|edge| edge.from == from && edge.to == to)
}

fn merge_props(existing: Option<Value>, patch: Option<Value>) -> Option<Value> {
    match (existing, patch) {
        (Some(Value::Object(mut base)), Some(Value::Object(patch))) => {
            base.extend(patch);
            Some(Value::Object(base))
        }
        (Some(_base), Some(patch)) => Some(patch),
        (Some(base), None) => Some(base),
        (None, Some(patch)) => Some(patch),
        (None, None) => None,
    }
}

fn praxis_host_error(error: PraxisError) -> HostError {
    let code = match error.code() {
        aideon_praxis::PraxisErrorCode::UnknownBranch => "unknown_branch",
        aideon_praxis::PraxisErrorCode::UnknownCommit => "unknown_commit",
        aideon_praxis::PraxisErrorCode::ConcurrencyConflict => "concurrency_conflict",
        aideon_praxis::PraxisErrorCode::ValidationFailed => "validation_failed",
        aideon_praxis::PraxisErrorCode::IntegrityViolation => "integrity_violation",
        aideon_praxis::PraxisErrorCode::MergeConflict => "merge_conflict",
    };
    HostError::new(code, error.to_string())
}
