use super::*;
use crate::{FieldDef, SetEdgeExistenceIntervalInput, TypeDef, TypeFieldDef};
use tempfile::tempdir;

fn field_def(
    field_id: Id,
    label: &str,
    value_type: ValueType,
    merge_policy: MergePolicy,
) -> FieldDef {
    FieldDef {
        field_id,
        label: label.to_string(),
        value_type,
        cardinality_multi: false,
        merge_policy,
        is_indexed: true,
        disallow_overlap: false,
    }
}

fn type_field_def(type_id: Id, field_id: Id) -> TypeFieldDef {
    TypeFieldDef {
        type_id,
        field_id,
        is_required: false,
        default_value: None,
        override_default: false,
        tighten_required: false,
        disallow_overlap: None,
    }
}

#[tokio::test]
async fn ingest_ops_applies_payloads() -> MnemeResult<()> {
    let dir = tempdir().expect("tempdir");
    let base = dir.path();
    let source_config = MnemeConfig::default_sqlite(base.join("source.sqlite").to_string_lossy());
    let store = MnemeStore::connect(&source_config, base).await?;
    let partition = PartitionId(Id::new());
    let actor = ActorId(Id::new());
    let type_id = Id::new();
    let field_name = Id::new();
    let field_tag = Id::new();
    let field_count = Id::new();

    store
        .upsert_metamodel_batch(
            partition,
            actor,
            Hlc::now(),
            MetamodelBatch {
                types: vec![TypeDef {
                    type_id,
                    applies_to: EntityKind::Node,
                    label: "Service".to_string(),
                    is_abstract: false,
                    parent_type_id: None,
                }],
                fields: vec![
                    field_def(field_name, "name", ValueType::Str, MergePolicy::Lww),
                    FieldDef {
                        field_id: field_tag,
                        label: "tags".to_string(),
                        value_type: ValueType::Str,
                        cardinality_multi: true,
                        merge_policy: MergePolicy::OrSet,
                        is_indexed: true,
                        disallow_overlap: false,
                    },
                    field_def(field_count, "count", ValueType::I64, MergePolicy::Counter),
                ],
                type_fields: vec![
                    type_field_def(type_id, field_name),
                    type_field_def(type_id, field_tag),
                    type_field_def(type_id, field_count),
                ],
                edge_type_rules: vec![],
                metamodel_version: None,
                metamodel_source: None,
            },
        )
        .await?;

    let node_a = Id::new();
    let node_b = Id::new();
    let edge_id = Id::new();
    let asserted_at = Hlc::now();
    store
        .create_node(CreateNodeInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at,
            node_id: node_a,
            type_id: Some(type_id),
            acl_group_id: None,
            owner_actor_id: None,
            visibility: None,
            write_options: None,
        })
        .await?;
    store
        .create_node(CreateNodeInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at,
            node_id: node_b,
            type_id: Some(type_id),
            acl_group_id: None,
            owner_actor_id: None,
            visibility: None,
            write_options: None,
        })
        .await?;
    store
        .create_edge(CreateEdgeInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at,
            edge_id,
            type_id: None,
            src_id: node_a,
            dst_id: node_b,
            exists_valid_from: ValidTime(0),
            exists_valid_to: Some(ValidTime(10)),
            layer: Layer::Actual,
            weight: None,
            acl_group_id: None,
            owner_actor_id: None,
            visibility: None,
            write_options: None,
        })
        .await?;
    store
        .set_edge_existence_interval(SetEdgeExistenceIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at,
            edge_id,
            valid_from: ValidTime(0),
            valid_to: Some(ValidTime(10)),
            layer: Layer::Actual,
            is_tombstone: false,
            write_options: None,
        })
        .await?;
    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at,
            entity_id: node_a,
            field_id: field_name,
            value: Value::Str("alpha".to_string()),
            valid_from: ValidTime(0),
            valid_to: Some(ValidTime(10)),
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;
    store
        .clear_property_interval(ClearPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at,
            entity_id: node_a,
            field_id: field_name,
            valid_from: ValidTime(10),
            valid_to: Some(ValidTime(20)),
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;
    store
        .or_set_update(OrSetUpdateInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at,
            entity_id: node_a,
            field_id: field_tag,
            op: SetOp::Add,
            element: Value::Str("beta".to_string()),
            valid_from: ValidTime(0),
            valid_to: Some(ValidTime(10)),
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;
    store
        .or_set_update(OrSetUpdateInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at,
            entity_id: node_a,
            field_id: field_tag,
            op: SetOp::Remove,
            element: Value::Str("beta".to_string()),
            valid_from: ValidTime(10),
            valid_to: Some(ValidTime(20)),
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;
    store
        .counter_update(CounterUpdateInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at,
            entity_id: node_a,
            field_id: field_count,
            delta: 3,
            valid_from: ValidTime(0),
            valid_to: Some(ValidTime(10)),
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;

    let scenario_id = store
        .create_scenario(CreateScenarioInput {
            partition,
            actor,
            asserted_at: Hlc::now(),
            name: "scenario-a".to_string(),
        })
        .await?;
    store
        .delete_scenario(partition, actor, Hlc::now(), scenario_id)
        .await?;
    store
        .tombstone_entity(partition, None, actor, Hlc::now(), edge_id)
        .await?;

    let mut ops = store
        .export_ops(ExportOpsInput {
            partition,
            scenario_id: None,
            since_asserted_at: None,
            limit: 500,
        })
        .await?;
    let mut scenario_ops = store
        .export_ops(ExportOpsInput {
            partition,
            scenario_id: Some(scenario_id),
            since_asserted_at: None,
            limit: 500,
        })
        .await?;
    ops.append(&mut scenario_ops);

    let target_config = MnemeConfig::default_sqlite(base.join("target.sqlite").to_string_lossy());
    let target = MnemeStore::connect(&target_config, base).await?;
    target.ingest_ops(partition, ops).await?;

    let entity = target
        .read_entity_at_time(ReadEntityAtTimeInput {
            partition,
            scenario_id: None,
            security_context: None,
            entity_id: node_a,
            at_valid_time: ValidTime(0),
            as_of_asserted_at: None,
            field_ids: None,
            include_defaults: true,
        })
        .await?;
    assert_eq!(entity.entity_id, node_a);
    Ok(())
}

#[tokio::test]
async fn rebuild_index_tables_populates_indexes() -> MnemeResult<()> {
    let dir = tempdir().expect("tempdir");
    let base = dir.path();
    let config = MnemeConfig::default_sqlite(base.join("index-rebuild.sqlite").to_string_lossy());
    let store = MnemeStore::connect(&config, base).await?;
    let partition = PartitionId(Id::new());
    let actor = ActorId(Id::new());
    let type_id = Id::new();

    let field_str = Id::new();
    let field_i64 = Id::new();
    let field_f64 = Id::new();
    let field_bool = Id::new();
    let field_time = Id::new();
    let field_ref = Id::new();
    store
        .upsert_metamodel_batch(
            partition,
            actor,
            Hlc::now(),
            MetamodelBatch {
                types: vec![TypeDef {
                    type_id,
                    applies_to: EntityKind::Node,
                    label: "Node".to_string(),
                    is_abstract: false,
                    parent_type_id: None,
                }],
                fields: vec![
                    field_def(field_str, "name", ValueType::Str, MergePolicy::Lww),
                    field_def(field_i64, "count", ValueType::I64, MergePolicy::Lww),
                    field_def(field_f64, "ratio", ValueType::F64, MergePolicy::Lww),
                    field_def(field_bool, "active", ValueType::Bool, MergePolicy::Lww),
                    field_def(field_time, "starts", ValueType::Time, MergePolicy::Lww),
                    field_def(field_ref, "ref", ValueType::Ref, MergePolicy::Lww),
                ],
                type_fields: vec![
                    type_field_def(type_id, field_str),
                    type_field_def(type_id, field_i64),
                    type_field_def(type_id, field_f64),
                    type_field_def(type_id, field_bool),
                    type_field_def(type_id, field_time),
                    type_field_def(type_id, field_ref),
                ],
                edge_type_rules: vec![],
                metamodel_version: None,
                metamodel_source: None,
            },
        )
        .await?;

    let node_a = Id::new();
    let node_b = Id::new();
    let asserted_at = Hlc::now();
    store
        .create_node(CreateNodeInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at,
            node_id: node_a,
            type_id: Some(type_id),
            acl_group_id: None,
            owner_actor_id: None,
            visibility: None,
            write_options: None,
        })
        .await?;
    store
        .create_node(CreateNodeInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at,
            node_id: node_b,
            type_id: Some(type_id),
            acl_group_id: None,
            owner_actor_id: None,
            visibility: None,
            write_options: None,
        })
        .await?;
    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at,
            entity_id: node_a,
            field_id: field_str,
            value: Value::Str("Alpha".to_string()),
            valid_from: ValidTime(0),
            valid_to: Some(ValidTime(10)),
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;
    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at,
            entity_id: node_a,
            field_id: field_i64,
            value: Value::I64(42),
            valid_from: ValidTime(0),
            valid_to: Some(ValidTime(10)),
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;
    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at,
            entity_id: node_a,
            field_id: field_f64,
            value: Value::F64(std::f64::consts::PI),
            valid_from: ValidTime(0),
            valid_to: Some(ValidTime(10)),
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;
    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at,
            entity_id: node_a,
            field_id: field_bool,
            value: Value::Bool(true),
            valid_from: ValidTime(0),
            valid_to: Some(ValidTime(10)),
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;
    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at,
            entity_id: node_a,
            field_id: field_time,
            value: Value::Time(ValidTime(123)),
            valid_from: ValidTime(0),
            valid_to: Some(ValidTime(10)),
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;
    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at,
            entity_id: node_a,
            field_id: field_ref,
            value: Value::Ref(node_b),
            valid_from: ValidTime(0),
            valid_to: Some(ValidTime(10)),
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;

    let tx = store.conn.begin().await?;
    store.rebuild_index_tables(&tx, partition).await?;
    tx.commit().await?;

    let rows = query_all(
        &store.conn,
        &Query::select()
            .from(AideonIdxFieldStr::Table)
            .column(AideonIdxFieldStr::EntityId)
            .and_where(
                Expr::col(AideonIdxFieldStr::PartitionId).eq(id_value(store.backend, partition.0)),
            )
            .to_owned(),
    )
    .await?;
    assert!(!rows.is_empty());

    let rows = query_all(
        &store.conn,
        &Query::select()
            .from(AideonIdxFieldI64::Table)
            .column(AideonIdxFieldI64::EntityId)
            .and_where(
                Expr::col(AideonIdxFieldI64::PartitionId).eq(id_value(store.backend, partition.0)),
            )
            .to_owned(),
    )
    .await?;
    assert!(!rows.is_empty());

    let rows = query_all(
        &store.conn,
        &Query::select()
            .from(AideonIdxFieldF64::Table)
            .column(AideonIdxFieldF64::EntityId)
            .and_where(
                Expr::col(AideonIdxFieldF64::PartitionId).eq(id_value(store.backend, partition.0)),
            )
            .to_owned(),
    )
    .await?;
    assert!(!rows.is_empty());

    let rows = query_all(
        &store.conn,
        &Query::select()
            .from(AideonIdxFieldBool::Table)
            .column(AideonIdxFieldBool::EntityId)
            .and_where(
                Expr::col(AideonIdxFieldBool::PartitionId).eq(id_value(store.backend, partition.0)),
            )
            .to_owned(),
    )
    .await?;
    assert!(!rows.is_empty());

    let rows = query_all(
        &store.conn,
        &Query::select()
            .from(AideonIdxFieldTime::Table)
            .column(AideonIdxFieldTime::EntityId)
            .and_where(
                Expr::col(AideonIdxFieldTime::PartitionId).eq(id_value(store.backend, partition.0)),
            )
            .to_owned(),
    )
    .await?;
    assert!(!rows.is_empty());

    let rows = query_all(
        &store.conn,
        &Query::select()
            .from(AideonIdxFieldRef::Table)
            .column(AideonIdxFieldRef::EntityId)
            .and_where(
                Expr::col(AideonIdxFieldRef::PartitionId).eq(id_value(store.backend, partition.0)),
            )
            .to_owned(),
    )
    .await?;
    assert!(!rows.is_empty());
    Ok(())
}

#[tokio::test]
async fn compaction_merges_adjacent_intervals() -> MnemeResult<()> {
    let dir = tempdir().expect("tempdir");
    let base = dir.path();
    let config = MnemeConfig::default_sqlite(base.join("compact-merge.sqlite").to_string_lossy());
    let store = MnemeStore::connect(&config, base).await?;
    let partition = PartitionId(Id::new());
    let actor = ActorId(Id::new());
    let type_id = Id::new();
    let field_id = Id::new();

    store
        .upsert_metamodel_batch(
            partition,
            actor,
            Hlc::now(),
            MetamodelBatch {
                types: vec![TypeDef {
                    type_id,
                    applies_to: EntityKind::Node,
                    label: "Service".to_string(),
                    is_abstract: false,
                    parent_type_id: None,
                }],
                fields: vec![field_def(
                    field_id,
                    "name",
                    ValueType::Str,
                    MergePolicy::Lww,
                )],
                type_fields: vec![type_field_def(type_id, field_id)],
                edge_type_rules: vec![],
                metamodel_version: None,
                metamodel_source: None,
            },
        )
        .await?;

    let node_id = Id::new();
    store
        .create_node(CreateNodeInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            node_id,
            type_id: Some(type_id),
            acl_group_id: None,
            owner_actor_id: None,
            visibility: None,
            write_options: None,
        })
        .await?;

    let tx = store.conn.begin().await?;
    store.ensure_partition(&tx, partition, actor).await?;
    let value = Value::Str("alpha".to_string());
    let payload = OpPayload::SetProperty(SetPropIntervalInput {
        partition,
        scenario_id: None,
        actor,
        asserted_at: Hlc::now(),
        entity_id: node_id,
        field_id,
        value: value.clone(),
        valid_from: ValidTime(0),
        valid_to: Some(ValidTime(5)),
        layer: Layer::Actual,
        write_options: None,
    });
    let (op_id, asserted_at, _payload, _op_type) = store
        .insert_op(&tx, partition, actor, Hlc::now(), &payload)
        .await?;
    let input = PropertyFactInsertInput {
        partition,
        scenario_id: None,
        entity_id: node_id,
        field_id,
        value: &value,
        valid_from: ValidTime(0),
        valid_to: Some(ValidTime(5)),
        layer: Layer::Actual,
        asserted_at,
        op_id,
        is_tombstone: false,
    };
    insert_property_fact(&tx, store.backend, input).await?;
    let input = PropertyFactInsertInput {
        partition,
        scenario_id: None,
        entity_id: node_id,
        field_id,
        value: &value,
        valid_from: ValidTime(5),
        valid_to: Some(ValidTime(10)),
        layer: Layer::Actual,
        asserted_at,
        op_id,
        is_tombstone: false,
    };
    insert_property_fact(&tx, store.backend, input).await?;

    let edge_id = Id::new();
    let edge_insert = Query::insert()
        .into_table(AideonEdgeExistsFacts::Table)
        .columns([
            AideonEdgeExistsFacts::PartitionId,
            AideonEdgeExistsFacts::ScenarioId,
            AideonEdgeExistsFacts::EdgeId,
            AideonEdgeExistsFacts::ValidFrom,
            AideonEdgeExistsFacts::ValidTo,
            AideonEdgeExistsFacts::ValidBucket,
            AideonEdgeExistsFacts::Layer,
            AideonEdgeExistsFacts::AssertedAtHlc,
            AideonEdgeExistsFacts::OpId,
            AideonEdgeExistsFacts::IsTombstone,
        ])
        .values_panic([
            id_value(store.backend, partition.0).into(),
            SeaValue::BigInt(None).into(),
            id_value(store.backend, edge_id).into(),
            0i64.into(),
            5i64.into(),
            valid_bucket(ValidTime(0)).into(),
            MnemeStore::layer_value(Layer::Actual).into(),
            asserted_at.as_i64().into(),
            id_value(store.backend, op_id.0).into(),
            false.into(),
        ])
        .values_panic([
            id_value(store.backend, partition.0).into(),
            SeaValue::BigInt(None).into(),
            id_value(store.backend, edge_id).into(),
            5i64.into(),
            10i64.into(),
            valid_bucket(ValidTime(5)).into(),
            MnemeStore::layer_value(Layer::Actual).into(),
            asserted_at.as_i64().into(),
            id_value(store.backend, op_id.0).into(),
            false.into(),
        ])
        .to_owned();
    exec(&tx, &edge_insert).await?;
    tx.commit().await?;

    let before = query_all(
        &store.conn,
        &Query::select()
            .from(AideonPropFactStr::Table)
            .column(AideonPropFactStr::ValidFrom)
            .and_where(
                Expr::col(AideonPropFactStr::PartitionId).eq(id_value(store.backend, partition.0)),
            )
            .to_owned(),
    )
    .await?;
    let before_edges = query_all(
        &store.conn,
        &Query::select()
            .from(AideonEdgeExistsFacts::Table)
            .column(AideonEdgeExistsFacts::ValidFrom)
            .and_where(
                Expr::col(AideonEdgeExistsFacts::PartitionId)
                    .eq(id_value(store.backend, partition.0)),
            )
            .to_owned(),
    )
    .await?;

    let tx = store.conn.begin().await?;
    store.compact_partition(&tx, partition).await?;
    tx.commit().await?;

    let after = query_all(
        &store.conn,
        &Query::select()
            .from(AideonPropFactStr::Table)
            .column(AideonPropFactStr::ValidFrom)
            .and_where(
                Expr::col(AideonPropFactStr::PartitionId).eq(id_value(store.backend, partition.0)),
            )
            .to_owned(),
    )
    .await?;
    let after_edges = query_all(
        &store.conn,
        &Query::select()
            .from(AideonEdgeExistsFacts::Table)
            .column(AideonEdgeExistsFacts::ValidFrom)
            .and_where(
                Expr::col(AideonEdgeExistsFacts::PartitionId)
                    .eq(id_value(store.backend, partition.0)),
            )
            .to_owned(),
    )
    .await?;

    assert!(before.len() > after.len());
    assert!(before_edges.len() > after_edges.len());
    Ok(())
}

