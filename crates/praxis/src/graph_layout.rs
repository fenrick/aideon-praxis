//! Graph layout DTOs used for persisting renderer geometry.

use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GraphLayoutNode {
    pub id: String,
    pub x: f64,
    pub y: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GraphLayoutSaveRequest {
    pub doc_id: String,
    pub widget_id: String,
    pub as_of: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scenario: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub layer: Option<String>,
    #[serde(default)]
    pub nodes: Vec<GraphLayoutNode>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GraphLayoutGetRequest {
    pub doc_id: String,
    pub widget_id: String,
    pub as_of: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scenario: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub layer: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn graph_layout_serializes_camel_case() {
        let payload = GraphLayoutSaveRequest {
            doc_id: "doc-1".into(),
            widget_id: "widget-1".into(),
            as_of: "2025-01-01".into(),
            scenario: Some("main".into()),
            layer: Some("plan".into()),
            nodes: vec![GraphLayoutNode {
                id: "n1".into(),
                x: 10.0,
                y: 20.0,
            }],
        };
        let value = serde_json::to_value(&payload).expect("serialize");
        assert_eq!(
            value,
            json!({
                "docId": "doc-1",
                "widgetId": "widget-1",
                "asOf": "2025-01-01",
                "scenario": "main",
                "layer": "plan",
                "nodes": [{ "id": "n1", "x": 10.0, "y": 20.0 }]
            })
        );
    }
}
