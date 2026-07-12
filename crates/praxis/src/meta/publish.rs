//! Publish the authored metamodel document to Mneme's canonical batch.
//!
//! This is the Praxis → Mneme "publish" step ([metamodel-ownership]): the
//! authored [`MetaModelDocument`] (rich: kinds, enum variants, length rules,
//! stable string ids) is converted to the canonical [`AuthoredMetamodelBatch`]
//! operation payload, which Mneme records on the op log. The batch carries the
//! full authored description (semantic kind, enum variants, keys, category,
//! effect types, edge rules, global validation) so Mneme can rebuild the
//! effective schema from the log alone — Praxis never hands Mneme a compiled
//! artefact, only authored source.

use mneme_core::ids::Id;
use mneme_core::schema::{
    AuthoredMetamodelBatch, AuthoredValidationRules, EdgeTypeRule, EntityKind, FieldDef, FieldKind,
    TypeDef, TypeFieldDef, ValueType,
};

use super::types::{MetaAttribute, MetaAttributeKind, MetaModelDocument, MetaRelationship};
use crate::error::{PraxisError, PraxisResult};

/// Convert the authored document to the canonical `AuthoredMetamodelBatch`.
///
/// # Errors
/// Returns [`PraxisError::IntegrityViolation`] if a type/attribute/relationship
/// is missing its UUID or an `extends`/endpoint reference names an unknown type.
pub fn publish_batch(doc: &MetaModelDocument) -> PraxisResult<AuthoredMetamodelBatch> {
    let mut types = Vec::new();
    let mut fields = Vec::new();
    let mut type_fields = Vec::new();
    let mut edge_type_rules = Vec::new();

    for entity in &doc.types {
        let type_id = symbol(&entity.uuid, &entity.id)?;
        types.push(TypeDef {
            type_id,
            key: entity.id.clone(),
            applies_to: EntityKind::Node,
            label: entity.label.clone().unwrap_or_else(|| entity.id.clone()),
            category: entity.category.clone(),
            effect_types: entity.effect_types.clone().unwrap_or_default(),
            is_abstract: false,
            parent_type_id: match &entity.extends {
                Some(parent) => Some(resolve_type(doc, parent, &entity.id)?),
                None => None,
            },
        });
        push_attributes(&entity.attributes, type_id, &mut fields, &mut type_fields)?;
    }

    for rel in &doc.relationships {
        let edge_type_id = symbol(&rel.uuid, &rel.id)?;
        types.push(TypeDef {
            type_id: edge_type_id,
            key: rel.id.clone(),
            applies_to: EntityKind::Edge,
            label: rel.label.clone().unwrap_or_else(|| rel.id.clone()),
            category: None,
            effect_types: vec![],
            is_abstract: false,
            parent_type_id: None,
        });
        push_attributes(&rel.attributes, edge_type_id, &mut fields, &mut type_fields)?;
        edge_type_rules.push(edge_rule(doc, rel, edge_type_id)?);
    }

    Ok(AuthoredMetamodelBatch {
        types,
        fields,
        type_fields,
        edge_type_rules,
        validation: validation_rules(doc),
        metamodel_version: Some(doc.version.clone()),
        metamodel_source: Some("core-v1.json".to_owned()),
    })
}

fn push_attributes(
    attributes: &[MetaAttribute],
    owner: Id,
    fields: &mut Vec<FieldDef>,
    type_fields: &mut Vec<TypeFieldDef>,
) -> PraxisResult<()> {
    for attr in attributes {
        let field_id = symbol(&attr.uuid, &attr.name)?;
        // Fields are unique per (type, attribute) via their UUID; dedupe defensively.
        if !fields.iter().any(|f: &FieldDef| f.field_id == field_id) {
            let (value_type, semantic_kind) = map_kind(attr.value_type);
            fields.push(FieldDef {
                field_id,
                key: attr.name.clone(),
                label: attr.name.clone(),
                value_type,
                semantic_kind,
                enum_values: attr.enum_values.clone(),
                cardinality_multi: attr.cardinality.as_deref() == Some("multi"),
                is_indexed: false,
            });
        }
        type_fields.push(TypeFieldDef {
            type_id: owner,
            field_id,
            is_required: attr.required,
            default_value: None,
            override_default: false,
            tighten_required: false,
        });
    }
    Ok(())
}

