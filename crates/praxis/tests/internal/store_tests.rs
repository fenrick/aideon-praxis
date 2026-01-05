use super::*;
use crate::error::PraxisError;

fn commit_summary(id: &str) -> CommitSummary {
    CommitSummary {
        id: id.to_string(),
        parents: Vec::new(),
        branch: "main".into(),
        author: None,
        time: None,
        message: "test".into(),
        tags: Vec::new(),
        change_count: 0,
    }
}

#[tokio::test]
async fn memory_store_compare_and_swap_reports_conflict() {
    let store = MemoryStore::default();
    store.ensure_branch("main").await.unwrap();

    store
        .compare_and_swap_branch("main", None, Some("c1"))
        .await
        .unwrap();

    let err = store
        .compare_and_swap_branch("main", None, Some("c2"))
        .await
        .unwrap_err();
    assert!(matches!(err, PraxisError::ConcurrencyConflict { .. }));
}

#[tokio::test]
async fn memory_store_commit_roundtrip() {
    let store = MemoryStore::default();
    let commit = PersistedCommit {
        summary: commit_summary("c1"),
        change_set: ChangeSet::default(),
    };
    store.put_commit(&commit).await.unwrap();
    let loaded = store.get_commit("c1").await.unwrap();
    let loaded = loaded.expect("commit");
    assert_eq!(loaded.summary.id, "c1");
    assert!(loaded.change_set.is_empty());
}

#[tokio::test]
async fn memory_store_tags_roundtrip() {
    let store = MemoryStore::default();
    assert_eq!(store.get_tag("missing").await.unwrap(), None);
    store.put_tag("tag-1", "c1").await.unwrap();
    assert_eq!(store.get_tag("tag-1").await.unwrap(), Some("c1".into()));
}