#[tokio::test]
async fn retention_policy_cleanup_paths() -> MnemeResult<()> {
    let dir = tempdir().expect("tempdir");
    let base = dir.path();
    let config = MnemeConfig::default_sqlite(base.join("retention.sqlite").to_string_lossy());
    let store = MnemeStore::connect(&config, base).await?;
    let partition = PartitionId(Id::new());
    let tx = store.conn.begin().await?;
    store
        .apply_retention_policy(
            &tx,
            partition,
            &RetentionPolicy {
                keep_ops_days: Some(1),
                keep_facts_days: Some(1),
                keep_failed_jobs_days: Some(1),
                keep_pagerank_runs_days: Some(1),
            },
        )
        .await?;
    tx.commit().await?;
    Ok(())
}

#[tokio::test]
async fn refresh_jobs_cover_integrity_and_analytics() -> MnemeResult<()> {
    let dir = tempdir().expect("tempdir");
    let base = dir.path();
    let config = MnemeConfig::default_sqlite(base.join("refresh.sqlite").to_string_lossy());
    let store = MnemeStore::connect(&config, base).await?;
    let partition = PartitionId(Id::new());
    let tx = store.conn.begin().await?;
    store
        .refresh_integrity(&tx, partition, None, "test-refresh")
        .await?;
    store.refresh_analytics(&tx, partition, None).await?;
    tx.commit().await?;
    Ok(())
}

