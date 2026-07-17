use aideon_chrona::TemporalEngine;
use aideon_praxis::PraxisError;
use aideon_praxis::temporal::{
    ChangeSet, CommitChangesRequest, CommitRef, EdgeTombstone, NodeTombstone,
};
use std::sync::Arc;
use tauri::State;

use crate::ipc::{EmptyPayload, HostError, IpcRequest, IpcResponse};
use crate::telemetry::command_envelope;
use crate::worker::WorkerState;

const DEFAULT_BRANCH: &str = "main";

#[tauri::command]
#[specta::specta]
pub async fn praxis_artefact_execute_graph(
    state: State<'_, WorkerState>,
    request: IpcRequest<GraphViewDefinition>,
) -> Result<IpcResponse<GraphViewModel>, HostError> {
    Ok(praxis_artefact_execute_graph_inner(state.engine(), request).await)
}

#[tauri::command]
#[specta::specta]
pub async fn praxis_artefact_execute_catalogue(
    state: State<'_, WorkerState>,
    request: IpcRequest<CatalogueViewDefinition>,
) -> Result<IpcResponse<CatalogueViewModel>, HostError> {
    Ok(praxis_artefact_execute_catalogue_inner(state.engine(), request).await)
}

#[tauri::command]
#[specta::specta]
pub async fn praxis_artefact_execute_matrix(
    state: State<'_, WorkerState>,
    request: IpcRequest<MatrixViewDefinition>,
) -> Result<IpcResponse<MatrixViewModel>, HostError> {
    Ok(praxis_artefact_execute_matrix_inner(state.engine(), request).await)
}

#[tauri::command]
#[specta::specta]
pub async fn praxis_artefact_execute_chart(
    state: State<'_, WorkerState>,
    request: IpcRequest<ChartViewDefinition>,
) -> Result<IpcResponse<ChartViewModel>, HostError> {
    Ok(praxis_artefact_execute_chart_inner(state.engine(), request).await)
}

#[derive(Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ApplyOperationsPayload {
    #[serde(default)]
    pub branch: Option<String>,
    #[serde(default)]
    pub operations: Vec<PraxisOperation>,
}

#[tauri::command]
#[specta::specta]
pub async fn praxis_task_apply_operations(
    state: State<'_, WorkerState>,
    request: IpcRequest<ApplyOperationsPayload>,
) -> Result<IpcResponse<OperationBatchResult>, HostError> {
    Ok(praxis_task_apply_operations_inner(state.engine(), request).await)
}

#[tauri::command]
#[specta::specta]
pub async fn praxis_scenario_list(
    state: State<'_, WorkerState>,
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<Vec<ScenarioSummary>>, HostError> {
    Ok(praxis_scenario_list_inner(state.engine(), request).await)
}

/// A view definition that can be resolved against a snapshot into its view model.
///
/// Ties each `*ViewDefinition` to its `*ViewModel` so the resolve-then-build flow
/// is expressed once in [`build_snapshot_view`] rather than duplicated per view.
trait SnapshotView: Sized {
    type Model;

    fn as_of(&self) -> &str;
    fn scenario(&self) -> Option<&str>;
    fn into_model(
        self,
        snapshot: &GraphSnapshot,
        resolved_as_of: &str,
        resolved_branch: &str,
    ) -> Self::Model;
}

async fn build_snapshot_view<D: SnapshotView>(
    engine: &TemporalEngine,
    definition: D,
) -> Result<D::Model, HostError> {
    let (commit_id, snapshot, branch) =
        resolve_snapshot(engine, definition.as_of(), definition.scenario()).await?;
    Ok(definition.into_model(snapshot.as_ref(), &commit_id, &branch))
}

/// Wires a view definition/model pair to its [`SnapshotView`] impl and the
/// telemetry-wrapped `*_inner` command handler.
macro_rules! snapshot_view_command {
    ($inner:ident, $telemetry:literal, $definition:ty => $model:ty) => {
        impl SnapshotView for $definition {
            type Model = $model;

            fn as_of(&self) -> &str {
                &self.as_of
            }

            fn scenario(&self) -> Option<&str> {
                self.scenario.as_deref()
            }

            fn into_model(
                self,
                snapshot: &GraphSnapshot,
                resolved_as_of: &str,
                resolved_branch: &str,
            ) -> Self::Model {
                <$model>::from_snapshot(self, snapshot, resolved_as_of, resolved_branch)
            }
        }

        async fn $inner(
            engine: &TemporalEngine,
            request: IpcRequest<$definition>,
        ) -> IpcResponse<$model> {
            command_envelope($telemetry, request, |definition| {
                build_snapshot_view(engine, definition)
            })
            .await
        }
    };
}

snapshot_view_command!(
    praxis_artefact_execute_graph_inner,
    "praxis_artefact_execute_graph",
    GraphViewDefinition => GraphViewModel
);
snapshot_view_command!(
    praxis_artefact_execute_catalogue_inner,
    "praxis_artefact_execute_catalogue",
    CatalogueViewDefinition => CatalogueViewModel
);
snapshot_view_command!(
    praxis_artefact_execute_matrix_inner,
    "praxis_artefact_execute_matrix",
    MatrixViewDefinition => MatrixViewModel
);
snapshot_view_command!(
    praxis_artefact_execute_chart_inner,
    "praxis_artefact_execute_chart",
    ChartViewDefinition => ChartViewModel
);

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
    command_envelope("praxis_task_apply_operations", request, |payload| {
        praxis_apply_operations_inner(engine, payload.operations, payload.branch)
    })
    .await
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
    command_envelope("praxis_scenario_list", request, |_payload| {
        praxis_list_scenarios_inner(engine)
    })
    .await
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
        apply_operation(operation, snapshot, &mut changes)?;
    }
    Ok(changes)
}

