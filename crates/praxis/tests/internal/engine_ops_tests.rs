use super::*;
use crate::meta::MetaModelRegistry;
use crate::meta::{
    MetaModelDocument, MetaRelationship, MetaRelationshipValidation, MetaType, MetaValidationRules,
};
use crate::temporal::NodeVersion;
use serde_json::json;
use std::collections::HashMap;

fn registry() -> MetaModelRegistry {
    let mut rels = HashMap::new();
    rels.insert(
        "rel".to_string(),
        MetaRelationshipValidation {
            allow_self: Some(true),
            allow_duplicate: Some(true),
        },
    );
    let doc = MetaModelDocument {
        version: "v1".into(),
        description: None,
        types: vec![
            MetaType {
                id: "A".into(),
                uuid: None,
                label: None,
                category: None,
                extends: None,
                attributes: vec![],
                effect_types: None,
            },
            MetaType {
                id: "B".into(),
                uuid: None,
                label: None,
                category: None,
                extends: None,
                attributes: vec![],
                effect_types: None,
            },
        ],
        relationships: vec![MetaRelationship {
            id: "rel".into(),
            uuid: None,
            label: None,
            from: vec!["A".into()],
            to: vec!["B".into()],
            directed: Some(true),
            multiplicity: None,
            attributes: vec![],
        }],
        validation: Some(MetaValidationRules {
            attributes: None,
            relationships: Some(rels),
        }),
    };
    MetaModelRegistry::from_document(doc).expect("registry")
}

fn snapshot_with_node_and_edge() -> GraphSnapshot {
    let registry = registry();
    let base = GraphSnapshot::empty();
    base.apply(
        &ChangeSet {
            node_creates: vec![
                NodeVersion {
                    id: "a".into(),
                    r#type: Some("A".into()),
                    props: None,
                },
                NodeVersion {
                    id: "b".into(),
                    r#type: Some("B".into()),
                    props: None,
                },
            ],
            edge_creates: vec![EdgeVersion {
                id: Some("e1".into()),
                from: "a".into(),
                to: "b".into(),
                r#type: Some("rel".into()),
                directed: None,
                props: None,
            }],
            ..ChangeSet::default()
        },
        &registry,
    )
    .unwrap()
}

#[test]
fn detect_conflicts_flags_overlapping_node_changes() {
    let mut source = DiffPatch::default();
    source.node_mods.push(NodeVersion {
        id: "n1".into(),
        r#type: Some("A".into()),
        props: None,
    });
    let mut target = DiffPatch::default();
    target.node_dels.push(NodeTombstone { id: "n1".into() });
    let conflicts = detect_conflicts(&source, &target);
    assert_eq!(conflicts.len(), 1);
    assert_eq!(conflicts[0].kind, "node");
}

#[test]
fn build_change_set_filters_noops_against_target_snapshot() {
    let target = snapshot_with_node_and_edge();
    let mut patch = DiffPatch::default();

    // Adds: "a" already exists, "c" is new.
    patch.node_adds.push(NodeVersion {
        id: "a".into(),
        r#type: Some("A".into()),
        props: None,
    });
    patch.node_adds.push(NodeVersion {
        id: "c".into(),
        r#type: Some("A".into()),
        props: None,
    });

    // Mods: first is identical to target, second changes props so should be kept.
    patch.node_mods.push(NodeVersion {
        id: "a".into(),
        r#type: Some("A".into()),
        props: None,
    });
    patch.node_mods.push(NodeVersion {
        id: "a".into(),
        r#type: Some("A".into()),
        props: Some(json!({"k":"v"})),
    });

    // Deletes: only "a" exists, so "missing" should be filtered out.
    patch.node_dels.push(NodeTombstone {
        id: "missing".into(),
    });
    patch.node_dels.push(NodeTombstone { id: "a".into() });

    // Edge adds: existing e1 should be filtered, new e2 should be kept.
    patch.edge_adds.push(EdgeVersion {
        id: Some("e1".into()),
        from: "a".into(),
        to: "b".into(),
        r#type: Some("rel".into()),
        directed: None,
        props: None,
    });
    patch.edge_adds.push(EdgeVersion {
        id: Some("e2".into()),
        from: "a".into(),
        to: "b".into(),
        r#type: Some("rel".into()),
        directed: None,
        props: Some(json!({"x":1})),
    });

    // Edge deletes: only existing endpoint pair should survive.
    patch.edge_dels.push(EdgeTombstone {
        from: "missing".into(),
        to: "missing".into(),
    });
    patch.edge_dels.push(EdgeTombstone {
        from: "a".into(),
        to: "b".into(),
    });

    let changes = build_change_set(&target, &patch);
    assert_eq!(changes.node_creates.len(), 1);
    assert_eq!(changes.node_creates[0].id, "c");
    assert_eq!(changes.node_updates.len(), 1);
    assert_eq!(changes.node_updates[0].props, Some(json!({"k":"v"})));
    assert_eq!(changes.node_deletes.len(), 1);
    assert_eq!(changes.node_deletes[0].id, "a");
    assert_eq!(changes.edge_creates.len(), 1);
    assert_eq!(changes.edge_creates[0].id.as_deref(), Some("e2"));
    assert_eq!(changes.edge_deletes.len(), 1);
    assert_eq!(changes.edge_deletes[0].from, "a");
}

#[test]
fn build_change_set_keeps_only_meaningful_edge_updates() {
    let target = snapshot_with_node_and_edge();
    let mut patch = DiffPatch::default();
    patch.edge_mods.push(EdgeVersion {
        id: Some("e1".into()),
        from: "a".into(),
        to: "b".into(),
        r#type: Some("rel".into()),
        directed: None,
        props: None,
    });
    patch.edge_mods.push(EdgeVersion {
        id: Some("e1".into()),
        from: "a".into(),
        to: "b".into(),
        r#type: Some("rel".into()),
        directed: None,
        props: Some(json!({"p": true})),
    });

    let changes = build_change_set(&target, &patch);
    assert_eq!(changes.edge_updates.len(), 1);
    assert_eq!(changes.edge_updates[0].props, Some(json!({"p": true})));
}

#[test]
fn detect_conflicts_flags_overlapping_edge_changes() {
    let mut source = DiffPatch::default();
    source.edge_mods.push(EdgeVersion {
        id: Some("e1".into()),
        from: "a".into(),
        to: "b".into(),
        r#type: Some("rel".into()),
        directed: None,
        props: None,
    });
    let mut target = DiffPatch::default();
    target.edge_dels.push(EdgeTombstone {
        from: "a".into(),
        to: "b".into(),
    });
    let conflicts = detect_conflicts(&source, &target);
    assert_eq!(conflicts.len(), 1);
    assert_eq!(conflicts[0].kind, "edge");
}