#[tokio::test]
async fn mark_job_failed_records_event_and_list_failed_jobs() -> MnemeResult<()> {
    let dir = tempdir().expect("tempdir");
    let base = dir.path();
    let config = MnemeConfig::default_sqlite(base.join("jobs.sqlite").to_string_lossy());
    let store = MnemeStore::connect(&config, base).await?;
    let partition = PartitionId(Id::new());
    let tx = store.conn.begin().await?;
    let job_id = store
        .enqueue_job(&tx, partition, "unknown", vec![], 0, None)
        .await?;
    let job = JobRecord {
        partition,
        job_id,
        job_type: "unknown".to_string(),
        status: 0,
        priority: 0,
        attempts: 0,
        max_attempts: 1,
        lease_expires_at: None,
        next_run_after: None,
        created_asserted_at: Hlc::now(),
        updated_asserted_at: Hlc::now(),
        dedupe_key: None,
        last_error: None,
        payload: vec![],
    };
    store.mark_job_failed(&tx, partition, &job, "boom").await?;
    tx.commit().await?;

    let failed = store.list_failed_jobs(partition, 10).await?;
    assert!(!failed.is_empty());
    Ok(())
}

#[test]
fn filter_matches_compares_values() {
    let field_id = Id::new();
    let filter = FieldFilter {
        field_id,
        op: CompareOp::Prefix,
        value: Value::Str("Al".to_string()),
    };
    assert!(
        filter_matches(
            Some(ReadValue::Single(Value::Str("Alpha".to_string()))),
            &filter
        )
        .expect("prefix matches")
    );

    let filter = FieldFilter {
        field_id,
        op: CompareOp::Contains,
        value: Value::Str("lp".to_string()),
    };
    assert!(
        filter_matches(
            Some(ReadValue::Single(Value::Str("Alpha".to_string()))),
            &filter
        )
        .expect("contains matches")
    );

    let filter = FieldFilter {
        field_id,
        op: CompareOp::Ne,
        value: Value::I64(10),
    };
    assert!(
        filter_matches(
            Some(ReadValue::Multi(vec![Value::I64(11), Value::I64(12)])),
            &filter
        )
        .expect("ne matches")
    );

    let filter = FieldFilter {
        field_id,
        op: CompareOp::Eq,
        value: Value::Bool(true),
    };
    assert!(
        filter_matches(
            Some(ReadValue::MultiLimited {
                values: vec![Value::Bool(true)],
                more_available: false
            }),
            &filter
        )
        .expect("multi limited matches")
    );

    let filter = FieldFilter {
        field_id,
        op: CompareOp::Gte,
        value: Value::Time(ValidTime(5)),
    };
    assert!(compare_value(&Value::Time(ValidTime(6)), &filter).expect("time compare"));

    let ref_id = Id::new();
    let filter = FieldFilter {
        field_id,
        op: CompareOp::Eq,
        value: Value::Ref(ref_id),
    };
    assert!(compare_value(&Value::Ref(ref_id), &filter).expect("ref eq"));

    let filter = FieldFilter {
        field_id,
        op: CompareOp::Prefix,
        value: Value::I64(1),
    };
    assert!(compare_value(&Value::I64(1), &filter).is_err());

    let filter = FieldFilter {
        field_id,
        op: CompareOp::Eq,
        value: Value::I64(1),
    };
    assert!(compare_value(&Value::Str("oops".to_string()), &filter).is_err());
}
