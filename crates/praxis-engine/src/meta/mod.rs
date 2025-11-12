//! Meta-model definition, loading, and validation.

mod config;
mod loader;
mod model;
mod registry;
mod validation;

pub use config::{MetaModelConfig, MetaModelSource};
pub use registry::MetaModelRegistry;
