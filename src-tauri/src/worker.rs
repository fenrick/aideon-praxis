//! Worker lifecycle glue for hosting the Chrona temporal engine inside Tauri.
//!
//! The host keeps the engine behind a managed state container so renderer IPC
//! handlers can access it without leaking internal mutability.

use aideon_chrona::TemporalEngine;
use aideon_praxis::praxis::PraxisEngine;
use log::{debug, info};
use serde::Serialize;
use specta::Type;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, Wry};

use crate::setup::{SetupSeedSummary, emit_setup_progress, emit_setup_seed_summary};

/// A lightweight host-owned worker health snapshot for IPC exposure.
///
/// This was previously sourced from the (now-removed) Mneme prototype; it is a
/// host-local type until the M0 storage rebuild provides a real health surface.
#[derive(Debug, Clone, Serialize, Type)]
pub struct WorkerHealth {
    pub ok: bool,
    pub timestamp_ms: u64,
}

impl WorkerHealth {
    /// A healthy snapshot at the given wall-clock millisecond timestamp.
    pub fn healthy(timestamp_ms: u64) -> Self {
        Self {
            ok: true,
            timestamp_ms,
        }
    }
}

/// Shared application state giving command handlers access to the temporal engine.
///
/// Partition change-feed subscriptions lived here to serve the (now-removed)
/// Mneme prototype's subscribe/unsubscribe commands; that plumbing returns with
/// the change-feed surface at the M0 storage rebuild.
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
    emit_setup_progress(app, "migrating");
    let storage_root = app
        .path()
        .app_data_dir()
        .map_err(|err| err.to_string())?
        .join("AideonPraxis")
        .join(".praxis");
    fs::create_dir_all(&storage_root)
        .map_err(|err| format!("failed to prepare storage dir: {err}"))?;
    let db_path = storage_root.join("praxis.sqlite");
    let engine = PraxisEngine::with_sqlite(&db_path)
        .await
        .map_err(|err| format!("temporal engine init failed: {err}"))?;
    let seed_metadata = engine.seed_metadata().await;
    let temporal = TemporalEngine::from_engine(engine);
    app.manage(WorkerState::new(temporal));
    info!("host: temporal engine registered with application state");
    if let Some(metadata) = seed_metadata {
        let summary = SetupSeedSummary {
            dataset_version: metadata.dataset_version,
            metamodel_version: metadata.metamodel_version,
        };
        emit_setup_seed_summary(app, &summary);
    }
    Ok(())
}

#[cfg(test)]
#[path = "../tests/internal/worker_tests.rs"]
mod tests;