fn edge_rule(
    doc: &MetaModelDocument,
    rel: &MetaRelationship,
    edge_type_id: Id,
) -> PraxisResult<EdgeTypeRule> {
    let resolve_all = |ids: &[String]| -> PraxisResult<Vec<Id>> {
        ids.iter()
            .map(|id| resolve_type(doc, id, &rel.id))
            .collect()
    };
    let (multiplicity_src, multiplicity_dst) = rel.multiplicity.as_ref().map_or_else(
        || ("many".to_owned(), "many".to_owned()),
        |m| (m.from.clone(), m.to.clone()),
    );
    Ok(EdgeTypeRule {
        edge_type_id,
        allowed_src_type_ids: resolve_all(&rel.from)?,
        allowed_dst_type_ids: resolve_all(&rel.to)?,
        allow_self: rel.allow_self.unwrap_or(false),
        allow_duplicate: rel.allow_duplicate.unwrap_or(false),
        multiplicity_src,
        multiplicity_dst,
        semantic_direction: rel
            .directed
            .unwrap_or(true)
            .then(|| "source_to_target".to_owned()),
    })
}

fn validation_rules(doc: &MetaModelDocument) -> AuthoredValidationRules {
    let attrs = doc.validation.as_ref().and_then(|v| v.attributes.as_ref());
    AuthoredValidationRules {
        string_max_length: attrs
            .and_then(|a| a.string.as_ref())
            .and_then(|s| s.max_length)
            .map(|n| n as u32),
        text_max_length: attrs
            .and_then(|a| a.text.as_ref())
            .and_then(|s| s.max_length)
            .map(|n| n as u32),
        enum_case_sensitive: attrs
            .and_then(|a| a.enum_rule.as_ref())
            .and_then(|e| e.case_sensitive)
            .unwrap_or(false),
    }
}

fn map_kind(kind: MetaAttributeKind) -> (ValueType, FieldKind) {
    match kind {
        MetaAttributeKind::String => (ValueType::Str, FieldKind::String),
        MetaAttributeKind::Text => (ValueType::Str, FieldKind::Text),
        MetaAttributeKind::Number => (ValueType::F64, FieldKind::Number),
        MetaAttributeKind::Boolean => (ValueType::Bool, FieldKind::Boolean),
        MetaAttributeKind::Enum => (ValueType::Str, FieldKind::Enum),
        MetaAttributeKind::Datetime => (ValueType::Time, FieldKind::Datetime),
        MetaAttributeKind::Blob => (ValueType::Blob, FieldKind::Blob),
    }
}

/// Parse a committed UUID string into a Mneme symbol.
fn symbol(uuid: &Option<String>, name: &str) -> PraxisResult<Id> {
    let raw = uuid
        .as_deref()
        .ok_or_else(|| PraxisError::IntegrityViolation {
            message: format!("metamodel symbol `{name}` is missing its uuid"),
        })?;
    raw.parse().map_err(|_| PraxisError::IntegrityViolation {
        message: format!("metamodel symbol `{name}` has an invalid uuid `{raw}`"),
    })
}

/// Resolve a type's stable string id to its symbol UUID.
fn resolve_type(doc: &MetaModelDocument, id: &str, referrer: &str) -> PraxisResult<Id> {
    let ty =
        doc.types
            .iter()
            .find(|t| t.id == id)
            .ok_or_else(|| PraxisError::IntegrityViolation {
                message: format!("`{referrer}` references unknown type `{id}`"),
            })?;
    symbol(&ty.uuid, &ty.id)
}

/// Load and publish the embedded core seed metamodel.
///
/// # Errors
/// See [`publish_batch`]; also propagates document load/parse failures.
pub fn publish_embedded_core() -> PraxisResult<AuthoredMetamodelBatch> {
    let doc = super::loader::load_document(&super::config::MetaModelSource::EmbeddedCore)?;
    publish_batch(&doc)
}

#[cfg(test)]
#[path = "../../tests/internal/meta_publish_tests.rs"]
mod tests;
