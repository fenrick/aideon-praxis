//! Shared temporal DTOs for the time-first command surface.
//!
//! These structs define the stable serialization contract between the
//! renderer, Tauri host, and engine crates. Field names follow the
//! `Time & Commit Model — Authoring Standards` captured in
//! `Architecture-Boundary.md`.

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Unique identifier for a commit.
pub type CommitId = String;
/// Branch names are case-sensitive pointers to head commits.
pub type BranchName = String;

/// Arguments provided when requesting a snapshot.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StateAtArgs {
    pub as_of: CommitRef,
    pub scenario: Option<BranchName>,
    pub confidence: Option<f64>,
}

impl StateAtArgs {
    /// Convenience constructor used by command handlers.
    pub fn new(as_of: String, scenario: Option<String>, confidence: Option<f64>) -> Self {
        Self {
            as_of: CommitRef::Id(as_of),
            scenario,
            confidence,
        }
    }
}

/// Result payload returned when fulfilling a snapshot request.
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

/// Reference to a commit by id or branch + optional position.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(untagged)]
pub enum CommitRef {
    /// Explicit commit id.
    Id(CommitId),
    /// Resolve by branch (head by default, or specific commit if provided).
    Branch {
        branch: BranchName,
        #[serde(skip_serializing_if = "Option::is_none")]
        at: Option<CommitId>,
    },
}

/// Node payload used for creates/updates.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NodeVersion {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub props: Option<Value>,
}

/// Node deletion refers to the immutable id only.
#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeTombstone {
    pub id: String,
}

/// Edge payload used for creates/updates.
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

/// Edge deletion references endpoints only.
#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EdgeTombstone {
    pub from: String,
    pub to: String,
}

/// Canonical change set carried by a commit.
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
    /// Convenience helper for future validation guards.
    pub fn is_empty(&self) -> bool {
        self.node_creates.is_empty()
            && self.node_updates.is_empty()
            && self.node_deletes.is_empty()
            && self.edge_creates.is_empty()
            && self.edge_updates.is_empty()
            && self.edge_deletes.is_empty()
    }
}

/// Summary metadata for a commit.
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

/// Branch metadata mirrored to the renderer.
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

/// Diff payload with explicit node/edge counts.
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

/// Diff request.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffArgs {
    pub from: CommitRef,
    pub to: CommitRef,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<Value>,
}

/// Diff metrics summary.
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

/// Arguments for computing a topology-focused delta between two commits.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopologyDeltaArgs {
    pub from: CommitRef,
    pub to: CommitRef,
}

/// Result metrics describing structural adds/removals between two snapshots.
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

/// Commit request payload.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitChangesRequest {
    pub branch: BranchName,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent: Option<CommitId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub time: Option<String>,
    pub message: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    pub changes: ChangeSet,
}

/// Commit response payload.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitChangesResponse {
    pub id: CommitId,
}

/// List commits response wrapper.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCommitsResponse {
    pub commits: Vec<CommitSummary>,
}

/// Create branch request payload.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBranchRequest {
    pub name: BranchName,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<CommitRef>,
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
pub struct MergeConflict {
    pub reference: String,
    pub kind: String,
    pub message: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MergeResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<CommitId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub conflicts: Option<Vec<MergeConflict>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn state_args_serialise_with_commit_ref() {
        let args = StateAtArgs {
            as_of: CommitRef::Branch {
                branch: "main".into(),
                at: Some("c1".into()),
            },
            scenario: Some("dev".into()),
            confidence: Some(0.8),
        };
        let json = serde_json::to_string(&args).expect("serialize");
        assert!(json.contains("\"branch\":\"main\""));
        let back: StateAtArgs = serde_json::from_str(&json).expect("deserialize");
        match back.as_of {
            CommitRef::Branch { branch, at } => {
                assert_eq!(branch, "main");
                assert_eq!(at.as_deref(), Some("c1"));
            }
            _ => panic!("expected branch ref"),
        }
    }

    #[test]
    fn change_set_reports_empty() {
        let empty = ChangeSet::default();
        assert!(empty.is_empty());
        let mut with_nodes = ChangeSet::default();
        with_nodes.node_creates.push(NodeVersion {
            id: "n1".into(),
            ..NodeVersion::default()
        });
        assert!(!with_nodes.is_empty());
    }

    #[test]
    fn diff_summary_roundtrip_uses_camel_case() {
        let summary = DiffSummary::new("a".into(), "b".into(), 1, 2, 3, 4, 5);
        let json = serde_json::to_string(&summary).expect("serialize");
        assert!(json.contains("\"nodeAdds\":1"));
        let back: DiffSummary = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.edge_mods, 4);
    }
}
