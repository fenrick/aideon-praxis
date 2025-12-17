use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};

use aideon_continuum::SnapshotStore as ContinuumSnapshotStore;

use async_trait::async_trait;

use crate::{MnemeError, MnemeResult, PersistedCommit, Store};

#[derive(Clone, Default)]
pub struct MemoryStore {
    inner: Arc<Mutex<MemoryState>>,
}

#[derive(Default)]
struct MemoryState {
    commits: BTreeMap<String, PersistedCommit>,
    branches: BTreeMap<String, Option<String>>,
    tags: BTreeMap<String, String>,
}

#[async_trait]
impl Store for MemoryStore {
    async fn put_commit(&self, commit: &PersistedCommit) -> MnemeResult<()> {
        let mut guard = self.inner.lock().expect("memory store poisoned");
        if guard.commits.contains_key(&commit.summary.id) {
            return Err(MnemeError::storage(format!(
                "commit '{}' already exists",
                commit.summary.id
            )));
        }
        guard
            .commits
            .insert(commit.summary.id.clone(), commit.clone());
        Ok(())
    }

    async fn get_commit(&self, id: &str) -> MnemeResult<Option<PersistedCommit>> {
        let guard = self.inner.lock().expect("memory store poisoned");
        Ok(guard.commits.get(id).cloned())
    }

    async fn ensure_branch(&self, branch: &str) -> MnemeResult<()> {
        let mut guard = self.inner.lock().expect("memory store poisoned");
        guard.branches.entry(branch.into()).or_insert(None);
        Ok(())
    }

    async fn compare_and_swap_branch(
        &self,
        branch: &str,
        expected: Option<&str>,
        next: Option<&str>,
    ) -> MnemeResult<()> {
        let mut guard = self.inner.lock().expect("memory store poisoned");
        let current = guard.branches.entry(branch.into()).or_insert(None);
        if current.as_deref() != expected {
            return Err(MnemeError::ConcurrencyConflict {
                branch: branch.into(),
                expected: expected.map(|s| s.to_string()),
                actual: current.clone(),
            });
        }
        *current = next.map(|s| s.to_string());
        Ok(())
    }

    async fn get_branch_head(&self, branch: &str) -> MnemeResult<Option<String>> {
        let guard = self.inner.lock().expect("memory store poisoned");
        Ok(guard.branches.get(branch).cloned().unwrap_or(None))
    }

    async fn list_branches(&self) -> MnemeResult<Vec<(String, Option<String>)>> {
        let guard = self.inner.lock().expect("memory store poisoned");
        let mut list: Vec<(String, Option<String>)> = guard
            .branches
            .iter()
            .map(|(name, head)| (name.clone(), head.clone()))
            .collect();
        list.sort_by(|a, b| a.0.cmp(&b.0));
        Ok(list)
    }

    async fn put_tag(&self, tag: &str, commit_id: &str) -> MnemeResult<()> {
        let mut guard = self.inner.lock().expect("memory store poisoned");
        guard.tags.insert(tag.into(), commit_id.into());
        Ok(())
    }

    async fn get_tag(&self, tag: &str) -> MnemeResult<Option<String>> {
        let guard = self.inner.lock().expect("memory store poisoned");
        Ok(guard.tags.get(tag).cloned())
    }

    async fn list_tags(&self) -> MnemeResult<Vec<(String, String)>> {
        let guard = self.inner.lock().expect("memory store poisoned");
        Ok(guard
            .tags
            .iter()
            .map(|(tag, commit)| (tag.clone(), commit.clone()))
            .collect())
    }
}

#[derive(Default)]
pub struct MemorySnapshotStore {
    inner: Mutex<BTreeMap<String, Vec<u8>>>,
}

impl ContinuumSnapshotStore for MemorySnapshotStore {
    fn put(&self, key: &str, bytes: &[u8]) -> Result<(), String> {
        let mut guard = self
            .inner
            .lock()
            .map_err(|_| "snapshot store poisoned".to_string())?;
        guard.insert(key.to_string(), bytes.to_vec());
        Ok(())
    }

    fn get(&self, key: &str) -> Result<Vec<u8>, String> {
        let guard = self
            .inner
            .lock()
            .map_err(|_| "snapshot store poisoned".to_string())?;
        guard
            .get(key)
            .cloned()
            .ok_or_else(|| format!("snapshot '{key}' not found"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::temporal::{ChangeSet, CommitSummary};

    fn commit(id: &str) -> PersistedCommit {
        PersistedCommit {
            summary: CommitSummary {
                id: id.into(),
                parents: Vec::new(),
                branch: "main".into(),
                author: None,
                time: None,
                message: "msg".into(),
                tags: Vec::new(),
                change_count: 0,
            },
            change_set: ChangeSet::default(),
        }
    }

    #[tokio::test]
    async fn put_commit_rejects_duplicates() {
        let store = MemoryStore::default();
        store.put_commit(&commit("c1")).await.unwrap();
        let err = store.put_commit(&commit("c1")).await.unwrap_err();
        assert!(matches!(err, MnemeError::Storage { .. }));
    }

    #[tokio::test]
    async fn compare_and_swap_branch_detects_conflicts() {
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
        assert!(matches!(err, MnemeError::ConcurrencyConflict { .. }));
    }

    #[tokio::test]
    async fn list_branches_is_sorted() {
        let store = MemoryStore::default();
        store.ensure_branch("b").await.unwrap();
        store.ensure_branch("a").await.unwrap();
        let list = store.list_branches().await.unwrap();
        assert_eq!(list[0].0, "a");
        assert_eq!(list[1].0, "b");
    }

    #[test]
    fn snapshot_store_put_get_roundtrip_and_missing() {
        let store = MemorySnapshotStore::default();
        store.put("k1", b"hello").unwrap();
        assert_eq!(store.get("k1").unwrap(), b"hello");
        assert!(store.get("missing").unwrap_err().contains("not found"));
    }
}
