use super::*;
use time::OffsetDateTime;

#[test]
fn metadata_contains_source() {
    let metadata = metadata_from("view-1", "Test", "2025-11-14", Some("main".into()));
    assert_eq!(metadata.source, "host");
    assert_eq!(metadata.scenario.as_deref(), Some("main"));
    assert!(OffsetDateTime::parse(&metadata.fetched_at, &Rfc3339).is_ok());
}

#[test]
fn scenarios_have_default() {
    let summary = ScenarioSummary::demo_list();
    assert!(summary.iter().any(|s| s.is_default == Some(true)));
}

#[tokio::test]
async fn apply_operations_rejects_empty_payload() {
    let out = praxis_apply_operations(Vec::new()).await.unwrap();
    assert!(!out.accepted);
    assert_eq!(out.commit_id, None);
    assert!(out.message.unwrap_or_default().contains("no operations"));
}

#[tokio::test]
async fn apply_operations_accepts_non_empty_payload_and_increments_commit_id() {
    let op = PraxisOperation::CreateNode {
        node: TwinNode {
            id: "n1".into(),
            r#type: Some("Capability".into()),
            props: None,
        },
    };
    let first = praxis_apply_operations(vec![op.clone()]).await.unwrap();
    let second = praxis_apply_operations(vec![op]).await.unwrap();
    assert!(first.accepted);
    assert!(second.accepted);
    assert!(
        first
            .commit_id
            .as_deref()
            .unwrap_or_default()
            .starts_with("mock-commit-")
    );
    assert_ne!(first.commit_id, second.commit_id);
}

#[test]
fn graph_view_demo_is_well_formed() {
    let def = GraphViewDefinition {
        id: "graph-1".into(),
        name: "Graph".into(),
        kind: "graph".into(),
        as_of: "2025-12-01".into(),
        scenario: None,
        confidence: Some(0.9),
        filters: Some(ViewFilters {
            node_types: Some(vec!["Capability".into()]),
            edge_types: None,
            tags: None,
            search: None,
        }),
        scope: Some(GraphViewScope {
            root_ids: vec!["cap-customer-onboarding".into()],
        }),
    };
    let model = GraphViewModel::demo(def);
    assert_eq!(model.metadata.id, "graph-1");
    assert_eq!(model.metadata.as_of, "2025-12-01");
    assert_eq!(model.stats.nodes, model.nodes.len());
    assert_eq!(model.stats.edges, model.edges.len());
    assert!(model.nodes.iter().all(|n| !n.id.is_empty()));
    assert!(
        model
            .edges
            .iter()
            .all(|e| !e.from.is_empty() && !e.to.is_empty())
    );
}

#[test]
fn catalogue_view_demo_defaults_columns_when_missing() {
    let def = CatalogueViewDefinition {
        id: "cat-1".into(),
        name: "Catalogue".into(),
        kind: "catalogue".into(),
        as_of: "2025-12-01".into(),
        scenario: None,
        confidence: None,
        filters: None,
        columns: Vec::new(),
    };
    let model = CatalogueViewModel::demo(def);
    assert_eq!(model.columns.len(), 3);
    assert!(!model.rows.is_empty());
    assert!(model.rows.iter().all(|row| row.values.contains_key("name")));
}

#[test]
fn catalogue_view_demo_respects_explicit_columns() {
    let def = CatalogueViewDefinition {
        id: "cat-2".into(),
        name: "Catalogue".into(),
        kind: "catalogue".into(),
        as_of: "2025-12-01".into(),
        scenario: None,
        confidence: None,
        filters: None,
        columns: vec![CatalogueColumn {
            id: "owner".into(),
            label: "Owner".into(),
            r#type: CatalogueColumnType::String,
        }],
    };
    let model = CatalogueViewModel::demo(def);
    assert_eq!(model.columns.len(), 1);
    assert_eq!(model.columns[0].id, "owner");
}

#[test]
fn matrix_view_demo_has_cells_for_each_axis_pair() {
    let def = MatrixViewDefinition {
        id: "matrix-1".into(),
        name: "Matrix".into(),
        kind: "matrix".into(),
        as_of: "2025-12-01".into(),
        row_type: "Capability".into(),
        column_type: "Service".into(),
        scenario: None,
        confidence: None,
        filters: None,
    };
    let model = MatrixViewModel::demo(def);
    assert_eq!(model.cells.len(), model.rows.len() * model.columns.len());
    assert!(
        model
            .cells
            .iter()
            .any(|cell| matches!(cell.state, MatrixCellState::Connected))
    );
}

#[test]
fn chart_view_demo_supports_kpi_and_line() {
    let base = ChartViewDefinition {
        id: "chart-1".into(),
        name: "Chart".into(),
        kind: "chart".into(),
        as_of: "2025-12-01".into(),
        chart_type: "kpi".into(),
        measure: "count".into(),
        dimension: None,
        scenario: None,
        confidence: None,
        filters: None,
    };
    let kpi = ChartViewModel::demo(base.clone());
    assert_eq!(kpi.chart_type, "kpi");
    assert!(kpi.kpi.is_some());
    assert!(kpi.series.is_empty());

    let mut line_def = base;
    line_def.chart_type = "line".into();
    let line = ChartViewModel::demo(line_def);
    assert_eq!(line.chart_type, "line");
    assert!(line.kpi.is_none());
    assert_eq!(line.series.len(), 1);
    assert!(!line.series[0].points.is_empty());
}

#[test]
fn map_from_rejects_non_objects() {
    assert!(map_from(Value::Null).is_empty());
    assert!(map_from(Value::Array(vec![])).is_empty());
    let obj = map_from(json!({"a": 1}));
    assert_eq!(obj.get("a"), Some(&json!(1)));
}

#[test]
fn seeded_score_is_deterministic_and_in_range() {
    let a = seeded_score("Security");
    let b = seeded_score("Security");
    assert_eq!(a, b);
    assert!((60..=94).contains(&a));
}
