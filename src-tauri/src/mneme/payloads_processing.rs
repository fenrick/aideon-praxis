#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetEffectiveSchemaPayload {
    pub partition_id: PartitionId,
    pub type_id: aideon_praxis::mneme::Id,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListEdgeTypeRulesPayload {
    pub partition_id: PartitionId,
    #[serde(default)]
    pub edge_type_id: Option<aideon_praxis::mneme::Id>,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertValidationRulesPayload {
    pub partition_id: PartitionId,
    pub actor_id: ActorId,
    pub asserted_at: String,
    pub rules: Vec<ValidationRule>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListValidationRulesPayload {
    pub partition_id: PartitionId,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertComputedRulesPayload {
    pub partition_id: PartitionId,
    pub actor_id: ActorId,
    pub asserted_at: String,
    pub rules: Vec<ComputedRule>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListComputedRulesPayload {
    pub partition_id: PartitionId,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComputedCacheEntryPayload {
    pub entity_id: aideon_praxis::mneme::Id,
    pub field_id: aideon_praxis::mneme::Id,
    pub valid_from: String,
    pub valid_to: Option<String>,
    pub value: Value,
    pub rule_version_hash: String,
    pub computed_asserted_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertComputedCachePayload {
    pub partition_id: PartitionId,
    pub entries: Vec<ComputedCacheEntryPayload>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListComputedCachePayload {
    pub partition_id: PartitionId,
    pub entity_id: Option<aideon_praxis::mneme::Id>,
    pub field_id: aideon_praxis::mneme::Id,
    pub at_valid_time: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerProcessingPayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub reason: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RetentionPolicyPayload {
    pub keep_ops_days: Option<u32>,
    pub keep_facts_days: Option<u32>,
    pub keep_failed_jobs_days: Option<u32>,
    pub keep_pagerank_runs_days: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerRetentionPayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub policy: RetentionPolicyPayload,
    pub reason: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerCompactionPayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub reason: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunWorkerPayload {
    pub max_jobs: u32,
    pub lease_millis: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunWorkerResult {
    pub jobs_processed: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListJobsPayload {
    pub partition_id: PartitionId,
    pub status: Option<u8>,
    pub limit: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IntegrityHeadPayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaHeadPayload {
    pub partition_id: PartitionId,
    pub type_id: aideon_praxis::mneme::Id,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListFailedJobsPayload {
    pub partition_id: PartitionId,
    pub limit: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplainResolutionPayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub entity_id: aideon_praxis::mneme::Id,
    pub field_id: aideon_praxis::mneme::Id,
    pub at: String,
    pub as_of_asserted_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplainTraversalPayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub edge_id: aideon_praxis::mneme::Id,
    pub at: String,
    pub as_of_asserted_at: Option<String>,
}
