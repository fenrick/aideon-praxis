use super::*;
use crate::temporal::{EdgeVersion, NodeTombstone, NodeVersion};

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
        "main",
        &["p1".into()],
        Some("me"),
        "message",
        &["tag".into()],
        &set,
    );
    let id2 = derive_commit_id(
        "commit-",
        "main",
        &["p1".into()],
        Some("me"),
        "message",
        &["tag".into()],
        &set,
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
