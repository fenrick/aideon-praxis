//! Praxis API-facing DTOs and Tauri command handlers bridging React IPC calls.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use time::{OffsetDateTime, format_description::well_known::Rfc3339};

use crate::ipc::{HostError, IpcRequest, IpcResponse};

include!("commands.rs");
include!("view_types.rs");
include!("view_models.rs");
include!("operations.rs");
include!("scenarios.rs");
include!("utils.rs");

#[cfg(test)]
#[path = "../../tests/internal/praxis_api_tests.rs"]
mod tests;
