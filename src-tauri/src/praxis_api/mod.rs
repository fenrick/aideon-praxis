//! Praxis API-facing DTOs and Tauri command handlers bridging React IPC calls.

use aideon_praxis::GraphSnapshot;
use aideon_praxis::temporal::{EdgeVersion, NodeVersion};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use specta::Type;
use time::{OffsetDateTime, format_description::well_known::Rfc3339};

include!("commands.rs");
include!("view_types.rs");
include!("view_models.rs");
include!("operations.rs");
include!("scenarios.rs");
include!("utils.rs");

#[cfg(test)]
#[path = "../../tests/internal/praxis_api_tests.rs"]
mod tests;
