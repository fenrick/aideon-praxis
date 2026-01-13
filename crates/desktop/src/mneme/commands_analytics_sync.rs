#[cfg(test)]
pub async fn mneme_store_pagerank_scores(
    state: State<'_, WorkerState>,
    payload: StorePageRankScoresPayload,
) -> Result<PageRankRunResult, HostError> {
    mneme_store_pagerank_scores_inner(state.inner(), payload).await
}

async fn mneme_store_pagerank_scores_inner(
    state: &WorkerState,
    payload: StorePageRankScoresPayload,
) -> Result<PageRankRunResult, HostError> {
    let store = state.mneme();
    debug!(
        "host: mneme_store_pagerank_scores partition={:?} scenario={:?} asserted_at={:?}",
        payload.partition_id, payload.scenario_id, payload.asserted_at
    );
    let as_of_valid_time = match payload.as_of_valid_time {
        Some(value) => Some(parse_valid_time(&value)?),
        None => None,
    };
    let as_of_asserted_at = payload
        .as_of_asserted_at
        .as_deref()
        .map(parse_hlc)
        .transpose()?;
    let run_id = store
        .store_pagerank_scores(
            payload.partition_id,
            payload.actor_id,
            as_of_valid_time,
            as_of_asserted_at,
            PageRankRunSpec {
                damping: payload.params.damping,
                max_iters: payload.params.max_iters,
                tol: payload.params.tol,
                personalised_seed: payload.params.personalised_seed.map(|entries| {
                    entries
                        .into_iter()
                        .map(|seed| (seed.id, seed.weight))
                        .collect()
                }),
            },
            payload
                .scores
                .into_iter()
                .map(|score| (score.id, score.score))
                .collect(),
        )
        .await
        .map_err(host_error)?;
    Ok(PageRankRunResult { run_id })
}

#[cfg(test)]
pub async fn mneme_get_pagerank_scores(
    state: State<'_, WorkerState>,
    payload: GetPageRankScoresPayload,
) -> Result<Vec<PageRankScoreItem>, HostError> {
    mneme_get_pagerank_scores_inner(state.inner(), payload).await
}

async fn mneme_get_pagerank_scores_inner(
    state: &WorkerState,
    payload: GetPageRankScoresPayload,
) -> Result<Vec<PageRankScoreItem>, HostError> {
    let store = state.mneme();
    let scores = store
        .get_pagerank_scores(payload.partition_id, payload.run_id, payload.top_n)
        .await
        .map_err(host_error)?;
    Ok(scores
        .into_iter()
        .map(|(id, score)| PageRankScoreItem { id, score })
        .collect())
}

#[cfg(test)]
pub async fn mneme_export_ops(
    state: State<'_, WorkerState>,
    payload: ExportOpsPayload,
) -> Result<Vec<OpEnvelope>, HostError> {
    mneme_export_ops_inner(state.inner(), payload).await
}

async fn mneme_export_ops_inner(
    state: &WorkerState,
    payload: ExportOpsPayload,
) -> Result<Vec<OpEnvelope>, HostError> {
    let store = state.mneme();
    let since = payload
        .since_asserted_at
        .as_deref()
        .map(parse_hlc)
        .transpose()?;
    store
        .export_ops(ExportOpsInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            since_asserted_at: since,
            limit: payload.limit.unwrap_or(500),
        })
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_ingest_ops(
    state: State<'_, WorkerState>,
    payload: IngestOpsPayload,
) -> Result<(), HostError> {
    mneme_ingest_ops_inner(state.inner(), payload).await
}

