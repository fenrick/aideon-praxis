mod error;
pub mod health;
mod memory;
pub mod meta;
pub mod sqlite;
pub mod temporal;
mod types;
pub mod datastore;

pub use error::{MnemeError, MnemeResult};
pub use health::WorkerHealth;
pub use meta::*;
pub use temporal::*;
pub use types::PersistedCommit;

pub use memory::{MemorySnapshotStore, MemoryStore};
pub use sqlite::{SqliteDb, SqliteSnapshotStore, sanitize_id};
pub use datastore::create_datastore;

/// Storage interface consumed by engines.
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
}
