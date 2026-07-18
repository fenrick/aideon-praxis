use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GraphViewModel {
    pub metadata: ViewMetadata,
    pub stats: ViewStats,
    pub nodes: Vec<GraphNodeView>,
    pub edges: Vec<GraphEdgeView>,
}

/// Compiled graph filters derived from a [`GraphViewDefinition`].
struct GraphFilters {
    node_types: Option<HashSet<String>>,
    edge_types: Option<HashSet<String>>,
    search: Option<String>,
    scope: Option<HashSet<String>>,
}

impl GraphFilters {
    fn from_definition(definition: &GraphViewDefinition, snapshot: &GraphSnapshot) -> Self {
        let filters = definition.filters.as_ref();
        let scope = definition
            .scope
            .as_ref()
            .map(|scope| scope.root_ids.iter().cloned().collect::<HashSet<String>>())
            .filter(|ids| !ids.is_empty())
            .map(|ids| expand_scope(&ids, snapshot));
        Self {
            node_types: filters
                .and_then(|f| f.node_types.as_ref())
                .map(|v| collect_set(v)),
            edge_types: filters
                .and_then(|f| f.edge_types.as_ref())
                .map(|v| collect_set(v)),
            search: filters
                .and_then(|f| f.search.as_ref())
                .map(|q| q.to_lowercase()),
            scope,
        }
    }

    fn accepts_node(&self, node: &NodeVersion, label: &str) -> bool {
        if let Some(scope) = self.scope.as_ref()
            && !scope.contains(&node.id)
        {
            return false;
        }
        node_included(node, label, self.node_types.as_ref(), self.search.as_ref())
    }

    fn accepts_edge(&self, edge: &EdgeVersion, label: &str) -> bool {
        if !type_allowed(self.edge_types.as_ref(), edge.r#type.as_ref()) {
            return false;
        }
        match self.search.as_ref() {
            Some(query) => edge_matches_query(edge, label, query),
            None => true,
        }
    }
}

fn collect_graph_nodes(snapshot: &GraphSnapshot, filters: &GraphFilters) -> Vec<GraphNodeView> {
    snapshot
        .nodes()
        .filter_map(|node| {
            let label = node_label(node);
            filters.accepts_node(node, &label).then(|| GraphNodeView {
                id: node.id.clone(),
                label,
                r#type: node.r#type.clone(),
                position: None,
                props: node.props.clone(),
            })
        })
        .collect()
}

fn collect_graph_edges(
    snapshot: &GraphSnapshot,
    filters: &GraphFilters,
    node_ids: &HashSet<String>,
) -> Vec<GraphEdgeView> {
    snapshot
        .edges()
        .filter(|edge| node_ids.contains(&edge.from) && node_ids.contains(&edge.to))
        .filter_map(|edge| {
            let label = edge_label(edge);
            filters.accepts_edge(edge, &label).then(|| GraphEdgeView {
                id: edge.id.clone(),
                from: edge.from.clone(),
                to: edge.to.clone(),
                r#type: edge.r#type.clone(),
                label: Some(label),
                props: edge.props.clone(),
            })
        })
        .collect()
}

