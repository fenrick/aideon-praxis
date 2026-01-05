use super::*;
use aideon_chrona::TemporalEngine;
use aideon_praxis::mneme::open_store;
use serde_json::json;
use std::future::Future;
use tempfile::tempdir;

fn ipc_request<T>(payload: T) -> IpcRequest<T> {
    use std::sync::atomic::{AtomicU32, Ordering};
    static COUNTER: AtomicU32 = AtomicU32::new(1);
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    IpcRequest {
        request_id: format!("req-{id}"),
        payload,
    }
}

async fn ipc_with_payload<T, R, F, Fut>(
    state: &WorkerState,
    request: IpcRequest<T>,
    f: F,
) -> IpcResponse<R>
where
    F: FnOnce(&WorkerState, T) -> Fut,
    Fut: Future<Output = Result<R, HostError>>,
{
    let IpcRequest {
        request_id,
        payload,
    } = request;
    ipc_handle(request_id, f(state, payload)).await
}

async fn ipc_no_payload<R, F, Fut>(
    state: &WorkerState,
    request: IpcRequest<EmptyPayload>,
    f: F,
) -> IpcResponse<R>
where
    F: FnOnce(&WorkerState) -> Fut,
    Fut: Future<Output = Result<R, HostError>>,
{
    let IpcRequest {
        request_id,
        payload: _,
    } = request;
    ipc_handle(request_id, f(state)).await
}

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

