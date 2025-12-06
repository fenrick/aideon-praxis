//! Mneme storage interface consumed by engines.

use async_trait::async_trait;

use crate::{MnemeResult, PersistedCommit};

#[async_trait]
pub trait Store: Send + Sync {
    async fn put_commit(&self, commit: &PersistedCommit) -> MnemeResult<()>;
    async fn get_commit(&self, id: &str) -> MnemeResult<Option<PersistedCommit>>;
    async fn ensure_branch(&self, branch: &str) -> MnemeResult<()>;
    async fn compare_and_swap_branch(
        &self,
        branch: &str,
        expected: Option<&str>,
        next: Option<&str>,
    ) -> MnemeResult<()>;
    async fn get_branch_head(&self, branch: &str) -> MnemeResult<Option<String>>;
    async fn list_branches(&self) -> MnemeResult<Vec<(String, Option<String>)>>;
    async fn put_tag(&self, tag: &str, commit_id: &str) -> MnemeResult<()>;
    async fn get_tag(&self, tag: &str) -> MnemeResult<Option<String>>;
    async fn list_tags(&self) -> MnemeResult<Vec<(String, String)>>;
}
