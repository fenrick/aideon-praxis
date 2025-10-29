//! Canvas DTOs used for renderer scene construction.
//! These are UI-agnostic shapes computed by the Rust engine.

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasShape {
    pub id: String,
    pub type_id: String,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::CanvasShape;

    #[test]
    fn serializes_camel_case() {
        let s = CanvasShape {
            id: "s1".into(),
            type_id: "rect".into(),
            x: 10.0,
            y: 20.0,
            w: 100.0,
            h: 50.0,
            label: Some("Node".into()),
        };
        let json = serde_json::to_string(&s).unwrap();
        assert!(json.contains("\"typeId\":"));
        assert!(json.contains("\"label\":"));
    }
}
