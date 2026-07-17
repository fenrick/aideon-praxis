//! Utility and helper functions for the Praxis engine.

use crate::engine::state::{BranchState, Inner};
use crate::error::{PraxisError, PraxisResult};
use crate::graph::GraphSnapshot;
use crate::temporal::{ChangeSet, CommitRef, EdgeTombstone, EdgeVersion};
use blake3::Hasher;
use serde::Serialize;
use std::cmp::min;
use std::collections::{HashSet, VecDeque};
use std::sync::Arc;
use time::OffsetDateTime;
use time::format_description::well_known::Rfc3339;

pub(super) fn change_count(set: &ChangeSet) -> u64 {
    (set.node_creates.len()
        + set.node_updates.len()
        + set.node_deletes.len()
        + set.edge_creates.len()
        + set.edge_updates.len()
        + set.edge_deletes.len()) as u64
}

pub(super) fn normalize_change_set(input: &ChangeSet) -> ChangeSet {
    let mut normalized = input.clone();
    normalized.node_creates.sort_by_key(|node| node.id.clone());
    normalized.node_updates.sort_by_key(|node| node.id.clone());
    normalized.node_deletes.sort_by_key(|node| node.id.clone());
    normalized.edge_creates.sort_by_key(edge_sort_key);
    normalized.edge_updates.sort_by_key(edge_sort_key);
    normalized.edge_deletes.sort_by_key(edge_tombstone_key);
    normalized
}

fn edge_sort_key(edge: &EdgeVersion) -> (String, String, String) {
    (
        edge.id.clone().unwrap_or_default(),
        edge.from.clone(),
        edge.to.clone(),
    )
}

fn edge_tombstone_key(tombstone: &EdgeTombstone) -> (String, String) {
    (tombstone.from.clone(), tombstone.to.clone())
}

/// The commit-identity inputs that are hashed to derive a deterministic commit
/// id. Grouping them keeps [`derive_commit_id`] to a small argument list and
/// doubles as the serialized hash payload.
#[derive(Serialize)]
pub(super) struct CommitIdentity<'a> {
    pub(super) branch: &'a str,
    pub(super) parents: &'a [String],
    pub(super) author: Option<&'a str>,
    pub(super) message: &'a str,
    pub(super) tags: &'a [String],
    pub(super) changes: &'a ChangeSet,
}

pub(super) fn derive_commit_id(prefix: &str, identity: &CommitIdentity<'_>) -> String {
    let payload = serde_json::to_vec(identity).expect("commit identity serialization");
    let mut hasher = Hasher::new();
    hasher.update(&payload);
    let hex = hasher.finalize().to_hex().to_string();
    let short = &hex[..min(32, hex.len())];
    format!("{}{}", prefix, short)
}

pub(super) fn current_timestamp() -> String {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".into())
}

pub(super) fn snapshot_tag(commit_id: &str) -> String {
    format!("snapshot/{commit_id}")
}

pub(super) fn validate_branch_name(name: &str) -> PraxisResult<()> {
    if name.trim().is_empty() {
        return Err(PraxisError::ValidationFailed {
            message: "branch name cannot be empty".into(),
        });
    }
    for segment in name.split('/') {
        if segment.is_empty() {
            return Err(PraxisError::ValidationFailed {
                message: "branch segments cannot be empty".into(),
            });
        }
        if segment == "." || segment == ".." {
            return Err(PraxisError::ValidationFailed {
                message: "branch segments may not be '.' or '..'".into(),
            });
        }
        if !segment
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.'))
        {
            return Err(PraxisError::ValidationFailed {
                message: format!("branch segment '{segment}' contains invalid characters"),
            });
        }
    }
    Ok(())
}

pub(super) async fn resolve_snapshot(
    inner: &mut Inner,
    reference: &CommitRef,
    scenario_hint: Option<&str>,
) -> PraxisResult<(String, Arc<GraphSnapshot>, String)> {
    let commit_id = resolve_commit_id(inner, reference, scenario_hint).await?;
    let record = inner.record_for(&commit_id).await?;
    Ok((
        commit_id,
        Arc::clone(&record.snapshot),
        record.summary.branch.clone(),
    ))
}

pub(super) async fn resolve_commit_id(
    inner: &mut Inner,
    reference: &CommitRef,
    scenario_hint: Option<&str>,
) -> PraxisResult<String> {
    match reference {
        CommitRef::Id(value) => resolve_id_reference(inner, value, scenario_hint).await,
        CommitRef::Branch { branch, at } => {
            resolve_branch_reference(inner, branch, at.as_deref()).await
        }
    }
}

async fn resolve_id_reference(
    inner: &mut Inner,
    value: &str,
    scenario_hint: Option<&str>,
) -> PraxisResult<String> {
    if inner.record_for(value).await.is_ok() {
        return Ok(value.to_string());
    }
    if let Some(branch_state) = inner.branches.get(value) {
        return branch_head(branch_state, value);
    }
    let hint = scenario_hint.ok_or_else(|| PraxisError::UnknownCommit {
        commit: value.to_string(),
    })?;
    let branch = inner
        .branches
        .get(hint)
        .ok_or_else(|| PraxisError::UnknownBranch {
            branch: hint.to_string(),
        })?;
    branch_head(branch, hint)
}

async fn resolve_branch_reference(
    inner: &mut Inner,
    branch: &str,
    at: Option<&str>,
) -> PraxisResult<String> {
    if let Some(at) = at {
        inner.record_for(at).await?;
        return Ok(at.to_string());
    }
    let target_branch = inner
        .branches
        .get(branch)
        .ok_or_else(|| PraxisError::UnknownBranch {
            branch: branch.to_string(),
        })?;
    branch_head(target_branch, branch)
}

fn branch_head(state: &BranchState, missing: &str) -> PraxisResult<String> {
    state
        .head
        .clone()
        .ok_or_else(|| PraxisError::UnknownCommit {
            commit: missing.to_string(),
        })
}

pub(super) async fn find_common_ancestor(
    inner: &mut Inner,
    a: &str,
    b: &str,
) -> PraxisResult<Option<String>> {
    let ancestors_a = collect_ancestors(inner, a).await?;
    let mut queue: VecDeque<String> = VecDeque::new();
    queue.push_back(b.to_string());
    let mut visited = HashSet::new();
    while let Some(id) = queue.pop_front() {
        if !visited.insert(id.clone()) {
            continue;
        }
        if ancestors_a.contains(&id) {
            return Ok(Some(id));
        }
        enqueue_parents(inner, &id, &mut queue).await;
    }
    Ok(None)
}

async fn collect_ancestors(inner: &mut Inner, head: &str) -> PraxisResult<HashSet<String>> {
    let mut visited = HashSet::new();
    let mut queue: VecDeque<String> = VecDeque::new();
    queue.push_back(head.to_string());
    while let Some(id) = queue.pop_front() {
        if visited.insert(id.clone()) {
            enqueue_parents(inner, &id, &mut queue).await;
        }
    }
    Ok(visited)
}

/// Enqueues the parents of `id` onto `queue`, skipping any commit whose record
/// cannot be loaded.
async fn enqueue_parents(inner: &mut Inner, id: &str, queue: &mut VecDeque<String>) {
    if let Ok(record) = inner.record_for(id).await {
        for parent in &record.summary.parents {
            queue.push_back(parent.clone());
        }
    }
}

#[cfg(test)]
#[path = "../../tests/internal/engine_util_tests.rs"]
mod tests;