#[tokio::test]
async fn mneme_store_wrappers_smoke() {
    let (state, _dir) = build_state().await;
    let state = &state;
    let partition_id = PartitionId(aideon_praxis::mneme::Id::new());
    let actor_id = ActorId(aideon_praxis::mneme::Id::new());
    let asserted_at = Hlc::now().as_i64().to_string();
    let type_id = aideon_praxis::mneme::Id::new();
    let field_id = aideon_praxis::mneme::Id::new();
    let node_a = aideon_praxis::mneme::Id::new();
    let node_b = aideon_praxis::mneme::Id::new();
    let edge_id = aideon_praxis::mneme::Id::new();

    let metamodel = UpsertMetamodelBatchInput {
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
    };
    let response = ipc_with_payload(
        state,
        ipc_request(metamodel),
        mneme_upsert_metamodel_batch_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(CompileEffectiveSchemaInput {
            partition_id,
            actor_id,
            asserted_at: asserted_at.clone(),
            type_id,
            scenario_id: None,
        }),
        mneme_compile_effective_schema_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(CreateNodePayload {
            partition_id,
            scenario_id: None,
            actor_id,
            asserted_at: asserted_at.clone(),
            node_id: node_a,
            type_id: Some(type_id),
            acl_group_id: None,
            owner_actor_id: None,
            visibility: None,
        }),
        mneme_create_node_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(CreateNodePayload {
            partition_id,
            scenario_id: None,
            actor_id,
            asserted_at: asserted_at.clone(),
            node_id: node_b,
            type_id: Some(type_id),
            acl_group_id: None,
            owner_actor_id: None,
            visibility: None,
        }),
        mneme_create_node_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(SetPropertyIntervalPayload {
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
        }),
        mneme_set_property_interval_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(CreateEdgePayload {
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
        }),
        mneme_create_edge_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(SetEdgeExistencePayload {
            partition_id,
            scenario_id: None,
            actor_id,
            asserted_at: asserted_at.clone(),
            edge_id,
            valid_from: "0".to_string(),
            valid_to: None,
            layer: None,
            is_tombstone: Some(false),
        }),
        mneme_set_edge_existence_interval_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(ReadEntityAtTimePayload {
            partition_id,
            scenario_id: None,
            entity_id: node_a,
            at: "0".to_string(),
            as_of_asserted_at: Some(asserted_at.clone()),
            field_ids: None,
            include_defaults: Some(true),
        }),
        mneme_read_entity_at_time_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(ListEntitiesPayload {
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
        }),
        mneme_list_entities_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(TraverseAtTimePayload {
            partition_id,
            scenario_id: None,
            from_entity_id: node_a,
            direction: Direction::Out,
            edge_type_id: None,
            at: "0".to_string(),
            as_of_asserted_at: None,
            limit: Some(10),
        }),
        mneme_traverse_at_time_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(GetChangesSincePayload {
            partition_id,
            from_sequence: None,
            limit: Some(10),
        }),
        mneme_get_changes_since_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(GetProjectionEdgesPayload {
            partition_id,
            scenario_id: None,
            at: None,
            as_of_asserted_at: None,
            edge_type_filter: None,
            limit: Some(10),
        }),
        mneme_get_projection_edges_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(GetGraphDegreeStatsPayload {
            partition_id,
            scenario_id: None,
            as_of_valid_time: None,
            entity_ids: Some(vec![node_a]),
            limit: Some(10),
        }),
        mneme_get_graph_degree_stats_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(GetGraphEdgeTypeCountsPayload {
            partition_id,
            scenario_id: None,
            edge_type_ids: None,
            limit: Some(10),
        }),
        mneme_get_graph_edge_type_counts_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(StorePageRankScoresPayload {
            partition_id,
            actor_id,
            asserted_at: asserted_at.clone(),
            as_of_valid_time: Some("0".to_string()),
            as_of_asserted_at: Some(asserted_at.clone()),
            params: PageRankParamsPayload {
                damping: 0.85,
                max_iters: 20,
                tol: 0.0001,
                personalised_seed: None,
            },
            scores: vec![PageRankScorePayload {
                id: node_a,
                score: 1.0,
            }],
            scenario_id: None,
        }),
        mneme_store_pagerank_scores_inner,
    )
    .await;
    assert_eq!(response.status, "ok");
    let run_id = response
        .result
        .as_ref()
        .map(|result| result.run_id)
        .expect("pagerank run id");

    let response = ipc_with_payload(
        state,
        ipc_request(GetPageRankScoresPayload {
            partition_id,
            run_id,
            top_n: 10,
        }),
        mneme_get_pagerank_scores_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let ops_response = ipc_with_payload(
        state,
        ipc_request(ExportOpsPayload {
            partition_id,
            scenario_id: None,
            since_asserted_at: None,
            limit: Some(100),
        }),
        mneme_export_ops_inner,
    )
    .await;
    assert_eq!(ops_response.status, "ok");
    let ops = ops_response.result.unwrap_or_default();

    let response = ipc_with_payload(
        state,
        ipc_request(IngestOpsPayload {
            partition_id,
            scenario_id: None,
            ops: ops
                .into_iter()
                .map(|op| OpEnvelopePayload {
                    op_id: op.op_id,
                    actor_id: op.actor_id,
                    asserted_at: op.asserted_at.as_i64().to_string(),
                    op_type: op.op_type,
                    payload: op.payload,
                    deps: op.deps,
                })
                .collect(),
        }),
        mneme_ingest_ops_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(PartitionHeadPayload {
            partition_id,
            scenario_id: None,
        }),
        mneme_get_partition_head_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let scenario_response = ipc_with_payload(
        state,
        ipc_request(CreateScenarioPayload {
            partition_id,
            actor_id,
            asserted_at: asserted_at.clone(),
            name: "Test Scenario".into(),
        }),
        mneme_create_scenario_inner,
    )
    .await;
    assert_eq!(scenario_response.status, "ok");
    let scenario_id = scenario_response.result.expect("scenario id");

    let response = ipc_with_payload(
        state,
        ipc_request(DeleteScenarioPayload {
            partition_id,
            actor_id,
            asserted_at: asserted_at.clone(),
            scenario_id,
        }),
        mneme_delete_scenario_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let export_ops = ipc_with_payload(
        state,
        ipc_request(ExportOpsStreamPayload {
            partition_id,
            scenario_id: None,
            since_asserted_at: None,
            until_asserted_at: None,
            include_schema: Some(true),
            include_data_ops: Some(true),
            include_scenarios: Some(true),
        }),
        mneme_export_ops_stream_inner,
    )
    .await;
    assert_eq!(export_ops.status, "ok");
    let records = export_ops.result.unwrap_or_default();

    let response = ipc_with_payload(
        state,
        ipc_request(ImportOpsStreamPayload {
            target_partition: partition_id,
            scenario_id: None,
            allow_partition_create: Some(false),
            remap_actor_ids: None,
            strict_schema: Some(false),
            records,
        }),
        mneme_import_ops_stream_inner,
    )
    .await;
    assert!(matches!(response.status, "ok" | "error"));

    let export_snapshot = ipc_with_payload(
        state,
        ipc_request(ExportSnapshotPayload {
            partition_id,
            scenario_id: None,
            as_of_asserted_at: asserted_at.clone(),
            include_facts: Some(true),
            include_entities: Some(true),
        }),
        mneme_export_snapshot_stream_inner,
    )
    .await;
    assert_eq!(export_snapshot.status, "ok");
    let snapshot_records = export_snapshot.result.unwrap_or_default();

    let response = ipc_with_payload(
        state,
        ipc_request(ImportSnapshotPayload {
            target_partition: partition_id,
            scenario_id: None,
            allow_partition_create: Some(false),
            remap_actor_ids: None,
            strict_schema: Some(false),
            records: snapshot_records,
        }),
        mneme_import_snapshot_stream_inner,
    )
    .await;
    assert!(matches!(response.status, "ok" | "error"));

    let response = ipc_with_payload(
        state,
        ipc_request(UpsertValidationRulesPayload {
            partition_id,
            actor_id,
            asserted_at: asserted_at.clone(),
            rules: vec![ValidationRule {
                rule_id: aideon_praxis::mneme::Id::new(),
                scope_kind: 0,
                scope_id: None,
                severity: 1,
                template_kind: "presence".into(),
                params: json!({ "field": field_id.to_string() }),
            }],
        }),
        mneme_upsert_validation_rules_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(ListValidationRulesPayload { partition_id }),
        mneme_list_validation_rules_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(UpsertComputedRulesPayload {
            partition_id,
            actor_id,
            asserted_at: asserted_at.clone(),
            rules: vec![ComputedRule {
                rule_id: aideon_praxis::mneme::Id::new(),
                target_type_id: Some(type_id),
                output_field_id: Some(field_id),
                template_kind: "derive".into(),
                params: json!({ "op": "concat" }),
            }],
        }),
        mneme_upsert_computed_rules_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(ListComputedRulesPayload { partition_id }),
        mneme_list_computed_rules_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(UpsertComputedCachePayload {
            partition_id,
            entries: vec![ComputedCacheEntryPayload {
                entity_id: node_a,
                field_id,
                valid_from: "0".to_string(),
                valid_to: None,
                value: Value::Str("computed".to_string()),
                rule_version_hash: "hash".into(),
                computed_asserted_at: asserted_at.clone(),
            }],
        }),
        mneme_upsert_computed_cache_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(ListComputedCachePayload {
            partition_id,
            entity_id: Some(node_a),
            field_id,
            at_valid_time: Some("0".to_string()),
            limit: Some(10),
        }),
        mneme_list_computed_cache_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(TriggerProcessingPayload {
            partition_id,
            scenario_id: None,
            reason: "tests".into(),
        }),
        mneme_trigger_rebuild_effective_schema_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(TriggerProcessingPayload {
            partition_id,
            scenario_id: None,
            reason: "tests".into(),
        }),
        mneme_trigger_refresh_integrity_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(TriggerProcessingPayload {
            partition_id,
            scenario_id: None,
            reason: "tests".into(),
        }),
        mneme_trigger_refresh_analytics_projections_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(TriggerRetentionPayload {
            partition_id,
            scenario_id: None,
            policy: RetentionPolicyPayload {
                keep_ops_days: Some(7),
                keep_facts_days: Some(7),
                keep_failed_jobs_days: Some(7),
                keep_pagerank_runs_days: Some(7),
            },
            reason: "tests".into(),
        }),
        mneme_trigger_retention_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(TriggerCompactionPayload {
            partition_id,
            scenario_id: None,
            reason: "tests".into(),
        }),
        mneme_trigger_compaction_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(RunWorkerPayload {
            max_jobs: 1,
            lease_millis: 1000,
        }),
        mneme_run_processing_worker_inner,
    )
    .await;
    assert!(matches!(response.status, "ok" | "error"));

    let response = ipc_with_payload(
        state,
        ipc_request(ListJobsPayload {
            partition_id,
            status: None,
            limit: 10,
        }),
        mneme_list_jobs_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(IntegrityHeadPayload {
            partition_id,
            scenario_id: None,
        }),
        mneme_get_integrity_head_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(SchemaHeadPayload {
            partition_id,
            type_id,
        }),
        mneme_get_last_schema_compile_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(ListFailedJobsPayload {
            partition_id,
            limit: 10,
        }),
        mneme_list_failed_jobs_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_no_payload(
        state,
        ipc_request(EmptyPayload {}),
        mneme_get_schema_manifest_inner,
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(ExplainResolutionPayload {
            partition_id,
            scenario_id: None,
            entity_id: node_a,
            field_id,
            at: "0".to_string(),
            as_of_asserted_at: Some(asserted_at.clone()),
        }),
        mneme_explain_resolution_inner,
    )
    .await;
    assert!(matches!(response.status, "ok" | "error"));

    let response = ipc_with_payload(
        state,
        ipc_request(ExplainTraversalPayload {
            partition_id,
            scenario_id: None,
            edge_id,
            at: "0".to_string(),
            as_of_asserted_at: Some(asserted_at.clone()),
        }),
        mneme_explain_traversal_inner,
    )
    .await;
    assert!(matches!(response.status, "ok" | "error"));

    let response = ipc_with_payload(
        state,
        ipc_request(GetEffectiveSchemaPayload {
            partition_id,
            type_id,
        }),
        |state, payload| {
            mneme_get_effective_schema_inner(state, payload.partition_id, payload.type_id)
        },
    )
    .await;
    assert_eq!(response.status, "ok");

    let response = ipc_with_payload(
        state,
        ipc_request(ListEdgeTypeRulesPayload {
            partition_id,
            edge_type_id: None,
        }),
        |state, payload| {
            mneme_list_edge_type_rules_inner(state, payload.partition_id, payload.edge_type_id)
        },
    )
    .await;
    assert_eq!(response.status, "ok");
}
