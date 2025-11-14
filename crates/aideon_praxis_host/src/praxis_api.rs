//! Praxis API-facing DTOs and Tauri command handlers bridging React IPC calls.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use time::{OffsetDateTime, format_description::well_known::Rfc3339};

#[tauri::command]
pub async fn praxis_graph_view(definition: GraphViewDefinition) -> Result<GraphViewModel, String> {
    Ok(GraphViewModel::demo(definition))
}

#[tauri::command]
pub async fn praxis_catalogue_view(
    definition: CatalogueViewDefinition,
) -> Result<CatalogueViewModel, String> {
    Ok(CatalogueViewModel::demo(definition))
}

#[tauri::command]
pub async fn praxis_matrix_view(
    definition: MatrixViewDefinition,
) -> Result<MatrixViewModel, String> {
    Ok(MatrixViewModel::demo(definition))
}

#[tauri::command]
pub async fn praxis_chart_view(definition: ChartViewDefinition) -> Result<ChartViewModel, String> {
    Ok(ChartViewModel::demo(definition))
}

#[tauri::command]
pub async fn praxis_apply_operations(
    operations: Vec<PraxisOperation>,
) -> Result<OperationBatchResult, String> {
    if operations.is_empty() {
        return Ok(OperationBatchResult::rejected("no operations supplied"));
    }
    Ok(OperationBatchResult::accepted(next_commit_id()))
}

