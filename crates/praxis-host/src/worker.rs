//! Worker lifecycle glue for hosting the Chrona temporal engine inside Tauri.
//!
//! The host keeps the engine behind a managed state container so renderer IPC
//! handlers can access it without leaking internal mutability.

use log::{debug, info};
use praxis_facade::chrona::TemporalEngine;
use praxis_facade::mneme::{WorkerHealth, datastore::create_datastore};
use praxis_facade::praxis::PraxisEngine;
use std::fs;
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
    let storage_root = app
        .path()
        .app_data_dir()
        .map_err(|err| err.to_string())?
        .join("AideonPraxis")
        .join(".praxis");
    fs::create_dir_all(&storage_root)
        .map_err(|err| format!("failed to prepare storage dir: {err}"))?;
    let db_path = create_datastore(&storage_root, None)
        .map_err(|err| format!("datastore init failed: {err}"))?;
    let engine = PraxisEngine::with_sqlite(&db_path)
        .map_err(|err| format!("temporal engine init failed: {err}"))?;
    let temporal = TemporalEngine::from_engine(engine);
    app.manage(WorkerState::new(temporal));
    info!("host: temporal engine registered with application state");
    Ok(())
}
