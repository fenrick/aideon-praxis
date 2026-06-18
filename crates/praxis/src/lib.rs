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

/// Re-export the Metis analytics crate.
pub mod metis {
    pub use aideon_metis::*;
}

/// Re-export the Continuum orchestration crate.
pub mod continuum {
    pub use aideon_continuum::*;
}

// The Mneme persistence crate was the inside-out prototype and has been removed
// (rebuilt to the M0 spec under #292); the `praxis::mneme` re-export is gone with
// it. Storage types return via the new MnemeStore trait when M0 lands.
