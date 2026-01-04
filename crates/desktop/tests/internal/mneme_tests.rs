use super::*;
use aideon_chrona::TemporalEngine;
use aideon_praxis::mneme::open_store;
use tempfile::tempdir;

#[test]
fn host_error_maps_codes() {
    let err = MnemeError::validation("bad");
    let mapped = host_error(err);
    assert_eq!(mapped.code, "validation_error");
    assert!(mapped.message.contains("bad"));

    let err = MnemeError::storage("fail");
    let mapped = host_error(err);
    assert_eq!(mapped.code, "storage_error");
}

#[test]
fn parse_hlc_accepts_integer_string() {
    let parsed = parse_hlc("123").expect("parse hlc");
    assert_eq!(parsed.as_i64(), 123);
}

#[test]
fn parse_hlc_rejects_invalid_string() {
    let err = parse_hlc("nope").expect_err("invalid");
    assert_eq!(err.code, "invalid_time");
}

#[test]
fn parse_valid_time_accepts_integer_string() {
    let parsed = parse_valid_time("456").expect("parse valid time");
    assert_eq!(parsed.0, 456);
}

#[test]
fn parse_valid_time_accepts_rfc3339() {
    let parsed = parse_valid_time("2025-01-01T00:00:00Z").expect("parse valid time");
    assert!(parsed.0 > 0);
}

#[test]
fn parse_valid_time_rejects_invalid_value() {
    let err = parse_valid_time("not-a-time").expect_err("invalid");
    assert_eq!(err.code, "invalid_time");
}

#[test]
fn next_subscription_id_increments() {
    let first = next_subscription_id();
    let second = next_subscription_id();
    assert_ne!(first, second);
    assert!(first.starts_with("mneme-sub-"));
    assert!(second.starts_with("mneme-sub-"));
}

async fn build_state() -> (WorkerState, tempfile::TempDir) {
    let dir = tempdir().expect("tempdir");
    let mneme = open_store(dir.path()).await.expect("open store");
    let engine = TemporalEngine::new().await.expect("engine");
    (WorkerState::new(engine, mneme), dir)
}

