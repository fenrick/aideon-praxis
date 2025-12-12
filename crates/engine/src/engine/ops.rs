//! Core Praxis engine operations (commit, merge, etc.).

use crate::engine::state::{BranchState, CommitRecord, Inner};
use crate::engine::util::{
    change_count, current_timestamp, derive_commit_id, find_common_ancestor, normalize_change_set,
    resolve_commit_id, resolve_snapshot, validate_branch_name,
};
use crate::error::{PraxisError, PraxisResult};
use crate::graph::GraphSnapshot;
use aideon_mneme::PersistedCommit;
use aideon_mneme::temporal::{
    BranchInfo, ChangeSet, CommitChangesRequest, CommitRef, CommitSummary, DiffArgs, DiffPatch,
    DiffSummary, EdgeTombstone, EdgeVersion, MergeConflict, MergeRequest, MergeResponse,
    NodeTombstone, StateAtArgs, StateAtResult, TopologyDeltaArgs, TopologyDeltaResult,
};
use std::collections::HashSet;
use std::sync::Arc;

pub(super) async fn commit(
    inner: &mut Inner,
    request: CommitChangesRequest,
) -> PraxisResult<String> {
    validate_branch_name(&request.branch)?;

    if !inner.config.allow_empty_commits && request.changes.is_empty() {
        return Err(PraxisError::ValidationFailed {
            message: "empty commits are disabled".into(),
        });
    }

    if !inner.branches.contains_key(&request.branch) {
        inner.store.ensure_branch(&request.branch).await?;
        inner
            .branches
            .insert(request.branch.clone(), BranchState::default());
    }

    let current_head = inner
        .branches
        .get(&request.branch)
        .and_then(|state| state.head.clone());

    let expected_parent = match (&request.parent, &current_head) {
        (Some(explicit), Some(head)) if explicit != head => {
            return Err(PraxisError::ConcurrencyConflict {
                branch: request.branch.clone(),
                expected: Some(explicit.clone()),
                actual: Some(head.clone()),
            });
        }
        (Some(explicit), _) => Some(explicit.clone()),
        (None, head) => head.clone(),
    };

    let base_snapshot = match expected_parent.as_deref() {
        Some(parent_id) => inner.snapshot_for(parent_id).await?,
        None => Arc::new(GraphSnapshot::empty()),
    };

    let normalized_changes = normalize_change_set(&request.changes);
    if !inner.config.allow_empty_commits && normalized_changes.is_empty() {
        return Err(PraxisError::ValidationFailed {
            message: "empty commits are disabled".into(),
        });
    }

    let snapshot = Arc::new(base_snapshot.apply(&normalized_changes, inner.registry.as_ref())?);

    let parents: Vec<String> = expected_parent.into_iter().collect();
    let timestamp = request.time.clone().or_else(|| Some(current_timestamp()));

    let commit_id = derive_commit_id(
        &inner.config.commit_id_prefix,
        &request.branch,
        &parents,
        request.author.as_deref(),
        &request.message,
        &request.tags,
        &normalized_changes,
    );

    if inner.store.get_commit(&commit_id).await?.is_some() {
        return Err(PraxisError::IntegrityViolation {
            message: format!("commit '{commit_id}' already exists"),
        });
    }

    let summary = CommitSummary {
        id: commit_id.clone(),
        parents: parents.clone(),
        branch: request.branch.clone(),
        author: request.author.clone(),
        time: timestamp,
        message: request.message.clone(),
        tags: request.tags.clone(),
        change_count: change_count(&normalized_changes),
    };

    let persisted = PersistedCommit {
        summary: summary.clone(),
        change_set: normalized_changes.clone(),
    };

    inner.store.put_commit(&persisted).await?;
    inner.record_snapshot_tag(&commit_id).await?;

    inner
        .store
        .compare_and_swap_branch(&request.branch, current_head.as_deref(), Some(&commit_id))
        .await?;
    inner
        .branches
        .entry(request.branch.clone())
        .or_default()
        .head = Some(commit_id.clone());

    inner.commits.insert(
        commit_id.clone(),
        CommitRecord {
            summary,
            snapshot: Arc::clone(&snapshot),
            change_set: normalized_changes,
        },
    );

    Ok(commit_id)
}

