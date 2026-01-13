#[cfg(test)]
pub async fn mneme_upsert_validation_rules(
    state: State<'_, WorkerState>,
    payload: UpsertValidationRulesPayload,
) -> Result<(), HostError> {
    mneme_upsert_validation_rules_inner(state.inner(), payload).await
}

async fn mneme_upsert_validation_rules_inner(
    state: &WorkerState,
    payload: UpsertValidationRulesPayload,
) -> Result<(), HostError> {
    let store = state.mneme();
    let asserted_at = parse_hlc(&payload.asserted_at)?;
    store
        .upsert_validation_rules(
            payload.partition_id,
            payload.actor_id,
            asserted_at,
            payload.rules,
        )
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_list_validation_rules(
    state: State<'_, WorkerState>,
    payload: ListValidationRulesPayload,
) -> Result<Vec<ValidationRule>, HostError> {
    mneme_list_validation_rules_inner(state.inner(), payload).await
}

async fn mneme_list_validation_rules_inner(
    state: &WorkerState,
    payload: ListValidationRulesPayload,
) -> Result<Vec<ValidationRule>, HostError> {
    let store = state.mneme();
    store
        .list_validation_rules(payload.partition_id)
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_upsert_computed_rules(
    state: State<'_, WorkerState>,
    payload: UpsertComputedRulesPayload,
) -> Result<(), HostError> {
    mneme_upsert_computed_rules_inner(state.inner(), payload).await
}

async fn mneme_upsert_computed_rules_inner(
    state: &WorkerState,
    payload: UpsertComputedRulesPayload,
) -> Result<(), HostError> {
    let store = state.mneme();
    let asserted_at = parse_hlc(&payload.asserted_at)?;
    store
        .upsert_computed_rules(
            payload.partition_id,
            payload.actor_id,
            asserted_at,
            payload.rules,
        )
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_list_computed_rules(
    state: State<'_, WorkerState>,
    payload: ListComputedRulesPayload,
) -> Result<Vec<ComputedRule>, HostError> {
    mneme_list_computed_rules_inner(state.inner(), payload).await
}

async fn mneme_list_computed_rules_inner(
    state: &WorkerState,
    payload: ListComputedRulesPayload,
) -> Result<Vec<ComputedRule>, HostError> {
    let store = state.mneme();
    store
        .list_computed_rules(payload.partition_id)
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_upsert_computed_cache(
    state: State<'_, WorkerState>,
    payload: UpsertComputedCachePayload,
) -> Result<(), HostError> {
    mneme_upsert_computed_cache_inner(state.inner(), payload).await
}

async fn mneme_upsert_computed_cache_inner(
    state: &WorkerState,
    payload: UpsertComputedCachePayload,
) -> Result<(), HostError> {
    let store = state.mneme();
    let entries = payload
        .entries
        .into_iter()
        .map(|entry| {
            let valid_from = parse_valid_time(&entry.valid_from)?.0;
            let valid_to = entry
                .valid_to
                .as_deref()
                .map(parse_valid_time)
                .transpose()?
                .map(|time| time.0);
            let computed_asserted_at = parse_hlc(&entry.computed_asserted_at)?;
            Ok(ComputedCacheEntry {
                entity_id: entry.entity_id,
                field_id: entry.field_id,
                valid_from,
                valid_to,
                value: entry.value,
                rule_version_hash: entry.rule_version_hash,
                computed_asserted_at,
            })
        })
        .collect::<Result<Vec<_>, HostError>>()?;
    store
        .upsert_computed_cache(payload.partition_id, entries)
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_list_computed_cache(
    state: State<'_, WorkerState>,
    payload: ListComputedCachePayload,
) -> Result<Vec<ComputedCacheEntry>, HostError> {
    mneme_list_computed_cache_inner(state.inner(), payload).await
}

async fn mneme_list_computed_cache_inner(
    state: &WorkerState,
    payload: ListComputedCachePayload,
) -> Result<Vec<ComputedCacheEntry>, HostError> {
    let store = state.mneme();
    let at_valid_time = payload
        .at_valid_time
        .as_deref()
        .map(parse_valid_time)
        .transpose()?;
    let input = ListComputedCacheInput {
        partition: payload.partition_id,
        entity_id: payload.entity_id,
        field_id: payload.field_id,
        at_valid_time,
        limit: payload.limit.unwrap_or(100),
    };
    store.list_computed_cache(input).await.map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_trigger_rebuild_effective_schema(
    state: State<'_, WorkerState>,
    payload: TriggerProcessingPayload,
) -> Result<(), HostError> {
    mneme_trigger_rebuild_effective_schema_inner(state.inner(), payload).await
}

async fn mneme_trigger_rebuild_effective_schema_inner(
    state: &WorkerState,
    payload: TriggerProcessingPayload,
) -> Result<(), HostError> {
    let store = state.mneme();
    store
        .trigger_rebuild_effective_schema(TriggerProcessingInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            reason: payload.reason,
        })
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_trigger_refresh_integrity(
    state: State<'_, WorkerState>,
    payload: TriggerProcessingPayload,
) -> Result<(), HostError> {
    mneme_trigger_refresh_integrity_inner(state.inner(), payload).await
}

async fn mneme_trigger_refresh_integrity_inner(
    state: &WorkerState,
    payload: TriggerProcessingPayload,
) -> Result<(), HostError> {
    let store = state.mneme();
    store
        .trigger_refresh_integrity(TriggerProcessingInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            reason: payload.reason,
        })
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_trigger_refresh_analytics_projections(
    state: State<'_, WorkerState>,
    payload: TriggerProcessingPayload,
) -> Result<(), HostError> {
    mneme_trigger_refresh_analytics_projections_inner(state.inner(), payload).await
}

async fn mneme_trigger_refresh_analytics_projections_inner(
    state: &WorkerState,
    payload: TriggerProcessingPayload,
) -> Result<(), HostError> {
    let store = state.mneme();
    store
        .trigger_refresh_analytics_projections(TriggerProcessingInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            reason: payload.reason,
        })
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_trigger_retention(
    state: State<'_, WorkerState>,
    payload: TriggerRetentionPayload,
) -> Result<(), HostError> {
    mneme_trigger_retention_inner(state.inner(), payload).await
}

async fn mneme_trigger_retention_inner(
    state: &WorkerState,
    payload: TriggerRetentionPayload,
) -> Result<(), HostError> {
    let store = state.mneme();
    store
        .trigger_retention(TriggerRetentionInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            policy: RetentionPolicy {
                keep_ops_days: payload.policy.keep_ops_days,
                keep_facts_days: payload.policy.keep_facts_days,
                keep_failed_jobs_days: payload.policy.keep_failed_jobs_days,
                keep_pagerank_runs_days: payload.policy.keep_pagerank_runs_days,
            },
            reason: payload.reason,
        })
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_trigger_compaction(
    state: State<'_, WorkerState>,
    payload: TriggerCompactionPayload,
) -> Result<(), HostError> {
    mneme_trigger_compaction_inner(state.inner(), payload).await
}

async fn mneme_trigger_compaction_inner(
    state: &WorkerState,
    payload: TriggerCompactionPayload,
) -> Result<(), HostError> {
    let store = state.mneme();
    store
        .trigger_compaction(TriggerCompactionInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            reason: payload.reason,
        })
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_run_processing_worker(
    state: State<'_, WorkerState>,
    payload: RunWorkerPayload,
) -> Result<RunWorkerResult, HostError> {
    mneme_run_processing_worker_inner(state.inner(), payload).await
}

async fn mneme_run_processing_worker_inner(
    state: &WorkerState,
    payload: RunWorkerPayload,
) -> Result<RunWorkerResult, HostError> {
    let store = state.mneme();
    let jobs = store
        .run_processing_worker(RunWorkerInput {
            max_jobs: payload.max_jobs,
            lease_millis: payload.lease_millis,
        })
        .await
        .map_err(host_error)?;
    Ok(RunWorkerResult {
        jobs_processed: jobs,
    })
}

#[cfg(test)]
pub async fn mneme_list_jobs(
    state: State<'_, WorkerState>,
    payload: ListJobsPayload,
) -> Result<Vec<JobSummary>, HostError> {
    mneme_list_jobs_inner(state.inner(), payload).await
}

async fn mneme_list_jobs_inner(
    state: &WorkerState,
    payload: ListJobsPayload,
) -> Result<Vec<JobSummary>, HostError> {
    let store = state.mneme();
    store
        .list_jobs(payload.partition_id, payload.status, payload.limit)
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_get_integrity_head(
    state: State<'_, WorkerState>,
    payload: IntegrityHeadPayload,
) -> Result<Option<IntegrityHead>, HostError> {
    mneme_get_integrity_head_inner(state.inner(), payload).await
}

async fn mneme_get_integrity_head_inner(
    state: &WorkerState,
    payload: IntegrityHeadPayload,
) -> Result<Option<IntegrityHead>, HostError> {
    let store = state.mneme();
    store
        .get_integrity_head(payload.partition_id, payload.scenario_id)
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_get_last_schema_compile(
    state: State<'_, WorkerState>,
    payload: SchemaHeadPayload,
) -> Result<Option<SchemaHead>, HostError> {
    mneme_get_last_schema_compile_inner(state.inner(), payload).await
}

async fn mneme_get_last_schema_compile_inner(
    state: &WorkerState,
    payload: SchemaHeadPayload,
) -> Result<Option<SchemaHead>, HostError> {
    let store = state.mneme();
    store
        .get_last_schema_compile(payload.partition_id, payload.type_id)
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_list_failed_jobs(
    state: State<'_, WorkerState>,
    payload: ListFailedJobsPayload,
) -> Result<Vec<JobSummary>, HostError> {
    mneme_list_failed_jobs_inner(state.inner(), payload).await
}

async fn mneme_list_failed_jobs_inner(
    state: &WorkerState,
    payload: ListFailedJobsPayload,
) -> Result<Vec<JobSummary>, HostError> {
    let store = state.mneme();
    store
        .list_failed_jobs(payload.partition_id, payload.limit)
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_get_schema_manifest(
    state: State<'_, WorkerState>,
) -> Result<SchemaManifest, HostError> {
    mneme_get_schema_manifest_inner(state.inner()).await
}

async fn mneme_get_schema_manifest_inner(state: &WorkerState) -> Result<SchemaManifest, HostError> {
    let store = state.mneme();
    store.get_schema_manifest().await.map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_explain_resolution(
    state: State<'_, WorkerState>,
    payload: ExplainResolutionPayload,
) -> Result<ExplainResolutionResult, HostError> {
    mneme_explain_resolution_inner(state.inner(), payload).await
}

async fn mneme_explain_resolution_inner(
    state: &WorkerState,
    payload: ExplainResolutionPayload,
) -> Result<ExplainResolutionResult, HostError> {
    let store = state.mneme();
    let as_of = payload
        .as_of_asserted_at
        .as_deref()
        .map(parse_hlc)
        .transpose()?;
    store
        .explain_resolution(ExplainResolutionInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            security_context: None,
            entity_id: payload.entity_id,
            field_id: payload.field_id,
            at_valid_time: parse_valid_time(&payload.at)?,
            as_of_asserted_at: as_of,
        })
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_explain_traversal(
    state: State<'_, WorkerState>,
    payload: ExplainTraversalPayload,
) -> Result<ExplainTraversalResult, HostError> {
    mneme_explain_traversal_inner(state.inner(), payload).await
}

async fn mneme_explain_traversal_inner(
    state: &WorkerState,
    payload: ExplainTraversalPayload,
) -> Result<ExplainTraversalResult, HostError> {
    let store = state.mneme();
    let as_of = payload
        .as_of_asserted_at
        .as_deref()
        .map(parse_hlc)
        .transpose()?;
    store
        .explain_traversal(ExplainTraversalInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            security_context: None,
            edge_id: payload.edge_id,
            at_valid_time: parse_valid_time(&payload.at)?,
            as_of_asserted_at: as_of,
        })
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_get_effective_schema(
    state: State<'_, WorkerState>,
    partition_id: PartitionId,
    type_id: aideon_praxis::mneme::Id,
) -> Result<Option<aideon_praxis::mneme::EffectiveSchema>, HostError> {
    mneme_get_effective_schema_inner(state.inner(), partition_id, type_id).await
}

async fn mneme_get_effective_schema_inner(
    state: &WorkerState,
    partition_id: PartitionId,
    type_id: aideon_praxis::mneme::Id,
) -> Result<Option<aideon_praxis::mneme::EffectiveSchema>, HostError> {
    let store = state.mneme();
    store
        .get_effective_schema(partition_id, type_id)
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_list_edge_type_rules(
    state: State<'_, WorkerState>,
    partition_id: PartitionId,
    edge_type_id: Option<aideon_praxis::mneme::Id>,
) -> Result<Vec<EdgeTypeRule>, HostError> {
    mneme_list_edge_type_rules_inner(state.inner(), partition_id, edge_type_id).await
}

async fn mneme_list_edge_type_rules_inner(
    state: &WorkerState,
    partition_id: PartitionId,
    edge_type_id: Option<aideon_praxis::mneme::Id>,
) -> Result<Vec<EdgeTypeRule>, HostError> {
    let store = state.mneme();
    store
        .list_edge_type_rules(partition_id, edge_type_id)
        .await
        .map_err(host_error)
}
