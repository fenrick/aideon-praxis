/// Namespaced + requestId-wrapped Mneme commands.
///
/// These are the forward-compatible IPC surface. The legacy `mneme_*` commands remain available
/// for existing renderer code; migrate callers to these as part of contract hardening.
#[tauri::command]
pub async fn mneme_store_upsert_metamodel_batch(
    state: State<'_, WorkerState>,
    request: IpcRequest<UpsertMetamodelBatchInput>,
) -> Result<IpcResponse<OpResult>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_upsert_metamodel_batch_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command]
pub async fn mneme_store_compile_effective_schema(
    state: State<'_, WorkerState>,
    request: IpcRequest<CompileEffectiveSchemaInput>,
) -> Result<IpcResponse<SchemaVersion>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_compile_effective_schema_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command]
pub async fn mneme_store_get_effective_schema(
    state: State<'_, WorkerState>,
    request: IpcRequest<GetEffectiveSchemaPayload>,
) -> Result<IpcResponse<Option<aideon_praxis::mneme::EffectiveSchema>>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_get_effective_schema_inner(state.inner(), payload.partition_id, payload.type_id),
    )
    .await)
}

#[tauri::command]
pub async fn mneme_store_list_edge_type_rules(
    state: State<'_, WorkerState>,
    request: IpcRequest<ListEdgeTypeRulesPayload>,
) -> Result<IpcResponse<Vec<EdgeTypeRule>>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_list_edge_type_rules_inner(state.inner(), payload.partition_id, payload.edge_type_id),
    )
    .await)
}

#[tauri::command]
pub async fn mneme_store_create_node(
    state: State<'_, WorkerState>,
    request: IpcRequest<CreateNodePayload>,
) -> Result<IpcResponse<OpResult>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(request_id, mneme_create_node_inner(state.inner(), payload)).await)
}

#[tauri::command]
pub async fn mneme_store_create_edge(
    state: State<'_, WorkerState>,
    request: IpcRequest<CreateEdgePayload>,
) -> Result<IpcResponse<OpResult>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(request_id, mneme_create_edge_inner(state.inner(), payload)).await)
}

#[tauri::command]
pub async fn mneme_store_set_edge_existence_interval(
    state: State<'_, WorkerState>,
    request: IpcRequest<SetEdgeExistencePayload>,
) -> Result<IpcResponse<OpResult>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_set_edge_existence_interval_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command]
pub async fn mneme_store_tombstone_entity(
    state: State<'_, WorkerState>,
    request: IpcRequest<TombstoneEntityPayload>,
) -> Result<IpcResponse<OpResult>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_tombstone_entity_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command]
pub async fn mneme_store_set_property_interval(
    state: State<'_, WorkerState>,
    request: IpcRequest<SetPropertyIntervalPayload>,
) -> Result<IpcResponse<OpResult>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_set_property_interval_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command]
pub async fn mneme_store_clear_property_interval(
    state: State<'_, WorkerState>,
    request: IpcRequest<ClearPropertyIntervalPayload>,
) -> Result<IpcResponse<OpResult>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_clear_property_interval_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command]
pub async fn mneme_store_or_set_update(
    state: State<'_, WorkerState>,
    request: IpcRequest<OrSetUpdatePayload>,
) -> Result<IpcResponse<OpResult>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_or_set_update_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command]
pub async fn mneme_store_counter_update(
    state: State<'_, WorkerState>,
    request: IpcRequest<CounterUpdatePayload>,
) -> Result<IpcResponse<OpResult>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_counter_update_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command]
pub async fn mneme_store_read_entity_at_time(
    state: State<'_, WorkerState>,
    request: IpcRequest<ReadEntityAtTimePayload>,
) -> Result<IpcResponse<ReadEntityAtTimeResult>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_read_entity_at_time_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command]
pub async fn mneme_store_traverse_at_time(
    state: State<'_, WorkerState>,
    request: IpcRequest<TraverseAtTimePayload>,
) -> Result<IpcResponse<Vec<TraverseEdgeItem>>, HostError> {
    let request_id = request.request_id;
    let response = match mneme_traverse_at_time_inner(state.inner(), request.payload).await {
        Ok(result) => IpcResponse::ok(request_id, result),
        Err(err) => IpcResponse::err(request_id, err),
    };
    Ok(response)
}

#[tauri::command]
pub async fn mneme_store_list_entities(
    state: State<'_, WorkerState>,
    request: IpcRequest<ListEntitiesPayload>,
) -> Result<IpcResponse<Vec<ListEntitiesResultItem>>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_list_entities_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command]
pub async fn mneme_store_get_changes_since(
    state: State<'_, WorkerState>,
    request: IpcRequest<GetChangesSincePayload>,
) -> Result<IpcResponse<Vec<ChangeEvent>>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_get_changes_since_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command]
pub async fn mneme_store_subscribe_partition(
    state: State<'_, WorkerState>,
    window: Window,
    request: IpcRequest<SubscribePartitionPayload>,
) -> Result<IpcResponse<SubscriptionResult>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_subscribe_partition(state, window, payload),
    )
    .await)
}

#[tauri::command]
pub async fn mneme_store_unsubscribe_partition(
    state: State<'_, WorkerState>,
    request: IpcRequest<UnsubscribePartitionPayload>,
) -> Result<IpcResponse<bool>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(request_id, mneme_unsubscribe_partition(state, payload)).await)
}

#[tauri::command]
pub async fn mneme_store_get_projection_edges(
    state: State<'_, WorkerState>,
    request: IpcRequest<GetProjectionEdgesPayload>,
) -> Result<IpcResponse<Vec<ProjectionEdge>>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_get_projection_edges_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command]
pub async fn mneme_store_get_graph_degree_stats(
    state: State<'_, WorkerState>,
    request: IpcRequest<GetGraphDegreeStatsPayload>,
) -> Result<IpcResponse<Vec<GraphDegreeStat>>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_get_graph_degree_stats_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command]
pub async fn mneme_store_get_graph_edge_type_counts(
    state: State<'_, WorkerState>,
    request: IpcRequest<GetGraphEdgeTypeCountsPayload>,
) -> Result<IpcResponse<Vec<GraphEdgeTypeCount>>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_get_graph_edge_type_counts_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command]
pub async fn mneme_store_store_pagerank_scores(
    state: State<'_, WorkerState>,
    request: IpcRequest<StorePageRankScoresPayload>,
) -> Result<IpcResponse<PageRankRunResult>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_store_pagerank_scores_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command]
pub async fn mneme_store_get_pagerank_scores(
    state: State<'_, WorkerState>,
    request: IpcRequest<GetPageRankScoresPayload>,
) -> Result<IpcResponse<Vec<PageRankScoreItem>>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_get_pagerank_scores_inner(state.inner(), payload),
    )
    .await)
}
