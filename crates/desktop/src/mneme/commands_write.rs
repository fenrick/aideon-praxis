#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertMetamodelBatchInput {
    pub partition_id: PartitionId,
    pub actor_id: ActorId,
    pub asserted_at: String,
    pub batch: MetamodelBatch,
    #[serde(default)]
    pub scenario_id: Option<ScenarioId>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompileEffectiveSchemaInput {
    pub partition_id: PartitionId,
    pub actor_id: ActorId,
    pub asserted_at: String,
    pub type_id: aideon_praxis::mneme::Id,
    #[serde(default)]
    pub scenario_id: Option<ScenarioId>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpResult {
    pub op_id: OpId,
}

#[cfg(test)]
pub async fn mneme_upsert_metamodel_batch(
    state: State<'_, WorkerState>,
    payload: UpsertMetamodelBatchInput,
) -> Result<OpResult, HostError> {
    mneme_upsert_metamodel_batch_inner(state.inner(), payload).await
}

async fn mneme_upsert_metamodel_batch_inner(
    state: &WorkerState,
    payload: UpsertMetamodelBatchInput,
) -> Result<OpResult, HostError> {
    info!("host: mneme_upsert_metamodel_batch received");
    debug!(
        "host: mneme_upsert_metamodel_batch partition={:?} scenario={:?}",
        payload.partition_id, payload.scenario_id
    );
    let store = state.mneme();
    let op_id = store
        .upsert_metamodel_batch(
            payload.partition_id,
            payload.actor_id,
            parse_hlc(&payload.asserted_at)?,
            payload.batch,
        )
        .await
        .map_err(host_error)?;
    Ok(OpResult { op_id })
}

#[cfg(test)]
pub async fn mneme_compile_effective_schema(
    state: State<'_, WorkerState>,
    payload: CompileEffectiveSchemaInput,
) -> Result<SchemaVersion, HostError> {
    mneme_compile_effective_schema_inner(state.inner(), payload).await
}

async fn mneme_compile_effective_schema_inner(
    state: &WorkerState,
    payload: CompileEffectiveSchemaInput,
) -> Result<SchemaVersion, HostError> {
    info!("host: mneme_compile_effective_schema received");
    debug!(
        "host: mneme_compile_effective_schema partition={:?} scenario={:?} type_id={:?}",
        payload.partition_id, payload.scenario_id, payload.type_id
    );
    let store = state.mneme();
    let result = store
        .compile_effective_schema(
            payload.partition_id,
            payload.actor_id,
            parse_hlc(&payload.asserted_at)?,
            payload.type_id,
        )
        .await
        .map_err(host_error)?;
    Ok(result)
}

#[cfg(test)]
pub async fn mneme_create_node(
    state: State<'_, WorkerState>,
    payload: CreateNodePayload,
) -> Result<OpResult, HostError> {
    mneme_create_node_inner(state.inner(), payload).await
}

async fn mneme_create_node_inner(
    state: &WorkerState,
    payload: CreateNodePayload,
) -> Result<OpResult, HostError> {
    let store = state.mneme();
    let op_id = store
        .create_node(CreateNodeInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            actor: payload.actor_id,
            asserted_at: parse_hlc(&payload.asserted_at)?,
            node_id: payload.node_id,
            type_id: payload.type_id,
            acl_group_id: payload.acl_group_id,
            owner_actor_id: payload.owner_actor_id,
            visibility: payload.visibility,
            write_options: None,
        })
        .await
        .map_err(host_error)?;
    Ok(OpResult { op_id })
}

#[cfg(test)]
pub async fn mneme_create_edge(
    state: State<'_, WorkerState>,
    payload: CreateEdgePayload,
) -> Result<OpResult, HostError> {
    mneme_create_edge_inner(state.inner(), payload).await
}

async fn mneme_create_edge_inner(
    state: &WorkerState,
    payload: CreateEdgePayload,
) -> Result<OpResult, HostError> {
    let store = state.mneme();
    let op_id = store
        .create_edge(CreateEdgeInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            actor: payload.actor_id,
            asserted_at: parse_hlc(&payload.asserted_at)?,
            edge_id: payload.edge_id,
            type_id: payload.type_id,
            src_id: payload.src_id,
            dst_id: payload.dst_id,
            exists_valid_from: parse_valid_time(&payload.exists_valid_from)?,
            exists_valid_to: match payload.exists_valid_to {
                Some(value) => Some(parse_valid_time(&value)?),
                None => None,
            },
            layer: payload.layer.unwrap_or_else(Layer::default_actual),
            weight: payload.weight,
            acl_group_id: payload.acl_group_id,
            owner_actor_id: payload.owner_actor_id,
            visibility: payload.visibility,
            write_options: None,
        })
        .await
        .map_err(host_error)?;
    Ok(OpResult { op_id })
}

#[cfg(test)]
pub async fn mneme_set_edge_existence_interval(
    state: State<'_, WorkerState>,
    payload: SetEdgeExistencePayload,
) -> Result<OpResult, HostError> {
    mneme_set_edge_existence_interval_inner(state.inner(), payload).await
}

