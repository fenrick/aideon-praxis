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

/// Richer node used for saving canvas layout and z-order/grouping.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasNode {
    pub id: String,
    pub type_id: String,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    #[serde(default)]
    pub z: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub z: Option<i32>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasGroup {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub z: Option<i32>,
}

/// Save payload sent from the renderer to persist a layout snapshot for a document
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasLayoutSaveRequest {
    pub doc_id: String,
    pub as_of: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scenario: Option<String>,
    #[serde(default)]
    pub nodes: Vec<CanvasNode>,
    #[serde(default)]
    pub edges: Vec<CanvasEdge>,
    #[serde(default)]
    pub groups: Vec<CanvasGroup>,
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
