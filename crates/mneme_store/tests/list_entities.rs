use aideon_mneme_store::{
    CompareOp, CreateNodeInput, EntityKind, FieldDef, FieldFilter, GraphReadApi, GraphWriteApi,
    Hlc, Id, Layer, ListEntitiesInput, MetamodelApi, MetamodelBatch, MnemeConfig, MnemeStore,
    PartitionId, PropertyWriteApi, SetPropIntervalInput, TypeDef, TypeFieldDef, ValidTime, Value,
    ValueType, encode_entity_cursor,
};
use tempfile::tempdir;

fn new_ids() -> (PartitionId, aideon_mneme_store::ActorId) {
    (
        PartitionId(Id::new()),
        aideon_mneme_store::ActorId(Id::new()),
    )
}

#[tokio::test]
async fn list_entities_filters_indexed_fields() -> aideon_mneme_store::MnemeResult<()> {
    let dir = tempdir().expect("tempdir");
    let base = dir.path();
    let config = MnemeConfig::default_sqlite(base.join("mneme.sqlite").to_string_lossy());
    let store = MnemeStore::connect(&config, base).await?;
    let (partition, actor) = new_ids();
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
                fields: vec![FieldDef {
                    field_id,
                    label: "name".to_string(),
                    value_type: ValueType::Str,
                    cardinality_multi: false,
                    merge_policy: aideon_mneme_store::MergePolicy::Lww,
                    is_indexed: true,
                    disallow_overlap: false,
                }],
                type_fields: vec![TypeFieldDef {
                    type_id,
                    field_id,
                    is_required: false,
                    default_value: None,
                    override_default: false,
                    tighten_required: false,
                    disallow_overlap: None,
                }],
                edge_type_rules: Vec::new(),
                metamodel_version: None,
                metamodel_source: None,
            },
        )
        .await?;

    let node_alpha = Id::new();
    let node_beta = Id::new();
    store
        .create_node(CreateNodeInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            node_id: node_alpha,
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
            asserted_at: Hlc::now(),
            node_id: node_beta,
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
            asserted_at: Hlc::now(),
            entity_id: node_alpha,
            field_id,
            value: Value::Str("alpha".to_string()),
            valid_from: ValidTime(0),
            valid_to: None,
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;
    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            entity_id: node_beta,
            field_id,
            value: Value::Str("beta".to_string()),
            valid_from: ValidTime(0),
            valid_to: None,
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;

    let results = store
        .list_entities(ListEntitiesInput {
            partition,
            scenario_id: None,
            security_context: None,
            kind: Some(EntityKind::Node),
            type_id: Some(type_id),
            at_valid_time: ValidTime(1),
            as_of_asserted_at: None,
            filters: vec![FieldFilter {
                field_id,
                op: CompareOp::Eq,
                value: Value::Str("alpha".to_string()),
            }],
            limit: 10,
            cursor: None,
        })
        .await?;

    assert_eq!(results.len(), 1);
    assert_eq!(results[0].entity_id, node_alpha);
    Ok(())
}

#[tokio::test]
async fn list_entities_cursor() -> aideon_mneme_store::MnemeResult<()> {
    let dir = tempdir().expect("tempdir");
    let base = dir.path();
    let config = MnemeConfig::default_sqlite(base.join("cursor.sqlite").to_string_lossy());
    let store = MnemeStore::connect(&config, base).await?;
    let (partition, actor) = new_ids();

    let first = Id::new();
    let second = Id::new();
    store
        .create_node(CreateNodeInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            node_id: first,
            type_id: None,
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
            asserted_at: Hlc::now(),
            node_id: second,
            type_id: None,
            acl_group_id: None,
            owner_actor_id: None,
            visibility: None,
            write_options: None,
        })
        .await?;

    let results = store
        .list_entities(ListEntitiesInput {
            partition,
            scenario_id: None,
            security_context: None,
            kind: Some(EntityKind::Node),
            type_id: None,
            at_valid_time: ValidTime(1),
            as_of_asserted_at: None,
            filters: vec![],
            limit: 1,
            cursor: None,
        })
        .await?;
    assert_eq!(results.len(), 1);
    let first_page_id = results[0].entity_id;
    let cursor = encode_entity_cursor(first_page_id)?;

    let results = store
        .list_entities(ListEntitiesInput {
            partition,
            scenario_id: None,
            security_context: None,
            kind: Some(EntityKind::Node),
            type_id: None,
            at_valid_time: ValidTime(1),
            as_of_asserted_at: None,
            filters: vec![],
            limit: 10,
            cursor: Some(cursor),
        })
        .await?;
    assert!(results.iter().all(|item| item.entity_id != first_page_id));
    Ok(())
}

