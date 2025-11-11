//! Shared temporal DTOs for the time-first command surface.

use serde::{Deserialize, Serialize};
use serde_json::Value;

pub type CommitId = String;
pub type BranchName = String;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StateAtArgs {
    pub as_of: CommitRef,
    pub scenario: Option<BranchName>,
    pub confidence: Option<f64>,
}

impl StateAtArgs {
    pub fn new(as_of: String, scenario: Option<String>, confidence: Option<f64>) -> Self {
        Self {
            as_of: CommitRef::Id(as_of),
            scenario,
            confidence,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StateAtResult {
    pub as_of: String,
    pub scenario: Option<String>,
    pub confidence: Option<f64>,
    pub nodes: u64,
    pub edges: u64,
}

impl StateAtResult {
    pub fn new(
        as_of: String,
        scenario: Option<String>,
        confidence: Option<f64>,
        nodes: u64,
        edges: u64,
    ) -> Self {
        Self {
            as_of,
            scenario,
            confidence,
            nodes,
            edges,
        }
    }

    pub fn empty(as_of: String, scenario: Option<String>, confidence: Option<f64>) -> Self {
        Self::new(as_of, scenario, confidence, 0, 0)
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(untagged)]
pub enum CommitRef {
    Id(CommitId),
    Branch {
        branch: BranchName,
        #[serde(skip_serializing_if = "Option::is_none")]
        at: Option<CommitId>,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NodeVersion {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub props: Option<Value>,
}

#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeTombstone {
    pub id: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EdgeVersion {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub from: String,
    pub to: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub directed: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub props: Option<Value>,
}

#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EdgeTombstone {
    pub from: String,
    pub to: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ChangeSet {
    #[serde(default)]
    pub node_creates: Vec<NodeVersion>,
    #[serde(default)]
    pub node_updates: Vec<NodeVersion>,
    #[serde(default)]
    pub node_deletes: Vec<NodeTombstone>,
    #[serde(default)]
    pub edge_creates: Vec<EdgeVersion>,
    #[serde(default)]
    pub edge_updates: Vec<EdgeVersion>,
    #[serde(default)]
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

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitSummary {
    pub id: CommitId,
    #[serde(default)]
    pub parents: Vec<CommitId>,
    pub branch: BranchName,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub time: Option<String>,
    pub message: String,
    #[serde(default)]
    pub tags: Vec<String>,
    pub change_count: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BranchInfo {
    pub name: BranchName,
    pub head: Option<CommitId>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListBranchesResponse {
    pub branches: Vec<BranchInfo>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DiffPatch {
    #[serde(default)]
    pub node_adds: Vec<NodeVersion>,
    #[serde(default)]
    pub node_mods: Vec<NodeVersion>,
    #[serde(default)]
    pub node_dels: Vec<NodeTombstone>,
    #[serde(default)]
    pub edge_adds: Vec<EdgeVersion>,
    #[serde(default)]
    pub edge_mods: Vec<EdgeVersion>,
    #[serde(default)]
    pub edge_dels: Vec<EdgeTombstone>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitChangesRequest {
    pub branch: BranchName,
    pub parent: Option<CommitId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub time: Option<String>,
    pub message: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub changes: ChangeSet,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitChangesResponse {
    pub id: CommitId,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCommitsResponse {
    pub commits: Vec<CommitSummary>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBranchRequest {
    pub name: BranchName,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<CommitRef>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffArgs {
    pub from: CommitRef,
    pub to: CommitRef,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
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

impl DiffSummary {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        from: String,
        to: String,
        node_adds: u64,
        node_mods: u64,
        node_dels: u64,
        edge_adds: u64,
        edge_mods: u64,
        edge_dels: u64,
    ) -> Self {
        Self {
            from,
            to,
            node_adds,
            node_mods,
            node_dels,
            edge_adds,
            edge_mods,
            edge_dels,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeRequest {
    pub source: BranchName,
    pub target: BranchName,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub strategy: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<CommitId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub conflicts: Option<Vec<MergeConflict>>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeConflict {
    pub reference: String,
    pub kind: String,
    pub message: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopologyDeltaArgs {
    pub from: CommitRef,
    pub to: CommitRef,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopologyDeltaResult {
    pub from: String,
    pub to: String,
    pub node_adds: u64,
    pub node_dels: u64,
    pub edge_adds: u64,
    pub edge_dels: u64,
}

impl TopologyDeltaResult {
    pub fn new(
        from: String,
        to: String,
        node_adds: u64,
        node_dels: u64,
        edge_adds: u64,
        edge_dels: u64,
    ) -> Self {
        Self {
            from,
            to,
            node_adds,
            node_dels,
            edge_adds,
            edge_dels,
        }
    }
}
