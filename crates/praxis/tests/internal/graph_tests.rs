use super::*;
use crate::meta::{
    MetaModelDocument, MetaRelationship, MetaRelationshipValidation, MetaType, MetaValidationRules,
};
use serde_json::Value;
use std::collections::HashMap as StdHashMap;

fn registry(allow_duplicate: Option<bool>) -> MetaModelRegistry {
    let mut rel_rules = StdHashMap::new();
    rel_rules.insert(
        "rel".to_string(),
        MetaRelationshipValidation {
            allow_self: Some(true),
            allow_duplicate,
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
            relationships: Some(rel_rules),
        }),
    };
    MetaModelRegistry::from_document(doc).expect("registry")
}

#[test]
fn sanitize_node_strips_null_props() {
    let node = NodeVersion {
        id: "n1".into(),
        r#type: Some("A".into()),
        props: Some(Value::Null),
    };
    let sanitized = sanitize_node(&node);
    assert!(sanitized.props.is_none());
}

#[test]
fn apply_rejects_edges_with_missing_endpoints() {
    let registry = registry(None);
    let snapshot = GraphSnapshot::empty();
    let change = ChangeSet {
        edge_creates: vec![EdgeVersion {
            id: Some("e1".into()),
            from: "missing".into(),
            to: "missing2".into(),
            r#type: Some("rel".into()),
            directed: None,
            props: None,
        }],
        ..ChangeSet::default()
    };
    let err = snapshot.apply(&change, &registry).unwrap_err();
    assert!(matches!(err, PraxisError::ValidationFailed { .. }));
    assert!(err.to_string().contains("missing node"));
}

#[test]
fn apply_rejects_deleting_missing_node() {
    let registry = registry(None);
    let snapshot = GraphSnapshot::empty();
    let change = ChangeSet {
        node_deletes: vec![NodeTombstone {
            id: "missing".into(),
        }],
        ..ChangeSet::default()
    };
    let err = snapshot.apply(&change, &registry).unwrap_err();
    assert!(err.to_string().contains("does not exist for delete"));
}

#[test]
fn apply_rejects_creating_duplicate_node() {
    let registry = registry(None);
    let snapshot = GraphSnapshot::empty();
    let first = snapshot
        .apply(
            &ChangeSet {
                node_creates: vec![NodeVersion {
                    id: "n1".into(),
                    r#type: Some("A".into()),
                    props: None,
                }],
                ..ChangeSet::default()
            },
            &registry,
        )
        .unwrap();
    let err = first
        .apply(
            &ChangeSet {
                node_creates: vec![NodeVersion {
                    id: "n1".into(),
                    r#type: Some("A".into()),
                    props: None,
                }],
                ..ChangeSet::default()
            },
            &registry,
        )
        .unwrap_err();
    assert!(err.to_string().contains("already exists"));
}

#[test]
fn apply_rejects_updating_missing_node() {
    let registry = registry(None);
    let snapshot = GraphSnapshot::empty();
    let err = snapshot
        .apply(
            &ChangeSet {
                node_updates: vec![NodeVersion {
                    id: "missing".into(),
                    r#type: Some("A".into()),
                    props: None,
                }],
                ..ChangeSet::default()
            },
            &registry,
        )
        .unwrap_err();
    assert!(err.to_string().contains("missing for update"));
}

#[test]
fn apply_rejects_deleting_missing_edge() {
    let registry = registry(None);
    let snapshot = GraphSnapshot::empty();
    let snapshot = snapshot
        .apply(
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
                ..ChangeSet::default()
            },
            &registry,
        )
        .unwrap();
    let err = snapshot
        .apply(
            &ChangeSet {
                edge_deletes: vec![EdgeTombstone {
                    from: "a".into(),
                    to: "b".into(),
                }],
                ..ChangeSet::default()
            },
            &registry,
        )
        .unwrap_err();
    assert!(err.to_string().contains("does not exist for delete"));
}

#[test]
fn apply_rejects_edge_missing_type() {
    let registry = registry(None);
    let snapshot = GraphSnapshot::empty();
    let snapshot = snapshot
        .apply(
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
                ..ChangeSet::default()
            },
            &registry,
        )
        .unwrap();
    let err = snapshot
        .apply(
            &ChangeSet {
                edge_creates: vec![EdgeVersion {
                    id: Some("e1".into()),
                    from: "a".into(),
                    to: "b".into(),
                    r#type: None,
                    directed: None,
                    props: None,
                }],
                ..ChangeSet::default()
            },
            &registry,
        )
        .unwrap_err();
    assert!(err.to_string().contains("missing relationship type"));
}

#[test]
fn apply_rejects_duplicate_relationships_when_disallowed() {
    let registry = registry(Some(false));
    let snapshot = GraphSnapshot::empty();
    let change = ChangeSet {
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
        edge_creates: vec![
            EdgeVersion {
                id: Some("e1".into()),
                from: "a".into(),
                to: "b".into(),
                r#type: Some("rel".into()),
                directed: None,
                props: None,
            },
            EdgeVersion {
                id: Some("e2".into()),
                from: "a".into(),
                to: "b".into(),
                r#type: Some("rel".into()),
                directed: None,
                props: None,
            },
        ],
        ..ChangeSet::default()
    };
    let err = snapshot.apply(&change, &registry).unwrap_err();
    assert!(err.to_string().contains("already exists"));
}

#[test]
fn diff_reports_adds_mods_and_deletes() {
    let registry = registry(None);
    let base = GraphSnapshot::empty();
    let created = base
        .apply(
            &ChangeSet {
                node_creates: vec![NodeVersion {
                    id: "n1".into(),
                    r#type: Some("A".into()),
                    props: None,
                }],
                ..ChangeSet::default()
            },
            &registry,
        )
        .unwrap();

    let modified = created
        .apply(
            &ChangeSet {
                node_updates: vec![NodeVersion {
                    id: "n1".into(),
                    r#type: Some("A".into()),
                    props: Some(serde_json::json!({"k":"v"})),
                }],
                node_creates: vec![NodeVersion {
                    id: "n2".into(),
                    r#type: Some("A".into()),
                    props: None,
                }],
                ..ChangeSet::default()
            },
            &registry,
        )
        .unwrap();

    let patch = created.diff(&modified);
    assert_eq!(patch.node_adds.len(), 1);
    assert_eq!(patch.node_mods.len(), 1);

    let deleted = modified
        .apply(
            &ChangeSet {
                node_deletes: vec![NodeTombstone { id: "n2".into() }],
                ..ChangeSet::default()
            },
            &registry,
        )
        .unwrap();
    let patch = modified.diff(&deleted);
    assert_eq!(patch.node_dels.len(), 1);
}
