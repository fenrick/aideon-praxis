//! Temporal engine implementation.
//!
//! The goal is to provide a clean Rust implementation of the time APIs that
//! previously lived in the Python worker. Keeping the API surface identical
//! eases the migration toward a fully Rust-based host/worker story.

use core_data::temporal::{
    BranchInfo, ChangeSet, CommitChangesRequest, CommitSummary, DiffArgs, DiffPatch, DiffSummary,
    EdgeRef, NodeRef, StateAtArgs, StateAtResult,
};
use log::debug;
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};

/// Primary entry point for temporal queries.
#[derive(Clone, Debug, Default)]
pub struct TemporalEngine {
    inner: Arc<Mutex<Repo>>,
}

#[derive(Clone, Debug, Default)]
struct Repo {
    next_commit: u64,
    // commit id -> record
    commits: HashMap<String, CommitRecord>,
    // branch name -> head commit id
    branches: HashMap<String, String>,
}

#[derive(Clone, Debug)]
struct CommitRecord {
    id: String,
    branch: String,
    parent: Option<String>,
    as_of: String,
    message: Option<String>,
    changes: ChangeSet,
}

impl TemporalEngine {
    /// Construct a new temporal engine instance.
    pub fn new() -> Self {
        debug!("chrona: TemporalEngine created");
        Self {
            inner: Arc::new(Mutex::new(Repo::default())),
        }
    }

    /// Compute a time-sliced view of the graph. The initial implementation
    /// mirrors the Python stub to keep the renderer contract stable.
    pub fn state_at(&self, args: StateAtArgs) -> StateAtResult {
        let StateAtArgs {
            as_of,
            scenario,
            confidence,
        } = args;
        debug!(
            "chrona: state_at invoked as_of={} scenario={:?} confidence={:?}",
            as_of, scenario, confidence
        );
        // Map scenario to branch; default main
        let branch = scenario.unwrap_or_else(|| "main".into());
        let (nodes, edges) = {
            let repo = self.inner.lock().expect("lock");
            let head = repo.branches.get(&branch).cloned();
            let (n, e) = self.materialize_counts(&repo, head.as_deref());
            (n, e)
        };
        StateAtResult::new(as_of, Some(branch), confidence, nodes as u64, edges as u64)
    }

    /// Commit a changeset to the given branch, creating the branch if needed.
    pub fn commit(&self, req: CommitChangesRequest) -> String {
        let mut repo = self.inner.lock().expect("lock");
        let parent = repo.branches.get(&req.branch).cloned();
        repo.next_commit += 1;
        let id = format!("c{}", repo.next_commit);
        let record = CommitRecord {
            id: id.clone(),
            branch: req.branch.clone(),
            parent,
            as_of: req.as_of,
            message: req.message,
            changes: req.changes,
        };
        repo.commits.insert(id.clone(), record);
        repo.branches.insert(req.branch, id.clone());
        id
    }

    /// Create a branch at the specified commit or current head of main.
    pub fn create_branch(&self, name: String, from: Option<String>) -> BranchInfo {
        let mut repo = self.inner.lock().expect("lock");
        let head = from.or_else(|| repo.branches.get("main").cloned());
        if let Some(h) = &head {
            repo.branches.insert(name.clone(), h.clone());
        } else {
            repo.branches.insert(name.clone(), String::new());
        }
        BranchInfo { name, head }
    }

    /// List commits for a branch from root to head (simple linear history).
    pub fn list_commits(&self, branch: String) -> Vec<CommitSummary> {
        let repo = self.inner.lock().expect("lock");
        let mut out = Vec::new();
        let mut cursor = repo.branches.get(&branch).cloned();
        while let Some(id) = cursor {
            if id.is_empty() {
                break;
            }
            if let Some(rec) = repo.commits.get(&id) {
                out.push(CommitSummary {
                    id: rec.id.clone(),
                    branch: rec.branch.clone(),
                    as_of: rec.as_of.clone(),
                    parent_id: rec.parent.clone(),
                    message: rec.message.clone(),
                });
                cursor = rec.parent.clone();
            } else {
                break;
            }
        }
        out.reverse();
        out
    }

    /// Compute a diff between two commits identified by id.
    pub fn diff(&self, a: &str, b: &str) -> DiffPatch {
        let repo = self.inner.lock().expect("lock");
        let repo_ref: &Repo = &repo;
        self.diff_between(
            repo_ref,
            self.resolve_reference(repo_ref, a).as_deref(),
            self.resolve_reference(repo_ref, b).as_deref(),
        )
    }

    fn materialize_counts(&self, repo: &Repo, head: Option<&str>) -> (usize, usize) {
        let (n, e) = self.materialize_sets(repo, head);
        (n.len(), e.len())
    }

