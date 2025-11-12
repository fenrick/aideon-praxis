//! Aideon Praxis Tauri host entrypoint and IPC commands.

mod app;
mod commands;
mod health;
mod menu;
mod scene;
mod setup;
mod temporal;
mod windows;
mod worker;

pub use praxis_facade::mneme::WorkerHealth;
pub use praxis_facade::mneme::temporal::{DiffArgs, DiffSummary, StateAtArgs, StateAtResult};

pub fn run() {
    app::run();
}
