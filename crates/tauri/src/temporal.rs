use core_data::temporal::{StateAtArgs, StateAtResult};
use log::info;
use tauri::State;

use crate::worker::WorkerState;

#[tauri::command]
pub async fn temporal_state_at(
    state: State<'_, WorkerState>,
    as_of: String,
    scenario: Option<String>,
    confidence: Option<f64>,
) -> Result<StateAtResult, String> {
    info!(
        "host: temporal_state_at as_of={} scenario={:?}",
        as_of, scenario
    );
    let worker_state = state.inner();

    let args = StateAtArgs::new(as_of, scenario, confidence);
    let output = worker_state.engine().state_at(args);
    info!(
        "host: temporal_state_at ok nodes={} edges={}",
        output.nodes, output.edges
    );
    Ok(output)
}