pub(super) async fn create_branch(
    inner: &mut Inner,
    name: String,
    from: Option<CommitRef>,
) -> PraxisResult<BranchInfo> {
    validate_branch_name(&name)?;
    if inner.branches.contains_key(&name) {
        return Err(PraxisError::ValidationFailed {
            message: format!("branch '{name}' already exists"),
        });
    }

    let head = match from {
        Some(reference) => Some(resolve_commit_id(inner, &reference, None).await?),
        None => inner.branches.get("main").and_then(|b| b.head.clone()),
    };
    inner.store.ensure_branch(&name).await?;
    inner
        .store
        .compare_and_swap_branch(&name, None, head.as_deref())
        .await?;
    inner
        .branches
        .insert(name.clone(), BranchState { head: head.clone() });
    Ok(BranchInfo { name, head })
}

pub(super) async fn list_commits(
    inner: &mut Inner,
    branch: String,
) -> PraxisResult<Vec<CommitSummary>> {
    let state = inner
        .branches
        .get(&branch)
        .ok_or_else(|| PraxisError::UnknownBranch {
            branch: branch.clone(),
        })?;

    let mut ordered: Vec<CommitSummary> = Vec::new();
    let mut cursor = state.head.clone();
    while let Some(id) = cursor {
        let record = inner.record_for(&id).await?;
        ordered.push(record.summary.clone());
        cursor = record.summary.parents.first().cloned();
    }
    ordered.reverse();
    Ok(ordered)
}

pub(super) async fn state_at(inner: &mut Inner, args: StateAtArgs) -> PraxisResult<StateAtResult> {
    let (commit_id, snapshot, branch_name) =
        resolve_snapshot(inner, &args.as_of, args.scenario.as_deref()).await?;
    let stats = snapshot.stats();
    Ok(StateAtResult::new(
        commit_id,
        Some(branch_name),
        args.confidence,
        stats.node_count as u64,
        stats.edge_count as u64,
    ))
}

