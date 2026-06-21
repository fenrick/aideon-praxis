//! Error types for the canonical core: serialisation, identity, and clock faults.

use thiserror::Error;

/// Errors raised while canonicalising or validating canonical material.
#[derive(Debug, Error, PartialEq, Eq)]
pub enum CoreError {
    /// A float value was not finite; `NaN`/±infinity are not representable in
    /// Aideon Canonical JSON v1 ([canonical-json] scalar table).
    #[error("non-finite float is not representable in canonical JSON")]
    NonFiniteFloat,

    /// A value carried an `f64` (or other number) that fell outside the
    /// representable set during canonicalisation.
    #[error("number could not be canonicalised: {0}")]
    BadNumber(String),

    /// A canonical record failed structural parsing or validation.
    #[error("invalid canonical record: {0}")]
    InvalidRecord(String),

    /// An operation of a kind not implemented at M0 was encountered (a deferred
    /// CRDT or scenario-lifecycle kind). The reader refuses rather than
    /// misapplying it.
    #[error("operation kind `{0}` is not supported at M0")]
    UnsupportedKind(String),

    /// The hybrid logical clock cannot advance: `successor` at the maximum
    /// representable `i64` would wrap, so authoring fails explicitly rather than
    /// minting an out-of-order value ([ADR-0022], clock exhaustion).
    #[error("hybrid logical clock exhausted: cannot advance past i64::MAX")]
    ClockExhausted,
}

/// Convenience alias for fallible core operations.
pub type Result<T> = std::result::Result<T, CoreError>;
