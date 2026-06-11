#[cfg(test)]
pub async fn mneme_read_entity_at_time(
    state: State<'_, WorkerState>,
    payload: ReadEntityAtTimePayload,
) -> Result<ReadEntityAtTimeResult, HostError> {
    mneme_read_entity_at_time_inner(state.inner(), payload).await
}

async fn mneme_read_entity_at_time_inner(
    state: &WorkerState,
    payload: ReadEntityAtTimePayload,
) -> Result<ReadEntityAtTimeResult, HostError> {
    let store = state.mneme();
    let as_of = payload
        .as_of_asserted_at
        .as_deref()
        .map(parse_hlc)
        .transpose()?;
    store
        .read_entity_at_time(ReadEntityAtTimeInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            security_context: None,
            entity_id: payload.entity_id,
            at_valid_time: parse_valid_time(&payload.at)?,
            as_of_asserted_at: as_of,
            field_ids: payload.field_ids,
            include_defaults: payload.include_defaults.unwrap_or(false),
        })
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_traverse_at_time(
    state: State<'_, WorkerState>,
    payload: TraverseAtTimePayload,
) -> Result<Vec<TraverseEdgeItem>, HostError> {
    mneme_traverse_at_time_inner(state.inner(), payload).await
}

async fn mneme_traverse_at_time_inner(
    state: &WorkerState,
    payload: TraverseAtTimePayload,
) -> Result<Vec<TraverseEdgeItem>, HostError> {
    let store = state.mneme();
    let as_of = payload
        .as_of_asserted_at
        .as_deref()
        .map(parse_hlc)
        .transpose()?;
    store
        .traverse_at_time(TraverseAtTimeInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            security_context: None,
            from_entity_id: payload.from_entity_id,
            direction: payload.direction,
            edge_type_id: payload.edge_type_id,
            at_valid_time: parse_valid_time(&payload.at)?,
            as_of_asserted_at: as_of,
            limit: payload.limit.unwrap_or(200),
        })
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_list_entities(
    state: State<'_, WorkerState>,
    payload: ListEntitiesPayload,
) -> Result<Vec<ListEntitiesResultItem>, HostError> {
    mneme_list_entities_inner(state.inner(), payload).await
}

async fn mneme_list_entities_inner(
    state: &WorkerState,
    payload: ListEntitiesPayload,
) -> Result<Vec<ListEntitiesResultItem>, HostError> {
    let store = state.mneme();
    let as_of = payload
        .as_of_asserted_at
        .as_deref()
        .map(parse_hlc)
        .transpose()?;
    let filters = payload
        .filters
        .unwrap_or_default()
        .into_iter()
        .map(|filter| FieldFilter {
            field_id: filter.field_id,
            op: filter.op,
            value: filter.value,
        })
        .collect();
    store
        .list_entities(ListEntitiesInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            security_context: None,
            kind: payload.kind,
            type_id: payload.type_id,
            at_valid_time: parse_valid_time(&payload.at)?,
            as_of_asserted_at: as_of,
            filters,
            limit: payload.limit.unwrap_or(200),
            cursor: payload.cursor,
        })
        .await
        .map_err(host_error)
}

async fn mneme_get_changes_since_inner(
    state: &WorkerState,
    payload: GetChangesSincePayload,
) -> Result<Vec<ChangeEvent>, HostError> {
    let store = state.mneme();
    store
        .get_changes_since(
            payload.partition_id,
            payload.from_sequence,
            payload.limit.unwrap_or(500),
        )
        .await
        .map_err(host_error)
}

