#[tauri::command]
pub async fn praxis_graph_view(
    definition: GraphViewDefinition,
) -> Result<GraphViewModel, HostError> {
    Ok(GraphViewModel::demo(definition))
}

#[tauri::command(rename = "praxis.artefact.execute_graph")]
pub async fn praxis_artefact_graph_execute(
    request: IpcRequest<GraphViewDefinition>,
) -> Result<IpcResponse<GraphViewModel>, HostError> {
    let request_id = request.request_id;
    let response = match praxis_graph_view(request.payload).await {
        Ok(result) => IpcResponse::ok(request_id, result),
        Err(err) => IpcResponse::err(request_id, err),
    };
    Ok(response)
}

#[tauri::command]
pub async fn praxis_catalogue_view(
    definition: CatalogueViewDefinition,
) -> Result<CatalogueViewModel, HostError> {
    Ok(CatalogueViewModel::demo(definition))
}

#[tauri::command(rename = "praxis.artefact.execute_catalogue")]
pub async fn praxis_artefact_catalogue_execute(
    request: IpcRequest<CatalogueViewDefinition>,
) -> Result<IpcResponse<CatalogueViewModel>, HostError> {
    let request_id = request.request_id;
    let response = match praxis_catalogue_view(request.payload).await {
        Ok(result) => IpcResponse::ok(request_id, result),
        Err(err) => IpcResponse::err(request_id, err),
    };
    Ok(response)
}

#[tauri::command]
pub async fn praxis_matrix_view(
    definition: MatrixViewDefinition,
) -> Result<MatrixViewModel, HostError> {
    Ok(MatrixViewModel::demo(definition))
}

#[tauri::command(rename = "praxis.artefact.execute_matrix")]
pub async fn praxis_artefact_matrix_execute(
    request: IpcRequest<MatrixViewDefinition>,
) -> Result<IpcResponse<MatrixViewModel>, HostError> {
    let request_id = request.request_id;
    let response = match praxis_matrix_view(request.payload).await {
        Ok(result) => IpcResponse::ok(request_id, result),
        Err(err) => IpcResponse::err(request_id, err),
    };
    Ok(response)
}

#[allow(dead_code)]
#[tauri::command]
pub async fn praxis_chart_view(
    definition: ChartViewDefinition,
) -> Result<ChartViewModel, HostError> {
    Ok(ChartViewModel::demo(definition))
}

#[tauri::command(rename = "praxis.artefact.execute_chart")]
pub async fn praxis_artefact_chart_execute(
    request: IpcRequest<ChartViewDefinition>,
) -> Result<IpcResponse<ChartViewModel>, HostError> {
    let request_id = request.request_id;
    let response = match praxis_chart_view(request.payload).await {
        Ok(result) => IpcResponse::ok(request_id, result),
        Err(err) => IpcResponse::err(request_id, err),
    };
    Ok(response)
}

#[tauri::command]
pub async fn praxis_apply_operations(
    operations: Vec<PraxisOperation>,
) -> Result<OperationBatchResult, HostError> {
    if operations.is_empty() {
        return Ok(OperationBatchResult::rejected("no operations supplied"));
    }
    Ok(OperationBatchResult::accepted(next_commit_id()))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyOperationsPayload {
    #[serde(default)]
    pub operations: Vec<PraxisOperation>,
}

#[tauri::command(rename = "praxis.task.apply_operations")]
pub async fn praxis_task_apply_operations(
    request: IpcRequest<ApplyOperationsPayload>,
) -> Result<IpcResponse<OperationBatchResult>, HostError> {
    let request_id = request.request_id;
    let response = match praxis_apply_operations(request.payload.operations).await {
        Ok(result) => IpcResponse::ok(request_id, result),
        Err(err) => IpcResponse::err(request_id, err),
    };
    Ok(response)
}

#[tauri::command]
pub async fn praxis_list_scenarios() -> Result<Vec<ScenarioSummary>, HostError> {
    Ok(ScenarioSummary::demo_list())
}

#[tauri::command(rename = "praxis.scenario.list")]
pub async fn praxis_scenario_list(
    request: IpcRequest<crate::ipc::EmptyPayload>,
) -> Result<IpcResponse<Vec<ScenarioSummary>>, HostError> {
    let request_id = request.request_id;
    let response = match praxis_list_scenarios().await {
        Ok(result) => IpcResponse::ok(request_id, result),
        Err(err) => IpcResponse::err(request_id, err),
    };
    Ok(response)
}