#[tokio::test]
async fn list_entities_filters_all_index_value_types() -> aideon_mneme_store::MnemeResult<()> {
    let dir = tempdir().expect("tempdir");
    let base = dir.path();
    let config = MnemeConfig::default_sqlite(base.join("filters.sqlite").to_string_lossy());
    let store = MnemeStore::connect(&config, base).await?;
    let (partition, actor) = new_ids();

    let node_type_id = Id::new();
    let owner_a = Id::new();
    let owner_b = Id::new();
    let entity_a = Id::new();
    let entity_b = Id::new();

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
                ],
                type_fields: vec![
                    TypeFieldDef {
                        type_id: node_type_id,
                        field_id: field_str,
                        is_required: false,
                        default_value: None,
                        override_default: false,
                        tighten_required: false,
                        disallow_overlap: None,
                    },
                    TypeFieldDef {
                        type_id: node_type_id,
                        field_id: field_i64,
                        is_required: false,
                        default_value: None,
                        override_default: false,
                        tighten_required: false,
                        disallow_overlap: None,
                    },
                    TypeFieldDef {
                        type_id: node_type_id,
                        field_id: field_f64,
                        is_required: false,
                        default_value: None,
                        override_default: false,
                        tighten_required: false,
                        disallow_overlap: None,
                    },
                    TypeFieldDef {
                        type_id: node_type_id,
                        field_id: field_bool,
                        is_required: false,
                        default_value: None,
                        override_default: false,
                        tighten_required: false,
                        disallow_overlap: None,
                    },
                    TypeFieldDef {
                        type_id: node_type_id,
                        field_id: field_time,
                        is_required: false,
                        default_value: None,
                        override_default: false,
                        tighten_required: false,
                        disallow_overlap: None,
                    },
                    TypeFieldDef {
                        type_id: node_type_id,
                        field_id: field_ref,
                        is_required: false,
                        default_value: None,
                        override_default: false,
                        tighten_required: false,
                        disallow_overlap: None,
                    },
                ],
                edge_type_rules: Vec::new(),
                metamodel_version: None,
                metamodel_source: None,
            },
        )
        .await?;

    for (id, owner) in [
        (owner_a, None),
        (owner_b, None),
        (entity_a, Some(owner_a)),
        (entity_b, Some(owner_b)),
    ] {
        store
            .create_node(CreateNodeInput {
                partition,
                scenario_id: None,
                actor,
                asserted_at: Hlc::now(),
                node_id: id,
                type_id: Some(node_type_id),
                acl_group_id: None,
                owner_actor_id: None,
                visibility: None,
                write_options: None,
            })
            .await?;
        if let Some(owner_id) = owner {
            store
                .set_property_interval(SetPropIntervalInput {
                    partition,
                    scenario_id: None,
                    actor,
                    asserted_at: Hlc::now(),
                    entity_id: id,
                    field_id: field_ref,
                    value: Value::Ref(owner_id),
                    valid_from: ValidTime(0),
                    valid_to: None,
                    layer: Layer::Actual,
                    write_options: None,
                })
                .await?;
        }
    }

    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            entity_id: entity_a,
            field_id: field_str,
            value: Value::Str("alpha".to_string()),
            valid_from: ValidTime(0),
            valid_to: None,
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;
    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            entity_id: entity_b,
            field_id: field_str,
            value: Value::Str("beta".to_string()),
            valid_from: ValidTime(0),
            valid_to: None,
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;

    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            entity_id: entity_a,
            field_id: field_i64,
            value: Value::I64(5),
            valid_from: ValidTime(0),
            valid_to: None,
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;
    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            entity_id: entity_b,
            field_id: field_i64,
            value: Value::I64(10),
            valid_from: ValidTime(0),
            valid_to: None,
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;

    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            entity_id: entity_a,
            field_id: field_f64,
            value: Value::F64(0.1),
            valid_from: ValidTime(0),
            valid_to: None,
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;
    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            entity_id: entity_b,
            field_id: field_f64,
            value: Value::F64(0.9),
            valid_from: ValidTime(0),
            valid_to: None,
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;

    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            entity_id: entity_a,
            field_id: field_bool,
            value: Value::Bool(true),
            valid_from: ValidTime(0),
            valid_to: None,
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;
    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            entity_id: entity_b,
            field_id: field_bool,
            value: Value::Bool(false),
            valid_from: ValidTime(0),
            valid_to: None,
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;

    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            entity_id: entity_a,
            field_id: field_time,
            value: Value::Time(ValidTime(100)),
            valid_from: ValidTime(0),
            valid_to: None,
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;
    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            entity_id: entity_b,
            field_id: field_time,
            value: Value::Time(ValidTime(200)),
            valid_from: ValidTime(0),
            valid_to: None,
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;

    async fn ids(
        store: &MnemeStore,
        input: ListEntitiesInput,
    ) -> aideon_mneme_store::MnemeResult<Vec<Id>> {
        Ok(store
            .list_entities(input)
            .await?
            .into_iter()
            .map(|i| i.entity_id)
            .collect::<Vec<_>>())
    }

    let base_input = ListEntitiesInput {
        partition,
        scenario_id: None,
        security_context: None,
        kind: Some(EntityKind::Node),
        type_id: Some(node_type_id),
        at_valid_time: ValidTime(1),
        as_of_asserted_at: None,
        filters: Vec::new(),
        limit: 10,
        cursor: None,
    };

    assert_eq!(
        ids(
            &store,
            ListEntitiesInput {
                filters: vec![FieldFilter {
                    field_id: field_str,
                    op: CompareOp::Prefix,
                    value: Value::Str("al".to_string()),
                }],
                ..base_input.clone()
            }
        )
        .await?,
        vec![entity_a]
    );
    assert_eq!(
        ids(
            &store,
            ListEntitiesInput {
                filters: vec![FieldFilter {
                    field_id: field_str,
                    op: CompareOp::Contains,
                    value: Value::Str("et".to_string()),
                }],
                ..base_input.clone()
            }
        )
        .await?,
        vec![entity_b]
    );
    assert_eq!(
        ids(
            &store,
            ListEntitiesInput {
                filters: vec![FieldFilter {
                    field_id: field_i64,
                    op: CompareOp::Lt,
                    value: Value::I64(10),
                }],
                ..base_input.clone()
            }
        )
        .await?,
        vec![entity_a]
    );
    assert_eq!(
        ids(
            &store,
            ListEntitiesInput {
                filters: vec![FieldFilter {
                    field_id: field_f64,
                    op: CompareOp::Gt,
                    value: Value::F64(0.5),
                }],
                ..base_input.clone()
            }
        )
        .await?,
        vec![entity_b]
    );
    assert_eq!(
        ids(
            &store,
            ListEntitiesInput {
                filters: vec![FieldFilter {
                    field_id: field_bool,
                    op: CompareOp::Eq,
                    value: Value::Bool(true),
                }],
                ..base_input.clone()
            }
        )
        .await?,
        vec![entity_a]
    );
    assert_eq!(
        ids(
            &store,
            ListEntitiesInput {
                filters: vec![FieldFilter {
                    field_id: field_time,
                    op: CompareOp::Gte,
                    value: Value::Time(ValidTime(200)),
                }],
                ..base_input.clone()
            }
        )
        .await?,
        vec![entity_b]
    );
    assert_eq!(
        ids(
            &store,
            ListEntitiesInput {
                filters: vec![FieldFilter {
                    field_id: field_ref,
                    op: CompareOp::Eq,
                    value: Value::Ref(owner_a),
                }],
                ..base_input
            }
        )
        .await?,
        vec![entity_a]
    );

    // Exercise delete_index_row branches for all indexed types.
    for field_id in [
        field_str, field_i64, field_f64, field_bool, field_time, field_ref,
    ] {
        store
            .clear_property_interval(aideon_mneme_store::ClearPropIntervalInput {
                partition,
                scenario_id: None,
                actor,
                asserted_at: Hlc::now(),
                entity_id: entity_a,
                field_id,
                valid_from: ValidTime(0),
                valid_to: None,
                layer: Layer::Actual,
                write_options: None,
            })
            .await?;
    }
    Ok(())
}

