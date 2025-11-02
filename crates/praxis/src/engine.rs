use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};

use core_data::temporal::{
    BranchInfo, ChangeSet, CommitChangesRequest, CommitRef, CommitSummary, DiffArgs, DiffSummary,
    StateAtArgs, StateAtResult,
};

use crate::error::{PraxisError, PraxisResult};
use crate::graph::{GraphSnapshot, SnapshotStats};

#[derive(Clone, Debug)]
pub struct PraxisEngineConfig {
    /// Allow commits with empty change sets. Defaults to `false`.
    pub allow_empty_commits: bool,
    /// Prefix applied to generated commit identifiers. Defaults to `"c"`.
    pub commit_id_prefix: String,
}

impl Default for PraxisEngineConfig {
    fn default() -> Self {
        Self {
            allow_empty_commits: false,
            commit_id_prefix: "c".into(),
        }
    }
}

#[derive(Clone, Debug, Default)]
pub struct PraxisEngine {
    inner: Arc<Mutex<Inner>>,
}

#[derive(Debug)]
struct Inner {
    commits: BTreeMap<String, CommitRecord>,
    branches: BTreeMap<String, BranchState>,
    next_commit: u64,
    config: PraxisEngineConfig,
}

#[derive(Clone, Debug)]
struct CommitRecord {
    summary: CommitSummary,
    snapshot: Arc<GraphSnapshot>,
    #[allow(dead_code)]
    change_set: ChangeSet,
}

#[derive(Clone, Debug, Default)]
struct BranchState {
    head: Option<String>,
}

impl Default for Inner {
    fn default() -> Self {
        let mut branches = BTreeMap::new();
        branches.insert("main".into(), BranchState::default());
        Self {
            commits: BTreeMap::new(),
            branches,
            next_commit: 0,
            config: PraxisEngineConfig::default(),
        }
    }
}

impl PraxisEngine {
    pub fn new() -> Self {
        Self::with_config(PraxisEngineConfig::default())
    }

