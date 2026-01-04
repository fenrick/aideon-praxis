#[tauri::command(rename = "mneme.store.export_ops")]
pub async fn mneme_store_export_ops(
    state: State<'_, WorkerState>,
    request: IpcRequest<ExportOpsPayload>,
) -> Result<IpcResponse<Vec<OpEnvelope>>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(request_id, mneme_export_ops_inner(state.inner(), payload)).await)
}

#[tauri::command(rename = "mneme.store.ingest_ops")]
pub async fn mneme_store_ingest_ops(
    state: State<'_, WorkerState>,
    request: IpcRequest<IngestOpsPayload>,
) -> Result<IpcResponse<()>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(request_id, mneme_ingest_ops_inner(state.inner(), payload)).await)
}

#[tauri::command(rename = "mneme.store.get_partition_head")]
pub async fn mneme_store_get_partition_head(
    state: State<'_, WorkerState>,
    request: IpcRequest<PartitionHeadPayload>,
) -> Result<IpcResponse<PartitionHeadResult>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_get_partition_head_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.create_scenario")]
pub async fn mneme_store_create_scenario(
    state: State<'_, WorkerState>,
    request: IpcRequest<CreateScenarioPayload>,
) -> Result<IpcResponse<ScenarioId>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_create_scenario_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.delete_scenario")]
pub async fn mneme_store_delete_scenario(
    state: State<'_, WorkerState>,
    request: IpcRequest<DeleteScenarioPayload>,
) -> Result<IpcResponse<()>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_delete_scenario_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.export_ops_stream")]
pub async fn mneme_store_export_ops_stream(
    state: State<'_, WorkerState>,
    request: IpcRequest<ExportOpsStreamPayload>,
) -> Result<IpcResponse<Vec<ExportRecord>>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_export_ops_stream_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.import_ops_stream")]
pub async fn mneme_store_import_ops_stream(
    state: State<'_, WorkerState>,
    request: IpcRequest<ImportOpsStreamPayload>,
) -> Result<IpcResponse<ImportReport>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_import_ops_stream_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.export_snapshot_stream")]
pub async fn mneme_store_export_snapshot_stream(
    state: State<'_, WorkerState>,
    request: IpcRequest<ExportSnapshotPayload>,
) -> Result<IpcResponse<Vec<ExportRecord>>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_export_snapshot_stream_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.import_snapshot_stream")]
pub async fn mneme_store_import_snapshot_stream(
    state: State<'_, WorkerState>,
    request: IpcRequest<ImportSnapshotPayload>,
) -> Result<IpcResponse<()>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_import_snapshot_stream_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.upsert_validation_rules")]
pub async fn mneme_store_upsert_validation_rules(
    state: State<'_, WorkerState>,
    request: IpcRequest<UpsertValidationRulesPayload>,
) -> Result<IpcResponse<()>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_upsert_validation_rules_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.list_validation_rules")]
pub async fn mneme_store_list_validation_rules(
    state: State<'_, WorkerState>,
    request: IpcRequest<ListValidationRulesPayload>,
) -> Result<IpcResponse<Vec<ValidationRule>>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_list_validation_rules_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.upsert_computed_rules")]
pub async fn mneme_store_upsert_computed_rules(
    state: State<'_, WorkerState>,
    request: IpcRequest<UpsertComputedRulesPayload>,
) -> Result<IpcResponse<()>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_upsert_computed_rules_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.list_computed_rules")]
pub async fn mneme_store_list_computed_rules(
    state: State<'_, WorkerState>,
    request: IpcRequest<ListComputedRulesPayload>,
) -> Result<IpcResponse<Vec<ComputedRule>>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_list_computed_rules_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.upsert_computed_cache")]
pub async fn mneme_store_upsert_computed_cache(
    state: State<'_, WorkerState>,
    request: IpcRequest<UpsertComputedCachePayload>,
) -> Result<IpcResponse<()>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_upsert_computed_cache_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.list_computed_cache")]
pub async fn mneme_store_list_computed_cache(
    state: State<'_, WorkerState>,
    request: IpcRequest<ListComputedCachePayload>,
) -> Result<IpcResponse<Vec<ComputedCacheEntry>>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_list_computed_cache_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.trigger_rebuild_effective_schema")]
pub async fn mneme_store_trigger_rebuild_effective_schema(
    state: State<'_, WorkerState>,
    request: IpcRequest<TriggerProcessingPayload>,
) -> Result<IpcResponse<()>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_trigger_rebuild_effective_schema_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.trigger_refresh_integrity")]
pub async fn mneme_store_trigger_refresh_integrity(
    state: State<'_, WorkerState>,
    request: IpcRequest<TriggerProcessingPayload>,
) -> Result<IpcResponse<()>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_trigger_refresh_integrity_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.trigger_refresh_analytics_projections")]
pub async fn mneme_store_trigger_refresh_analytics_projections(
    state: State<'_, WorkerState>,
    request: IpcRequest<TriggerProcessingPayload>,
) -> Result<IpcResponse<()>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_trigger_refresh_analytics_projections_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.trigger_retention")]
pub async fn mneme_store_trigger_retention(
    state: State<'_, WorkerState>,
    request: IpcRequest<TriggerRetentionPayload>,
) -> Result<IpcResponse<()>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_trigger_retention_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.trigger_compaction")]
pub async fn mneme_store_trigger_compaction(
    state: State<'_, WorkerState>,
    request: IpcRequest<TriggerCompactionPayload>,
) -> Result<IpcResponse<()>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_trigger_compaction_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.run_processing_worker")]
pub async fn mneme_store_run_processing_worker(
    state: State<'_, WorkerState>,
    request: IpcRequest<RunWorkerPayload>,
) -> Result<IpcResponse<RunWorkerResult>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_run_processing_worker_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.list_jobs")]
pub async fn mneme_store_list_jobs(
    state: State<'_, WorkerState>,
    request: IpcRequest<ListJobsPayload>,
) -> Result<IpcResponse<Vec<JobSummary>>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(request_id, mneme_list_jobs_inner(state.inner(), payload)).await)
}

