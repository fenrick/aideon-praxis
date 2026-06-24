use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GraphViewModel {
    pub metadata: ViewMetadata,
    pub stats: ViewStats,
    pub nodes: Vec<GraphNodeView>,
    pub edges: Vec<GraphEdgeView>,
}

impl GraphViewModel {
    fn from_snapshot(
        definition: GraphViewDefinition,
        snapshot: &GraphSnapshot,
        resolved_as_of: &str,
        resolved_branch: &str,
    ) -> Self {
        let filters = definition.filters.as_ref();
        let node_type_filter = filters
            .and_then(|filter| filter.node_types.as_ref())
            .map(|types| types.iter().cloned().collect::<HashSet<String>>());
        let edge_type_filter = filters
            .and_then(|filter| filter.edge_types.as_ref())
            .map(|types| types.iter().cloned().collect::<HashSet<String>>());
        let search_query = filters
            .and_then(|filter| filter.search.as_ref())
            .map(|query| query.to_lowercase());

        let scope_ids = definition
            .scope
            .as_ref()
            .map(|scope| scope.root_ids.iter().cloned().collect::<HashSet<String>>());
        let scope_allowed = scope_ids
            .as_ref()
            .filter(|ids| !ids.is_empty())
            .map(|ids| expand_scope(ids, snapshot));

        let mut nodes = Vec::new();
        for node in snapshot.nodes() {
            if let Some(scope) = scope_allowed.as_ref()
                && !scope.contains(&node.id)
            {
                continue;
            }
            if let Some(filter) = node_type_filter.as_ref()
                && !node
                    .r#type
                    .as_ref()
                    .map(|ty| filter.contains(ty))
                    .unwrap_or(false)
            {
                continue;
            }
            let label = node_label(node);
            if let Some(query) = search_query.as_ref()
                && !node_matches_query(node, &label, query)
            {
                continue;
            }
            nodes.push(GraphNodeView {
                id: node.id.clone(),
                label,
                r#type: node.r#type.clone(),
                position: None,
                props: node.props.clone(),
            });
        }

        let node_ids: HashSet<String> = nodes.iter().map(|node| node.id.clone()).collect();
        let mut edges = Vec::new();
        for edge in snapshot.edges() {
            if !node_ids.contains(&edge.from) || !node_ids.contains(&edge.to) {
                continue;
            }
            if let Some(filter) = edge_type_filter.as_ref()
                && !edge
                    .r#type
                    .as_ref()
                    .map(|ty| filter.contains(ty))
                    .unwrap_or(false)
            {
                continue;
            }
            let label = edge_label(edge);
            if let Some(query) = search_query.as_ref()
                && !edge_matches_query(edge, &label, query)
            {
                continue;
            }
            edges.push(GraphEdgeView {
                id: edge.id.clone(),
                from: edge.from.clone(),
                to: edge.to.clone(),
                r#type: edge.r#type.clone(),
                label: Some(label),
                props: edge.props.clone(),
            });
        }

        let scenario = definition
            .scenario
            .clone()
            .or_else(|| Some(resolved_branch.to_string()));
        Self {
            metadata: metadata_from(
                &definition.id,
                &definition.name,
                resolved_as_of,
                definition.layer.clone(),
                scenario,
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

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CatalogueColumn {
    pub id: String,
    pub label: String,
    pub r#type: CatalogueColumnType,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum CatalogueColumnType {
    String,
    Number,
    Boolean,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CatalogueRow {
    pub id: String,
    pub values: Map<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CatalogueViewModel {
    pub metadata: ViewMetadata,
    pub columns: Vec<CatalogueColumn>,
    pub rows: Vec<CatalogueRow>,
}

impl CatalogueViewModel {
    fn from_snapshot(
        definition: CatalogueViewDefinition,
        snapshot: &GraphSnapshot,
        resolved_as_of: &str,
        resolved_branch: &str,
    ) -> Self {
        let filters = definition.filters.as_ref();
        let node_type_filter = filters
            .and_then(|filter| filter.node_types.as_ref())
            .map(|types| types.iter().cloned().collect::<HashSet<String>>());
        let search_query = filters
            .and_then(|filter| filter.search.as_ref())
            .map(|query| query.to_lowercase());

        let columns = if definition.columns.is_empty() {
            vec![
                CatalogueColumn {
                    id: "name".into(),
                    label: "Name".into(),
                    r#type: CatalogueColumnType::String,
                },
                CatalogueColumn {
                    id: "type".into(),
                    label: "Type".into(),
                    r#type: CatalogueColumnType::String,
                },
                CatalogueColumn {
                    id: "owner".into(),
                    label: "Owner".into(),
                    r#type: CatalogueColumnType::String,
                },
            ]
        } else {
            definition.columns
        };

        let mut rows: Vec<CatalogueRow> = snapshot
            .nodes()
            .filter(|node| {
                if let Some(filter) = node_type_filter.as_ref()
                    && !node
                        .r#type
                        .as_ref()
                        .map(|ty| filter.contains(ty))
                        .unwrap_or(false)
                {
                    return false;
                }
                let label = node_label(node);
                if let Some(query) = search_query.as_ref()
                    && !node_matches_query(node, &label, query)
                {
                    return false;
                }
                true
            })
            .map(|node| CatalogueRow {
                id: node.id.clone(),
                values: catalogue_values(node, &columns),
            })
            .collect();
        if let Some(limit) = definition.limit {
            rows.truncate(limit as usize);
        }

        let scenario = definition
            .scenario
            .clone()
            .or_else(|| Some(resolved_branch.to_string()));
        Self {
            metadata: metadata_from(
                &definition.id,
                &definition.name,
                resolved_as_of,
                definition.layer.clone(),
                scenario,
            ),
            columns,
            rows,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MatrixAxis {
    pub id: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum MatrixCellState {
    Connected,
    Missing,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
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

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MatrixViewModel {
    pub metadata: ViewMetadata,
    pub rows: Vec<MatrixAxis>,
    pub columns: Vec<MatrixAxis>,
    pub cells: Vec<MatrixCell>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ChartPoint {
    pub label: String,
    pub value: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ChartSeries {
    pub id: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    pub points: Vec<ChartPoint>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
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
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ChartViewModel {
    pub metadata: ViewMetadata,
    pub chart_type: String,
    pub series: Vec<ChartSeries>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kpi: Option<ChartKpiSummary>,
}

impl MatrixViewModel {
    fn from_snapshot(
        definition: MatrixViewDefinition,
        snapshot: &GraphSnapshot,
        resolved_as_of: &str,
        resolved_branch: &str,
    ) -> Self {
        let row_type = definition.row_type.clone();
        let column_type = definition.column_type.clone();
        let relationship = definition.relationship.clone();

        let mut rows = Vec::new();
        let mut columns = Vec::new();
        for node in snapshot.nodes() {
            if node.r#type.as_deref() == Some(&row_type) {
                rows.push(MatrixAxis {
                    id: node.id.clone(),
                    label: node_label(node),
                });
            } else if node.r#type.as_deref() == Some(&column_type) {
                columns.push(MatrixAxis {
                    id: node.id.clone(),
                    label: node_label(node),
                });
            }
        }

        let mut edges = Vec::new();
        for edge in snapshot.edges() {
            if let Some(ref rel) = relationship
                && edge.r#type.as_deref() != Some(rel.as_str())
            {
                continue;
            }
            edges.push(edge);
        }

        let mut cells = Vec::new();
        for row in &rows {
            for column in &columns {
                let matched = edges.iter().find(|edge| {
                    (edge.from == row.id && edge.to == column.id)
                        || (edge.from == column.id && edge.to == row.id)
                });
                if let Some(edge) = matched {
                    cells.push(MatrixCell {
                        row_id: row.id.clone(),
                        column_id: column.id.clone(),
                        state: MatrixCellState::Connected,
                        strength: edge_strength(edge),
                        value: edge_value(edge),
                    });
                } else {
                    cells.push(MatrixCell {
                        row_id: row.id.clone(),
                        column_id: column.id.clone(),
                        state: MatrixCellState::Missing,
                        strength: None,
                        value: None,
                    });
                }
            }
        }

        let scenario = definition
            .scenario
            .clone()
            .or_else(|| Some(resolved_branch.to_string()));
        Self {
            metadata: metadata_from(
                &definition.id,
                &definition.name,
                resolved_as_of,
                definition.layer.clone(),
                scenario,
            ),
            rows,
            columns,
            cells,
        }
    }
}

impl ChartViewModel {
    fn from_snapshot(
        definition: ChartViewDefinition,
        snapshot: &GraphSnapshot,
        resolved_as_of: &str,
        resolved_branch: &str,
    ) -> Self {
        let scenario = definition
            .scenario
            .clone()
            .or_else(|| Some(resolved_branch.to_string()));
        let metadata = metadata_from(
            &definition.id,
            &definition.name,
            resolved_as_of,
            definition.layer.clone(),
            scenario,
        );
        let node_count = snapshot.nodes().count() as f64;
        let edge_count = snapshot.edges().count() as f64;
        let measure = definition.measure.to_lowercase();
        let (value, units) = if measure.contains("edge") || measure.contains("link") {
            (edge_count, Some("links".into()))
        } else {
            (node_count, Some("entities".into()))
        };
        match definition.chart_type.as_str() {
            "kpi" => Self {
                metadata,
                chart_type: "kpi".into(),
                series: Vec::new(),
                kpi: Some(ChartKpiSummary {
                    value,
                    units,
                    delta: None,
                    trend: None,
                }),
            },
            "line" => Self {
                metadata,
                chart_type: "line".into(),
                series: vec![ChartSeries {
                    id: "series-primary".into(),
                    label: definition.measure.clone(),
                    color: Some("#2563eb".into()),
                    points: vec![
                        ChartPoint {
                            label: "T-2".into(),
                            value,
                            timestamp: None,
                        },
                        ChartPoint {
                            label: "T-1".into(),
                            value,
                            timestamp: None,
                        },
                        ChartPoint {
                            label: "Now".into(),
                            value,
                            timestamp: None,
                        },
                    ],
                }],
                kpi: None,
            },
            _ => {
                let mut counts: HashMap<String, u64> = HashMap::new();
                for node in snapshot.nodes() {
                    if let Some(node_type) = node.r#type.as_ref() {
                        *counts.entry(node_type.clone()).or_default() += 1;
                    }
                }
                let mut points: Vec<ChartPoint> = counts
                    .into_iter()
                    .map(|(label, count)| ChartPoint {
                        label,
                        value: count as f64,
                        timestamp: None,
                    })
                    .collect();
                points.sort_by(|a, b| a.label.cmp(&b.label));
                Self {
                    metadata,
                    chart_type: "bar".into(),
                    series: vec![ChartSeries {
                        id: "by-type".into(),
                        label: definition.measure.clone(),
                        color: Some("#0f172a".into()),
                        points,
                    }],
                    kpi: None,
                }
            }
        }
    }
}

fn expand_scope(root_ids: &HashSet<String>, snapshot: &GraphSnapshot) -> HashSet<String> {
    let mut allowed = root_ids.clone();
    for edge in snapshot.edges() {
        if root_ids.contains(&edge.from) || root_ids.contains(&edge.to) {
            allowed.insert(edge.from.clone());
            allowed.insert(edge.to.clone());
        }
    }
    allowed
}

fn node_label(node: &NodeVersion) -> String {
    let Some(props) = props_map(&node.props) else {
        return node.id.clone();
    };
    props
        .get("name")
        .and_then(Value::as_str)
        .or_else(|| props.get("label").and_then(Value::as_str))
        .or_else(|| props.get("title").and_then(Value::as_str))
        .unwrap_or(&node.id)
        .to_string()
}

fn node_matches_query(node: &NodeVersion, label: &str, query: &str) -> bool {
    if label.to_lowercase().contains(query) {
        return true;
    }
    if node.id.to_lowercase().contains(query) {
        return true;
    }
    if let Some(node_type) = node.r#type.as_ref()
        && node_type.to_lowercase().contains(query)
    {
        return true;
    }
    false
}

fn edge_label(edge: &EdgeVersion) -> String {
    let Some(props) = props_map(&edge.props) else {
        return edge
            .r#type
            .clone()
            .unwrap_or_else(|| format!("{}→{}", edge.from, edge.to));
    };
    props
        .get("label")
        .and_then(Value::as_str)
        .or_else(|| props.get("name").and_then(Value::as_str))
        .or(edge.r#type.as_deref())
        .unwrap_or("link")
        .to_string()
}

fn edge_matches_query(edge: &EdgeVersion, label: &str, query: &str) -> bool {
    if label.to_lowercase().contains(query) {
        return true;
    }
    if edge.from.to_lowercase().contains(query) || edge.to.to_lowercase().contains(query) {
        return true;
    }
    if let Some(edge_type) = edge.r#type.as_ref()
        && edge_type.to_lowercase().contains(query)
    {
        return true;
    }
    false
}

fn catalogue_values(node: &NodeVersion, columns: &[CatalogueColumn]) -> Map<String, Value> {
    let mut values = Map::new();
    let props = props_map(&node.props);
    for column in columns {
        let value = match column.id.as_str() {
            "id" => Value::String(node.id.clone()),
            "type" => node
                .r#type
                .as_ref()
                .map(|ty| Value::String(ty.clone()))
                .unwrap_or(Value::Null),
            _ => props
                .and_then(|map| map.get(&column.id))
                .cloned()
                .unwrap_or(Value::Null),
        };
        values.insert(column.id.clone(), value);
    }
    values
}

fn props_map(props: &Option<Value>) -> Option<&Map<String, Value>> {
    match props {
        Some(Value::Object(map)) => Some(map),
        _ => None,
    }
}

fn edge_strength(edge: &EdgeVersion) -> Option<f32> {
    let props = props_map(&edge.props)?;
    if let Some(value) = props.get("strength") {
        return value.as_f64().map(|v| v as f32);
    }
    props
        .get("confidence")
        .and_then(|value| value.as_f64())
        .map(|v| v as f32)
}

fn edge_value(edge: &EdgeVersion) -> Option<String> {
    let props = props_map(&edge.props)?;
    props
        .get("value")
        .and_then(|value| value.as_str())
        .map(|value| value.to_string())
}
