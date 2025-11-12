//! Temporal engine façade built on top of the Praxis commit model.
//!
//! Chrona keeps the IPC-friendly API exposed to the Tauri host while delegating
//! persistence, validation, and diff computation to the Praxis engine.

use mneme_core::meta::MetaModelDocument;
use mneme_core::temporal::{
    BranchInfo, CommitChangesRequest, CommitRef, CommitSummary, DiffArgs, DiffSummary,
    ListBranchesResponse, MergeRequest, MergeResponse, StateAtArgs, StateAtResult,
    TopologyDeltaArgs, TopologyDeltaResult,
};
use praxis_engine::{PraxisEngine, PraxisResult};

/// Thin wrapper that keeps the previous `TemporalEngine` name stable for the host.
#[derive(Clone)]
pub struct TemporalEngine {
    inner: PraxisEngine,
}

impl TemporalEngine {
    pub fn new() -> Self {
        Self {
            inner: PraxisEngine::new(),
        }
    }

    pub fn from_engine(engine: PraxisEngine) -> Self {
        Self { inner: engine }
    }

    pub fn state_at(&self, args: StateAtArgs) -> PraxisResult<StateAtResult> {
        self.inner.state_at(args)
    }

    pub fn commit(&self, request: CommitChangesRequest) -> PraxisResult<String> {
        self.inner.commit(request)
    }

    pub fn create_branch(&self, name: String, from: Option<CommitRef>) -> PraxisResult<BranchInfo> {
        self.inner.create_branch(name, from)
    }

    pub fn list_commits(&self, branch: String) -> PraxisResult<Vec<CommitSummary>> {
        self.inner.list_commits(branch)
    }

    pub fn list_branches(&self) -> ListBranchesResponse {
        let branches = self.inner.list_branches();
        ListBranchesResponse { branches }
    }

    pub fn diff_summary(&self, args: DiffArgs) -> PraxisResult<DiffSummary> {
        self.inner.diff_summary(args)
    }

    pub fn merge(&self, request: MergeRequest) -> PraxisResult<MergeResponse> {
        self.inner.merge(request)
    }

    pub fn topology_delta(&self, args: TopologyDeltaArgs) -> PraxisResult<TopologyDeltaResult> {
        self.inner.topology_delta(args)
    }

    pub fn meta_model(&self) -> MetaModelDocument {
        self.inner.meta_model()
    }
}

impl Default for TemporalEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::TemporalEngine;
    use mneme_core::temporal::{
        ChangeSet, CommitChangesRequest, CommitRef, EdgeTombstone, EdgeVersion, NodeTombstone,
        NodeVersion, StateAtArgs, TopologyDeltaArgs,
    };
    use serde_json::json;

    fn capability_node(id: &str) -> NodeVersion {
        NodeVersion {
            id: id.into(),
            r#type: Some("Capability".into()),
            props: Some(json!({ "name": id })),
        }
    }

    fn stage_node(id: &str) -> NodeVersion {
        NodeVersion {
            id: id.into(),
            r#type: Some("ValueStreamStage".into()),
            props: Some(json!({ "name": id })),
        }
    }

    #[test]
    fn commit_and_state_flow() {
        let engine = TemporalEngine::new();
        let commit_id = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: None,
                author: Some("tester".into()),
                time: None,
                message: "seed".into(),
                tags: vec![],
                changes: ChangeSet {
                    node_creates: vec![capability_node("cap-1")],
                    ..ChangeSet::default()
                },
            })
            .expect("commit ok");
        let result = engine
            .state_at(StateAtArgs {
                as_of: CommitRef::Id(commit_id),
                scenario: Some("main".into()),
                confidence: None,
            })
            .expect("state ok");
        assert!(result.nodes > 0);
        assert!(result.edges > 0);
    }

    #[test]
    fn topology_delta_passthrough() {
        let engine = TemporalEngine::new();
        let base = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: None,
                author: None,
                time: None,
                message: "base".into(),
                tags: vec![],
                changes: ChangeSet {
                    node_creates: vec![capability_node("cap-root")],
                    ..ChangeSet::default()
                },
            })
            .expect("base commit");

        let expanded = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: Some(base.clone()),
                author: None,
                time: None,
                message: "expand".into(),
                tags: vec![],
                changes: {
                    let mut change = ChangeSet::default();
                    change.node_creates.push(stage_node("stage-extra"));
                    change.edge_creates.push(EdgeVersion {
                        id: None,
                        from: "cap-root".into(),
                        to: "stage-extra".into(),
                        r#type: Some("serves".into()),
                        directed: Some(true),
                        props: None,
                    });
                    change
                },
            })
            .expect("expanded commit");

        let delta = engine
            .topology_delta(TopologyDeltaArgs {
                from: CommitRef::Id(base.clone()),
                to: CommitRef::Id(expanded.clone()),
            })
            .expect("topology delta");
        assert_eq!(delta.node_adds, 1);
        assert_eq!(delta.edge_adds, 1);

        let trimmed = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: Some(expanded.clone()),
                author: None,
                time: None,
                message: "trim".into(),
                tags: vec![],
                changes: {
                    let mut change = ChangeSet::default();
                    change.edge_deletes.push(EdgeTombstone {
                        from: "cap-root".into(),
                        to: "stage-extra".into(),
                    });
                    change.node_deletes.push(NodeTombstone {
                        id: "stage-extra".into(),
                    });
                    change
                },
            })
            .expect("trim commit");

        let delta_trim = engine
            .topology_delta(TopologyDeltaArgs {
                from: CommitRef::Id(expanded),
                to: CommitRef::Id(trimmed),
            })
            .expect("topology delta trim");
        assert_eq!(delta_trim.node_dels, 1);
        assert_eq!(delta_trim.edge_dels, 1);
    }
}
