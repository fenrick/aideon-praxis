//! Praxis façade crate aggregating the domain crates under a stable namespace.
//!
//! Downstream consumers can depend on a single package and import modules like
//! `aideon_praxis_facade::praxis::PraxisEngine`.

/// Re-export the Praxis domain crate under `aideon_praxis_facade::praxis`.
pub mod praxis {
    pub use aideon_engine::*;
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

/// Re-export Mneme (persistence + DTOs).
pub mod mneme {
    pub use aideon_mneme::*;
}
