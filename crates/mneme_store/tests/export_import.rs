use aideon_mneme_store::ops::CreateNodeInput;
use aideon_mneme_store::{
    ActorId, CreateEdgeInput, EntityKind, ExportOptions, FieldDef, GraphReadApi, GraphWriteApi,
    Hlc, Id, ImportOptions, Layer, MetamodelApi, MetamodelBatch, MnemeConfig, MnemeExportApi,
    MnemeImportApi, MnemeSnapshotApi, MnemeStore, PartitionId, PropertyWriteApi,
    SetPropIntervalInput, SnapshotOptions, TypeDef, TypeFieldDef, ValidTime, Value, ValueType,
};
use serde_json::json;
use tempfile::tempdir;

#[tokio::test]
async fn export_import_roundtrip_ops() -> aideon_mneme_store::MnemeResult<()> {
    let dir = tempdir().expect("tempdir");
    let base = dir.path();
    let config = MnemeConfig::default_sqlite(base.join("source.sqlite").to_string_lossy());
    let source = MnemeStore::connect(&config, base).await?;
    let partition = PartitionId(Id::new());
    let actor = ActorId(Id::new());
    source
        .create_node(CreateNodeInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            node_id: Id::new(),
            type_id: None,
            acl_group_id: None,
            owner_actor_id: None,
            visibility: None,
            write_options: None,
        })
        .await?;
    let records = source
        .export_ops_stream(ExportOptions {
            partition,
            scenario_id: None,
            since_asserted_at: None,
            until_asserted_at: None,
            include_schema: false,
            include_data_ops: true,
            include_scenarios: false,
        })
        .await?
        .collect::<Vec<_>>();

    let target_config = MnemeConfig::default_sqlite(base.join("target.sqlite").to_string_lossy());
    let target = MnemeStore::connect(&target_config, base).await?;
    let target_partition = PartitionId(Id::new());
    let report = target
        .import_ops_stream(
            ImportOptions {
                target_partition,
                scenario_id: None,
                allow_partition_create: true,
                remap_actor_ids: Default::default(),
                strict_schema: true,
            },
            records.into_iter(),
        )
        .await?;
    assert!(report.ops_imported > 0);
    Ok(())
}

