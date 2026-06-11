//! Temporal engine façade built on top of the Praxis commit model.
//!
//! Chrona keeps the IPC-friendly API exposed to the Tauri host while delegating
//! persistence, validation, and diff computation to the Praxis engine.

use aideon_praxis::meta::MetaModelDocument;
use aideon_praxis::temporal::{
    BranchInfo, CommitChangesRequest, CommitRef, CommitSummary, DiffArgs, DiffSummary,
    ListBranchesResponse, MergeRequest, MergeResponse, StateAtArgs, StateAtResult,
    TopologyDeltaArgs, TopologyDeltaResult,
};
use aideon_praxis::{GraphSnapshot, PraxisEngine, PraxisResult};
use std::sync::Arc;

/// Thin wrapper that keeps the previous `TemporalEngine` name stable for the host.
#[derive(Clone)]
pub struct TemporalEngine {
    inner: PraxisEngine,
}

impl TemporalEngine {
    /// Construct a new temporal engine backed by the default in-memory Praxis store.
    pub async fn new() -> PraxisResult<Self> {
        Ok(Self {
            inner: PraxisEngine::new().await?,
        })
    }

    /// Wrap an existing Praxis engine.
    pub fn from_engine(engine: PraxisEngine) -> Self {
        Self { inner: engine }
    }

    /// Fetch state-at snapshot statistics for the given reference.
    pub async fn state_at(&self, args: StateAtArgs) -> PraxisResult<StateAtResult> {
        self.inner.state_at(args).await
    }

    /// Commit a new change set to the underlying Praxis engine.
    pub async fn commit(&self, request: CommitChangesRequest) -> PraxisResult<String> {
        self.inner.commit(request).await
    }

    /// Create a new branch from the optional reference point.
    pub async fn create_branch(
        &self,
        name: String,
        from: Option<CommitRef>,
    ) -> PraxisResult<BranchInfo> {
        self.inner.create_branch(name, from).await
    }

    /// List commits for the specified branch (oldest to newest).
    pub async fn list_commits(&self, branch: String) -> PraxisResult<Vec<CommitSummary>> {
        self.inner.list_commits(branch).await
    }

    /// Enumerate branches along with their current heads.
    pub async fn list_branches(&self) -> ListBranchesResponse {
        let branches = self.inner.list_branches().await;
        ListBranchesResponse { branches }
    }

    /// Produce a diff summary between two commit references.
    pub async fn diff_summary(&self, args: DiffArgs) -> PraxisResult<DiffSummary> {
        self.inner.diff_summary(args).await
    }

    /// Merge the source branch into the target branch.
    pub async fn merge(&self, request: MergeRequest) -> PraxisResult<MergeResponse> {
        self.inner.merge(request).await
    }

    /// Compute topology deltas between two commit references.
    pub async fn topology_delta(
        &self,
        args: TopologyDeltaArgs,
    ) -> PraxisResult<TopologyDeltaResult> {
        self.inner.topology_delta(args).await
    }

    /// Return the active meta-model document.
    pub async fn meta_model(&self) -> MetaModelDocument {
        self.inner.meta_model().await
    }

    /// Resolve a snapshot for a commit reference or branch.
    pub async fn resolve_snapshot(
        &self,
        reference: CommitRef,
        scenario: Option<String>,
    ) -> PraxisResult<(String, Arc<GraphSnapshot>, String)> {
        self.inner.resolve_snapshot(reference, scenario).await
    }
}

#[cfg(test)]
#[path = "../tests/internal/temporal_tests.rs"]
mod tests;
