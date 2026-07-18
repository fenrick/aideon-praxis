//! Commit-model DTOs and temporal request/response shapes.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use specta::Type;

#[derive(Clone, Debug, Default, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ChangeSet {
    pub node_creates: Vec<NodeVersion>,
    pub node_updates: Vec<NodeVersion>,
    pub node_deletes: Vec<NodeTombstone>,
    pub edge_creates: Vec<EdgeVersion>,
    pub edge_updates: Vec<EdgeVersion>,
    pub edge_deletes: Vec<EdgeTombstone>,
}

impl ChangeSet {
    pub fn is_empty(&self) -> bool {
        self.node_creates.is_empty()
            && self.node_updates.is_empty()
            && self.node_deletes.is_empty()
            && self.edge_creates.is_empty()
            && self.edge_updates.is_empty()
            && self.edge_deletes.is_empty()
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Type)]
#[serde(rename_all = "camelCase")]
pub struct NodeVersion {
    pub id: String,
    pub r#type: Option<String>,
    pub props: Option<Value>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Type)]
#[serde(rename_all = "camelCase")]
pub struct EdgeVersion {
    pub id: Option<String>,
    pub from: String,
    pub to: String,
    pub r#type: Option<String>,
    pub directed: Option<bool>,
    pub props: Option<Value>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Type)]
#[serde(rename_all = "camelCase")]
pub struct NodeTombstone {
    pub id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Type)]
#[serde(rename_all = "camelCase")]
pub struct EdgeTombstone {
    pub from: String,
    pub to: String,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DiffPatch {
    pub node_adds: Vec<NodeVersion>,
    pub node_mods: Vec<NodeVersion>,
    pub node_dels: Vec<NodeTombstone>,
    pub edge_adds: Vec<EdgeVersion>,
    pub edge_mods: Vec<EdgeVersion>,
    pub edge_dels: Vec<EdgeTombstone>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CommitSummary {
    pub id: String,
    pub parents: Vec<String>,
    pub branch: String,
    pub author: Option<String>,
    pub time: Option<String>,
    pub message: String,
    pub tags: Vec<String>,
    pub change_count: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PersistedCommit {
    pub summary: CommitSummary,
    pub change_set: ChangeSet,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CommitChangesRequest {
    pub branch: String,
    pub parent: Option<String>,
    pub author: Option<String>,
    pub time: Option<String>,
    pub message: String,
    pub tags: Vec<String>,
    pub changes: ChangeSet,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CommitChangesResponse {
    pub id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum CommitRef {
    Id(String),
    Branch { branch: String, at: Option<String> },
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BranchInfo {
    pub name: String,
    pub head: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateBranchRequest {
    pub name: String,
    pub from: Option<CommitRef>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ListCommitsResponse {
    pub commits: Vec<CommitSummary>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ListBranchesResponse {
    pub branches: Vec<BranchInfo>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StateAtArgs {
    pub as_of: CommitRef,
    pub scenario: Option<String>,
    pub confidence: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub layer: Option<String>,
}

impl StateAtArgs {
    pub fn new(
        as_of: String,
        scenario: Option<String>,
        confidence: Option<f64>,
        layer: Option<String>,
    ) -> Self {
        Self {
            as_of: CommitRef::Id(as_of),
            scenario,
            confidence,
            layer,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StateAtResult {
    #[serde(rename = "asOf")]
    pub commit_id: String,
    pub scenario: Option<String>,
    pub confidence: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub layer: Option<String>,
    pub nodes: u64,
    pub edges: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DiffArgs {
    pub from: CommitRef,
    pub to: CommitRef,
    pub scope: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DiffSummary {
    pub from: String,
    pub to: String,
    pub node_adds: u64,
    pub node_mods: u64,
    pub node_dels: u64,
    pub edge_adds: u64,
    pub edge_mods: u64,
    pub edge_dels: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TopologyDeltaArgs {
    pub from: CommitRef,
    pub to: CommitRef,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TopologyDeltaResult {
    pub from: String,
    pub to: String,
    pub node_adds: u64,
    pub node_dels: u64,
    pub edge_adds: u64,
    pub edge_dels: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MergeRequest {
    pub source: String,
    pub target: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MergeConflict {
    pub reference: String,
    pub kind: String,
    pub message: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MergeResponse {
    pub result: Option<String>,
    pub conflicts: Option<Vec<MergeConflict>>,
}
