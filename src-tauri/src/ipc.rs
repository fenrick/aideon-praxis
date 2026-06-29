//! Shared IPC error types for the Tauri host.
//!
//! M0 contract discipline requires a stable, machine-readable error envelope
//! across all commands (see `docs/ROADMAP.md` and `docs/CONTRACTS-AND-SCHEMAS.md`).

use serde::Deserialize;
use serde::Serialize;
use serde_json::{Value, json};
use specta::Type;
use std::fmt;

/// Stable error envelope returned by host commands.
///
/// - `code` is a stable, machine-readable identifier (snake_case).
/// - `message` is user-facing and may change between releases.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct HostError {
    pub code: &'static str,
    pub message: String,
}

impl fmt::Display for HostError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} ({})", self.message, self.code)
    }
}

impl std::error::Error for HostError {}

impl HostError {
    pub fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }

    pub fn invalid_input(message: impl Into<String>) -> Self {
        Self::new("INVALID_INPUT", message)
    }

    pub fn invalid_time(message: impl Into<String>) -> Self {
        Self::new("INVALID_TIME", message)
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self::new("INTERNAL_ERROR", message)
    }
}

/// RFC-9457 problem category ([error-envelope]): the renderer reacts to the
/// category generically rather than hard-coding per-code knowledge ([ADR-0016]).
#[derive(Debug, Clone, Copy, Serialize, Type)]
#[serde(rename_all = "snake_case")]
pub enum ProblemCategory {
    Validation,
    Permission,
    Conflict,
    Transient,
    Internal,
}

/// RFC-9457 machine-readable recovery hint.
#[derive(Debug, Clone, Copy, Serialize, Type)]
#[serde(rename_all = "snake_case")]
pub enum ProblemRecovery {
    Retry,
    Reconcile,
    Refresh,
    None,
    Report,
}

/// The one error catalogue ([ADR-0016]): map a stable code to its category,
/// recovery hint, and a short human-safe title. Unknown codes fall back to
/// internal/report so a new code is never silently treated as user-actionable.
fn classify(code: &str) -> (ProblemCategory, ProblemRecovery, &'static str) {
    use ProblemCategory::{Conflict, Internal, Permission, Transient, Validation};
    use ProblemRecovery::{None, Reconcile, Refresh, Report, Retry};
    match code {
        "INVALID_INPUT" => (Validation, None, "Invalid input"),
        "INVALID_TIME" => (Validation, None, "Invalid time"),
        "VALIDATION_FAILED" => (Validation, None, "Validation failed"),
        "SCENARIO_UNSUPPORTED" => (Validation, None, "Scenario not supported"),
        "FOREIGN_PARTITION" => (Validation, None, "Operation belongs to another partition"),
        "WORKSPACE_NOT_OPEN" => (Validation, None, "No workspace is open"),
        "UNKNOWN_BRANCH" => (Validation, None, "Unknown branch"),
        "UNKNOWN_COMMIT" => (Validation, None, "Unknown commit"),
        "WORKSPACE_NOT_FOUND" => (Permission, None, "Workspace not found"),
        "WORKSPACE_LOCKED" => (Conflict, Refresh, "Workspace is locked"),
        "IDENTITY_COLLISION" => (Conflict, Reconcile, "Identity collision"),
        "INTEGRITY_VIOLATION" => (Conflict, Reconcile, "Integrity violation"),
        "MERGE_CONFLICT" => (Conflict, Reconcile, "Merge conflict"),
        "CONCURRENCY_CONFLICT" => (Conflict, Retry, "Concurrent modification"),
        "INVALID_TRACE_CONTEXT" => (Validation, None, "Invalid trace context"),
        "BACKPRESSURE" => (Transient, Retry, "Work queue is saturated"),
        "SCHEMA_TOO_NEW" => (Internal, Report, "Schema is too new"),
        "WORKSPACE_FORMAT_TOO_NEW" => (Internal, Report, "Workspace format is too new"),
        "UNSUPPORTED_FEATURE" => (Internal, Report, "Unsupported workspace feature"),
        "WORKSPACE_CORRUPT" => (Internal, Report, "Workspace is corrupt"),
        "TEMPORAL_INIT_FAILED" => (Internal, Report, "Temporal engine failed to initialise"),
        _ => (Internal, Report, "Internal error"),
    }
}

/// Canonical IPC request envelope.
///
/// Matches the host design doc contract:
/// `{ requestId: "uuid", traceparent?: string, payload: { ... } }`.
///
/// `traceparent` is W3C Trace Context transport metadata (ADR-0019). It is
/// optional: absent means no span context; present but invalid returns
/// `INVALID_TRACE_CONTEXT` without echoing the raw value.
#[derive(Debug, Clone, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IpcRequest<T> {
    pub request_id: String,
    #[serde(default)]
    pub traceparent: Option<String>,
    pub payload: T,
}