pub async fn mneme_subscribe_partition(
    state: State<'_, WorkerState>,
    window: Window,
    payload: SubscribePartitionPayload,
) -> Result<SubscriptionResult, HostError> {
    let store = state.mneme();
    let receiver = store
        .subscribe_partition(payload.partition_id, payload.from_sequence)
        .await
        .map_err(host_error)?;
    let (cancel_tx, cancel_rx) = oneshot::channel();
    let subscription_id = next_subscription_id();
    state
        .register_subscription(subscription_id.clone(), cancel_tx)
        .await;
    let event_name = payload
        .event_name
        .unwrap_or_else(|| "mneme_change_event".to_string());
    spawn_change_event_forwarder(receiver, cancel_rx, move |change| {
        let _ = window.emit(&event_name, change);
    });
    Ok(SubscriptionResult { subscription_id })
}

fn spawn_change_event_forwarder<F>(
    mut receiver: tokio::sync::mpsc::Receiver<ChangeEvent>,
    mut cancel_rx: oneshot::Receiver<()>,
    mut emit: F,
) where
    F: FnMut(ChangeEvent) + Send + 'static,
{
    spawn(async move {
        loop {
            tokio::select! {
                _ = &mut cancel_rx => break,
                evt = receiver.recv() => {
                    match evt {
                        Some(change) => emit(change),
                        None => break,
                    }
                }
            }
        }
    });
}

pub async fn mneme_unsubscribe_partition(
    state: State<'_, WorkerState>,
    payload: UnsubscribePartitionPayload,
) -> Result<bool, HostError> {
    Ok(state.cancel_subscription(&payload.subscription_id).await)
}

#[cfg(test)]
pub async fn mneme_get_projection_edges(
    state: State<'_, WorkerState>,
    payload: GetProjectionEdgesPayload,
) -> Result<Vec<ProjectionEdge>, HostError> {
    mneme_get_projection_edges_inner(state.inner(), payload).await
}

async fn mneme_get_projection_edges_inner(
    state: &WorkerState,
    payload: GetProjectionEdgesPayload,
) -> Result<Vec<ProjectionEdge>, HostError> {
    let store = state.mneme();
    let as_of = payload
        .as_of_asserted_at
        .as_deref()
        .map(parse_hlc)
        .transpose()?;
    let at_valid_time = match payload.at {
        Some(value) => Some(parse_valid_time(&value)?),
        None => None,
    };
    store
        .get_projection_edges(GetProjectionEdgesInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            security_context: None,
            at_valid_time,
            as_of_asserted_at: as_of,
            edge_type_filter: payload.edge_type_filter,
            limit: payload.limit,
        })
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_get_graph_degree_stats(
    state: State<'_, WorkerState>,
    payload: GetGraphDegreeStatsPayload,
) -> Result<Vec<GraphDegreeStat>, HostError> {
    mneme_get_graph_degree_stats_inner(state.inner(), payload).await
}

async fn mneme_get_graph_degree_stats_inner(
    state: &WorkerState,
    payload: GetGraphDegreeStatsPayload,
) -> Result<Vec<GraphDegreeStat>, HostError> {
    let store = state.mneme();
    let as_of_valid_time = match payload.as_of_valid_time {
        Some(value) => Some(parse_valid_time(&value)?),
        None => None,
    };
    store
        .get_graph_degree_stats(GetGraphDegreeStatsInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            as_of_valid_time,
            entity_ids: payload.entity_ids,
            limit: payload.limit,
        })
        .await
        .map_err(host_error)
}

#[cfg(test)]
pub async fn mneme_get_graph_edge_type_counts(
    state: State<'_, WorkerState>,
    payload: GetGraphEdgeTypeCountsPayload,
) -> Result<Vec<GraphEdgeTypeCount>, HostError> {
    mneme_get_graph_edge_type_counts_inner(state.inner(), payload).await
}

async fn mneme_get_graph_edge_type_counts_inner(
    state: &WorkerState,
    payload: GetGraphEdgeTypeCountsPayload,
) -> Result<Vec<GraphEdgeTypeCount>, HostError> {
    let store = state.mneme();
    store
        .get_graph_edge_type_counts(GetGraphEdgeTypeCountsInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            edge_type_ids: payload.edge_type_ids,
            limit: payload.limit,
        })
        .await
        .map_err(host_error)
}
