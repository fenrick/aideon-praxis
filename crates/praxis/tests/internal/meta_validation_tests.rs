use super::*;
use crate::meta::{MetaAttribute, MetaAttributeKind};
use serde_json::json;
use std::collections::BTreeMap;

fn rules() -> AttributeRuleSet {
    AttributeRuleSet {
        string_max: Some(5),
        text_max: Some(10),
        enum_case_sensitive: false,
    }
}

fn string_attr(name: &str, required: bool) -> MetaAttribute {
    MetaAttribute {
        name: name.into(),
        uuid: None,
        value_type: MetaAttributeKind::String,
        required,
        enum_values: vec![],
        cardinality: None,
    }
}

fn enum_attr(name: &str, variants: &[&str]) -> MetaAttribute {
    MetaAttribute {
        name: name.into(),
        uuid: None,
        value_type: MetaAttributeKind::Enum,
        required: true,
        enum_values: variants.iter().map(|v| (*v).to_string()).collect(),
        cardinality: None,
    }
}

#[test]
fn validate_node_rejects_missing_type() {
    let node = NodeVersion {
        id: "n1".into(),
        r#type: None,
        props: None,
    };
    let types = BTreeMap::<String, TypeDescriptor>::new();
    let err = validate_node(&node, &types, &rules()).unwrap_err();
    assert!(matches!(err, PraxisError::ValidationFailed { .. }));
    assert!(err.to_string().contains("missing type"));
}

#[test]
fn validate_node_checks_required_attributes_and_types() {
    let mut types = BTreeMap::<String, TypeDescriptor>::new();
    let mut attrs = BTreeMap::new();
    attrs.insert("name".into(), string_attr("name", true));
    types.insert("Capability".into(), TypeDescriptor { attributes: attrs });

    let node = NodeVersion {
        id: "n1".into(),
        r#type: Some("Capability".into()),
        props: None,
    };
    let err = validate_node(&node, &types, &rules()).unwrap_err();
    assert!(err.to_string().contains("missing required attributes"));

    let node = NodeVersion {
        id: "n1".into(),
        r#type: Some("Capability".into()),
        props: Some(json!({"name": "ok"})),
    };
    validate_node(&node, &types, &rules()).unwrap();
}

#[test]
fn validate_node_rejects_null_or_overlong_string_values() {
    let mut types = BTreeMap::<String, TypeDescriptor>::new();
    let mut attrs = BTreeMap::new();
    attrs.insert("name".into(), string_attr("name", true));
    types.insert("Capability".into(), TypeDescriptor { attributes: attrs });

    let node = NodeVersion {
        id: "n1".into(),
        r#type: Some("Capability".into()),
        props: Some(json!({"name": null})),
    };
    let err = validate_node(&node, &types, &rules()).unwrap_err();
    assert!(err.to_string().contains("cannot be null"));

    let node = NodeVersion {
        id: "n1".into(),
        r#type: Some("Capability".into()),
        props: Some(json!({"name": "too-long"})),
    };
    let err = validate_node(&node, &types, &rules()).unwrap_err();
    assert!(err.to_string().contains("exceeds max length"));
}

#[test]
fn validate_edge_enforces_endpoints_and_enum_values() {
    let mut relationships = BTreeMap::<String, RelationshipDescriptor>::new();
    relationships.insert(
        "rel_aa".into(),
        RelationshipDescriptor {
            from: vec!["A".into()],
            to: vec!["A".into()],
            attributes: BTreeMap::new(),
        },
    );
    let mut attrs = BTreeMap::new();
    attrs.insert("state".into(), enum_attr("state", &["open", "closed"]));
    relationships.insert(
        "rel_ab".into(),
        RelationshipDescriptor {
            from: vec!["A".into()],
            to: vec!["B".into()],
            attributes: attrs,
        },
    );
    let ruleset = rules();
    let mut rel_rules = HashMap::<String, RelationshipRule>::new();
    rel_rules.insert(
        "rel_aa".into(),
        RelationshipRule {
            allow_self: Some(false),
            allow_duplicate: None,
        },
    );
    rel_rules.insert(
        "rel_ab".into(),
        RelationshipRule {
            allow_self: Some(false),
            allow_duplicate: None,
        },
    );

    let edge_self = EdgeVersion {
        id: Some("e1".into()),
        from: "a".into(),
        to: "a".into(),
        r#type: Some("rel_aa".into()),
        directed: None,
        props: None,
    };
    let err =
        validate_edge(&edge_self, "A", "A", &relationships, &rel_rules, &ruleset).unwrap_err();
    assert!(err.to_string().contains("forbids self-links"));

    let edge_enum_ok = EdgeVersion {
        id: Some("e2".into()),
        from: "a".into(),
        to: "b".into(),
        r#type: Some("rel_ab".into()),
        directed: None,
        props: Some(json!({"state": "OPEN"})),
    };
    validate_edge(
        &edge_enum_ok,
        "A",
        "B",
        &relationships,
        &rel_rules,
        &ruleset,
    )
    .unwrap();

    let edge_enum_bad = EdgeVersion {
        props: Some(json!({"state": "invalid"})),
        ..edge_enum_ok
    };
    let err = validate_edge(
        &edge_enum_bad,
        "A",
        "B",
        &relationships,
        &rel_rules,
        &ruleset,
    )
    .unwrap_err();
    assert!(err.to_string().contains("not in"));
}
