//! Temporal engine implementation.
//!
//! The goal is to provide a clean Rust implementation of the time APIs that
//! previously lived in the Python worker. Keeping the API surface identical
//! eases the migration toward a fully Rust-based host/worker story.

use core_data::temporal::{StateAtArgs, StateAtResult};
use log::{debug, trace};

/// Primary entry point for temporal queries.
#[derive(Clone, Debug, Default)]
pub struct TemporalEngine;

impl TemporalEngine {
    /// Construct a new temporal engine instance.
    pub fn new() -> Self {
        Self
    }

    /// Compute a time-sliced view of the graph. The initial implementation
    /// mirrors the Python stub to keep the renderer contract stable.
    pub fn state_at(&self, args: StateAtArgs) -> StateAtResult {
        let StateAtArgs {
            as_of,
            scenario,
            confidence,
        } = args;
        debug!(
            "chrona: state_at invoked as_of={} scenario={:?} confidence={:?}",
            as_of, scenario, confidence
        );
        trace!("chrona: returning empty graph placeholder");
        StateAtResult::empty(as_of, scenario, confidence)
    }
}

#[cfg(test)]
mod tests {
    use super::TemporalEngine;
    use core_data::temporal::StateAtArgs;

    #[test]
    fn state_at_returns_empty_graph_stub() {
        let engine = TemporalEngine::new();
        let args = StateAtArgs::new("2025-01-01".into(), None, None);
        let result = engine.state_at(args);
        assert_eq!(result.nodes, 0);
        assert_eq!(result.edges, 0);
        assert_eq!(result.as_of, "2025-01-01");
    }
}