#[tokio::test]
async fn mneme_command_helpers_roundtrip() {
    let (state, _dir) = build_state().await;
    let partition_id = PartitionId(aideon_praxis::mneme::Id::new());
    let actor_id = ActorId(aideon_praxis::mneme::Id::new());
    let type_id = aideon_praxis::mneme::Id::new();
    let field_id = aideon_praxis::mneme::Id::new();
    let asserted_at = Hlc::now().as_i64().to_string();

    let _ = mneme_upsert_metamodel_batch_inner(
        &state,
        UpsertMetamodelBatchInput {
            partition_id,
            actor_id,
            asserted_at: asserted_at.clone(),
            batch: MetamodelBatch {
                types: vec![aideon_praxis::mneme::TypeDef {
                    type_id,
                    applies_to: EntityKind::Node,
                    label: "Service".to_string(),
                    is_abstract: false,
                    parent_type_id: None,
                }],
                fields: vec![aideon_praxis::mneme::FieldDef {
                    field_id,
                    label: "name".to_string(),
                    value_type: aideon_praxis::mneme::ValueType::Str,
                    cardinality_multi: false,
                    merge_policy: aideon_praxis::mneme::MergePolicy::Lww,
                    is_indexed: true,
                    disallow_overlap: false,
                }],
                type_fields: vec![aideon_praxis::mneme::TypeFieldDef {
                    type_id,
                    field_id,
                    is_required: false,
                    default_value: None,
                    override_default: false,
                    tighten_required: false,
                    disallow_overlap: None,
                }],
                edge_type_rules: vec![],
                metamodel_version: Some("v1".to_string()),
                metamodel_source: Some("tests".to_string()),
            },
            scenario_id: None,
        },
    )
    .await
    .expect("metamodel");

    let node_a = aideon_praxis::mneme::Id::new();
    let node_b = aideon_praxis::mneme::Id::new();
    let _ = mneme_create_node_inner(
        &state,
        CreateNodePayload {
            partition_id,
            scenario_id: None,
            actor_id,
            asserted_at: asserted_at.clone(),
            node_id: node_a,
            type_id: Some(type_id),
            acl_group_id: None,
            owner_actor_id: None,
            visibility: None,
        },
    )
    .await
    .expect("create node");
    let _ = mneme_create_node_inner(
        &state,
        CreateNodePayload {
            partition_id,
            scenario_id: None,
            actor_id,
            asserted_at: asserted_at.clone(),
            node_id: node_b,
            type_id: Some(type_id),
            acl_group_id: None,
            owner_actor_id: None,
            visibility: None,
        },
    )
    .await
    .expect("create node");

    let _ = mneme_set_property_interval_inner(
        &state,
        SetPropertyIntervalPayload {
            partition_id,
            scenario_id: None,
            actor_id,
            asserted_at: asserted_at.clone(),
            entity_id: node_a,
            field_id,
            value: Value::Str("alpha".to_string()),
            valid_from: "0".to_string(),
            valid_to: None,
            layer: None,
        },
    )
    .await
    .expect("set property");

    let edge_id = aideon_praxis::mneme::Id::new();
    let _ = mneme_create_edge_inner(
        &state,
        CreateEdgePayload {
            partition_id,
            scenario_id: None,
            actor_id,
            asserted_at: asserted_at.clone(),
            edge_id,
            type_id: None,
            src_id: node_a,
            dst_id: node_b,
            exists_valid_from: "0".to_string(),
            exists_valid_to: None,
            layer: None,
            weight: None,
            acl_group_id: None,
            owner_actor_id: None,
            visibility: None,
        },
    )
    .await
    .expect("create edge");

    let _ = mneme_set_edge_existence_interval_inner(
        &state,
        SetEdgeExistencePayload {
            partition_id,
            scenario_id: None,
            actor_id,
            asserted_at: asserted_at.clone(),
            edge_id,
            valid_from: "0".to_string(),
            valid_to: None,
            layer: None,
            is_tombstone: Some(false),
        },
    )
    .await
    .expect("set edge interval");

    let read = mneme_read_entity_at_time_inner(
        &state,
        ReadEntityAtTimePayload {
            partition_id,
            scenario_id: None,
            entity_id: node_a,
            at: "0".to_string(),
            as_of_asserted_at: Some(asserted_at.clone()),
            field_ids: None,
            include_defaults: Some(true),
        },
    )
    .await
    .expect("read");
    assert_eq!(read.entity_id, node_a);

    let listed = mneme_list_entities_inner(
        &state,
        ListEntitiesPayload {
            partition_id,
            scenario_id: None,
            kind: Some(EntityKind::Node),
            type_id: Some(type_id),
            at: "0".to_string(),
            as_of_asserted_at: None,
            filters: Some(vec![ListEntitiesFilterPayload {
                field_id,
                op: CompareOp::Eq,
                value: Value::Str("alpha".to_string()),
            }]),
            limit: Some(10),
            cursor: None,
        },
    )
    .await
    .expect("list");
    assert!(!listed.is_empty());

    let traversed = mneme_traverse_at_time_inner(
        &state,
        TraverseAtTimePayload {
            partition_id,
            scenario_id: None,
            from_entity_id: node_a,
            direction: Direction::Out,
            edge_type_id: None,
            at: "0".to_string(),
            as_of_asserted_at: None,
            limit: Some(10),
        },
    )
    .await
    .expect("traverse");
    assert!(traversed.len() <= 10);

    let _ = mneme_get_changes_since_inner(
        &state,
        GetChangesSincePayload {
            partition_id,
            from_sequence: None,
            limit: Some(10),
        },
    )
    .await
    .expect("changes");

    let ops = mneme_export_ops_inner(
        &state,
        ExportOpsPayload {
            partition_id,
            scenario_id: None,
            since_asserted_at: None,
            limit: Some(100),
        },
    )
    .await
    .expect("export ops");
    assert!(!ops.is_empty());

    let records = mneme_export_ops_stream_inner(
        &state,
        ExportOpsStreamPayload {
            partition_id,
            scenario_id: None,
            since_asserted_at: None,
            until_asserted_at: None,
            include_schema: Some(true),
            include_data_ops: Some(true),
            include_scenarios: Some(true),
        },
    )
    .await
    .expect("export ops stream");
    assert!(!records.is_empty());

    let snapshot = mneme_export_snapshot_stream_inner(
        &state,
        ExportSnapshotPayload {
            partition_id,
            scenario_id: None,
            as_of_asserted_at: asserted_at.clone(),
            include_facts: Some(true),
            include_entities: Some(true),
        },
    )
    .await
    .expect("snapshot");
    assert!(!snapshot.is_empty());

    let _ = mneme_get_projection_edges_inner(
        &state,
        GetProjectionEdgesPayload {
            partition_id,
            scenario_id: None,
            at: None,
            as_of_asserted_at: None,
            edge_type_filter: None,
            limit: Some(10),
        },
    )
    .await
    .expect("projection edges");
}
