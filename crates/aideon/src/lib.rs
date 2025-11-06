//! Aideon Rust workspace façade crate.
//!
//! This crate aggregates the public APIs of the internal domain crates under
//! a stable namespace so downstream consumers can depend on a single package
//! and import modules like `aideon::praxis::PraxisEngine`.

/// Re-export the Praxis domain crate under the `aideon::praxis` module.
pub mod praxis {
    pub use aideon_praxis::*;
}

/// Re-export the Chrona temporal engine crate.
pub mod chrona {
    pub use aideon_chrona::*;
}

/// Re-export the Metis analytics crate.
pub mod metis {
    pub use aideon_metis::*;
}

/// Re-export the Continuum orchestration crate.
pub mod continuum {
    pub use aideon_continuum::*;
}

/// Re-export the Core Data DTOs crate.
pub mod core_data {
    pub use aideon_core_data::*;
}
