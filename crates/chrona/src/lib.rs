//! Chrona time engine crate.
//!
//! This crate hosts the `Temporal` execution ports that the Tauri host can
//! invoke directly. The initial implementation mirrors the previous Python
//! worker stub so the renderer contract remains unchanged while we grow the
//! Rust engine.

pub mod layout;
pub mod scene;
pub mod temporal;

pub use temporal::TemporalEngine;
