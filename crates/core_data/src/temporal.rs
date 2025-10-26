//! Shared temporal DTOs for the `Temporal.StateAt` flow.
//!
//! These structs intentionally mirror the public contract exposed to the
//! renderer. By keeping the serialization format stable (camelCase), the UI
//! can switch between local and remote execution without churn.

use serde::{Deserialize, Serialize};

/// Arguments provided by the renderer/host when requesting a time-slice.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StateAtArgs {
    pub as_of: String,
    pub scenario: Option<String>,
    pub confidence: Option<f64>,
}

impl StateAtArgs {
    /// Convenience constructor used by command handlers.
    pub fn new(as_of: String, scenario: Option<String>, confidence: Option<f64>) -> Self {
        Self {
            as_of,
            scenario,
            confidence,
        }
    }
}

/// Result payload returned to the renderer when fulfilling a `state_at` request.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StateAtResult {
    pub as_of: String,
    pub scenario: Option<String>,
    pub confidence: Option<f64>,
    pub nodes: u64,
    pub edges: u64,
}

impl StateAtResult {
    /// Construct a new result with explicit graph counts.
    pub fn new(
        as_of: String,
        scenario: Option<String>,
        confidence: Option<f64>,
        nodes: u64,
        edges: u64,
    ) -> Self {
        Self {
            as_of,
            scenario,
            confidence,
            nodes,
            edges,
        }
    }

    /// Convenience helper for producing an empty graph at the requested time.
    pub fn empty(as_of: String, scenario: Option<String>, confidence: Option<f64>) -> Self {
        Self::new(as_of, scenario, confidence, 0, 0)
    }
}

#[cfg(test)]
mod tests {
    use super::{StateAtArgs, StateAtResult};

    #[test]
    fn args_roundtrip_keeps_camel_case() {
        let args = StateAtArgs::new("2025-01-01".into(), None, Some(0.5));
        let json = serde_json::to_string(&args).expect("serialize");
        assert!(
            json.contains("\"asOf\":\"2025-01-01\""),
            "asOf must remain camelCase"
        );
        let back: StateAtArgs = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.as_of, args.as_of);
        assert_eq!(back.confidence, args.confidence);
    }

    #[test]
    fn result_roundtrip_keeps_counts() {
        let result = StateAtResult::new("2025-01-01".into(), None, None, 7, 11);
        let json = serde_json::to_string(&result).expect("serialize");
        assert!(json.contains("\"nodes\":7"));
        assert!(json.contains("\"edges\":11"));
        let back: StateAtResult = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.nodes, 7);
        assert_eq!(back.edges, 11);
    }
}
