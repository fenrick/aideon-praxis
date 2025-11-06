//! Worker lifecycle glue for hosting the Chrona temporal engine inside Tauri.
//!
//! The host keeps the engine behind a managed state container so renderer IPC
//! handlers can access it without leaking internal mutability.

use aideon::chrona::TemporalEngine;
use aideon::core_data::WorkerHealth;
use log::{debug, info};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, Wry};

/// Shared application state giving command handlers access to the temporal engine.
pub struct WorkerState {
    engine: TemporalEngine,
}

impl WorkerState {
    /// Create a new worker state wrapper around the provided engine instance.
    pub fn new(engine: TemporalEngine) -> Self {
        debug!("host: WorkerState constructed");
        Self { engine }
    }

    /// Borrow the underlying temporal engine for read-only operations.
    pub fn engine(&self) -> &TemporalEngine {
        &self.engine
    }

    /// Produce a lightweight health snapshot for IPC exposure.
    pub fn health(&self) -> WorkerHealth {
        let timestamp_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        WorkerHealth::healthy(timestamp_ms)
    }
}

/// Lazily initialize the temporal engine and store it in Tauri managed state.
pub async fn init_temporal(app: &AppHandle<Wry>) -> Result<(), String> {
    let engine = TemporalEngine::new();
    app.manage(WorkerState::new(engine));
    info!("host: temporal engine registered with application state");
    Ok(())
}
