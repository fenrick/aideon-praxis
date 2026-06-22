//! Praxis core graph model library.
//!
//! This crate provides the commit-centric temporal model described in
//! `ARCHITECTURE-BOUNDARY.md` and exposes a cohesive API surface that
//! orchestrates Praxis Engine with Chrona/Metis/Continuum/Mneme.

pub mod canvas;
mod dataset;
pub mod engine;
mod error;
mod graph;
pub mod graph_layout;
pub mod meta;
mod meta_seed;
pub mod store;
pub mod temporal;

pub use dataset::{BaselineDataset, DatasetCommit};
pub use engine::{PraxisEngine, PraxisEngineConfig, SeedMetadata};
pub use error::{PraxisError, PraxisErrorCode, PraxisResult};
pub use graph::{GraphSnapshot, SnapshotStats};
pub use meta::{MetaModelConfig, MetaModelRegistry};
pub use store::{MemoryStore, SqliteDb, Store};
pub use temporal::*;

/// Re-export the Praxis engine domain crate (this crate) under `praxis`.
pub mod praxis {
    pub use crate::*;
}

// No lateral engine re-exports. Praxis must not depend on Metis or Continuum
// (MODULE-DEPENDENCY-MAP.md: "No lateral engine dependency; composition routes
// through the host"; enforced by `aideon_xtask check-crate-boundaries`).
// Consumers import `aideon_metis` / `aideon_continuum` directly. The Mneme
// persistence crate (inside-out prototype) was removed under #292; storage
// types return via the MnemeStore trait when M0 lands.