    pub fn with_config(config: PraxisEngineConfig) -> Self {
        let inner = Inner {
            config,
            ..Inner::default()
        };
        Self {
            inner: Arc::new(Mutex::new(inner)),
        }
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, Inner> {
        self.inner.lock().expect("praxis engine mutex poisoned")
    }

    pub fn commit(&self, request: CommitChangesRequest) -> PraxisResult<String> {
        let mut inner = self.lock();
        if !inner.config.allow_empty_commits && request.changes.is_empty() {
            return Err(PraxisError::ValidationFailed {
                message: "empty commits are disabled".into(),
            });
        }

        let branch_name = request.branch.clone();
        let expected_parent = {
            let state = inner.branches.entry(branch_name.clone()).or_default();
            match (&request.parent, &state.head) {
                (Some(explicit), Some(head)) if explicit != head => {
                    return Err(PraxisError::ConcurrencyConflict {
                        branch: branch_name.clone(),
                        expected: Some(explicit.clone()),
                        actual: state.head.clone(),
                    });
                }
                (Some(explicit), None) => Some(explicit.clone()),
                (Some(explicit), Some(_)) => Some(explicit.clone()),
                (None, head) => head.clone(),
            }
        };

        let base_snapshot = match expected_parent {
            Some(ref parent_id) => inner
                .commits
                .get(parent_id.as_str())
                .map(|record| Arc::clone(&record.snapshot))
                .ok_or_else(|| PraxisError::UnknownCommit {
                    commit: parent_id.clone(),
                })?,
            None => Arc::new(GraphSnapshot::empty()),
        };

        let snapshot = Arc::new(base_snapshot.apply(&request.changes)?);

        inner.next_commit += 1;
        let commit_id = format!("{}{}", inner.config.commit_id_prefix, inner.next_commit);
        let summary = CommitSummary {
            id: commit_id.clone(),
            parents: expected_parent.into_iter().collect(),
            branch: branch_name.clone(),
            author: request.author.clone(),
            time: request.time.clone(),
            message: request.message.clone(),
            tags: request.tags.clone(),
            change_count: change_count(&request.changes),
        };

        inner.commits.insert(
            commit_id.clone(),
            CommitRecord {
                summary: summary.clone(),
                snapshot: Arc::clone(&snapshot),
                change_set: request.changes.clone(),
            },
        );

        inner.branches.entry(branch_name).or_default().head = Some(commit_id.clone());

        // To-do: enforce schema validation here once the meta-model module lands.

        Ok(commit_id)
    }

    pub fn create_branch(&self, name: String, from: Option<CommitRef>) -> PraxisResult<BranchInfo> {
        let mut inner = self.lock();
        if inner.branches.contains_key(&name) {
            return Err(PraxisError::ValidationFailed {
                message: format!("branch '{name}' already exists"),
            });
        }

        let head = match from {
            Some(reference) => Some(resolve_commit_id(&inner, &reference, None)?),
            None => inner.branches.get("main").and_then(|b| b.head.clone()),
        };
        inner
            .branches
            .insert(name.clone(), BranchState { head: head.clone() });
        Ok(BranchInfo { name, head })
    }

    pub fn list_commits(&self, branch: String) -> PraxisResult<Vec<CommitSummary>> {
        let inner = self.lock();
        let state = inner
            .branches
            .get(&branch)
            .ok_or_else(|| PraxisError::UnknownBranch {
                branch: branch.clone(),
            })?;

        let mut ordered: Vec<CommitSummary> = Vec::new();
        let mut cursor = state.head.clone();
        while let Some(id) = cursor {
            let record = inner
                .commits
                .get(&id)
                .ok_or_else(|| PraxisError::UnknownCommit { commit: id.clone() })?;
            ordered.push(record.summary.clone());
            cursor = record.summary.parents.first().cloned();
        }
        ordered.reverse();
        Ok(ordered)
    }

    pub fn state_at(&self, args: StateAtArgs) -> PraxisResult<StateAtResult> {
        let inner = self.lock();
        let (commit_id, snapshot, branch_name) =
            resolve_snapshot(&inner, &args.as_of, args.scenario.as_deref())?;
        let stats = snapshot.stats();
        Ok(StateAtResult::new(
            commit_id,
            Some(branch_name),
            args.confidence,
            stats.node_count as u64,
            stats.edge_count as u64,
        ))
    }

    pub fn diff_summary(&self, args: DiffArgs) -> PraxisResult<DiffSummary> {
        let inner = self.lock();
        let (from_id, from_snapshot, _) = resolve_snapshot(&inner, &args.from, None)?;
        let (to_id, to_snapshot, _) = resolve_snapshot(&inner, &args.to, None)?;
        let patch = from_snapshot.diff(&to_snapshot);
        Ok(DiffSummary::new(
            from_id,
            to_id,
            patch.node_adds.len() as u64,
            patch.node_mods.len() as u64,
            patch.node_dels.len() as u64,
            patch.edge_adds.len() as u64,
            patch.edge_mods.len() as u64,
            patch.edge_dels.len() as u64,
        ))
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

    pub fn stats_for_commit(&self, commit_id: &str) -> PraxisResult<SnapshotStats> {
        let inner = self.lock();
        let record = inner
            .commits
            .get(commit_id)
            .ok_or_else(|| PraxisError::UnknownCommit {
                commit: commit_id.into(),
            })?;
        Ok(record.snapshot.stats())
    }

    pub fn snapshot_for_commit(&self, commit_id: &str) -> PraxisResult<Arc<GraphSnapshot>> {
        let inner = self.lock();
        let record = inner
            .commits
            .get(commit_id)
            .ok_or_else(|| PraxisError::UnknownCommit {
                commit: commit_id.into(),
            })?;
        Ok(Arc::clone(&record.snapshot))
    }

    pub fn merge(
        &self,
        _source: String,
        _target: String,
        _strategy: Option<String>,
    ) -> PraxisResult<()> {
        // To-do: implement three-way merge once the conflict resolution UI is ready.
        Err(PraxisError::MergeConflict {
            message: "merge engine not implemented".into(),
        })
    }
}

fn change_count(set: &ChangeSet) -> u64 {
    (set.node_creates.len()
        + set.node_updates.len()
        + set.node_deletes.len()
        + set.edge_creates.len()
        + set.edge_updates.len()
        + set.edge_deletes.len()) as u64
}

fn resolve_snapshot(
    inner: &Inner,
    reference: &CommitRef,
    scenario_hint: Option<&str>,
) -> PraxisResult<(String, Arc<GraphSnapshot>, String)> {
    let commit_id = resolve_commit_id(inner, reference, scenario_hint)?;
    let record = inner
        .commits
        .get(&commit_id)
        .ok_or_else(|| PraxisError::UnknownCommit {
            commit: commit_id.clone(),
        })?;
    Ok((
        commit_id,
        Arc::clone(&record.snapshot),
        record.summary.branch.clone(),
    ))
}

fn resolve_commit_id(
    inner: &Inner,
    reference: &CommitRef,
    scenario_hint: Option<&str>,
) -> PraxisResult<String> {
    match reference {
        CommitRef::Id(value) => {
            if inner.commits.contains_key(value.as_str()) {
                Ok(value.clone())
            } else if let Some(branch_state) = inner.branches.get(value.as_str()) {
                branch_state
                    .head
                    .clone()
                    .ok_or_else(|| PraxisError::UnknownCommit {
                        commit: value.clone(),
                    })
            } else if let Some(hint) = scenario_hint {
                let branch =
                    inner
                        .branches
                        .get(hint)
                        .ok_or_else(|| PraxisError::UnknownBranch {
                            branch: hint.into(),
                        })?;
                branch
                    .head
                    .clone()
                    .ok_or_else(|| PraxisError::UnknownCommit {
                        commit: hint.into(),
                    })
            } else {
                Err(PraxisError::UnknownCommit {
                    commit: value.clone(),
                })
            }
        }
        CommitRef::Branch { branch, at } => {
            if let Some(at) = at
                && inner.commits.contains_key(at.as_str())
            {
                return Ok(at.clone());
            }
            let target_branch =
                inner
                    .branches
                    .get(branch)
                    .ok_or_else(|| PraxisError::UnknownBranch {
                        branch: branch.clone(),
                    })?;
            target_branch
                .head
                .clone()
                .ok_or_else(|| PraxisError::UnknownCommit {
                    commit: branch.clone(),
                })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::PraxisEngine;
    use core_data::temporal::{
        ChangeSet, CommitChangesRequest, CommitRef, DiffArgs, EdgeVersion, NodeTombstone,
        NodeVersion, StateAtArgs,
    };

    fn make_change_set(node_id: &str) -> ChangeSet {
        ChangeSet {
            node_creates: vec![NodeVersion {
                id: node_id.into(),
                r#type: None,
                props: None,
            }],
            ..ChangeSet::default()
        }
    }

    #[test]
    fn commit_and_state_counts_reflect_changes() {
        let engine = PraxisEngine::new();
        let request = CommitChangesRequest {
            branch: "main".into(),
            parent: None,
            author: Some("tester".into()),
            time: None,
            message: "seed".into(),
            tags: vec![],
            changes: make_change_set("n1"),
        };
        let commit_id = engine.commit(request).expect("commit succeed");
        let result = engine
            .state_at(StateAtArgs {
                as_of: CommitRef::Id(commit_id.clone()),
                scenario: Some("main".into()),
                confidence: None,
            })
            .expect("state ok");
        assert_eq!(result.nodes, 1);
        assert_eq!(result.edges, 0);
    }

    #[test]
    fn diff_summary_reports_additions() {
        let engine = PraxisEngine::new();
        let first = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: None,
                author: None,
                time: None,
                message: "first".into(),
                tags: vec![],
                changes: make_change_set("n1"),
            })
            .unwrap();
        let second = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: Some(first.clone()),
                author: None,
                time: None,
                message: "second".into(),
                tags: vec![],
                changes: make_change_set("n2"),
            })
            .unwrap();

        let summary = engine
            .diff_summary(DiffArgs {
                from: CommitRef::Id(first.clone()),
                to: CommitRef::Id(second.clone()),
                scope: None,
            })
            .unwrap();
        assert_eq!(summary.node_adds, 1);
        assert_eq!(summary.node_mods, 0);
        assert_eq!(summary.node_dels, 0);
    }

