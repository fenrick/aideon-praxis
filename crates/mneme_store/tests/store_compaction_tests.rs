use super::*;
use crate::{FieldDef, SetEdgeExistenceIntervalInput, TypeDef, TypeFieldDef};
use tempfile::tempdir;

#[tokio::test]
async fn compaction_prunes_duplicate_intervals() -> MnemeResult<()> {
    let dir = tempdir().expect("tempdir");
    let base = dir.path();
    let config = MnemeConfig::default_sqlite(base.join("compaction.sqlite").to_string_lossy());
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
                fields: vec![FieldDef {
                    field_id,
                    label: "name".to_string(),
                    value_type: ValueType::Str,
                    cardinality_multi: false,
                    merge_policy: MergePolicy::Lww,
                    is_indexed: false,
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

    store
        .set_property_interval(SetPropIntervalInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            entity_id: node_id,
            field_id,
            value: Value::Str("alpha".to_string()),
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
            asserted_at: Hlc::now(),
            entity_id: node_id,
            field_id,
            value: Value::Str("beta".to_string()),
            valid_from: ValidTime(0),
            valid_to: Some(ValidTime(10)),
            layer: Layer::Actual,
            write_options: None,
        })
        .await?;

    let edge_id = Id::new();
    store
        .create_edge(CreateEdgeInput {
            partition,
            scenario_id: None,
            actor,
            asserted_at: Hlc::now(),
            edge_id,
            type_id: None,
            src_id: node_id,
            dst_id: node_id,
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
            asserted_at: Hlc::now(),
            edge_id,
            valid_from: ValidTime(0),
            valid_to: Some(ValidTime(10)),
            layer: Layer::Actual,
            is_tombstone: false,
            write_options: None,
        })
        .await?;

    let before = store
        .export_snapshot_stream(SnapshotOptions {
            partition_id: partition,
            scenario_id: None,
            as_of_asserted_at: Hlc::now(),
            include_facts: true,
            include_entities: true,
        })
        .await?
        .collect::<Vec<_>>();
    let before_prop = before
        .iter()
        .filter(|rec| rec.record_type == "snapshot_fact_str")
        .count();
    let before_edge = before
        .iter()
        .filter(|rec| rec.record_type == "snapshot_edge_exists")
        .count();

    let tx = store.conn.begin().await?;
    store.compact_partition(&tx, partition).await?;
    tx.commit().await?;

    let after = store
        .export_snapshot_stream(SnapshotOptions {
            partition_id: partition,
            scenario_id: None,
            as_of_asserted_at: Hlc::now(),
            include_facts: true,
            include_entities: true,
        })
        .await?
        .collect::<Vec<_>>();
    let after_prop = after
        .iter()
        .filter(|rec| rec.record_type == "snapshot_fact_str")
        .count();
    let after_edge = after
        .iter()
        .filter(|rec| rec.record_type == "snapshot_edge_exists")
        .count();

    assert!(before_prop > after_prop);
    assert!(before_edge > after_edge);
    Ok(())
}