async fn mneme_ingest_ops_inner(
    state: &WorkerState,
    payload: IngestOpsPayload,
) -> Result<(), HostError> {
    let store = state.mneme();
    debug!(
        "host: mneme_ingest_ops partition={:?} scenario={:?} ops={}",
        payload.partition_id,
        payload.scenario_id,
        payload.ops.len()
    );
    let ops: Vec<OpEnvelope> = payload
        .ops
        .into_iter()
        .map(|op| {
            Ok(OpEnvelope {
                op_id: op.op_id,
                actor_id: op.actor_id,
                asserted_at: parse_hlc(&op.asserted_at)?,
                op_type: op.op_type,
                payload: op.payload,
                deps: op.deps,
            })
        })
        .collect::<Result<Vec<_>, HostError>>()?;
    store
        .ingest_ops(payload.partition_id, ops)
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_get_partition_head(
    state: State<'_, WorkerState>,
    payload: PartitionHeadPayload,
) -> Result<PartitionHeadResult, HostError> {
    mneme_get_partition_head_inner(state.inner(), payload).await
}

async fn mneme_get_partition_head_inner(
    state: &WorkerState,
    payload: PartitionHeadPayload,
) -> Result<PartitionHeadResult, HostError> {
    let store = state.mneme();
    debug!(
        "host: mneme_get_partition_head partition={:?} scenario={:?}",
        payload.partition_id, payload.scenario_id
    );
    let head = store
        .get_partition_head(payload.partition_id)
        .await
        .map_err(host_error)?;
    Ok(PartitionHeadResult {
        head: head.as_i64().to_string(),
    })
}

#[cfg(test)]
pub async fn mneme_create_scenario(
    state: State<'_, WorkerState>,
    payload: CreateScenarioPayload,
) -> Result<ScenarioId, HostError> {
    mneme_create_scenario_inner(state.inner(), payload).await
}

async fn mneme_create_scenario_inner(
    state: &WorkerState,
    payload: CreateScenarioPayload,
) -> Result<ScenarioId, HostError> {
    let store = state.mneme();
    let asserted_at = parse_hlc(&payload.asserted_at)?;
    store
        .create_scenario(CreateScenarioInput {
            partition: payload.partition_id,
            actor: payload.actor_id,
            asserted_at,
            name: payload.name,
        })
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_delete_scenario(
    state: State<'_, WorkerState>,
    payload: DeleteScenarioPayload,
) -> Result<(), HostError> {
    mneme_delete_scenario_inner(state.inner(), payload).await
}

async fn mneme_delete_scenario_inner(
    state: &WorkerState,
    payload: DeleteScenarioPayload,
) -> Result<(), HostError> {
    let store = state.mneme();
    let asserted_at = parse_hlc(&payload.asserted_at)?;
    store
        .delete_scenario(
            payload.partition_id,
            payload.actor_id,
            asserted_at,
            payload.scenario_id,
        )
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_export_ops_stream(
    state: State<'_, WorkerState>,
    payload: ExportOpsStreamPayload,
) -> Result<Vec<ExportRecord>, HostError> {
    mneme_export_ops_stream_inner(state.inner(), payload).await
}

async fn mneme_export_ops_stream_inner(
    state: &WorkerState,
    payload: ExportOpsStreamPayload,
) -> Result<Vec<ExportRecord>, HostError> {
    let store = state.mneme();
    let since_asserted_at = payload
        .since_asserted_at
        .as_deref()
        .map(parse_hlc)
        .transpose()?;
    let until_asserted_at = payload
        .until_asserted_at
        .as_deref()
        .map(parse_hlc)
        .transpose()?;
    let options = ExportOptions {
        partition: payload.partition_id,
        scenario_id: payload.scenario_id,
        since_asserted_at,
        until_asserted_at,
        include_schema: payload.include_schema.unwrap_or(true),
        include_data_ops: payload.include_data_ops.unwrap_or(true),
        include_scenarios: payload.include_scenarios.unwrap_or(true),
    };
    let records = store.export_ops_stream(options).await.map_err(host_error)?;
    Ok(records.collect())
}

#[cfg(test)]
pub async fn mneme_import_ops_stream(
    state: State<'_, WorkerState>,
    payload: ImportOpsStreamPayload,
) -> Result<ImportReport, HostError> {
    mneme_import_ops_stream_inner(state.inner(), payload).await
}

async fn mneme_import_ops_stream_inner(
    state: &WorkerState,
    payload: ImportOpsStreamPayload,
) -> Result<ImportReport, HostError> {
    let store = state.mneme();
    let options = ImportOptions {
        target_partition: payload.target_partition,
        scenario_id: payload.scenario_id,
        allow_partition_create: payload.allow_partition_create.unwrap_or(false),
        remap_actor_ids: payload.remap_actor_ids.unwrap_or_default(),
        strict_schema: payload.strict_schema.unwrap_or(false),
    };
    store
        .import_ops_stream(options, payload.records.into_iter())
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_export_snapshot_stream(
    state: State<'_, WorkerState>,
    payload: ExportSnapshotPayload,
) -> Result<Vec<ExportRecord>, HostError> {
    mneme_export_snapshot_stream_inner(state.inner(), payload).await
}

async fn mneme_export_snapshot_stream_inner(
    state: &WorkerState,
    payload: ExportSnapshotPayload,
) -> Result<Vec<ExportRecord>, HostError> {
    let store = state.mneme();
    let options = SnapshotOptions {
        partition_id: payload.partition_id,
        scenario_id: payload.scenario_id,
        as_of_asserted_at: parse_hlc(&payload.as_of_asserted_at)?,
        include_facts: payload.include_facts.unwrap_or(true),
        include_entities: payload.include_entities.unwrap_or(true),
    };
    let records = store
        .export_snapshot_stream(options)
        .await
        .map_err(host_error)?;
    Ok(records.collect())
}

#[cfg(test)]
pub async fn mneme_import_snapshot_stream(
    state: State<'_, WorkerState>,
    payload: ImportSnapshotPayload,
) -> Result<(), HostError> {
    mneme_import_snapshot_stream_inner(state.inner(), payload).await
}

async fn mneme_import_snapshot_stream_inner(
    state: &WorkerState,
    payload: ImportSnapshotPayload,
) -> Result<(), HostError> {
    let store = state.mneme();
    let options = ImportOptions {
        target_partition: payload.target_partition,
        scenario_id: payload.scenario_id,
        allow_partition_create: payload.allow_partition_create.unwrap_or(false),
        remap_actor_ids: payload.remap_actor_ids.unwrap_or_default(),
        strict_schema: payload.strict_schema.unwrap_or(false),
    };
    store
        .import_snapshot_stream(options, payload.records.into_iter())
        .await
        .map_err(host_error)
}
