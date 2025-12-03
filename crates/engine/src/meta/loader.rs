//! Praxis meta-model document loading and merging.

use crate::error::{PraxisError, PraxisResult};
use crate::meta::config::MetaModelSource;
use aideon_mneme::meta::{MetaModelDocument, MetaRelationship, MetaType};
use std::collections::HashMap;
use std::fs;

const CORE_META_JSON: &str = include_str!("../../../../docs/data/meta/core-v1.json");

pub(super) fn load_document(source: &MetaModelSource) -> PraxisResult<MetaModelDocument> {
    match source {
        MetaModelSource::EmbeddedCore => parse_document(CORE_META_JSON),
        MetaModelSource::File(path) => {
            let contents =
                fs::read_to_string(path).map_err(|err| PraxisError::IntegrityViolation {
                    message: format!("failed to read meta-model '{}': {err}", path.display()),
                })?;
            parse_document(&contents)
        }
        MetaModelSource::Inline(raw) => parse_document(raw),
        MetaModelSource::Document(doc) => Ok(doc.clone()),
    }
}

fn parse_document(raw: &str) -> PraxisResult<MetaModelDocument> {
    serde_json::from_str(raw).map_err(|err| PraxisError::IntegrityViolation {
        message: format!("failed to parse meta-model: {err}"),
    })
}

pub(super) fn merge_documents(
    mut base: MetaModelDocument,
    overlays: &[MetaModelDocument],
) -> PraxisResult<MetaModelDocument> {
    for layer in overlays {
        if layer.version != base.version {
            return Err(PraxisError::IntegrityViolation {
                message: format!(
                    "meta-model version mismatch: base={} overlay={}",
                    base.version, layer.version
                ),
            });
        }
        merge_types(&mut base.types, &layer.types);
        merge_relationships(&mut base.relationships, &layer.relationships);
        if layer.validation.is_some() {
            base.validation = layer.validation.clone();
        }
        if layer.description.is_some() {
            base.description = layer.description.clone();
        }
    }
    Ok(base)
}

fn merge_types(base: &mut Vec<MetaType>, overrides: &[MetaType]) {
    let mut index: HashMap<String, usize> = base
        .iter()
        .enumerate()
        .map(|(idx, ty)| (ty.id.clone(), idx))
        .collect();
    for ty in overrides {
        if let Some(pos) = index.get(&ty.id).copied() {
            base[pos] = ty.clone();
        } else {
            index.insert(ty.id.clone(), base.len());
            base.push(ty.clone());
        }
    }
}

fn merge_relationships(base: &mut Vec<MetaRelationship>, overrides: &[MetaRelationship]) {
    let mut index: HashMap<String, usize> = base
        .iter()
        .enumerate()
        .map(|(idx, rel)| (rel.id.clone(), idx))
        .collect();
    for rel in overrides {
        if let Some(pos) = index.get(&rel.id).copied() {
            base[pos] = rel.clone();
        } else {
            index.insert(rel.id.clone(), base.len());
            base.push(rel.clone());
        }
    }
}