#[tokio::test]
async fn list_entities_rejects_unsupported_ops_by_type() -> aideon_mneme_store::MnemeResult<()> {
    let dir = tempdir().expect("tempdir");
    let base = dir.path();
    let config = MnemeConfig::default_sqlite(base.join("invalid_ops.sqlite").to_string_lossy());
    let store = MnemeStore::connect(&config, base).await?;
    let (partition, actor) = new_ids();
    let node_type_id = Id::new();
    let field_i64 = Id::new();
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
                    type_id: node_type_id,
                    applies_to: EntityKind::Node,
                    label: "Service".to_string(),
                    is_abstract: false,
                    parent_type_id: None,
                }],
                fields: vec![
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
                ],
                type_fields: vec![
                    TypeFieldDef {
                        type_id: node_type_id,
                        field_id: field_i64,
                        is_required: false,
                        default_value: None,
                        override_default: false,
                        tighten_required: false,
                        disallow_overlap: None,
                    },
                    TypeFieldDef {
                        type_id: node_type_id,
                        field_id: field_bool,
                        is_required: false,
                        default_value: None,
                        override_default: false,
                        tighten_required: false,
                        disallow_overlap: None,
                    },
                    TypeFieldDef {
                        type_id: node_type_id,
                        field_id: field_time,
                        is_required: false,
                        default_value: None,
                        override_default: false,
                        tighten_required: false,
                        disallow_overlap: None,
                    },
                    TypeFieldDef {
                        type_id: node_type_id,
                        field_id: field_ref,
                        is_required: false,
                        default_value: None,
                        override_default: false,
                        tighten_required: false,
                        disallow_overlap: None,
                    },
                ],
                edge_type_rules: Vec::new(),
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
            type_id: Some(node_type_id),
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
            asserted_at: Hlc::now(),
            entity_id: node_id,
            field_id: field_i64,
            value: Value::I64(1),
            valid_from: ValidTime(0),
            valid_to: None,
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;
    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            entity_id: node_id,
            field_id: field_bool,
            value: Value::Bool(true),
            valid_from: ValidTime(0),
            valid_to: None,
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;
    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            entity_id: node_id,
            field_id: field_time,
            value: Value::Time(ValidTime(100)),
            valid_from: ValidTime(0),
            valid_to: None,
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;
    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            entity_id: node_id,
            field_id: field_ref,
            value: Value::Ref(Id::new()),
            valid_from: ValidTime(0),
            valid_to: None,
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;

    let base_input = ListEntitiesInput {
        partition,
        scenario_id: None,
        security_context: None,
        kind: Some(EntityKind::Node),
        type_id: Some(node_type_id),
        at_valid_time: ValidTime(1),
        as_of_asserted_at: None,
        filters: Vec::new(),
        limit: 10,
        cursor: None,
    };

    assert!(
        store
            .list_entities(ListEntitiesInput {
                filters: vec![FieldFilter {
                    field_id: field_i64,
                    op: CompareOp::Prefix,
                    value: Value::I64(1),
                }],
                ..base_input.clone()
            })
            .await
            .is_err()
    );
    assert!(
        store
            .list_entities(ListEntitiesInput {
                filters: vec![FieldFilter {
                    field_id: field_bool,
                    op: CompareOp::Lt,
                    value: Value::Bool(true),
                }],
                ..base_input.clone()
            })
            .await
            .is_err()
    );
    assert!(
        store
            .list_entities(ListEntitiesInput {
                filters: vec![FieldFilter {
                    field_id: field_time,
                    op: CompareOp::Contains,
                    value: Value::Time(ValidTime(1)),
                }],
                ..base_input.clone()
            })
            .await
            .is_err()
    );
    assert!(
        store
            .list_entities(ListEntitiesInput {
                filters: vec![FieldFilter {
                    field_id: field_ref,
                    op: CompareOp::Gt,
                    value: Value::Ref(Id::new()),
                }],
                ..base_input
            })
            .await
            .is_err()
    );
    Ok(())
}
