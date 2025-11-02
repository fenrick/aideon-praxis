//! Temporal engine façade built on top of the Praxis commit model.
//!
//! Chrona keeps the IPC-friendly API exposed to the Tauri host while delegating
//! persistence, validation, and diff computation to the Praxis engine.

use core_data::temporal::{
    BranchInfo, CommitChangesRequest, CommitRef, CommitSummary, DiffArgs, DiffSummary, StateAtArgs,
    StateAtResult,
};
use praxis::{PraxisEngine, PraxisResult};

/// Thin wrapper that keeps the previous `TemporalEngine` name stable for the host.
#[derive(Clone, Debug, Default)]
pub struct TemporalEngine {
    inner: PraxisEngine,
}

impl TemporalEngine {
    pub fn new() -> Self {
        Self {
            inner: PraxisEngine::new(),
        }
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

    pub fn list_branches(&self) -> Vec<BranchInfo> {
        self.inner.list_branches()
    }

    pub fn diff_summary(&self, args: DiffArgs) -> PraxisResult<DiffSummary> {
        self.inner.diff_summary(args)
    }
}

#[cfg(test)]
mod tests {
    use super::TemporalEngine;
    use core_data::temporal::{ChangeSet, CommitChangesRequest, CommitRef, StateAtArgs};

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
                    node_creates: vec![core_data::temporal::NodeVersion {
                        id: "n1".into(),
                        r#type: None,
                        props: None,
                    }],
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
        assert_eq!(result.nodes, 1);
        assert_eq!(result.edges, 0);
    }
}
