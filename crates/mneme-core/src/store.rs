//! Mneme storage interface consumed by engines.

use crate::{MnemeResult, PersistedCommit};

pub trait Store: Send + Sync {
    fn put_commit(&self, commit: &PersistedCommit) -> MnemeResult<()>;
    fn get_commit(&self, id: &str) -> MnemeResult<Option<PersistedCommit>>;
    fn ensure_branch(&self, branch: &str) -> MnemeResult<()>;
    fn compare_and_swap_branch(
        &self,
        branch: &str,
        expected: Option<&str>,
        next: Option<&str>,
    ) -> MnemeResult<()>;
    fn get_branch_head(&self, branch: &str) -> MnemeResult<Option<String>>;
    fn list_branches(&self) -> MnemeResult<Vec<(String, Option<String>)>>;
    fn put_tag(&self, tag: &str, commit_id: &str) -> MnemeResult<()>;
    fn get_tag(&self, tag: &str) -> MnemeResult<Option<String>>;
    fn list_tags(&self) -> MnemeResult<Vec<(String, String)>>;
}
