//! Shared test utilities for the `aideon_desktop` crate.
//!
//! Centralises the process-global lock that serialises every test that mutates
//! `AIDEON_TEST_DATA_DIR`.  `scene_tests` and `workspace_tests` both set the
//! same process-wide env var, so they must share one lock — two per-file statics
//! do not serialise against each other.
use std::sync::OnceLock;
use tokio::sync::Mutex;

static ENV_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

/// Returns the process-global mutex that guards `AIDEON_TEST_DATA_DIR` mutations.
///
/// Call `crate::test_support::env_lock()` from every test that sets or removes
/// this env var and hold the guard for the duration of the test.
pub(crate) fn env_lock() -> &'static Mutex<()> {
    ENV_LOCK.get_or_init(|| Mutex::new(()))
}
