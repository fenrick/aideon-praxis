//! Aideon Tauri host entrypoint and IPC commands.

mod app;
mod commands;
mod contracts;
mod health;
mod ipc;
mod menu;
mod mneme;
mod praxis_api;
mod scene;
mod setup;
mod shell_commands;
mod temporal;
mod windows;
mod worker;
mod workspace;

pub use aideon_praxis::mneme::WorkerHealth;
pub use aideon_praxis::praxis::temporal::{DiffArgs, DiffSummary, StateAtArgs, StateAtResult};
pub use ipc::{HostError, IpcRequest, IpcResponse};

pub fn run() {
    app::run();
}

#[cfg(test)]
#[path = "../tests/internal/tauri_e2e_smoke.rs"]
mod tauri_e2e_smoke_tests;
