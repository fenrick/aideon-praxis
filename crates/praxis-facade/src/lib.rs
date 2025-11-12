//! Praxis façade crate aggregating the domain crates under a stable namespace.
//!
//! Downstream consumers can depend on a single package and import modules like
//! `praxis_facade::praxis::PraxisEngine`.

/// Re-export the Praxis domain crate under `praxis_facade::praxis`.
pub mod praxis {
    pub use praxis_engine::*;
}

/// Re-export the Chrona temporal engine crate.
pub mod chrona {
    pub use chrona_visualization::*;
}

/// Re-export the Metis analytics crate.
pub mod metis {
    pub use metis_analytics::*;
}

/// Re-export the Continuum orchestration crate.
pub mod continuum {
    pub use continuum_orchestrator::*;
}

/// Re-export Mneme (persistence + DTOs).
pub mod mneme {
    pub use mneme_core::*;
}
