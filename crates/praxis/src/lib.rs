//! Praxis core graph model library.
//!
//! This crate provides an in-memory implementation of the commit-centric
//! temporal model described in `Architecture-Boundary.md`. The goal is to
//! keep the engine simple, deterministic, and well-documented so future
//! work (e.g., remote adapters, persistence) can reuse the same API surface.

pub mod canvas;
mod dataset;
mod engine;
mod error;
mod graph;
mod meta;
mod meta_seed;

pub use engine::{PraxisEngine, PraxisEngineConfig};
pub use error::{PraxisError, PraxisErrorCode, PraxisResult};
pub use graph::{GraphSnapshot, SnapshotStats};
pub use meta::{MetaModelConfig, MetaModelRegistry, MetaModelSource};
pub use dataset::{BaselineDataset, DatasetCommit};