pub(super) async fn diff_summary(inner: &mut Inner, args: DiffArgs) -> PraxisResult<DiffSummary> {
    let (from_id, from_snapshot, _) = resolve_snapshot(inner, &args.from, None).await?;
    let (to_id, to_snapshot, _) = resolve_snapshot(inner, &args.to, None).await?;
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

pub(super) async fn topology_delta(
    inner: &mut Inner,
    args: TopologyDeltaArgs,
) -> PraxisResult<TopologyDeltaResult> {
    let (from_id, from_snapshot, _) = resolve_snapshot(inner, &args.from, None).await?;
    let (to_id, to_snapshot, _) = resolve_snapshot(inner, &args.to, None).await?;
    let patch = from_snapshot.diff(&to_snapshot);
    Ok(TopologyDeltaResult::new(
        from_id,
        to_id,
        patch.node_adds.len() as u64,
        patch.node_dels.len() as u64,
        patch.edge_adds.len() as u64,
        patch.edge_dels.len() as u64,
    ))
}

pub(super) async fn merge(inner: &mut Inner, request: MergeRequest) -> PraxisResult<MergeResponse> {
    let source_head = inner
        .branches
        .get(&request.source)
        .ok_or_else(|| PraxisError::UnknownBranch {
            branch: request.source.clone(),
        })?
        .head
        .clone()
        .ok_or_else(|| PraxisError::UnknownCommit {
            commit: request.source.clone(),
        })?;
    let target_head = inner
        .branches
        .get(&request.target)
        .ok_or_else(|| PraxisError::UnknownBranch {
            branch: request.target.clone(),
        })?
        .head
        .clone()
        .ok_or_else(|| PraxisError::UnknownCommit {
            commit: request.target.clone(),
        })?;

    let base = find_common_ancestor(inner, &source_head, &target_head)
        .await?
        .ok_or_else(|| PraxisError::MergeConflict {
            message: "branches do not share a common ancestor".into(),
        })?;

    let base_snapshot = inner.snapshot_for(&base).await?;
    let source_snapshot = inner.snapshot_for(&source_head).await?;
    let target_snapshot = inner.snapshot_for(&target_head).await?;

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
    let normalized_changes = normalize_change_set(&changes);

    let parents = vec![target_head.clone(), source_head.clone()];
    let message = format!("merge {} -> {}", request.source, request.target);
    let tags = vec!["merge".into()];
    let commit_id = derive_commit_id(
        &inner.config.commit_id_prefix,
        &request.target,
        &parents,
        None,
        &message,
        &tags,
        &normalized_changes,
    );

    if inner.store.get_commit(&commit_id).await?.is_some() {
        return Err(PraxisError::IntegrityViolation {
            message: format!("commit '{commit_id}' already exists"),
        });
    }

    let summary = CommitSummary {
        id: commit_id.clone(),
        parents: parents.clone(),
        branch: request.target.clone(),
        author: None,
        time: Some(current_timestamp()),
        message,
        tags: tags.clone(),
        change_count: change_count(&normalized_changes),
    };
    let snapshot = Arc::new(target_snapshot.apply(&normalized_changes, inner.registry.as_ref())?);

    let persisted = PersistedCommit {
        summary: summary.clone(),
        change_set: normalized_changes.clone(),
    };

    inner.store.put_commit(&persisted).await?;
    inner.record_snapshot_tag(&commit_id).await?;
    inner
        .store
        .compare_and_swap_branch(&request.target, Some(&target_head), Some(&commit_id))
        .await?;
    inner
        .branches
        .entry(request.target.clone())
        .or_default()
        .head = Some(commit_id.clone());
    inner.commits.insert(
        commit_id.clone(),
        CommitRecord {
            summary,
            snapshot: Arc::clone(&snapshot),
            change_set: normalized_changes,
        },
    );

    Ok(MergeResponse {
        result: Some(commit_id),
        conflicts: None,
    })
}

fn detect_conflicts(source: &DiffPatch, target: &DiffPatch) -> Vec<MergeConflict> {
    let mut conflicts = Vec::new();

    detect_node_conflicts(source, target, &mut conflicts);
    detect_edge_conflicts(source, target, &mut conflicts);

    conflicts
}

fn detect_node_conflicts(
    source: &DiffPatch,
    target: &DiffPatch,
    conflicts: &mut Vec<MergeConflict>,
) {
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
}

fn detect_edge_conflicts(
    source: &DiffPatch,
    target: &DiffPatch,
    conflicts: &mut Vec<MergeConflict>,
) {
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
}

fn build_change_set(target_snapshot: &GraphSnapshot, patch: &DiffPatch) -> ChangeSet {
    let mut changes = ChangeSet::default();

    changes.node_creates.extend(
        patch
            .node_adds
            .iter()
            .filter(|node| !target_snapshot.has_node(&node.id))
            .cloned(),
    );

    changes
        .node_updates
        .extend(
            patch
                .node_mods
                .iter()
                .filter_map(|node| match target_snapshot.node(&node.id) {
                    Some(existing) if existing == node => None,
                    _ => Some(node.clone()),
                }),
        );

    changes.node_deletes.extend(
        patch
            .node_dels
            .iter()
            .filter(|tomb| target_snapshot.has_node(&tomb.id))
            .map(|tomb| NodeTombstone {
                id: tomb.id.clone(),
            }),
    );

    changes.edge_creates.extend(
        patch
            .edge_adds
            .iter()
            .filter(|edge| !target_snapshot.has_edge(edge))
            .cloned(),
    );

    changes
        .edge_updates
        .extend(
            patch
                .edge_mods
                .iter()
                .filter_map(|edge| match target_snapshot.edge(edge) {
                    Some(existing) if existing == edge => None,
                    _ => Some(edge.clone()),
                }),
        );

    changes.edge_deletes.extend(
        patch
            .edge_dels
            .iter()
            .filter(|tomb| target_snapshot.has_edge_tombstone(tomb))
            .map(|tomb| EdgeTombstone {
                from: tomb.from.clone(),
                to: tomb.to.clone(),
            }),
    );

    changes
}
