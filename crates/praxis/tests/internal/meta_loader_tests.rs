use super::*;
use crate::meta::config::MetaModelSource;
use crate::meta::{MetaAttribute, MetaAttributeKind, MetaModelDocument};

fn doc(
    version: &str,
    types: Vec<MetaType>,
    relationships: Vec<MetaRelationship>,
) -> MetaModelDocument {
    MetaModelDocument {
        version: version.into(),
        description: None,
        types,
        relationships,
        validation: None,
    }
}

#[test]
fn load_inline_document_rejects_invalid_json() {
    let source = MetaModelSource::Inline("{not json".into());
    let err = load_document(&source).unwrap_err();
    assert!(matches!(err, PraxisError::IntegrityViolation { .. }));
    assert!(err.to_string().contains("failed to parse"));
}

#[test]
fn merge_documents_rejects_version_mismatch() {
    let base = doc("v1", vec![], vec![]);
    let overlay = doc("v2", vec![], vec![]);
    let err = merge_documents(base, &[overlay]).unwrap_err();
    assert!(matches!(err, PraxisError::IntegrityViolation { .. }));
    assert!(err.to_string().contains("version mismatch"));
}

#[test]
fn merge_documents_overrides_types_and_relationships_by_id() {
    let base_type = MetaType {
        id: "Capability".into(),
        uuid: None,
        label: Some("Capability".into()),
        category: None,
        extends: None,
        attributes: vec![MetaAttribute {
            name: "name".into(),
            uuid: None,
            value_type: MetaAttributeKind::String,
            required: true,
            enum_values: vec![],
        }],
        effect_types: None,
    };
    let overlay_type = MetaType {
        id: "Capability".into(),
        uuid: None,
        label: Some("Capability (override)".into()),
        category: None,
        extends: None,
        attributes: vec![MetaAttribute {
            name: "owner".into(),
            uuid: None,
            value_type: MetaAttributeKind::String,
            required: false,
            enum_values: vec![],
        }],
        effect_types: None,
    };
    let base_rel = MetaRelationship {
        id: "supports".into(),
        uuid: None,
        label: None,
        from: vec!["Capability".into()],
        to: vec!["Capability".into()],
        directed: Some(true),
        multiplicity: None,
        attributes: vec![],
    };
    let overlay_rel = MetaRelationship {
        id: "supports".into(),
        uuid: None,
        label: Some("Supports".into()),
        from: vec!["Capability".into()],
        to: vec!["Capability".into()],
        directed: Some(false),
        multiplicity: None,
        attributes: vec![],
    };

    let base = doc("v1", vec![base_type], vec![base_rel]);
    let overlay = doc("v1", vec![overlay_type], vec![overlay_rel]);
    let merged = merge_documents(base, &[overlay]).unwrap();
    assert_eq!(merged.types.len(), 1);
    assert_eq!(
        merged.types[0].label.as_deref(),
        Some("Capability (override)")
    );
    assert_eq!(merged.relationships.len(), 1);
    assert_eq!(merged.relationships[0].directed, Some(false));
}

#[test]
fn embedded_core_has_stable_uuids() {
    let doc = load_document(&MetaModelSource::EmbeddedCore).expect("core meta");
    for ty in &doc.types {
        assert!(
            ty.uuid.as_deref().map(looks_like_uuid).unwrap_or(false),
            "type {} missing uuid",
            ty.id
        );
        for attr in &ty.attributes {
            assert!(
                attr.uuid.as_deref().map(looks_like_uuid).unwrap_or(false),
                "type {} attribute {} missing uuid",
                ty.id,
                attr.name
            );
        }
    }
    for rel in &doc.relationships {
        assert!(
            rel.uuid.as_deref().map(looks_like_uuid).unwrap_or(false),
            "relationship {} missing uuid",
            rel.id
        );
        for attr in &rel.attributes {
            assert!(
                attr.uuid.as_deref().map(looks_like_uuid).unwrap_or(false),
                "relationship {} attribute {} missing uuid",
                rel.id,
                attr.name
            );
        }
    }
}

fn looks_like_uuid(value: &str) -> bool {
    value.len() == 36 && value.matches('-').count() == 4
}
