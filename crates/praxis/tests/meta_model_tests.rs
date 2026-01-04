use super::*;
use crate::meta::{MetaAttribute, MetaAttributeKind};

#[test]
fn build_type_descriptors_inherits_parent_attributes() {
    let parent = MetaType {
        id: "Parent".into(),
        label: None,
        category: None,
        extends: None,
        attributes: vec![MetaAttribute {
            name: "name".into(),
            value_type: MetaAttributeKind::String,
            required: true,
            enum_values: vec![],
        }],
        effect_types: None,
    };
    let child = MetaType {
        id: "Child".into(),
        label: None,
        category: None,
        extends: Some("Parent".into()),
        attributes: vec![MetaAttribute {
            name: "owner".into(),
            value_type: MetaAttributeKind::String,
            required: false,
            enum_values: vec![],
        }],
        effect_types: None,
    };
    let descriptors = build_type_descriptors(&[parent, child]).unwrap();
    let child_desc = descriptors.get("Child").expect("child desc");
    assert!(child_desc.attributes.contains_key("name"));
    assert!(child_desc.attributes.contains_key("owner"));
}

#[test]
fn build_type_descriptors_rejects_inheritance_cycles() {
    let a = MetaType {
        id: "A".into(),
        label: None,
        category: None,
        extends: Some("B".into()),
        attributes: vec![],
        effect_types: None,
    };
    let b = MetaType {
        id: "B".into(),
        label: None,
        category: None,
        extends: Some("A".into()),
        attributes: vec![],
        effect_types: None,
    };
    let err = build_type_descriptors(&[a, b]).unwrap_err();
    assert!(matches!(err, PraxisError::IntegrityViolation { .. }));
    assert!(err.to_string().contains("cycle"));
}
