//! Core data schemas and shared DTOs used across the host, renderer, and
//! computational crates. Keep these focused on API contracts that must remain
//! stable regardless of where the work executes (local or remote).

pub mod temporal;

pub use temporal::{StateAtArgs, StateAtResult};

/// Canvas/scene DTOs used by the renderer to draw a default scene.
pub mod canvas;