    #[test]
    fn concurrency_conflict_detected() {
        let engine = PraxisEngine::new();
        let first = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: None,
                author: None,
                time: None,
                message: "first".into(),
                tags: vec![],
                changes: make_change_set("n1"),
            })
            .unwrap();
        let result = engine.commit(CommitChangesRequest {
            branch: "main".into(),
            parent: Some("c999".into()),
            author: None,
            time: None,
            message: "conflict".into(),
            tags: vec![],
            changes: make_change_set("n2"),
        });
        assert!(matches!(
            result,
            Err(super::PraxisError::ConcurrencyConflict { .. })
        ));

        let ok = engine.commit(CommitChangesRequest {
            branch: "main".into(),
            parent: Some(first),
            author: None,
            time: None,
            message: "second".into(),
            tags: vec![],
            changes: make_change_set("n3"),
        });
        assert!(ok.is_ok());
    }

    #[test]
    fn rejects_dangling_edges() {
        let engine = PraxisEngine::new();
        let base = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: None,
                author: None,
                time: None,
                message: "nodes".into(),
                tags: vec![],
                changes: {
                    let mut cs = ChangeSet::default();
                    cs.node_creates = vec![
                        NodeVersion {
                            id: "n1".into(),
                            r#type: None,
                            props: None,
                        },
                        NodeVersion {
                            id: "n2".into(),
                            r#type: None,
                            props: None,
                        },
                    ];
                    cs
                },
            })
            .unwrap();
        let with_edge = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: Some(base.clone()),
                author: None,
                time: None,
                message: "edge".into(),
                tags: vec![],
                changes: {
                    let mut cs = ChangeSet::default();
                    cs.edge_creates.push(EdgeVersion {
                        id: None,
                        from: "n1".into(),
                        to: "n2".into(),
                        r#type: None,
                        directed: Some(true),
                        props: None,
                    });
                    cs
                },
            })
            .unwrap();
        let err = engine.commit(CommitChangesRequest {
            branch: "main".into(),
            parent: Some(with_edge),
            author: None,
            time: None,
            message: "dangling".into(),
            tags: vec![],
            changes: {
                let mut cs = ChangeSet::default();
                cs.node_deletes.push(NodeTombstone { id: "n1".into() });
                cs
            },
        });
        assert!(matches!(
            err,
            Err(super::PraxisError::IntegrityViolation { .. })
        ));
    }
}
