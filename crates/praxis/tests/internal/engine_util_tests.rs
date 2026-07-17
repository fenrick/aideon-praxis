use super::*;
use crate::PraxisEngineConfig;
use crate::store::{MemoryStore, Store};
use crate::temporal::{CommitSummary, EdgeVersion, NodeTombstone, NodeVersion, PersistedCommit};
use std::sync::Arc;

#[test]
fn change_count_counts_all_change_vectors() {
    let mut set = ChangeSet::default();
    set.node_creates.push(NodeVersion {
        id: "n1".into(),
        r#type: None,
        props: None,
    });
    set.node_updates.push(NodeVersion {
        id: "n2".into(),
        r#type: None,
        props: None,
    });
    set.node_deletes.push(NodeTombstone { id: "n3".into() });
    set.edge_creates.push(EdgeVersion {
        id: Some("e1".into()),
        from: "n1".into(),
        to: "n2".into(),
        r#type: None,
        directed: None,
        props: None,
    });
    assert_eq!(change_count(&set), 4);
}

#[test]
fn normalize_change_set_sorts_by_id_and_endpoints() {
    let mut set = ChangeSet::default();
    set.node_creates.push(NodeVersion {
        id: "b".into(),
        r#type: None,
        props: None,
    });
    set.node_creates.push(NodeVersion {
        id: "a".into(),
        r#type: None,
        props: None,
    });
    set.edge_creates.push(EdgeVersion {
        id: Some("2".into()),
        from: "b".into(),
        to: "c".into(),
        r#type: None,
        directed: None,
        props: None,
    });
    set.edge_creates.push(EdgeVersion {
        id: Some("1".into()),
        from: "a".into(),
        to: "c".into(),
        r#type: None,
        directed: None,
        props: None,
    });

    let normalized = normalize_change_set(&set);
    assert_eq!(normalized.node_creates[0].id, "a");
    assert_eq!(normalized.node_creates[1].id, "b");
    assert_eq!(normalized.edge_creates[0].id.as_deref(), Some("1"));
    assert_eq!(normalized.edge_creates[1].id.as_deref(), Some("2"));
}

#[test]
fn derive_commit_id_is_deterministic_for_same_input() {
    let set = ChangeSet::default();
    let id1 = derive_commit_id(
        "commit-",
        &CommitIdentity {
            branch: "main",
            parents: &["p1".into()],
            author: Some("me"),
            message: "message",
            tags: &["tag".into()],
            changes: &set,
        },
    );
    let id2 = derive_commit_id(
        "commit-",
        &CommitIdentity {
            branch: "main",
            parents: &["p1".into()],
            author: Some("me"),
            message: "message",
            tags: &["tag".into()],
            changes: &set,
        },
    );
    assert_eq!(id1, id2);
    assert!(id1.starts_with("commit-"));
}

#[test]
fn snapshot_tag_is_prefixed() {
    assert_eq!(snapshot_tag("abc"), "snapshot/abc");
}

#[test]
fn validate_branch_name_rejects_empty_or_invalid_segments() {
    assert!(validate_branch_name("").is_err());
    assert!(validate_branch_name(" ").is_err());
    assert!(validate_branch_name("a//b").is_err());
    assert!(validate_branch_name("a/../b").is_err());
    assert!(validate_branch_name("a/b@c").is_err());
    validate_branch_name("feature/test_1").unwrap();
    validate_branch_name("release-1.0").unwrap();
}

fn persisted_commit(id: &str, parents: Vec<String>) -> PersistedCommit {
    PersistedCommit {
        summary: CommitSummary {
            id: id.to_string(),
            parents,
            branch: "main".into(),
            author: None,
            time: None,
            message: "test".into(),
            tags: Vec::new(),
            change_count: 0,
        },
        change_set: ChangeSet::default(),
    }
}

#[tokio::test]
async fn resolve_commit_id_prefers_known_commit_or_branch_head() {
    let store = Arc::new(MemoryStore::default());
    store
        .put_commit(&persisted_commit("c1", Vec::new()))
        .await
        .unwrap();
    let mut inner = Inner::new(PraxisEngineConfig::default(), store)
        .await
        .unwrap();
    inner.branches.insert(
        "feature".into(),
        crate::engine::state::BranchState {
            head: Some("c1".into()),
        },
    );

    let resolved = resolve_commit_id(&mut inner, &CommitRef::Id("c1".into()), None)
        .await
        .unwrap();
    assert_eq!(resolved, "c1");

    let resolved = resolve_commit_id(&mut inner, &CommitRef::Id("feature".into()), None)
        .await
        .unwrap();
    assert_eq!(resolved, "c1");
}

#[tokio::test]
async fn resolve_commit_id_respects_branch_reference_and_errors() {
    let store = Arc::new(MemoryStore::default());
    store
        .put_commit(&persisted_commit("c1", Vec::new()))
        .await
        .unwrap();
    let mut inner = Inner::new(PraxisEngineConfig::default(), store)
        .await
        .unwrap();
    inner.branches.insert(
        "main".into(),
        crate::engine::state::BranchState {
            head: Some("c1".into()),
        },
    );

    let resolved = resolve_commit_id(
        &mut inner,
        &CommitRef::Branch {
            branch: "main".into(),
            at: None,
        },
        None,
    )
    .await
    .unwrap();
    assert_eq!(resolved, "c1");

    let err = resolve_commit_id(&mut inner, &CommitRef::Id("missing".into()), None)
        .await
        .unwrap_err();
    assert!(matches!(
        err,
        crate::error::PraxisError::UnknownCommit { .. }
    ));
}
