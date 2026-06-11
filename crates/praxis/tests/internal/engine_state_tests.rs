use super::*;
use crate::store::{MemoryStore, Store};

#[tokio::test]
async fn new_ensures_main_branch_exists() {
    let store = Arc::new(MemoryStore::default());
    let inner = Inner::new(PraxisEngineConfig::default(), store.clone())
        .await
        .unwrap();
    assert!(inner.branches.contains_key("main"));
    let head = store.get_branch_head("main").await.unwrap();
    assert_eq!(head, None);
}

#[tokio::test]
async fn record_snapshot_tag_writes_tag_in_store() {
    let store = Arc::new(MemoryStore::default());
    let inner = Inner::new(PraxisEngineConfig::default(), store.clone())
        .await
        .unwrap();
    inner.record_snapshot_tag("c123").await.unwrap();
    let tag = super::super::util::snapshot_tag("c123");
    let stored = store.get_tag(&tag).await.unwrap();
    assert_eq!(stored.as_deref(), Some("c123"));
}

#[tokio::test]
async fn record_for_unknown_commit_returns_error() {
    let store = Arc::new(MemoryStore::default());
    let mut inner = Inner::new(PraxisEngineConfig::default(), store)
        .await
        .unwrap();
    let err = inner.record_for("missing").await.unwrap_err();
    assert!(matches!(
        err,
        crate::error::PraxisError::UnknownCommit { .. }
    ));
}
