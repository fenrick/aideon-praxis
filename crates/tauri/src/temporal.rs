//! Host-side temporal commands bridging renderer IPC calls to the worker engine.
//!
//! These commands remain thin so that all business logic stays within the worker
//! crate, reinforcing the boundary guidance spelled out in `AGENTS.md`.

use core_data::temporal::{StateAtArgs, StateAtResult};
use log::{debug, error, info};
use std::panic::AssertUnwindSafe;
use std::time::Instant;
use tauri::State;

use crate::worker::WorkerState;

#[tauri::command]
/// Handle a renderer request for `Temporal.StateAt`, delegating to the worker engine.
///
/// The handler logs the request for traceability and forwards the typed DTOs
/// untouched so the transport format stays stable regardless of runtime.
pub async fn temporal_state_at(
    state: State<'_, WorkerState>,
    as_of: String,
    scenario: Option<String>,
    confidence: Option<f64>,
) -> Result<StateAtResult, String> {
    info!("host: temporal_state_at received");
    debug!(
        "host: temporal_state_at params as_of={} scenario={:?} confidence={:?}",
        as_of, scenario, confidence
    );
    let worker_state = state.inner();

    let args = StateAtArgs::new(as_of, scenario, confidence);
    let args_clone = args.clone();
    let started = Instant::now();
    let engine = worker_state.engine();
    let output = match std::panic::catch_unwind(AssertUnwindSafe(|| engine.state_at(args))) {
        Ok(result) => result,
        Err(panic) => {
            error!("host: temporal_state_at panic: {:?}", panic);
            return Err("worker panic during state_at".into());
        }
    };
    let elapsed = started.elapsed();
    info!(
        "host: temporal_state_at ok nodes={} edges={} elapsed_ms={}",
        output.nodes,
        output.edges,
        elapsed.as_millis()
    );
    debug!(
        "host: temporal_state_at completed as_of={} scenario={:?} confidence={:?}",
        args_clone.as_of, args_clone.scenario, args_clone.confidence
    );
    Ok(output)
}