#[tauri::command(rename = "mneme.store.get_integrity_head")]
pub async fn mneme_store_get_integrity_head(
    state: State<'_, WorkerState>,
    request: IpcRequest<IntegrityHeadPayload>,
) -> Result<IpcResponse<Option<IntegrityHead>>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_get_integrity_head_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.get_last_schema_compile")]
pub async fn mneme_store_get_last_schema_compile(
    state: State<'_, WorkerState>,
    request: IpcRequest<SchemaHeadPayload>,
) -> Result<IpcResponse<Option<SchemaHead>>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_get_last_schema_compile_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.list_failed_jobs")]
pub async fn mneme_store_list_failed_jobs(
    state: State<'_, WorkerState>,
    request: IpcRequest<ListFailedJobsPayload>,
) -> Result<IpcResponse<Vec<JobSummary>>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_list_failed_jobs_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.get_schema_manifest")]
pub async fn mneme_store_get_schema_manifest(
    state: State<'_, WorkerState>,
    request: IpcRequest<EmptyPayload>,
) -> Result<IpcResponse<SchemaManifest>, HostError> {
    let request_id = request.request_id;
    Ok(ipc_handle(request_id, mneme_get_schema_manifest_inner(state.inner())).await)
}

#[tauri::command(rename = "mneme.store.explain_resolution")]
pub async fn mneme_store_explain_resolution(
    state: State<'_, WorkerState>,
    request: IpcRequest<ExplainResolutionPayload>,
) -> Result<IpcResponse<ExplainResolutionResult>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_explain_resolution_inner(state.inner(), payload),
    )
    .await)
}

#[tauri::command(rename = "mneme.store.explain_traversal")]
pub async fn mneme_store_explain_traversal(
    state: State<'_, WorkerState>,
    request: IpcRequest<ExplainTraversalPayload>,
) -> Result<IpcResponse<ExplainTraversalResult>, HostError> {
    let IpcRequest {
        request_id,
        payload,
    } = request;
    Ok(ipc_handle(
        request_id,
        mneme_explain_traversal_inner(state.inner(), payload),
    )
    .await)
}