async fn mneme_set_edge_existence_interval_inner(
    state: &WorkerState,
    payload: SetEdgeExistencePayload,
) -> Result<OpResult, HostError> {
    let store = state.mneme();
    let op_id = store
        .set_edge_existence_interval(SetEdgeExistenceIntervalInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            actor: payload.actor_id,
            asserted_at: parse_hlc(&payload.asserted_at)?,
            edge_id: payload.edge_id,
            valid_from: parse_valid_time(&payload.valid_from)?,
            valid_to: match payload.valid_to {
                Some(value) => Some(parse_valid_time(&value)?),
                None => None,
            },
            layer: payload.layer.unwrap_or_else(Layer::default_actual),
            is_tombstone: payload.is_tombstone.unwrap_or(false),
            write_options: None,
        })
        .await
        .map_err(host_error)?;
    Ok(OpResult { op_id })
}

async fn mneme_tombstone_entity_inner(
    state: &WorkerState,
    payload: TombstoneEntityPayload,
) -> Result<OpResult, HostError> {
    let store = state.mneme();
    let op_id = store
        .tombstone_entity(
            payload.partition_id,
            payload.scenario_id,
            payload.actor_id,
            parse_hlc(&payload.asserted_at)?,
            payload.entity_id,
        )
        .await
        .map_err(host_error)?;
    Ok(OpResult { op_id })
}

#[cfg(test)]
pub async fn mneme_set_property_interval(
    state: State<'_, WorkerState>,
    payload: SetPropertyIntervalPayload,
) -> Result<OpResult, HostError> {
    mneme_set_property_interval_inner(state.inner(), payload).await
}

async fn mneme_set_property_interval_inner(
    state: &WorkerState,
    payload: SetPropertyIntervalPayload,
) -> Result<OpResult, HostError> {
    let store = state.mneme();
    let op_id = store
        .set_property_interval(SetPropIntervalInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            actor: payload.actor_id,
            asserted_at: parse_hlc(&payload.asserted_at)?,
            entity_id: payload.entity_id,
            field_id: payload.field_id,
            value: payload.value,
            valid_from: parse_valid_time(&payload.valid_from)?,
            valid_to: match payload.valid_to {
                Some(value) => Some(parse_valid_time(&value)?),
                None => None,
            },
            layer: payload.layer.unwrap_or_else(Layer::default_actual),
            write_options: None,
        })
        .await
        .map_err(host_error)?;
    Ok(OpResult { op_id })
}

#[cfg(test)]
pub async fn mneme_clear_property_interval(
    state: State<'_, WorkerState>,
    payload: ClearPropertyIntervalPayload,
) -> Result<OpResult, HostError> {
    mneme_clear_property_interval_inner(state.inner(), payload).await
}

async fn mneme_clear_property_interval_inner(
    state: &WorkerState,
    payload: ClearPropertyIntervalPayload,
) -> Result<OpResult, HostError> {
    let store = state.mneme();
    let op_id = store
        .clear_property_interval(ClearPropIntervalInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            actor: payload.actor_id,
            asserted_at: parse_hlc(&payload.asserted_at)?,
            entity_id: payload.entity_id,
            field_id: payload.field_id,
            valid_from: parse_valid_time(&payload.valid_from)?,
            valid_to: match payload.valid_to {
                Some(value) => Some(parse_valid_time(&value)?),
                None => None,
            },
            layer: payload.layer.unwrap_or_else(Layer::default_actual),
            write_options: None,
        })
        .await
        .map_err(host_error)?;
    Ok(OpResult { op_id })
}

#[cfg(test)]
pub async fn mneme_or_set_update(
    state: State<'_, WorkerState>,
    payload: OrSetUpdatePayload,
) -> Result<OpResult, HostError> {
    mneme_or_set_update_inner(state.inner(), payload).await
}

async fn mneme_or_set_update_inner(
    state: &WorkerState,
    payload: OrSetUpdatePayload,
) -> Result<OpResult, HostError> {
    let store = state.mneme();
    let op_id = store
        .or_set_update(OrSetUpdateInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            actor: payload.actor_id,
            asserted_at: parse_hlc(&payload.asserted_at)?,
            entity_id: payload.entity_id,
            field_id: payload.field_id,
            op: payload.op,
            element: payload.element,
            valid_from: parse_valid_time(&payload.valid_from)?,
            valid_to: match payload.valid_to {
                Some(value) => Some(parse_valid_time(&value)?),
                None => None,
            },
            layer: payload.layer.unwrap_or_else(Layer::default_actual),
            write_options: None,
        })
        .await
        .map_err(host_error)?;
    Ok(OpResult { op_id })
}

#[cfg(test)]
pub async fn mneme_counter_update(
    state: State<'_, WorkerState>,
    payload: CounterUpdatePayload,
) -> Result<OpResult, HostError> {
    mneme_counter_update_inner(state.inner(), payload).await
}

async fn mneme_counter_update_inner(
    state: &WorkerState,
    payload: CounterUpdatePayload,
) -> Result<OpResult, HostError> {
    let store = state.mneme();
    let op_id = store
        .counter_update(CounterUpdateInput {
            partition: payload.partition_id,
            scenario_id: payload.scenario_id,
            actor: payload.actor_id,
            asserted_at: parse_hlc(&payload.asserted_at)?,
            entity_id: payload.entity_id,
            field_id: payload.field_id,
            delta: payload.delta,
            valid_from: parse_valid_time(&payload.valid_from)?,
            valid_to: match payload.valid_to {
                Some(value) => Some(parse_valid_time(&value)?),
                None => None,
            },
            layer: payload.layer.unwrap_or_else(Layer::default_actual),
            write_options: None,
        })
        .await
        .map_err(host_error)?;
    Ok(OpResult { op_id })
}
