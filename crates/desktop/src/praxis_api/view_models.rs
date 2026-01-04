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

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChartPoint {
    pub label: String,
    pub value: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChartSeries {
    pub id: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    pub points: Vec<ChartPoint>,
}

#[allow(dead_code)]
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

#[allow(dead_code)]
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

#[allow(dead_code)]
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
