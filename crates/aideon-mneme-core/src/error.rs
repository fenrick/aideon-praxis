use thiserror::Error;

#[derive(Debug, Error)]
pub enum MnemeError {
    #[error("mneme storage error: {message}")]
    Storage { message: String },
    #[error("mneme branch concurrency conflict {branch}")]
    ConcurrencyConflict {
        branch: String,
        expected: Option<String>,
        actual: Option<String>,
    },
}

impl MnemeError {
    pub(crate) fn storage(message: impl Into<String>) -> Self {
        Self::Storage {
            message: message.into(),
        }
    }
}

pub type MnemeResult<T> = Result<T, MnemeError>;
