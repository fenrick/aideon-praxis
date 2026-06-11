#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorePageRankScoresPayload {
    pub partition_id: PartitionId,
    pub actor_id: ActorId,
    pub asserted_at: String,
    pub as_of_valid_time: Option<String>,
    pub as_of_asserted_at: Option<String>,
    pub params: PageRankParamsPayload,
    pub scores: Vec<PageRankScorePayload>,
    pub scenario_id: Option<ScenarioId>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageRankParamsPayload {
    pub damping: f64,
    pub max_iters: u32,
    pub tol: f64,
    pub personalised_seed: Option<Vec<PageRankSeedPayload>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageRankSeedPayload {
    pub id: aideon_praxis::mneme::Id,
    pub weight: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageRankScorePayload {
    pub id: aideon_praxis::mneme::Id,
    pub score: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetPageRankScoresPayload {
    pub partition_id: PartitionId,
    pub run_id: aideon_praxis::mneme::Id,
    pub top_n: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PageRankRunResult {
    pub run_id: aideon_praxis::mneme::Id,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PageRankScoreItem {
    pub id: aideon_praxis::mneme::Id,
    pub score: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportOpsPayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub since_asserted_at: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IngestOpsPayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub ops: Vec<OpEnvelopePayload>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpEnvelopePayload {
    pub op_id: OpId,
    pub actor_id: ActorId,
    pub asserted_at: String,
    pub op_type: u16,
    pub payload: Vec<u8>,
    pub deps: Vec<OpId>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PartitionHeadResult {
    pub head: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PartitionHeadPayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateScenarioPayload {
    pub partition_id: PartitionId,
    pub actor_id: ActorId,
    pub asserted_at: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteScenarioPayload {
    pub partition_id: PartitionId,
    pub actor_id: ActorId,
    pub asserted_at: String,
    pub scenario_id: ScenarioId,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportOpsStreamPayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub since_asserted_at: Option<String>,
    pub until_asserted_at: Option<String>,
    pub include_schema: Option<bool>,
    pub include_data_ops: Option<bool>,
    pub include_scenarios: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportOpsStreamPayload {
    pub target_partition: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub allow_partition_create: Option<bool>,
    pub remap_actor_ids: Option<HashMap<ActorId, ActorId>>,
    pub strict_schema: Option<bool>,
    pub records: Vec<ExportRecord>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSnapshotPayload {
    pub partition_id: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub as_of_asserted_at: String,
    pub include_facts: Option<bool>,
    pub include_entities: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportSnapshotPayload {
    pub target_partition: PartitionId,
    pub scenario_id: Option<ScenarioId>,
    pub allow_partition_create: Option<bool>,
    pub remap_actor_ids: Option<HashMap<ActorId, ActorId>>,
    pub strict_schema: Option<bool>,
    pub records: Vec<ExportRecord>,
}