impl GraphViewModel {
    fn from_snapshot(
        definition: GraphViewDefinition,
        snapshot: &GraphSnapshot,
        resolved_as_of: &str,
        resolved_branch: &str,
    ) -> Self {
        let filters = GraphFilters::from_definition(&definition, snapshot);
        let nodes = collect_graph_nodes(snapshot, &filters);
        let node_ids: HashSet<String> = nodes.iter().map(|node| node.id.clone()).collect();
        let edges = collect_graph_edges(snapshot, &filters, &node_ids);

        Self {
            metadata: metadata_from(
                &definition.id,
                &definition.name,
                resolved_as_of,
                definition.layer.clone(),
                resolve_scenario(&definition.scenario, resolved_branch),
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

fn default_catalogue_columns() -> Vec<CatalogueColumn> {
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
}

impl CatalogueViewModel {
    fn from_snapshot(
        definition: CatalogueViewDefinition,
        snapshot: &GraphSnapshot,
        resolved_as_of: &str,
        resolved_branch: &str,
    ) -> Self {
        let filters = definition.filters.as_ref();
        let node_types = filters
            .and_then(|f| f.node_types.as_ref())
            .map(|v| collect_set(v));
        let search = filters
            .and_then(|f| f.search.as_ref())
            .map(|q| q.to_lowercase());

        let columns = if definition.columns.is_empty() {
            default_catalogue_columns()
        } else {
            definition.columns
        };

        let mut rows: Vec<CatalogueRow> = snapshot
            .nodes()
            .filter(|node| {
                node_included(
                    node,
                    &node_label(node),
                    node_types.as_ref(),
                    search.as_ref(),
                )
            })
            .map(|node| CatalogueRow {
                id: node.id.clone(),
                values: catalogue_values(node, &columns),
            })
            .collect();
        if let Some(limit) = definition.limit {
            rows.truncate(limit as usize);
        }

        Self {
            metadata: metadata_from(
                &definition.id,
                &definition.name,
                resolved_as_of,
                definition.layer.clone(),
                resolve_scenario(&definition.scenario, resolved_branch),
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

fn matrix_axes(
    snapshot: &GraphSnapshot,
    row_type: &str,
    column_type: &str,
) -> (Vec<MatrixAxis>, Vec<MatrixAxis>) {
    let mut rows = Vec::new();
    let mut columns = Vec::new();
    for node in snapshot.nodes() {
        let node_type = node.r#type.as_deref();
        if node_type == Some(row_type) {
            rows.push(matrix_axis(node));
        } else if node_type == Some(column_type) {
            columns.push(matrix_axis(node));
        }
    }
    (rows, columns)
}

fn matrix_axis(node: &NodeVersion) -> MatrixAxis {
    MatrixAxis {
        id: node.id.clone(),
        label: node_label(node),
    }
}

fn matrix_edges<'a>(
    snapshot: &'a GraphSnapshot,
    relationship: Option<&str>,
) -> Vec<&'a EdgeVersion> {
    snapshot
        .edges()
        .filter(|edge| match relationship {
            Some(rel) => edge.r#type.as_deref() == Some(rel),
            None => true,
        })
        .collect()
}

fn matrix_cells(
    rows: &[MatrixAxis],
    columns: &[MatrixAxis],
    edges: &[&EdgeVersion],
) -> Vec<MatrixCell> {
    let mut cells = Vec::new();
    for row in rows {
        for column in columns {
            cells.push(matrix_cell(row, column, edges));
        }
    }
    cells
}

fn matrix_cell(row: &MatrixAxis, column: &MatrixAxis, edges: &[&EdgeVersion]) -> MatrixCell {
    let matched = edges.iter().find(|edge| {
        (edge.from == row.id && edge.to == column.id)
            || (edge.from == column.id && edge.to == row.id)
    });
    match matched {
        Some(edge) => MatrixCell {
            row_id: row.id.clone(),
            column_id: column.id.clone(),
            state: MatrixCellState::Connected,
            strength: edge_strength(edge),
            value: edge_value(edge),
        },
        None => MatrixCell {
            row_id: row.id.clone(),
            column_id: column.id.clone(),
            state: MatrixCellState::Missing,
            strength: None,
            value: None,
        },
    }
}

impl MatrixViewModel {
    fn from_snapshot(
        definition: MatrixViewDefinition,
        snapshot: &GraphSnapshot,
        resolved_as_of: &str,
        resolved_branch: &str,
    ) -> Self {
        let (rows, columns) = matrix_axes(snapshot, &definition.row_type, &definition.column_type);
        let edges = matrix_edges(snapshot, definition.relationship.as_deref());
        let cells = matrix_cells(&rows, &columns, &edges);

        Self {
            metadata: metadata_from(
                &definition.id,
                &definition.name,
                resolved_as_of,
                definition.layer.clone(),
                resolve_scenario(&definition.scenario, resolved_branch),
            ),
            rows,
            columns,
            cells,
        }
    }
}

fn chart_measure(measure: &str, snapshot: &GraphSnapshot) -> (f64, Option<String>) {
    let measure = measure.to_lowercase();
    if measure.contains("edge") || measure.contains("link") {
        (snapshot.edges().count() as f64, Some("links".into()))
    } else {
        (snapshot.nodes().count() as f64, Some("entities".into()))
    }
}

fn kpi_chart(metadata: ViewMetadata, value: f64, units: Option<String>) -> ChartViewModel {
    ChartViewModel {
        metadata,
        chart_type: "kpi".into(),
        series: Vec::new(),
        kpi: Some(ChartKpiSummary {
            value,
            units,
            delta: None,
            trend: None,
        }),
    }
}

fn line_chart(metadata: ViewMetadata, measure: &str, value: f64) -> ChartViewModel {
    let point = |label: &str| ChartPoint {
        label: label.into(),
        value,
        timestamp: None,
    };
    ChartViewModel {
        metadata,
        chart_type: "line".into(),
        series: vec![ChartSeries {
            id: "series-primary".into(),
            label: measure.to_string(),
            color: Some("#2563eb".into()),
            points: vec![point("T-2"), point("T-1"), point("Now")],
        }],
        kpi: None,
    }
}

fn bar_chart(metadata: ViewMetadata, measure: &str, snapshot: &GraphSnapshot) -> ChartViewModel {
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
    ChartViewModel {
        metadata,
        chart_type: "bar".into(),
        series: vec![ChartSeries {
            id: "by-type".into(),
            label: measure.to_string(),
            color: Some("#0f172a".into()),
            points,
        }],
        kpi: None,
    }
}

impl ChartViewModel {
    fn from_snapshot(
        definition: ChartViewDefinition,
        snapshot: &GraphSnapshot,
        resolved_as_of: &str,
        resolved_branch: &str,
    ) -> Self {
        let metadata = metadata_from(
            &definition.id,
            &definition.name,
            resolved_as_of,
            definition.layer.clone(),
            resolve_scenario(&definition.scenario, resolved_branch),
        );
        let (value, units) = chart_measure(&definition.measure, snapshot);
        match definition.chart_type.as_str() {
            "kpi" => kpi_chart(metadata, value, units),
            "line" => line_chart(metadata, &definition.measure, value),
            _ => bar_chart(metadata, &definition.measure, snapshot),
        }
    }
}

fn resolve_scenario(scenario: &Option<String>, resolved_branch: &str) -> Option<String> {
    scenario
        .clone()
        .or_else(|| Some(resolved_branch.to_string()))
}

fn collect_set(values: &[String]) -> HashSet<String> {
    values.iter().cloned().collect()
}

fn type_allowed(filter: Option<&HashSet<String>>, ty: Option<&String>) -> bool {
    match filter {
        None => true,
        Some(filter) => ty.map(|ty| filter.contains(ty)).unwrap_or(false),
    }
}

fn node_included(
    node: &NodeVersion,
    label: &str,
    node_types: Option<&HashSet<String>>,
    search: Option<&String>,
) -> bool {
    if !type_allowed(node_types, node.r#type.as_ref()) {
        return false;
    }
    match search {
        Some(query) => node_matches_query(node, label, query),
        None => true,
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

fn any_matches(query: &str, candidates: &[&str]) -> bool {
    candidates
        .iter()
        .any(|candidate| candidate.to_lowercase().contains(query))
}

fn node_matches_query(node: &NodeVersion, label: &str, query: &str) -> bool {
    let mut candidates = vec![label, node.id.as_str()];
    if let Some(node_type) = node.r#type.as_deref() {
        candidates.push(node_type);
    }
    any_matches(query, &candidates)
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
    let mut candidates = vec![label, edge.from.as_str(), edge.to.as_str()];
    if let Some(edge_type) = edge.r#type.as_deref() {
        candidates.push(edge_type);
    }
    any_matches(query, &candidates)
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