#[tokio::test]
async fn snapshot_export_import_roundtrip() -> aideon_mneme_store::MnemeResult<()> {
    let dir = tempdir().expect("tempdir");
    let base = dir.path();
    let config = MnemeConfig::default_sqlite(base.join("source.sqlite").to_string_lossy());
    let source = MnemeStore::connect(&config, base).await?;
    let partition = PartitionId(Id::new());
    let actor = ActorId(Id::new());

    let node_type_id = Id::new();
    let field_str = Id::new();
    let field_i64 = Id::new();
    let field_f64 = Id::new();
    let field_bool = Id::new();
    let field_time = Id::new();
    let field_ref = Id::new();
    let field_blob = Id::new();
    let field_json = Id::new();
    let metamodel = MetamodelBatch {
        types: vec![TypeDef {
            type_id: node_type_id,
            applies_to: EntityKind::Node,
            label: "Service".to_string(),
            is_abstract: false,
            parent_type_id: None,
        }],
        fields: vec![
            FieldDef {
                field_id: field_str,
                label: "name".to_string(),
                value_type: ValueType::Str,
                cardinality_multi: false,
                merge_policy: aideon_mneme_store::MergePolicy::Lww,
                is_indexed: true,
                disallow_overlap: false,
            },
            FieldDef {
                field_id: field_i64,
                label: "count".to_string(),
                value_type: ValueType::I64,
                cardinality_multi: false,
                merge_policy: aideon_mneme_store::MergePolicy::Lww,
                is_indexed: true,
                disallow_overlap: false,
            },
            FieldDef {
                field_id: field_f64,
                label: "ratio".to_string(),
                value_type: ValueType::F64,
                cardinality_multi: false,
                merge_policy: aideon_mneme_store::MergePolicy::Lww,
                is_indexed: true,
                disallow_overlap: false,
            },
            FieldDef {
                field_id: field_bool,
                label: "enabled".to_string(),
                value_type: ValueType::Bool,
                cardinality_multi: false,
                merge_policy: aideon_mneme_store::MergePolicy::Lww,
                is_indexed: true,
                disallow_overlap: false,
            },
            FieldDef {
                field_id: field_time,
                label: "since".to_string(),
                value_type: ValueType::Time,
                cardinality_multi: false,
                merge_policy: aideon_mneme_store::MergePolicy::Lww,
                is_indexed: true,
                disallow_overlap: false,
            },
            FieldDef {
                field_id: field_ref,
                label: "owner".to_string(),
                value_type: ValueType::Ref,
                cardinality_multi: false,
                merge_policy: aideon_mneme_store::MergePolicy::Lww,
                is_indexed: true,
                disallow_overlap: false,
            },
            FieldDef {
                field_id: field_blob,
                label: "blob".to_string(),
                value_type: ValueType::Blob,
                cardinality_multi: false,
                merge_policy: aideon_mneme_store::MergePolicy::Lww,
                is_indexed: false,
                disallow_overlap: false,
            },
            FieldDef {
                field_id: field_json,
                label: "meta".to_string(),
                value_type: ValueType::Json,
                cardinality_multi: false,
                merge_policy: aideon_mneme_store::MergePolicy::Lww,
                is_indexed: false,
                disallow_overlap: false,
            },
        ],
        type_fields: vec![
            TypeFieldDef {
                type_id: node_type_id,
                field_id: field_str,
                is_required: false,
                default_value: Some(Value::Str("default".to_string())),
                override_default: false,
                tighten_required: false,
                disallow_overlap: None,
            },
            TypeFieldDef {
                type_id: node_type_id,
                field_id: field_i64,
                is_required: false,
                default_value: Some(Value::I64(0)),
                override_default: false,
                tighten_required: false,
                disallow_overlap: None,
            },
            TypeFieldDef {
                type_id: node_type_id,
                field_id: field_f64,
                is_required: false,
                default_value: Some(Value::F64(0.0)),
                override_default: false,
                tighten_required: false,
                disallow_overlap: None,
            },
            TypeFieldDef {
                type_id: node_type_id,
                field_id: field_bool,
                is_required: false,
                default_value: Some(Value::Bool(false)),
                override_default: false,
                tighten_required: false,
                disallow_overlap: None,
            },
            TypeFieldDef {
                type_id: node_type_id,
                field_id: field_time,
                is_required: false,
                default_value: Some(Value::Time(ValidTime(0))),
                override_default: false,
                tighten_required: false,
                disallow_overlap: None,
            },
            TypeFieldDef {
                type_id: node_type_id,
                field_id: field_ref,
                is_required: false,
                default_value: Some(Value::Ref(Id::from_bytes([0u8; 16]))),
                override_default: false,
                tighten_required: false,
                disallow_overlap: None,
            },
            TypeFieldDef {
                type_id: node_type_id,
                field_id: field_blob,
                is_required: false,
                default_value: Some(Value::Blob(vec![])),
                override_default: false,
                tighten_required: false,
                disallow_overlap: None,
            },
            TypeFieldDef {
                type_id: node_type_id,
                field_id: field_json,
                is_required: false,
                default_value: Some(Value::Json(json!({}))),
                override_default: false,
                tighten_required: false,
                disallow_overlap: None,
            },
        ],
        edge_type_rules: Vec::new(),
        metamodel_version: None,
        metamodel_source: None,
    };
    source
        .upsert_metamodel_batch(partition, actor, Hlc::now(), metamodel.clone())
        .await?;

    source
        .compile_effective_schema(partition, actor, Hlc::now(), node_type_id)
        .await?;

    let owner = Id::new();
    source
        .create_node(CreateNodeInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            node_id: owner,
            type_id: Some(node_type_id),
            acl_group_id: None,
            owner_actor_id: None,
            visibility: None,
            write_options: None,
        })
        .await?;

    let node_id = Id::new();
    source
        .create_node(CreateNodeInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            node_id,
            type_id: Some(node_type_id),
            acl_group_id: None,
            owner_actor_id: None,
            visibility: None,
            write_options: None,
        })
        .await?;

    let edge_id = Id::new();
    source
        .create_edge(CreateEdgeInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            edge_id,
            type_id: None,
            src_id: node_id,
            dst_id: owner,
            exists_valid_from: ValidTime(0),
            exists_valid_to: None,
            layer: Layer::Actual,
            weight: Some(1.0),
            acl_group_id: None,
            owner_actor_id: None,
            visibility: None,
            write_options: None,
        })
        .await?;

    let writes = [
        (field_str, Value::Str("alpha".to_string())),
        (field_i64, Value::I64(42)),
        (field_f64, Value::F64(0.25)),
        (field_bool, Value::Bool(true)),
        (field_time, Value::Time(ValidTime(123))),
        (field_ref, Value::Ref(owner)),
        (field_blob, Value::Blob(vec![1, 2, 3])),
        (field_json, Value::Json(json!({"k":"v"}))),
    ];
    for (field_id, value) in writes {
        source
            .set_property_interval(SetPropIntervalInput {
                partition,
                scenario_id: None,
                actor,
                asserted_at: Hlc::now(),
                entity_id: node_id,
                field_id,
                value,
                valid_from: ValidTime(0),
                valid_to: None,
                layer: Layer::Actual,
                write_options: None,
            })
            .await?;
    }

    let snapshot = source
        .export_snapshot_stream(SnapshotOptions {
            partition_id: partition,
            scenario_id: None,
            as_of_asserted_at: Hlc::now(),
            include_facts: true,
            include_entities: true,
        })
        .await?
        .collect::<Vec<_>>();

    for record_type in [
        "snapshot_entity",
        "snapshot_edge",
        "snapshot_edge_exists",
        "snapshot_fact_str",
        "snapshot_fact_i64",
        "snapshot_fact_f64",
        "snapshot_fact_bool",
        "snapshot_fact_time",
        "snapshot_fact_ref",
        "snapshot_fact_blob",
        "snapshot_fact_json",
    ] {
        assert!(
            snapshot.iter().any(|rec| rec.record_type == record_type),
            "snapshot missing record type {record_type}"
        );
    }

    let target_dir = tempdir().expect("tempdir");
    let target_base = target_dir.path();
    let target_config =
        MnemeConfig::default_sqlite(target_base.join("target.sqlite").to_string_lossy());
    let target = MnemeStore::connect(&target_config, target_base).await?;
    target
        .import_snapshot_stream(
            ImportOptions {
                target_partition: partition,
                scenario_id: None,
                allow_partition_create: true,
                remap_actor_ids: Default::default(),
                strict_schema: false,
            },
            snapshot.into_iter(),
        )
        .await?;

    target
        .upsert_metamodel_batch(partition, actor, Hlc::now(), metamodel)
        .await?;

    let read = target
        .read_entity_at_time(aideon_mneme_store::ReadEntityAtTimeInput {
            partition,
            scenario_id: None,
            security_context: None,
            entity_id: node_id,
            at_valid_time: ValidTime(1),
            as_of_asserted_at: None,
            field_ids: Some(vec![
                field_str, field_i64, field_f64, field_bool, field_time, field_ref, field_blob,
                field_json,
            ]),
            include_defaults: false,
        })
        .await?;
    assert_eq!(
        read.properties.get(&field_str),
        Some(&aideon_mneme_store::ReadValue::Single(Value::Str(
            "alpha".to_string()
        )))
    );
    assert_eq!(
        read.properties.get(&field_i64),
        Some(&aideon_mneme_store::ReadValue::Single(Value::I64(42)))
    );

    let empty_dir = tempdir().expect("tempdir");
    let empty_base = empty_dir.path();
    let empty_config =
        MnemeConfig::default_sqlite(empty_base.join("empty.sqlite").to_string_lossy());
    let empty_store = MnemeStore::connect(&empty_config, empty_base).await?;
    let empty_partition = PartitionId(Id::new());
    let empty_result = empty_store
        .import_snapshot_stream(
            ImportOptions {
                target_partition: empty_partition,
                scenario_id: None,
                allow_partition_create: true,
                remap_actor_ids: Default::default(),
                strict_schema: false,
            },
            Vec::new().into_iter(),
        )
        .await;
    assert!(empty_result.is_err());

    Ok(())
}