impl<T> IpcRequest<T> {
    /// Construct a request with no trace context — used in tests and
    /// internal callers that don't need W3C span propagation.
    pub fn new(request_id: impl Into<String>, payload: T) -> Self {
        Self {
            request_id: request_id.into(),
            traceparent: None,
            payload,
        }
    }

    /// Validate the `traceparent` field if present.
    ///
    /// Returns `Ok(())` when absent or when it matches the W3C format.
    /// Returns `Err(HostError)` with code `INVALID_TRACE_CONTEXT` when
    /// present but malformed. The raw invalid value is not included in the
    /// error message (ADR-0019).
    pub fn validate_traceparent(&self) -> Result<(), HostError> {
        let Some(tp) = &self.traceparent else {
            return Ok(());
        };
        // Simple manual match — avoids a regex crate dependency.
        if is_valid_traceparent(tp) {
            Ok(())
        } else {
            Err(HostError::new(
                "INVALID_TRACE_CONTEXT",
                "traceparent must be a valid W3C Trace Context value",
            ))
        }
    }
}

/// Validates a W3C Trace Context `traceparent` header value without
/// a regex dependency: `00-<32 lowercase hex>-<16 lowercase hex>-<2 lowercase hex>`.
fn is_valid_traceparent(value: &str) -> bool {
    // Expected: "00-" + 32 hex + "-" + 16 hex + "-" + 2 hex = 55 chars
    let bytes = value.as_bytes();
    if bytes.len() != 55 {
        return false;
    }
    let is_hex = |b: u8| b.is_ascii_digit() || (b'a'..=b'f').contains(&b);
    bytes[0] == b'0'
        && bytes[1] == b'0'
        && bytes[2] == b'-'
        && bytes[3..35].iter().all(|&b| is_hex(b))
        && bytes[35] == b'-'
        && bytes[36..52].iter().all(|&b| is_hex(b))
        && bytes[52] == b'-'
        && bytes[53..55].iter().all(|&b| is_hex(b))
}

/// Payload used when a command requires a payload object but has no inputs.
#[derive(Debug, Clone, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct EmptyPayload {}

/// Canonical IPC response envelope.
///
/// Matches the host design doc contract:
/// `{ requestId, status, result?, error? }`.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IpcResponse<T> {
    pub request_id: String,
    pub status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<IpcError>,
}

/// The RFC-9457 Problem Detail carried over IPC ([error-envelope], [ADR-0016]).
/// `HostError` maps to this at the boundary, gaining the category, recovery
/// hint, and correlation id that let the renderer react generically.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IpcError {
    /// Stable, non-dereferenceable problem URI (`aideon:problem/<kebab-code>`).
    #[serde(rename = "type")]
    pub type_uri: String,
    pub code: String,
    pub title: String,
    pub detail: String,
    pub category: ProblemCategory,
    pub recovery: ProblemRecovery,
    pub correlation_id: String,
    pub details: Value,
}

impl IpcError {
    /// Map a host error to the wire Problem Detail, joining it to its command's
    /// correlation id and classifying it from the catalogue.
    fn from_host(error: HostError, correlation_id: String) -> Self {
        let (category, recovery, title) = classify(error.code);
        Self {
            type_uri: format!(
                "aideon:problem/{}",
                error.code.to_ascii_lowercase().replace('_', "-")
            ),
            code: error.code.to_string(),
            title: title.to_string(),
            detail: error.message,
            category,
            recovery,
            correlation_id,
            details: json!({}),
        }
    }
}

impl<T> IpcResponse<T> {
    pub fn ok(request_id: impl Into<String>, result: T) -> Self {
        Self {
            request_id: request_id.into(),
            status: "ok",
            result: Some(result),
            error: None,
        }
    }

    pub fn err(request_id: impl Into<String>, error: HostError) -> Self {
        let request_id = request_id.into();
        Self {
            request_id: request_id.clone(),
            status: "error",
            result: None,
            // The request id is the command's correlation id; the error carries
            // it too so the renderer error joins to the host log and trace.
            error: Some(IpcError::from_host(error, request_id)),
        }
    }
}

/// Recognise an engine error meaning "the derived snapshot does not exist yet"
/// — absence, not failure. Callers (scene, workspace) treat it as an empty
/// result. One predicate so detection lives in a single place rather than being
/// re-implemented per command module.
pub(crate) fn is_missing_snapshot_error(message: &str) -> bool {
    message.contains("os error 2") || message.contains("No such file")
}

#[cfg(test)]
#[path = "../tests/internal/ipc_tests.rs"]
mod tests;