#[tauri::command]
pub async fn praxis_list_scenarios() -> Result<Vec<ScenarioSummary>, String> {
    Ok(ScenarioSummary::demo_list())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewFilters {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub node_types: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub edge_types: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub search: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphViewDefinition {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub as_of: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scenario: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filters: Option<ViewFilters>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<GraphViewScope>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphViewScope {
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub root_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogueViewDefinition {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub as_of: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scenario: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filters: Option<ViewFilters>,
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub columns: Vec<CatalogueColumn>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatrixViewDefinition {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub as_of: String,
    pub row_type: String,
    pub column_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scenario: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filters: Option<ViewFilters>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChartViewDefinition {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub as_of: String,
    pub chart_type: String,
    pub measure: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dimension: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scenario: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filters: Option<ViewFilters>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TwinNode {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub props: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TwinEdge {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub from: String,
    pub to: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub directed: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub props: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphNodeView {
    pub id: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub position: Option<Position>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub props: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphEdgeView {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub from: String,
    pub to: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub props: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewMetadata {
    pub id: String,
    pub name: String,
    pub as_of: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scenario: Option<String>,
    pub fetched_at: String,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewStats {
    pub nodes: usize,
    pub edges: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphViewModel {
    pub metadata: ViewMetadata,
    pub stats: ViewStats,
    pub nodes: Vec<GraphNodeView>,
    pub edges: Vec<GraphEdgeView>,
}

impl GraphViewModel {
    fn demo(definition: GraphViewDefinition) -> Self {
        let nodes = vec![
            GraphNodeView {
                id: "cap-customer-onboarding".into(),
                label: "Customer Onboarding".into(),
                r#type: Some("Capability".into()),
                position: Some(Position { x: 120.0, y: 200.0 }),
                props: None,
            },
            GraphNodeView {
                id: "cap-customer-support".into(),
                label: "Customer Support".into(),
                r#type: Some("Capability".into()),
                position: Some(Position { x: 420.0, y: 120.0 }),
                props: None,
            },
            GraphNodeView {
                id: "app-workflow".into(),
                label: "Workflow Engine".into(),
                r#type: Some("Application".into()),
                position: Some(Position { x: 420.0, y: 320.0 }),
                props: None,
            },
            GraphNodeView {
                id: "svc-auth".into(),
                label: "Identity Service".into(),
                r#type: Some("Service".into()),
                position: Some(Position { x: 680.0, y: 220.0 }),
                props: None,
            },
        ];
        let edges = vec![
            GraphEdgeView {
                id: Some("edge-1".into()),
                from: nodes[0].id.clone(),
                to: nodes[1].id.clone(),
                r#type: Some("supports".into()),
                label: Some("handoff".into()),
                props: None,
            },
            GraphEdgeView {
                id: Some("edge-2".into()),
                from: nodes[1].id.clone(),
                to: nodes[2].id.clone(),
                r#type: Some("depends_on".into()),
                label: Some("tickets".into()),
                props: None,
            },
            GraphEdgeView {
                id: Some("edge-3".into()),
                from: nodes[2].id.clone(),
                to: nodes[3].id.clone(),
                r#type: Some("depends_on".into()),
                label: Some("auth".into()),
                props: None,
            },
        ];
        Self {
            metadata: metadata_from(
                &definition.id,
                &definition.name,
                &definition.as_of,
                definition.scenario.clone(),
            ),
            stats: ViewStats {
                nodes: nodes.len(),
                edges: edges.len(),
            },
            nodes,
            edges,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogueColumn {
    pub id: String,
    pub label: String,
    pub r#type: CatalogueColumnType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CatalogueColumnType {
    String,
    Number,
    Boolean,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogueRow {
    pub id: String,
    pub values: Map<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogueViewModel {
    pub metadata: ViewMetadata,
    pub columns: Vec<CatalogueColumn>,
    pub rows: Vec<CatalogueRow>,
}

impl CatalogueViewModel {
    fn demo(definition: CatalogueViewDefinition) -> Self {
        let cols = if definition.columns.is_empty() {
            vec![
                CatalogueColumn {
                    id: "name".into(),
                    label: "Name".into(),
                    r#type: CatalogueColumnType::String,
                },
                CatalogueColumn {
                    id: "owner".into(),
                    label: "Owner".into(),
                    r#type: CatalogueColumnType::String,
                },
                CatalogueColumn {
                    id: "state".into(),
                    label: "State".into(),
                    r#type: CatalogueColumnType::String,
                },
            ]
        } else {
            definition.columns
        };
        let rows = vec![
            CatalogueRow {
                id: "cap-customer-onboarding".into(),
                values: map_from(
                    json!({ "name": "Customer Onboarding", "owner": "CX", "state": "Pilot" }),
                ),
            },
            CatalogueRow {
                id: "cap-customer-support".into(),
                values: map_from(
                    json!({ "name": "Customer Support", "owner": "Ops", "state": "Production" }),
                ),
            },
            CatalogueRow {
                id: "cap-incident-response".into(),
                values: map_from(
                    json!({ "name": "Incident Response", "owner": "SRE", "state": "In Flight" }),
                ),
            },
        ];
        Self {
            metadata: metadata_from(
                &definition.id,
                &definition.name,
                &definition.as_of,
                definition.scenario.clone(),
            ),
            columns: cols,
            rows,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatrixAxis {
    pub id: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MatrixCellState {
    Connected,
    Missing,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatrixCell {
    pub row_id: String,
    pub column_id: String,
    pub state: MatrixCellState,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub strength: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatrixViewModel {
    pub metadata: ViewMetadata,
    pub rows: Vec<MatrixAxis>,
    pub columns: Vec<MatrixAxis>,
    pub cells: Vec<MatrixCell>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChartPoint {
    pub label: String,
    pub value: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChartSeries {
    pub id: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    pub points: Vec<ChartPoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChartKpiSummary {
    pub value: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub units: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delta: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trend: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChartViewModel {
    pub metadata: ViewMetadata,
    pub chart_type: String,
    pub series: Vec<ChartSeries>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kpi: Option<ChartKpiSummary>,
}

impl MatrixViewModel {
    fn demo(definition: MatrixViewDefinition) -> Self {
        let rows = vec![
            MatrixAxis {
                id: "cap-customer-onboarding".into(),
                label: "Customer Onboarding".into(),
            },
            MatrixAxis {
                id: "cap-incident-response".into(),
                label: "Incident Response".into(),
            },
        ];
        let cols = vec![
            MatrixAxis {
                id: "svc-auth".into(),
                label: "Identity Service".into(),
            },
            MatrixAxis {
                id: "svc-search".into(),
                label: "Search Platform".into(),
            },
        ];
        let cells = vec![
            MatrixCell {
                row_id: rows[0].id.clone(),
                column_id: cols[0].id.clone(),
                state: MatrixCellState::Connected,
                strength: Some(0.8),
                value: None,
            },
            MatrixCell {
                row_id: rows[0].id.clone(),
                column_id: cols[1].id.clone(),
                state: MatrixCellState::Missing,
                strength: None,
                value: None,
            },
            MatrixCell {
                row_id: rows[1].id.clone(),
                column_id: cols[0].id.clone(),
                state: MatrixCellState::Connected,
                strength: Some(0.4),
                value: None,
            },
            MatrixCell {
                row_id: rows[1].id.clone(),
                column_id: cols[1].id.clone(),
                state: MatrixCellState::Missing,
                strength: None,
                value: None,
            },
        ];
        Self {
            metadata: metadata_from(
                &definition.id,
                &definition.name,
                &definition.as_of,
                definition.scenario.clone(),
            ),
            rows,
            columns: cols,
            cells,
        }
    }
}

impl ChartViewModel {
    fn demo(definition: ChartViewDefinition) -> Self {
        let metadata = metadata_from(
            &definition.id,
            &definition.name,
            &definition.as_of,
            definition.scenario.clone(),
        );
        match definition.chart_type.as_str() {
            "kpi" => Self {
                metadata,
                chart_type: "kpi".into(),
                series: Vec::new(),
                kpi: Some(ChartKpiSummary {
                    value: 128.0,
                    units: Some("services".into()),
                    delta: Some(6.0),
                    trend: Some("up".into()),
                }),
            },
            "line" => Self {
                metadata,
                chart_type: "line".into(),
                series: vec![ChartSeries {
                    id: "velocity".into(),
                    label: "Delivery velocity".into(),
                    color: Some("#2563eb".into()),
                    points: recent_velocity_points(),
                }],
                kpi: None,
            },
            _ => Self {
                metadata,
                chart_type: "bar".into(),
                series: vec![
                    ChartSeries {
                        id: "current".into(),
                        label: "Current".into(),
                        color: Some("#0f172a".into()),
                        points: competency_scores(),
                    },
                    ChartSeries {
                        id: "target".into(),
                        label: "Target".into(),
                        color: Some("#10b981".into()),
                        points: competency_targets(),
                    },
                ],
                kpi: None,
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum PraxisOperation {
    CreateNode { node: TwinNode },
    UpdateNode { node: TwinNode },
    DeleteNode { node_id: String },
    CreateEdge { edge: TwinEdge },
    DeleteEdge { edge_id: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationBatchResult {
    pub accepted: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commit_id: Option<String>,
}

impl OperationBatchResult {
    fn accepted(commit_id: String) -> Self {
        Self {
            accepted: true,
            message: Some("mock commit created".into()),
            commit_id: Some(commit_id),
        }
    }

    fn rejected(message: &str) -> Self {
        Self {
            accepted: false,
            message: Some(message.into()),
            commit_id: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScenarioSummary {
    pub id: String,
    pub name: String,
    pub branch: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_default: Option<bool>,
}

impl ScenarioSummary {
    fn demo_list() -> Vec<Self> {
        vec![
            ScenarioSummary {
                id: "scenario-main".into(),
                name: "Mainline FY25".into(),
                branch: "main".into(),
                description: Some("Authoritative branch".into()),
                updated_at: now_iso(),
                is_default: Some(true),
            },
            ScenarioSummary {
                id: "scenario-chrona".into(),
                name: "Chrona Playground".into(),
                branch: "chronaplay".into(),
                description: Some("Prototype overlays".into()),
                updated_at: now_iso(),
                is_default: None,
            },
        ]
    }
}

fn metadata_from(id: &str, name: &str, as_of: &str, scenario: Option<String>) -> ViewMetadata {
    ViewMetadata {
        id: id.into(),
        name: name.into(),
        as_of: as_of.into(),
        scenario,
        fetched_at: now_iso(),
        source: "host".into(),
    }
}

fn map_from(value: Value) -> Map<String, Value> {
    match value {
        Value::Object(map) => map,
        _ => Map::new(),
    }
}

fn recent_velocity_points() -> Vec<ChartPoint> {
    let now = OffsetDateTime::now_utc();
    let mut points = Vec::new();
    for index in 0..7 {
        let offset = 6 - index;
        if let Some(timestamp) = now.checked_sub(time::Duration::days(offset)) {
            points.push(ChartPoint {
                label: timestamp.weekday().to_string(),
                value: 78.0 + (index as f64 * 3.5),
                timestamp: Some(timestamp.format(&Rfc3339).unwrap_or_else(|_| now_iso())),
            });
        }
    }
    points
}

fn competency_scores() -> Vec<ChartPoint> {
    ["Security", "Resilience", "Efficiency", "Experience"]
        .iter()
        .map(|label| ChartPoint {
            label: (*label).into(),
            value: seeded_score(label) as f64,
            timestamp: None,
        })
        .collect()
}

fn competency_targets() -> Vec<ChartPoint> {
    ["Security", "Resilience", "Efficiency", "Experience"]
        .iter()
        .map(|label| ChartPoint {
            label: (*label).into(),
            value: 95.0,
            timestamp: None,
        })
        .collect()
}

fn seeded_score(label: &str) -> i32 {
    let mut hash = 0i32;
    for ch in label.chars() {
        hash = hash.wrapping_shl(5).wrapping_sub(hash) + i32::from(ch as u32);
    }
    60 + (hash.abs() % 35)
}

fn now_iso() -> String {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".into())
}

fn next_commit_id() -> String {
    use std::sync::atomic::{AtomicU32, Ordering};
    static COUNTER: AtomicU32 = AtomicU32::new(1);
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("mock-commit-{:04}", id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn metadata_contains_source() {
        let metadata = metadata_from("view-1", "Test", "2025-11-14", Some("main".into()));
        assert_eq!(metadata.source, "host");
        assert_eq!(metadata.scenario.as_deref(), Some("main"));
    }

    #[test]
    fn scenarios_have_default() {
        let summary = ScenarioSummary::demo_list();
        assert!(summary.iter().any(|s| s.is_default == Some(true)));
    }
}
