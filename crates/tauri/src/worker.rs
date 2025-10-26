use chrona::TemporalEngine;
use tauri::{AppHandle, Manager, Wry};

pub struct WorkerState {
    engine: TemporalEngine,
}

impl WorkerState {
    pub fn new(engine: TemporalEngine) -> Self {
        Self { engine }
    }

    pub fn engine(&self) -> &TemporalEngine {
        &self.engine
    }
}

pub async fn init_temporal(app: &AppHandle<Wry>) -> Result<(), String> {
    let engine = TemporalEngine::new();
    app.manage(WorkerState::new(engine));
    Ok(())
}
