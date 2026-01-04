#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNodePayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub actor_id: ActorId,
    pub asserted_at: String,
    pub node_id: aideon_praxis::mneme::Id,
    pub type_id: Option<aideon_praxis::mneme::Id>,
    pub acl_group_id: Option<String>,
    pub owner_actor_id: Option<ActorId>,
    pub visibility: Option<u8>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEdgePayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub actor_id: ActorId,
    pub asserted_at: String,
    pub edge_id: aideon_praxis::mneme::Id,
    pub type_id: Option<aideon_praxis::mneme::Id>,
    pub src_id: aideon_praxis::mneme::Id,
    pub dst_id: aideon_praxis::mneme::Id,
    pub exists_valid_from: String,
    pub exists_valid_to: Option<String>,
    pub layer: Option<Layer>,
    pub weight: Option<f64>,
    pub acl_group_id: Option<String>,
    pub owner_actor_id: Option<ActorId>,
    pub visibility: Option<u8>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetEdgeExistencePayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub actor_id: ActorId,
    pub asserted_at: String,
    pub edge_id: aideon_praxis::mneme::Id,
    pub valid_from: String,
    pub valid_to: Option<String>,
    pub layer: Option<Layer>,
    pub is_tombstone: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TombstoneEntityPayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub actor_id: ActorId,
    pub asserted_at: String,
    pub entity_id: aideon_praxis::mneme::Id,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetPropertyIntervalPayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub actor_id: ActorId,
    pub asserted_at: String,
    pub entity_id: aideon_praxis::mneme::Id,
    pub field_id: aideon_praxis::mneme::Id,
    pub value: Value,
    pub valid_from: String,
    pub valid_to: Option<String>,
    pub layer: Option<Layer>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClearPropertyIntervalPayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub actor_id: ActorId,
    pub asserted_at: String,
    pub entity_id: aideon_praxis::mneme::Id,
    pub field_id: aideon_praxis::mneme::Id,
    pub valid_from: String,
    pub valid_to: Option<String>,
    pub layer: Option<Layer>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrSetUpdatePayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub actor_id: ActorId,
    pub asserted_at: String,
    pub entity_id: aideon_praxis::mneme::Id,
    pub field_id: aideon_praxis::mneme::Id,
    pub op: SetOp,
    pub element: Value,
    pub valid_from: String,
    pub valid_to: Option<String>,
    pub layer: Option<Layer>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CounterUpdatePayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub actor_id: ActorId,
    pub asserted_at: String,
    pub entity_id: aideon_praxis::mneme::Id,
    pub field_id: aideon_praxis::mneme::Id,
    pub delta: i64,
    pub valid_from: String,
    pub valid_to: Option<String>,
    pub layer: Option<Layer>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadEntityAtTimePayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub entity_id: aideon_praxis::mneme::Id,
    pub at: String,
    pub as_of_asserted_at: Option<String>,
    pub field_ids: Option<Vec<aideon_praxis::mneme::Id>>,
    pub include_defaults: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TraverseAtTimePayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub from_entity_id: aideon_praxis::mneme::Id,
    pub direction: Direction,
    pub edge_type_id: Option<aideon_praxis::mneme::Id>,
    pub at: String,
    pub as_of_asserted_at: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListEntitiesPayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub kind: Option<EntityKind>,
    pub type_id: Option<aideon_praxis::mneme::Id>,
    pub at: String,
    pub as_of_asserted_at: Option<String>,
    pub filters: Option<Vec<ListEntitiesFilterPayload>>,
    pub limit: Option<u32>,
    pub cursor: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListEntitiesFilterPayload {
    pub field_id: aideon_praxis::mneme::Id,
    pub op: CompareOp,
    pub value: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetChangesSincePayload {
    pub partition_id: PartitionId,
    pub from_sequence: Option<i64>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscribePartitionPayload {
    pub partition_id: PartitionId,
    pub from_sequence: Option<i64>,
    pub event_name: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionResult {
    pub subscription_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnsubscribePartitionPayload {
    pub subscription_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetProjectionEdgesPayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub at: Option<String>,
    pub as_of_asserted_at: Option<String>,
    pub edge_type_filter: Option<Vec<aideon_praxis::mneme::Id>>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetGraphDegreeStatsPayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub as_of_valid_time: Option<String>,
    pub entity_ids: Option<Vec<aideon_praxis::mneme::Id>>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetGraphEdgeTypeCountsPayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub edge_type_ids: Option<Vec<aideon_praxis::mneme::Id>>,
    pub limit: Option<u32>,
}
