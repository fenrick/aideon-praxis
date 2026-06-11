//! Shared health check DTOs surfaced via host/worker IPC.

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerHealth {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    pub timestamp_ms: u64,
}

impl WorkerHealth {
    pub fn healthy(timestamp_ms: u64) -> Self {
        Self {
            ok: true,
            message: None,
            timestamp_ms,
        }
    }

    pub fn degraded(timestamp_ms: u64, message: impl Into<String>) -> Self {
        Self {
            ok: false,
            message: Some(message.into()),
            timestamp_ms,
        }
    }
}

#[cfg(test)]
#[path = "../tests/internal/health_tests.rs"]
mod tests;
