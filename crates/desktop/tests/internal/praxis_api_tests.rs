use super::*;
use crate::ipc::EmptyPayload;
use aideon_chrona::TemporalEngine;
use time::OffsetDateTime;

fn ipc_request<T>(payload: T) -> IpcRequest<T> {
    use std::sync::atomic::{AtomicU32, Ordering};
    static COUNTER: AtomicU32 = AtomicU32::new(1);
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    IpcRequest {
        request_id: format!("req-{id}"),
        payload,
    }
}

#[test]
fn metadata_contains_source() {
    let metadata = metadata_from(
        "view-1",
        "Test",
        "2025-11-14",
        Some("Plan".into()),
        Some("main".into()),
    );
    assert_eq!(metadata.source, "host");
    assert_eq!(metadata.scenario.as_deref(), Some("main"));
    assert_eq!(metadata.layer.as_deref(), Some("Plan"));
    assert!(OffsetDateTime::parse(&metadata.fetched_at, &Rfc3339).is_ok());
}

#[tokio::test]
async fn scenarios_have_default() {
    let engine = TemporalEngine::new().await.expect("engine");
    let summary = praxis_list_scenarios_inner(&engine)
        .await
        .expect("scenarios");
    assert!(summary.iter().any(|s| s.is_default == Some(true)));
}

#[tokio::test]
async fn apply_operations_rejects_empty_payload() {
    let engine = TemporalEngine::new().await.expect("engine");
    let out = praxis_apply_operations_inner(&engine, Vec::new(), None)
        .await
        .unwrap();
    assert!(!out.accepted);
    assert_eq!(out.commit_id, None);
    assert!(out.message.unwrap_or_default().contains("no operations"));
}

#[tokio::test]
async fn apply_operations_accepts_non_empty_payload_and_increments_commit_id() {
    let engine = TemporalEngine::new().await.expect("engine");
    let op = PraxisOperation::CreateNode {
        node: TwinNode {
            id: "n1".into(),
            r#type: Some("Capability".into()),
            props: Some(serde_json::json!({ "name": "Temp Node" })),
        },
    };
    let op_two = PraxisOperation::CreateNode {
        node: TwinNode {
            id: "n2".into(),
            r#type: Some("Capability".into()),
            props: Some(serde_json::json!({ "name": "Temp Node 2" })),
        },
    };
    let first = praxis_apply_operations_inner(&engine, vec![op.clone()], None)
        .await
        .unwrap();
    let second = praxis_apply_operations_inner(&engine, vec![op_two], None)
        .await
        .unwrap();
    assert!(first.accepted);
    assert!(second.accepted);
    assert_ne!(first.commit_id, second.commit_id);
}

