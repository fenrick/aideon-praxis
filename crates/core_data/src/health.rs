//! Shared health check DTOs surfaced via host/worker IPC.
//!
//! The structures here stay intentionally small so they can travel across
//! transports with minimal coupling. Additional diagnostics can layer on
//! later without breaking the stable fields exposed today.

use serde::{Deserialize, Serialize};

/// Basic worker health response exposed to the renderer.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerHealth {
    /// Indicates whether the worker is healthy enough to serve requests.
    pub ok: bool,
    /// Optional human-readable details when degraded.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    /// Millisecond timestamp (Unix epoch) when the health snapshot was captured.
    pub timestamp_ms: u64,
}

impl WorkerHealth {
    /// Construct a healthy health response.
    pub fn healthy(timestamp_ms: u64) -> Self {
        Self {
            ok: true,
            message: None,
            timestamp_ms,
        }
    }

    /// Construct a degraded health response with a descriptive message.
    pub fn degraded(timestamp_ms: u64, message: impl Into<String>) -> Self {
        Self {
            ok: false,
            message: Some(message.into()),
            timestamp_ms,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::WorkerHealth;

    #[test]
    fn healthy_serializes_without_message() {
        let health = WorkerHealth::healthy(42);
        let json = serde_json::to_string(&health).expect("serialize");
        assert!(json.contains("\"ok\":true"));
        assert!(!json.contains("message"));
    }

    #[test]
    fn degraded_serializes_message() {
        let health = WorkerHealth::degraded(99, "offline");
        let json = serde_json::to_string(&health).expect("serialize");
        assert!(json.contains("\"message\":\"offline\""));
        let back: WorkerHealth = serde_json::from_str(&json).expect("roundtrip");
        assert!(!back.ok);
        assert_eq!(back.timestamp_ms, 99);
    }
}
