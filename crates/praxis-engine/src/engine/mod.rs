//! The core Praxis engine for temporal graph operations.

use std::sync::{Arc, Mutex, MutexGuard};

use mneme_core::meta::MetaModelDocument;
use mneme_core::temporal::{
    BranchInfo, CommitChangesRequest, CommitRef, CommitSummary, DiffArgs, DiffSummary,
    MergeRequest, MergeResponse, StateAtArgs, StateAtResult, TopologyDeltaArgs,
    TopologyDeltaResult,
};

use crate::error::PraxisResult;
use crate::graph::GraphSnapshot;

mod config;
mod init;
mod ops;
mod seed;
mod state;
mod util;

pub use config::PraxisEngineConfig;
use state::Inner;

#[derive(Clone)]
pub struct PraxisEngine {
    inner: Arc<Mutex<Inner>>,
}

impl PraxisEngine {
    fn lock(&self) -> MutexGuard<'_, Inner> {
        self.inner.lock().expect("praxis engine mutex poisoned")
    }

    pub fn commit(&self, request: CommitChangesRequest) -> PraxisResult<String> {
        ops::commit(self.lock(), request)
    }

    pub fn create_branch(&self, name: String, from: Option<CommitRef>) -> PraxisResult<BranchInfo> {
        ops::create_branch(self.lock(), name, from)
    }

    pub fn list_commits(&self, branch: String) -> PraxisResult<Vec<CommitSummary>> {
        ops::list_commits(self.lock(), branch)
    }

    pub fn state_at(&self, args: StateAtArgs) -> PraxisResult<StateAtResult> {
        ops::state_at(self.lock(), args)
    }

    pub fn diff_summary(&self, args: DiffArgs) -> PraxisResult<DiffSummary> {
        ops::diff_summary(self.lock(), args)
    }

    pub fn topology_delta(&self, args: TopologyDeltaArgs) -> PraxisResult<TopologyDeltaResult> {
        ops::topology_delta(self.lock(), args)
    }

    pub fn list_branches(&self) -> Vec<BranchInfo> {
        let inner = self.lock();
        inner
            .branches
            .iter()
            .map(|(name, state)| BranchInfo {
                name: name.clone(),
                head: state.head.clone(),
            })
            .collect()
    }

    pub fn stats_for_commit(&self, commit_id: &str) -> PraxisResult<crate::graph::SnapshotStats> {
        let mut inner = self.lock();
        let record = inner.record_for(commit_id)?;
        Ok(record.snapshot.stats())
    }

    pub fn snapshot_for_commit(&self, commit_id: &str) -> PraxisResult<Arc<GraphSnapshot>> {
        let mut inner = self.lock();
        inner.snapshot_for(commit_id)
    }

    pub fn meta_model(&self) -> MetaModelDocument {
        let inner = self.lock();
        inner.registry.document()
    }

    pub fn merge(&self, request: MergeRequest) -> PraxisResult<MergeResponse> {
        ops::merge(self.lock(), request)
    }
}