#[tokio::test]
async fn graph_view_from_snapshot_is_well_formed() {
    let engine = TemporalEngine::new().await.expect("engine");
    let def = GraphViewDefinition {
        id: "graph-1".into(),
        name: "Graph".into(),
        kind: "graph".into(),
        as_of: "main".into(),
        layout: None,
        layer: Some("Plan".into()),
        scenario: Some("main".into()),
        confidence: Some(0.9),
        filters: Some(ViewFilters {
            node_types: Some(vec!["Capability".into()]),
            edge_types: None,
            tags: None,
            search: None,
        }),
        scope: None,
    };
    let model = praxis_graph_view_inner(&engine, def).await.unwrap();
    assert_eq!(model.metadata.id, "graph-1");
    assert!(!model.metadata.as_of.is_empty());
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

#[tokio::test]
async fn catalogue_view_defaults_columns_when_missing() {
    let engine = TemporalEngine::new().await.expect("engine");
    let def = CatalogueViewDefinition {
        id: "cat-1".into(),
        name: "Catalogue".into(),
        kind: "catalogue".into(),
        as_of: "main".into(),
        layer: None,
        scenario: Some("main".into()),
        confidence: None,
        filters: None,
        columns: Vec::new(),
        limit: None,
    };
    let model = praxis_catalogue_view_inner(&engine, def).await.unwrap();
    assert_eq!(model.columns.len(), 3);
    assert!(model.rows.iter().all(|row| row.values.contains_key("name")));
}

#[tokio::test]
async fn catalogue_view_respects_explicit_columns() {
    let engine = TemporalEngine::new().await.expect("engine");
    let def = CatalogueViewDefinition {
        id: "cat-2".into(),
        name: "Catalogue".into(),
        kind: "catalogue".into(),
        as_of: "main".into(),
        layer: None,
        scenario: Some("main".into()),
        confidence: None,
        filters: None,
        columns: vec![CatalogueColumn {
            id: "owner".into(),
            label: "Owner".into(),
            r#type: CatalogueColumnType::String,
        }],
        limit: None,
    };
    let model = praxis_catalogue_view_inner(&engine, def).await.unwrap();
    assert_eq!(model.columns.len(), 1);
    assert_eq!(model.columns[0].id, "owner");
}

#[tokio::test]
async fn matrix_view_has_cells_for_each_axis_pair() {
    let engine = TemporalEngine::new().await.expect("engine");
    let def = MatrixViewDefinition {
        id: "matrix-1".into(),
        name: "Matrix".into(),
        kind: "matrix".into(),
        as_of: "main".into(),
        row_type: "Capability".into(),
        column_type: "Application".into(),
        relationship: Some("realises".into()),
        layer: None,
        scenario: Some("main".into()),
        confidence: None,
        filters: None,
    };
    let model = praxis_matrix_view_inner(&engine, def).await.unwrap();
    assert_eq!(model.cells.len(), model.rows.len() * model.columns.len());
    assert!(
        model
            .cells
            .iter()
            .any(|cell| matches!(cell.state, MatrixCellState::Connected))
    );
}

#[tokio::test]
async fn chart_view_supports_kpi_and_line() {
    let engine = TemporalEngine::new().await.expect("engine");
    let base = ChartViewDefinition {
        id: "chart-1".into(),
        name: "Chart".into(),
        kind: "chart".into(),
        as_of: "main".into(),
        chart_type: "kpi".into(),
        measure: "count".into(),
        dimension: None,
        layer: None,
        scenario: Some("main".into()),
        confidence: None,
        filters: None,
    };
    let kpi = praxis_chart_view_inner(&engine, base.clone())
        .await
        .unwrap();
    assert_eq!(kpi.chart_type, "kpi");
    assert!(kpi.kpi.is_some());
    assert!(kpi.series.is_empty());

    let mut line_def = base;
    line_def.chart_type = "line".into();
    let line = praxis_chart_view_inner(&engine, line_def).await.unwrap();
    assert_eq!(line.chart_type, "line");
    assert!(line.kpi.is_none());
    assert_eq!(line.series.len(), 1);
    assert!(!line.series[0].points.is_empty());
}

#[tokio::test]
async fn artefact_wrappers_return_ipc_envelopes() {
    let engine = TemporalEngine::new().await.expect("engine");

    let graph_def = GraphViewDefinition {
        id: "graph-1".into(),
        name: "Graph".into(),
        kind: "graph".into(),
        as_of: "main".into(),
        layout: None,
        layer: None,
        scenario: Some("main".into()),
        confidence: Some(0.9),
        filters: None,
        scope: None,
    };
    let graph = praxis_artefact_graph_execute_inner(&engine, ipc_request(graph_def)).await;
    assert_eq!(graph.status, "ok");

    let catalogue_def = CatalogueViewDefinition {
        id: "cat-1".into(),
        name: "Catalogue".into(),
        kind: "catalogue".into(),
        as_of: "main".into(),
        layer: None,
        scenario: Some("main".into()),
        confidence: None,
        filters: None,
        columns: Vec::new(),
        limit: None,
    };
    let catalogue =
        praxis_artefact_catalogue_execute_inner(&engine, ipc_request(catalogue_def)).await;
    assert_eq!(catalogue.status, "ok");

    let matrix_def = MatrixViewDefinition {
        id: "matrix-1".into(),
        name: "Matrix".into(),
        kind: "matrix".into(),
        as_of: "main".into(),
        row_type: "Capability".into(),
        column_type: "Application".into(),
        relationship: Some("realises".into()),
        layer: None,
        scenario: Some("main".into()),
        confidence: None,
        filters: None,
    };
    let matrix = praxis_artefact_matrix_execute_inner(&engine, ipc_request(matrix_def)).await;
    assert_eq!(matrix.status, "ok");

    let chart_def = ChartViewDefinition {
        id: "chart-1".into(),
        name: "Chart".into(),
        kind: "chart".into(),
        as_of: "main".into(),
        chart_type: "kpi".into(),
        measure: "count".into(),
        dimension: None,
        layer: None,
        scenario: Some("main".into()),
        confidence: None,
        filters: None,
    };
    let chart = praxis_artefact_chart_execute_inner(&engine, ipc_request(chart_def)).await;
    assert_eq!(chart.status, "ok");

    let scenarios = praxis_scenario_list_inner(&engine, ipc_request(EmptyPayload {})).await;
    assert_eq!(scenarios.status, "ok");
}