    fn materialize_sets(
        &self,
        repo: &Repo,
        head: Option<&str>,
    ) -> (HashSet<String>, HashSet<(String, String)>) {
        let mut nodes: HashSet<String> = HashSet::new();
        let mut edges: HashSet<(String, String)> = HashSet::new();
        let mut stack: Vec<String> = Vec::new();
        if let Some(id) = head {
            let mut cursor = Some(id.to_string());
            while let Some(cid) = cursor {
                if let Some(rec) = repo.commits.get(&cid) {
                    stack.push(cid.clone());
                    cursor = rec.parent.clone();
                } else {
                    break;
                }
            }
        }
        for cid in stack.into_iter().rev() {
            if let Some(rec) = repo.commits.get(&cid) {
                for n in &rec.changes.add_nodes {
                    nodes.insert(n.id.clone());
                }
                for n in &rec.changes.remove_nodes {
                    nodes.remove(&n.id);
                }
                for e in &rec.changes.add_edges {
                    edges.insert((e.source.clone(), e.target.clone()));
                }
                for e in &rec.changes.remove_edges {
                    edges.remove(&(e.source.clone(), e.target.clone()));
                }
            }
        }
        (nodes, edges)
    }

    fn resolve_reference(&self, repo: &Repo, reference: &str) -> Option<String> {
        if reference.is_empty() {
            return None;
        }
        if repo.commits.contains_key(reference) {
            return Some(reference.to_string());
        }
        if let Some(branch_head) = repo.branches.get(reference)
            && !branch_head.is_empty()
        {
            return Some(branch_head.clone());
        }
        let mut candidate: Option<String> = None;
        for (id, record) in repo.commits.iter() {
            if record.as_of == reference {
                candidate = Some(id.clone());
            }
        }
        candidate
    }

    fn diff_between(&self, repo: &Repo, from: Option<&str>, to: Option<&str>) -> DiffPatch {
        let (an, ae) = self.materialize_sets(repo, from);
        let (bn, be) = self.materialize_sets(repo, to);
        let mut patch = DiffPatch::default();
        for id in bn.difference(&an) {
            patch.added_nodes.push(NodeRef { id: id.clone() });
        }
        for id in an.difference(&bn) {
            patch.removed_nodes.push(NodeRef { id: id.clone() });
        }
        for e in be.difference(&ae) {
            patch.added_edges.push(EdgeRef {
                source: e.0.clone(),
                target: e.1.clone(),
            });
        }
        for e in ae.difference(&be) {
            patch.removed_edges.push(EdgeRef {
                source: e.0.clone(),
                target: e.1.clone(),
            });
        }
        patch
    }

    /// Produce diff counts for UI summary use, resolving plateau/date references.
    pub fn diff_summary(&self, args: DiffArgs) -> DiffSummary {
        let DiffArgs { from, to, .. } = args;
        let repo = self.inner.lock().expect("lock");
        let repo_ref: &Repo = &repo;
        let from_resolved = self.resolve_reference(repo_ref, &from);
        let to_resolved = self.resolve_reference(repo_ref, &to);
        let patch = self.diff_between(repo_ref, from_resolved.as_deref(), to_resolved.as_deref());
        DiffSummary::new(
            from,
            to,
            patch.added_nodes.len() as u64,
            patch.removed_nodes.len() as u64,
            patch.added_edges.len() as u64,
            patch.removed_edges.len() as u64,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::TemporalEngine;
    use core_data::temporal::{ChangeSet, CommitChangesRequest, DiffArgs, StateAtArgs};

    #[test]
    fn commit_and_state_counts_increase() {
        let engine = TemporalEngine::new();
        let req = CommitChangesRequest {
            branch: "main".into(),
            as_of: "2025-01-01".into(),
            message: None,
            changes: ChangeSet {
                add_nodes: vec![super::NodeRef { id: "n1".into() }],
                remove_nodes: vec![],
                add_edges: vec![],
                remove_edges: vec![],
            },
        };
        let _id = engine.commit(req);
        let args = StateAtArgs::new("2025-01-01".into(), Some("main".into()), None);
        let result = engine.state_at(args);
        assert_eq!(result.nodes, 1);
        assert_eq!(result.edges, 0);
    }

    #[test]
    fn diff_summary_counts_transitions() {
        let engine = TemporalEngine::new();
        let first = engine.commit(CommitChangesRequest {
            branch: "main".into(),
            as_of: "2025-01-01".into(),
            message: None,
            changes: ChangeSet {
                add_nodes: vec![super::NodeRef { id: "n1".into() }],
                remove_nodes: vec![],
                add_edges: vec![],
                remove_edges: vec![],
            },
        });
        let _second = engine.commit(CommitChangesRequest {
            branch: "main".into(),
            as_of: "2025-02-01".into(),
            message: None,
            changes: ChangeSet {
                add_nodes: vec![super::NodeRef { id: "n2".into() }],
                remove_nodes: vec![],
                add_edges: vec![super::EdgeRef {
                    source: "n1".into(),
                    target: "n2".into(),
                }],
                remove_edges: vec![],
            },
        });

        let summary = engine.diff_summary(DiffArgs {
            from: first.clone(),
            to: "main".into(),
            scope: None,
        });
        assert_eq!(summary.nodes_added, 1);
        assert_eq!(summary.edges_added, 1);
        assert_eq!(summary.nodes_removed, 0);

        let date_summary = engine.diff_summary(DiffArgs {
            from: "2025-01-01".into(),
            to: "2025-02-01".into(),
            scope: None,
        });
        assert_eq!(date_summary.nodes_added, 1);
        assert_eq!(date_summary.edges_added, 1);
    }
}
