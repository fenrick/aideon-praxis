//! Aideon Tauri host entrypoint and IPC commands.

mod app;
mod bindings;
mod commands;
mod contracts;
mod health;
mod ipc;
mod logging;
mod menu;
mod metrics;
mod praxis_api;
mod scene;
mod session_marker;
mod setup;
mod shell_commands;
mod telemetry;
mod temporal;
mod windows;
mod worker;
mod workspace;
mod workspace_lifecycle;

pub use aideon_praxis::praxis::temporal::{DiffArgs, DiffSummary, StateAtArgs, StateAtResult};
pub use ipc::{HostError, IpcRequest, IpcResponse};
pub use worker::WorkerHealth;

pub fn run() {
    app::run();
}

#[cfg(test)]
#[path = "../tests/internal/tauri_e2e_smoke.rs"]
mod tauri_e2e_smoke_tests;
