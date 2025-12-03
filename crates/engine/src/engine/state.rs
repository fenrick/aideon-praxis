//! Praxis engine-internal state representation.

use crate::engine::config::PraxisEngineConfig;
use crate::error::PraxisResult;
use crate::graph::GraphSnapshot;
use crate::meta::MetaModelRegistry;
use aideon_mneme::temporal::ChangeSet;
use aideon_mneme::{CommitSummary, Store};
use async_recursion::async_recursion;
use std::collections::BTreeMap;
use std::sync::Arc;

pub(super) struct Inner {
    pub(super) commits: BTreeMap<String, CommitRecord>,
    pub(super) branches: BTreeMap<String, BranchState>,
    pub(super) config: PraxisEngineConfig,
    pub(super) store: Arc<dyn Store>,
    pub(super) registry: Arc<MetaModelRegistry>,
}

#[derive(Clone, Debug)]
pub(super) struct CommitRecord {
    pub(super) summary: CommitSummary,
    pub(super) snapshot: Arc<GraphSnapshot>,
    #[allow(dead_code)]
    pub(super) change_set: ChangeSet,
}

#[derive(Clone, Debug, Default)]
pub(super) struct BranchState {
    pub(super) head: Option<String>,
}

impl Inner {
    pub(super) async fn new(
        config: PraxisEngineConfig,
        store: Arc<dyn Store>,
    ) -> PraxisResult<Self> {
        let registry = Arc::new(MetaModelRegistry::load(&config.meta_model)?);
        let mut branches = BTreeMap::new();
        for (name, head) in store.list_branches().await? {
            branches.insert(name, BranchState { head });
        }
        if !branches.contains_key("main") {
            store.ensure_branch("main").await?;
            branches.insert("main".into(), BranchState::default());
        }
        Ok(Self {
            commits: BTreeMap::new(),
            branches,
            config,
            store,
            registry,
        })
    }

    pub(super) async fn record_snapshot_tag(&self, commit_id: &str) -> PraxisResult<()> {
        let tag = super::util::snapshot_tag(commit_id);
        self.store.put_tag(&tag, commit_id).await.map_err(|err| {
            crate::error::PraxisError::IntegrityViolation {
                message: format!("record snapshot tag '{tag}': {err}"),
            }
        })
    }

    #[async_recursion]
    pub(super) async fn record_for(&mut self, commit_id: &str) -> PraxisResult<CommitRecord> {
        if let Some(record) = self.commits.get(commit_id) {
            return Ok(record.clone());
        }
        let persisted = self.store.get_commit(commit_id).await?.ok_or_else(|| {
            crate::error::PraxisError::UnknownCommit {
                commit: commit_id.into(),
            }
        })?;
        let base_snapshot = match persisted.summary.parents.first() {
            Some(parent_id) => self.snapshot_for(parent_id).await?,
            None => Arc::new(GraphSnapshot::empty()),
        };
        let snapshot = Arc::new(
            base_snapshot
                .apply(&persisted.change_set, self.registry.as_ref())
                .map_err(|err| crate::error::PraxisError::IntegrityViolation {
                    message: format!("replay commit '{commit_id}' failed: {err}"),
                })?,
        );
        let record = CommitRecord {
            summary: persisted.summary.clone(),
            snapshot: Arc::clone(&snapshot),
            change_set: persisted.change_set.clone(),
        };
        self.commits.insert(commit_id.into(), record.clone());
        Ok(record)
    }

    #[async_recursion]
    pub(super) async fn snapshot_for(
        &mut self,
        commit_id: &str,
    ) -> PraxisResult<Arc<GraphSnapshot>> {
        let record = self.record_for(commit_id).await?;
        Ok(Arc::clone(&record.snapshot))
    }
}
