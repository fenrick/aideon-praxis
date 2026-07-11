//! Storage-layer errors, including the typed refusal seams the open path uses
//! ([workspace-integrity-and-recovery], [ADR-0016]).

use thiserror::Error;

use mneme_core::CoreError;

/// Errors raised by the canonical storage layer.
#[derive(Debug, Error)]
pub enum StoreError {
    /// An underlying filesystem error.
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    /// A canonical-core error (serialisation, identity, clock).
    #[error("core error: {0}")]
    Core(#[from] CoreError),

    /// A derived-runtime (SQLite) error.
    #[error("runtime store error: {0}")]
    Runtime(#[from] rusqlite::Error),

    /// A JSON document failed to parse or shape-check.
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),

    /// Another writer holds the workspace lock, or exclusivity cannot be
    /// established on this filesystem (`WORKSPACE_LOCKED`).
    #[error("workspace is locked by another writer")]
    WorkspaceLocked,

    /// The workspace declares a major format version newer than this build
    /// supports (`WORKSPACE_FORMAT_TOO_NEW`).
    #[error("workspace format version {found} is newer than supported max {max}")]
    WorkspaceFormatTooNew {
        /// The version found on disk.
        found: u32,
        /// The maximum this build understands.
        max: u32,
    },

    /// The authored metamodel package version is newer than this build
    /// understands (`SCHEMA_TOO_NEW`).
    #[error("metamodel package version {found} is newer than supported max {max}")]
    SchemaTooNew {
        /// The version found on disk.
        found: u32,
        /// The maximum this build understands.
        max: u32,
    },

    /// The workspace's `manifest.required_features` lists a feature this build
    /// does not implement; it is refused read-write.
    #[error("workspace requires unsupported feature(s): {0}")]
    UnsupportedFeature(String),

    /// An operation carries a `partition_id` other than the manifest's sole
    /// declared partition.
    #[error("operation references foreign partition {found}, expected {expected}")]
    ForeignPartition {
        /// The partition the operation carried.
        found: String,
        /// The manifest's sole declared partition.
        expected: String,
    },

    /// A scenario-qualified operation was found at M0, where only the base case
    /// (`scenario_id: null`) is supported.
    #[error("non-null scenario_id is not supported at M0")]
    ScenarioUnsupported,

    /// Two records share `(partition_id, op_id)` with different canonical
    /// content — an identity collision / corruption.
    #[error("identity collision for op {op_id}: same id, different canonical content")]
    IdentityCollision {
        /// The colliding operation id.
        op_id: String,
    },

    /// Canonical data is damaged (a sealed segment failed its checksum, a blob
    /// failed its hash, or framing is broken in a sealed segment).
    #[error("canonical corruption: {0}")]
    Corruption(String),

    /// A write is structurally well-formed but invalid against the metamodel
    /// (unknown type, missing required attribute, out-of-range enum, illegal
    /// relationship endpoint, …). Rejected at the boundary before any operation
    /// is appended — it never enters the op log (`VALIDATION_FAILED`, M1 /
    /// [ADR-0016]). The message is user-facing and carries no path or PII.
    #[error("{message}")]
    Validation {
        /// The user-facing reason the write was refused.
        message: String,
    },
}

/// Convenience alias for fallible storage operations.
pub type Result<T> = std::result::Result<T, StoreError>;
