use aideon_mneme_core::MnemeError;
use thiserror::Error;

/// Structured error codes emitted by the Praxis engine.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PraxisErrorCode {
    UnknownBranch,
    UnknownCommit,
    ConcurrencyConflict,
    ValidationFailed,
    IntegrityViolation,
    MergeConflict,
}

/// Result alias used throughout the engine.
pub type PraxisResult<T> = Result<T, PraxisError>;

/// Domain error type describing failure modes surfaced to the host.
#[derive(Debug, Error)]
pub enum PraxisError {
    #[error("unknown branch '{branch}'")]
    UnknownBranch { branch: String },

    #[error("unknown commit '{commit}'")]
    UnknownCommit { commit: String },

    #[error(
        "concurrency conflict on branch '{branch}': expected head {expected:?}, actual {actual:?}"
    )]
    ConcurrencyConflict {
        branch: String,
        expected: Option<String>,
        actual: Option<String>,
    },

    #[error("validation failed: {message}")]
    ValidationFailed { message: String },

    #[error("integrity violation: {message}")]
    IntegrityViolation { message: String },

    #[error("merge produced conflicts: {message}")]
    MergeConflict { message: String },
}

impl PraxisError {
    /// Machine-friendly error code for host serialization.
    pub fn code(&self) -> PraxisErrorCode {
        match self {
            Self::UnknownBranch { .. } => PraxisErrorCode::UnknownBranch,
            Self::UnknownCommit { .. } => PraxisErrorCode::UnknownCommit,
            Self::ConcurrencyConflict { .. } => PraxisErrorCode::ConcurrencyConflict,
            Self::ValidationFailed { .. } => PraxisErrorCode::ValidationFailed,
            Self::IntegrityViolation { .. } => PraxisErrorCode::IntegrityViolation,
            Self::MergeConflict { .. } => PraxisErrorCode::MergeConflict,
        }
    }
}

impl From<MnemeError> for PraxisError {
    fn from(value: MnemeError) -> Self {
        match value {
            MnemeError::ConcurrencyConflict {
                branch,
                expected,
                actual,
            } => PraxisError::ConcurrencyConflict {
                branch,
                expected,
                actual,
            },
            MnemeError::Storage { message } => PraxisError::IntegrityViolation { message },
        }
    }
}