fn apply_operation(
    operation: PraxisOperation,
    snapshot: &GraphSnapshot,
    changes: &mut ChangeSet,
) -> Result<(), HostError> {
    match operation {
        PraxisOperation::CreateNode { node } => changes.node_creates.push(node_create(node)?),
        PraxisOperation::UpdateNode { node } => {
            changes.node_updates.push(node_update(node, snapshot)?)
        }
        PraxisOperation::DeleteNode { node_id } => {
            changes.node_deletes.push(NodeTombstone { id: node_id })
        }
        PraxisOperation::CreateEdge { edge } => changes.edge_creates.push(edge_create(edge)?),
        PraxisOperation::UpdateEdge { edge } => {
            changes.edge_updates.push(edge_update(edge, snapshot)?)
        }
        PraxisOperation::DeleteEdge { edge_id } => {
            changes.edge_deletes.push(edge_delete(&edge_id, snapshot)?)
        }
    }
    Ok(())
}

fn node_create(node: TwinNode) -> Result<NodeVersion, HostError> {
    let node_type = node
        .r#type
        .clone()
        .ok_or_else(|| HostError::invalid_input("node type is required"))?;
    Ok(NodeVersion {
        id: node.id,
        r#type: Some(node_type),
        props: node.props,
    })
}

fn node_update(node: TwinNode, snapshot: &GraphSnapshot) -> Result<NodeVersion, HostError> {
    let existing = snapshot
        .node(&node.id)
        .ok_or_else(|| HostError::invalid_input("node missing for update"))?;
    let node_type = node
        .r#type
        .clone()
        .or_else(|| existing.r#type.clone())
        .ok_or_else(|| HostError::invalid_input("node type is required"))?;
    let merged_props = merge_props(existing.props.clone(), node.props);
    Ok(NodeVersion {
        id: node.id,
        r#type: Some(node_type),
        props: merged_props,
    })
}

fn edge_create(edge: TwinEdge) -> Result<EdgeVersion, HostError> {
    let edge_type = edge
        .r#type
        .clone()
        .ok_or_else(|| HostError::invalid_input("edge type is required"))?;
    Ok(EdgeVersion {
        id: edge.id,
        from: edge.from,
        to: edge.to,
        r#type: Some(edge_type),
        directed: edge.directed,
        props: edge.props,
    })
}

fn edge_update(edge: TwinEdge, snapshot: &GraphSnapshot) -> Result<EdgeVersion, HostError> {
    let existing = find_edge(snapshot, edge.id.as_deref(), &edge.from, &edge.to)
        .ok_or_else(|| HostError::invalid_input("edge missing for update"))?;
    let edge_type = edge
        .r#type
        .clone()
        .or_else(|| existing.r#type.clone())
        .ok_or_else(|| HostError::invalid_input("edge type is required"))?;
    let merged_props = merge_props(existing.props.clone(), edge.props);
    Ok(EdgeVersion {
        id: edge.id.or_else(|| existing.id.clone()),
        from: edge.from.clone(),
        to: edge.to.clone(),
        r#type: Some(edge_type),
        directed: edge.directed.or(existing.directed),
        props: merged_props,
    })
}

fn edge_delete(edge_id: &str, snapshot: &GraphSnapshot) -> Result<EdgeTombstone, HostError> {
    let existing = snapshot
        .edge_by_id(edge_id)
        .ok_or_else(|| HostError::invalid_input("edge missing for delete"))?;
    Ok(EdgeTombstone {
        from: existing.from.clone(),
        to: existing.to.clone(),
    })
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
        aideon_praxis::PraxisErrorCode::UnknownBranch => "UNKNOWN_BRANCH",
        aideon_praxis::PraxisErrorCode::UnknownCommit => "UNKNOWN_COMMIT",
        aideon_praxis::PraxisErrorCode::ConcurrencyConflict => "CONCURRENCY_CONFLICT",
        aideon_praxis::PraxisErrorCode::ValidationFailed => "VALIDATION_FAILED",
        aideon_praxis::PraxisErrorCode::IntegrityViolation => "INTEGRITY_VIOLATION",
        aideon_praxis::PraxisErrorCode::MergeConflict => "MERGE_CONFLICT",
    };
    HostError::new(code, error.to_string())
}
