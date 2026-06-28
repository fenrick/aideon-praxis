//! The minimal in-process accepted-work core (M0, defect D1). Long foundation
//! work — at M0, only workspace rebuild — runs off the IPC call: the command
//! returns an [`AcceptedJob`] acknowledgement immediately, the work runs on a
//! spawned task, and readiness travels by typed event. Readiness is
//! **proof-carrying** ([ADR-0040]): the `workspace.ready_read_write` event
//! carries the `foundation_rebuild_hash` it became ready against, so a stub
//! cannot fake readiness without running the real rebuild.
//!
//! This is **not** Continuum ([M4]): no durable run-ledger across restart, no
//! retries/scheduling, no queue classes beyond rebuild. It is the smallest
//! subset that makes M0 rebuild accepted-work and readiness honest.
//!
//! [ADR-0040]: ../../docs/06-adrs/ADR-0040-m0-host-validation-gate-and-proof-carrying-readiness.md

use serde::Serialize;
use specta::Type;
use tauri_specta::Event;

/// Event channel names ([accepted-work event-model], [workspace-lifecycle]).
/// Tauri event names forbid `.`; the wire channel uses the `:` convention (as
/// `run:progress` does) while the contract refers to them by their dotted names.
pub const EVENT_LIFECYCLE_CHANGED: &str = "workspace:lifecycle_changed";
pub const EVENT_READY_READ_WRITE: &str = "workspace:ready_read_write";

/// The class of long-running work. M0 runs only `Rebuild`; the other Continuum
/// classes are deferred to M4 (variants are additive).
#[derive(Debug, Clone, Copy, Serialize, Type, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum WorkQueueClass {
    Rebuild,
}

/// The acknowledgement a long-running command returns immediately
/// ([accepted-job-shape]). Acceptance is receipt, not durability.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AcceptedJob {
    pub run_id: String,
    pub queue_class: WorkQueueClass,
    pub idempotency_key: String,
    pub ledger_ref: String,
    pub accepted_at: String,
}

impl AcceptedJob {
    /// Build a rebuild acknowledgement bound to its correlation id.
    pub fn rebuild(run_id: String, idempotency_key: String, accepted_at: String) -> Self {
        let ledger_ref = format!("ops/runs/{run_id}/run.json");
        Self {
            run_id,
            queue_class: WorkQueueClass::Rebuild,
            idempotency_key,
            ledger_ref,
            accepted_at,
        }
    }
}

/// The M0 flat lifecycle state ([workspace-lifecycle]): write capability is
/// enabled only in `ready_read_write`. M0 deliberately does not name semantic
/// axes (effective schema, temporal) it cannot prove; those arrive as additive
/// sibling fields at M1/M2. M0 emits the states the rebuild path produces; the
/// `opening`/`closed` transitions on create/open/close are a follow-up (#291).
#[derive(Debug, Clone, Copy, Serialize, Type, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum LifecycleState {
    Rebuilding,
    ReadyReadWrite,
    RecoveryReadOnly,
}

/// `workspace.lifecycle.changed` payload — the state-transition announcement.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceLifecycleEvent {
    pub workspace_id: String,
    pub state: LifecycleState,
    pub job_id: Option<String>,
    pub error_code: Option<String>,
    pub correlation_id: String,
}

/// `workspace.ready_read_write` payload — proof-carrying readiness ([ADR-0040]):
/// an integrity claim with the foundation hash attached, not a status message.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceReadinessEvent {
    pub workspace_id: String,
    pub job_id: String,
    pub readiness: String,
    pub foundation_rebuild_hash: String,
    pub runtime_generation: String,
    pub correlation_id: String,
}

// Manual `Event` impls keep the wire channel names in sync with the
// `EVENT_*` constants rather than the struct-name kebab-case that the derive
// macro would generate. The channel names use `:` (Tauri forbids `.`).
impl Event for WorkspaceLifecycleEvent {
    const NAME: &'static str = EVENT_LIFECYCLE_CHANGED;
}

impl Event for WorkspaceReadinessEvent {
    const NAME: &'static str = EVENT_READY_READ_WRITE;
}

impl WorkspaceReadinessEvent {
    pub fn read_write(
        workspace_id: String,
        job_id: String,
        foundation_rebuild_hash: String,
        runtime_generation: String,
        correlation_id: String,
    ) -> Self {
        Self {
            workspace_id,
            job_id,
            readiness: "read_write".to_string(),
            foundation_rebuild_hash,
            runtime_generation,
            correlation_id,
        }
    }
}

#[cfg(test)]
#[path = "../tests/internal/jobs_tests.rs"]
mod tests;
