//! Shared temporal DTOs for the `Temporal.StateAt` flow.
//!
//! These structs intentionally mirror the public contract exposed to the
//! renderer. By keeping the serialization format stable (camelCase), the UI
//! can switch between local and remote execution without churn.

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Arguments provided by the renderer/host when requesting a time-slice.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StateAtArgs {
    pub as_of: String,
    pub scenario: Option<String>,
    pub confidence: Option<f64>,
}

impl StateAtArgs {
    /// Convenience constructor used by command handlers.
    pub fn new(as_of: String, scenario: Option<String>, confidence: Option<f64>) -> Self {
        Self {
            as_of,
            scenario,
            confidence,
        }
    }
}

/// Result payload returned to the renderer when fulfilling a `state_at` request.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StateAtResult {
    pub as_of: String,
    pub scenario: Option<String>,
    pub confidence: Option<f64>,
    pub nodes: u64,
    pub edges: u64,
}

/// Time-graph domain types for in-memory temporal store.
#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeRef {
    pub id: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EdgeRef {
    pub source: String,
    pub target: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ChangeSet {
    #[serde(default)]
    pub add_nodes: Vec<NodeRef>,
    #[serde(default)]
    pub remove_nodes: Vec<NodeRef>,
    #[serde(default)]
    pub add_edges: Vec<EdgeRef>,
    #[serde(default)]
    pub remove_edges: Vec<EdgeRef>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitSummary {
    pub id: String,
    pub branch: String,
    pub as_of: String,
    pub parent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BranchInfo {
    pub name: String,
    pub head: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DiffPatch {
    #[serde(default)]
    pub added_nodes: Vec<NodeRef>,
    #[serde(default)]
    pub removed_nodes: Vec<NodeRef>,
    #[serde(default)]
    pub added_edges: Vec<EdgeRef>,
    #[serde(default)]
    pub removed_edges: Vec<EdgeRef>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffArgs {
    pub from: String,
    pub to: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<Value>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffSummary {
    pub from: String,
    pub to: String,
    pub nodes_added: u64,
    pub nodes_removed: u64,
    pub edges_added: u64,
    pub edges_removed: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitChangesRequest {
    pub branch: String,
    pub as_of: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    pub changes: ChangeSet,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitChangesResponse {
    pub id: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCommitsResponse {
    pub commits: Vec<CommitSummary>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBranchRequest {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<String>,
}

impl StateAtResult {
    /// Construct a new result with explicit graph counts.
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

    /// Convenience helper for producing an empty graph at the requested time.
    pub fn empty(as_of: String, scenario: Option<String>, confidence: Option<f64>) -> Self {
        Self::new(as_of, scenario, confidence, 0, 0)
    }
}

impl DiffSummary {
    /// Create a new summary from explicit counts.
    pub fn new(
        from: String,
        to: String,
        nodes_added: u64,
        nodes_removed: u64,
        edges_added: u64,
        edges_removed: u64,
    ) -> Self {
        Self {
            from,
            to,
            nodes_added,
            nodes_removed,
            edges_added,
            edges_removed,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{DiffArgs, DiffSummary, StateAtArgs, StateAtResult};

    #[test]
    fn args_roundtrip_keeps_camel_case() {
        let args = StateAtArgs::new("2025-01-01".into(), None, Some(0.5));
        let json = serde_json::to_string(&args).expect("serialize");
        assert!(
            json.contains("\"asOf\":\"2025-01-01\""),
            "asOf must remain camelCase"
        );
        let back: StateAtArgs = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.as_of, args.as_of);
        assert_eq!(back.confidence, args.confidence);
    }

    #[test]
    fn result_roundtrip_keeps_counts() {
        let result = StateAtResult::new("2025-01-01".into(), None, None, 7, 11);
        let json = serde_json::to_string(&result).expect("serialize");
        assert!(json.contains("\"nodes\":7"));
        assert!(json.contains("\"edges\":11"));
        let back: StateAtResult = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.nodes, 7);
        assert_eq!(back.edges, 11);
    }

    #[test]
    fn diff_args_serializes_scope_optional() {
        let args = DiffArgs {
            from: "c1".into(),
            to: "c2".into(),
            scope: None,
        };
        let json = serde_json::to_string(&args).expect("serialize");
        assert!(json.contains("\"from\":\"c1\""));
        assert!(!json.contains("scope"));
    }

    #[test]
    fn diff_summary_roundtrip_counts() {
        let summary = DiffSummary::new("a".into(), "b".into(), 1, 2, 3, 4);
        let json = serde_json::to_string(&summary).expect("serialize");
        assert!(json.contains("\"nodesAdded\":1"));
        let back: DiffSummary = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.edges_removed, 4);
    }
}
