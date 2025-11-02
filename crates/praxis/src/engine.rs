use std::collections::{BTreeMap, HashSet, VecDeque};
use std::sync::{Arc, Mutex};

use core_data::temporal::{
    BranchInfo, ChangeSet, CommitChangesRequest, CommitRef, CommitSummary, DiffArgs, DiffPatch,
    DiffSummary, EdgeTombstone, EdgeVersion, MergeConflict, MergeRequest, MergeResponse,
    NodeTombstone, StateAtArgs, StateAtResult,
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

    pub fn merge(&self, request: MergeRequest) -> PraxisResult<MergeResponse> {
        let mut inner = self.lock();

        let source_branch =
            inner
                .branches
                .get(&request.source)
                .ok_or_else(|| PraxisError::UnknownBranch {
                    branch: request.source.clone(),
                })?;
        let target_branch =
            inner
                .branches
                .get(&request.target)
                .ok_or_else(|| PraxisError::UnknownBranch {
                    branch: request.target.clone(),
                })?;

        let source_head = source_branch
            .head
            .clone()
            .ok_or_else(|| PraxisError::UnknownCommit {
                commit: request.source.clone(),
            })?;
        let target_head = target_branch
            .head
            .clone()
            .ok_or_else(|| PraxisError::UnknownCommit {
                commit: request.target.clone(),
            })?;

        let base = find_common_ancestor(&inner, &source_head, &target_head).ok_or_else(|| {
            PraxisError::MergeConflict {
                message: "branches do not share a common ancestor".into(),
            }
        })?;

        let base_snapshot = inner
            .commits
            .get(&base)
            .map(|record| Arc::clone(&record.snapshot))
            .unwrap_or_else(|| Arc::new(GraphSnapshot::empty()));
        let source_snapshot = inner
            .commits
            .get(&source_head)
            .map(|record| Arc::clone(&record.snapshot))
            .ok_or_else(|| PraxisError::UnknownCommit {
                commit: source_head.clone(),
            })?;
        let target_snapshot = inner
            .commits
            .get(&target_head)
            .map(|record| Arc::clone(&record.snapshot))
            .ok_or_else(|| PraxisError::UnknownCommit {
                commit: target_head.clone(),
            })?;

        let source_patch = base_snapshot.diff(&source_snapshot);
        let target_patch = base_snapshot.diff(&target_snapshot);

        let conflicts = detect_conflicts(&source_patch, &target_patch);
        if !conflicts.is_empty() {
            return Ok(MergeResponse {
                result: None,
                conflicts: Some(conflicts),
            });
        }

        let changes = build_change_set(target_snapshot.as_ref(), &source_patch);
        if changes.is_empty() {
            return Ok(MergeResponse {
                result: Some(target_head),
                conflicts: None,
            });
        }

        inner.next_commit += 1;
        let commit_id = format!("{}{}", inner.config.commit_id_prefix, inner.next_commit);
        let summary = CommitSummary {
            id: commit_id.clone(),
            parents: vec![target_head.clone(), source_head.clone()],
            branch: request.target.clone(),
            author: None,
            time: None,
            message: format!("merge {} -> {}", request.source, request.target),
            tags: vec!["merge".into()],
            change_count: change_count(&changes),
        };
        let snapshot = Arc::new(target_snapshot.apply(&changes)?);

        inner.commits.insert(
            commit_id.clone(),
            CommitRecord {
                summary: summary.clone(),
                snapshot: Arc::clone(&snapshot),
                change_set: changes.clone(),
            },
        );
        inner.branches.entry(request.target).or_default().head = Some(commit_id.clone());

        Ok(MergeResponse {
            result: Some(commit_id),
            conflicts: None,
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

fn find_common_ancestor(inner: &Inner, a: &str, b: &str) -> Option<String> {
    let ancestors_a = collect_ancestors(inner, a);
    let mut queue: VecDeque<String> = VecDeque::new();
    queue.push_back(b.to_string());
    let mut visited = HashSet::new();
    while let Some(id) = queue.pop_front() {
        if !visited.insert(id.clone()) {
            continue;
        }
        if ancestors_a.contains(&id) {
            return Some(id);
        }
        if let Some(record) = inner.commits.get(&id) {
            for parent in &record.summary.parents {
                queue.push_back(parent.clone());
            }
        }
    }
    None
}

fn collect_ancestors(inner: &Inner, head: &str) -> HashSet<String> {
    let mut visited = HashSet::new();
    let mut queue: VecDeque<String> = VecDeque::new();
    queue.push_back(head.to_string());
    while let Some(id) = queue.pop_front() {
        if !visited.insert(id.clone()) {
            continue;
        }
        if let Some(record) = inner.commits.get(&id) {
            for parent in &record.summary.parents {
                queue.push_back(parent.clone());
            }
        }
    }
    visited
}

fn detect_conflicts(source: &DiffPatch, target: &DiffPatch) -> Vec<MergeConflict> {
    let mut conflicts = Vec::new();

    let target_mod_nodes: HashSet<&str> = target
        .node_mods
        .iter()
        .map(|node| node.id.as_str())
        .collect();
    let target_del_nodes: HashSet<&str> = target
        .node_dels
        .iter()
        .map(|node| node.id.as_str())
        .collect();
    let target_add_nodes: HashSet<&str> = target
        .node_adds
        .iter()
        .map(|node| node.id.as_str())
        .collect();

    for node in &source.node_mods {
        if target_mod_nodes.contains(node.id.as_str())
            || target_del_nodes.contains(node.id.as_str())
        {
            conflicts.push(MergeConflict {
                reference: node.id.clone(),
                kind: "node".into(),
                message: "both branches modify or delete the node".into(),
            });
        }
    }

    for node in &source.node_dels {
        if target_add_nodes.contains(node.id.as_str())
            || target_mod_nodes.contains(node.id.as_str())
        {
            conflicts.push(MergeConflict {
                reference: node.id.clone(),
                kind: "node".into(),
                message: "delete conflicts with target updates".into(),
            });
        }
    }

    let edge_key = |edge: &EdgeVersion| (edge.from.clone(), edge.to.clone());
    let target_mod_edges: HashSet<(String, String)> =
        target.edge_mods.iter().map(edge_key).collect();
    let target_del_edges: HashSet<(String, String)> = target
        .edge_dels
        .iter()
        .map(|edge| (edge.from.clone(), edge.to.clone()))
        .collect();
    let target_add_edges: HashSet<(String, String)> =
        target.edge_adds.iter().map(edge_key).collect();

    for edge in &source.edge_mods {
        let key = (edge.from.clone(), edge.to.clone());
        if target_mod_edges.contains(&key) || target_del_edges.contains(&key) {
            conflicts.push(MergeConflict {
                reference: format!("{}->{}", edge.from, edge.to),
                kind: "edge".into(),
                message: "both branches modify or delete the edge".into(),
            });
        }
    }

    for edge in &source.edge_dels {
        let key = (edge.from.clone(), edge.to.clone());
        if target_add_edges.contains(&key) || target_mod_edges.contains(&key) {
            conflicts.push(MergeConflict {
                reference: format!("{}->{}", edge.from, edge.to),
                kind: "edge".into(),
                message: "delete conflicts with target updates".into(),
            });
        }
    }

    conflicts
}

fn build_change_set(target_snapshot: &GraphSnapshot, patch: &DiffPatch) -> ChangeSet {
    let mut changes = ChangeSet::default();

    for node in &patch.node_adds {
        if !target_snapshot.has_node(&node.id) {
            changes.node_creates.push(node.clone());
        }
    }

    for node in &patch.node_mods {
        match target_snapshot.node(&node.id) {
            Some(existing) if existing == node => {}
            _ => changes.node_updates.push(node.clone()),
        }
    }

    for tomb in &patch.node_dels {
        if target_snapshot.has_node(&tomb.id) {
            changes.node_deletes.push(NodeTombstone {
                id: tomb.id.clone(),
            });
        }
    }

    for edge in &patch.edge_adds {
        if !target_snapshot.has_edge(edge) {
            changes.edge_creates.push(edge.clone());
        }
    }

    for edge in &patch.edge_mods {
        match target_snapshot.edge(edge) {
            Some(existing) if existing == edge => {}
            _ => changes.edge_updates.push(edge.clone()),
        }
    }

    for tomb in &patch.edge_dels {
        if target_snapshot.has_edge_tombstone(tomb) {
            changes.edge_deletes.push(EdgeTombstone {
                from: tomb.from.clone(),
                to: tomb.to.clone(),
            });
        }
    }

    changes
}

#[cfg(test)]
mod tests {
    use super::PraxisEngine;
    use core_data::temporal::{
        ChangeSet, CommitChangesRequest, CommitRef, DiffArgs, EdgeVersion, MergeRequest,
        NodeTombstone, NodeVersion, StateAtArgs,
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

    #[test]
    fn merge_without_conflicts_commits_changes() {
        let engine = PraxisEngine::new();
        let base = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: None,
                author: None,
                time: None,
                message: "init".into(),
                tags: vec![],
                changes: make_change_set("root"),
            })
            .unwrap();
        engine
            .create_branch("feature".into(), Some(CommitRef::Id(base.clone())))
            .unwrap();
        engine
            .commit(CommitChangesRequest {
                branch: "feature".into(),
                parent: Some(base.clone()),
                author: None,
                time: None,
                message: "feat".into(),
                tags: vec![],
                changes: make_change_set("feature-node"),
            })
            .unwrap();
        engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: Some(base.clone()),
                author: None,
                time: None,
                message: "main".into(),
                tags: vec![],
                changes: make_change_set("main-node"),
            })
            .unwrap();

        let response = engine
            .merge(MergeRequest {
                source: "feature".into(),
                target: "main".into(),
                strategy: None,
            })
            .unwrap();

        assert!(response.conflicts.is_none());
        let merge_commit = response.result.expect("merge commit");
        let stats = engine.stats_for_commit(&merge_commit).unwrap();
        assert_eq!(stats.node_count, 3);
    }

    #[test]
    fn merge_reports_conflicts_for_overlapping_updates() {
        let engine = PraxisEngine::new();
        let base = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: None,
                author: None,
                time: None,
                message: "init".into(),
                tags: vec![],
                changes: make_change_set("shared"),
            })
            .unwrap();
        engine
            .create_branch("feature".into(), Some(CommitRef::Id(base.clone())))
            .unwrap();
        engine
            .commit(CommitChangesRequest {
                branch: "feature".into(),
                parent: Some(base.clone()),
                author: None,
                time: None,
                message: "feat change".into(),
                tags: vec![],
                changes: ChangeSet {
                    node_updates: vec![NodeVersion {
                        id: "shared".into(),
                        r#type: Some("Feature".into()),
                        props: None,
                    }],
                    ..ChangeSet::default()
                },
            })
            .unwrap();
        engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: Some(base),
                author: None,
                time: None,
                message: "main change".into(),
                tags: vec![],
                changes: ChangeSet {
                    node_updates: vec![NodeVersion {
                        id: "shared".into(),
                        r#type: Some("Main".into()),
                        props: None,
                    }],
                    ..ChangeSet::default()
                },
            })
            .unwrap();

        let response = engine
            .merge(MergeRequest {
                source: "feature".into(),
                target: "main".into(),
                strategy: None,
            })
            .unwrap();
        assert!(response.result.is_none());
        let conflicts = response.conflicts.expect("conflicts");
        assert!(!conflicts.is_empty());
        assert_eq!(conflicts[0].kind, "node");
    }

    #[test]
    fn merge_errors_when_no_common_ancestor_exists() {
        let engine = PraxisEngine::new();
        let main_commit = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: None,
                author: None,
                time: None,
                message: "main-root".into(),
                tags: vec![],
                changes: make_change_set("main-root"),
            })
            .expect("main commit");
        assert_eq!(main_commit, "c1");

        let feature_commit = engine
            .commit(CommitChangesRequest {
                branch: "feature".into(),
                parent: None,
                author: None,
                time: None,
                message: "feature-root".into(),
                tags: vec![],
                changes: make_change_set("feature-root"),
            })
            .expect("feature commit");
        assert_eq!(feature_commit, "c2");

        let merge = engine.merge(MergeRequest {
            source: "feature".into(),
            target: "main".into(),
            strategy: None,
        });

        assert!(matches!(
            merge,
            Err(super::PraxisError::MergeConflict { .. })
        ));
    }
}
