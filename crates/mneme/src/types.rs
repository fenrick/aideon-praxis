use crate::temporal::{ChangeSet, CommitSummary};
use serde::{Deserialize, Serialize};

/// Full commit payload persisted to storage.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PersistedCommit {
    pub summary: CommitSummary,
    pub change_set: ChangeSet,
}
