use std::collections::{BTreeMap, HashMap};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;

use aideon_mneme::meta::{
    MetaAttribute, MetaAttributeKind, MetaAttributeValidation, MetaEnumRule, MetaModelDocument,
    MetaRelationship, MetaStringRule, MetaType, MetaValidationRules,
};
use aideon_mneme::temporal::{EdgeVersion, NodeVersion};
use serde_json::Value;
use time::OffsetDateTime;
use time::format_description::well_known::Rfc3339;

use crate::error::{PraxisError, PraxisResult};

const CORE_META_JSON: &str = include_str!("../../../docs/data/meta/core-v1.json");

/// Source definition for loading meta-model documents.
#[derive(Clone, Debug)]
pub enum MetaModelSource {
    /// Built-in `docs/data/meta/core-v1.json` embedded at compile time.
    EmbeddedCore,
    /// Load schema from a file on disk.
    File(PathBuf),
    /// Inline JSON string supplied programmatically.
    Inline(String),
    /// Already parsed document (used by tests).
    Document(MetaModelDocument),
}

/// Configuration describing how the registry should be initialised.
#[derive(Clone, Debug)]
pub struct MetaModelConfig {
    pub base: MetaModelSource,
    pub overrides: Vec<MetaModelSource>,
}

impl Default for MetaModelConfig {
    fn default() -> Self {
        Self {
            base: MetaModelSource::EmbeddedCore,
            overrides: Vec::new(),
        }
    }
}

impl MetaModelConfig {
    pub fn with_base(mut self, base: MetaModelSource) -> Self {
        self.base = base;
        self
    }

    pub fn with_overrides(mut self, overrides: Vec<MetaModelSource>) -> Self {
        self.overrides = overrides;
        self
    }

    pub fn add_override(mut self, source: MetaModelSource) -> Self {
        self.overrides.push(source);
        self
    }
}

/// Materialised schema registry used by the Praxis engine for validation.
pub struct MetaModelRegistry {
    document: Arc<MetaModelDocument>,
    types: BTreeMap<String, TypeDescriptor>,
    relationships: BTreeMap<String, RelationshipDescriptor>,
    attr_rules: AttributeRuleSet,
    relationship_rules: HashMap<String, RelationshipRule>,
}

impl MetaModelRegistry {
    pub fn load(config: &MetaModelConfig) -> PraxisResult<Self> {
        let mut docs = Vec::new();
        for source in std::iter::once(&config.base).chain(config.overrides.iter()) {
            docs.push(load_document(source)?);
        }
        let (base, overlays) =
            docs.split_first()
                .ok_or_else(|| PraxisError::IntegrityViolation {
                    message: "meta-model config missing base document".into(),
                })?;
        let merged = merge_documents(base.clone(), overlays)?;
        Self::from_document(merged)
    }

    pub fn embedded() -> PraxisResult<Self> {
        Self::load(&MetaModelConfig::default())
    }

    pub fn from_document(doc: MetaModelDocument) -> PraxisResult<Self> {
        let attr_rules = AttributeRuleSet::from_validation(doc.validation.as_ref());
        let relationship_rules = relationship_rules(doc.validation.as_ref());
        let type_descriptors = build_type_descriptors(&doc.types)?;
        let relationship_descriptors = build_relationship_descriptors(&doc.relationships);
        Ok(Self {
            document: Arc::new(doc),
            types: type_descriptors,
            relationships: relationship_descriptors,
            attr_rules,
            relationship_rules,
        })
    }

    pub fn document(&self) -> MetaModelDocument {
        (*self.document).clone()
    }

    pub fn validate_node(&self, node: &NodeVersion) -> PraxisResult<()> {
        let type_id = node
            .r#type
            .as_ref()
            .ok_or_else(|| PraxisError::ValidationFailed {
                message: format!("node '{}' missing type", node.id),
            })?;
        let descriptor = self
            .types
            .get(type_id)
            .ok_or_else(|| PraxisError::ValidationFailed {
                message: format!("node '{}' references unknown type '{type_id}'", node.id),
            })?;
        if let Some(props) = node.props.as_ref() {
            let map = props
                .as_object()
                .ok_or_else(|| PraxisError::ValidationFailed {
                    message: format!("node '{}' props must be an object", node.id),
                })?;
            validate_attributes(
                &descriptor.attributes,
                map,
                &self.attr_rules,
                |attr, reason| format!("node '{}' attribute '{}': {}", node.id, attr.name, reason),
            )?;
        } else if descriptor.attributes.values().any(|attr| attr.required) {
            return Err(PraxisError::ValidationFailed {
                message: format!(
                    "node '{}' missing required attributes for type '{}'",
                    node.id, type_id
                ),
            });
        }

        Ok(())
    }

    pub fn validate_edge(
        &self,
        edge: &EdgeVersion,
        from_type: &str,
        to_type: &str,
    ) -> PraxisResult<()> {
        let rel_type = edge
            .r#type
            .as_ref()
            .ok_or_else(|| PraxisError::ValidationFailed {
                message: format!(
                    "edge '{}->{}' missing relationship type",
                    edge.from, edge.to
                ),
            })?;
        let descriptor =
            self.relationships
                .get(rel_type)
                .ok_or_else(|| PraxisError::ValidationFailed {
                    message: format!("edge uses unknown relationship '{rel_type}'"),
                })?;

        if !descriptor.from.iter().any(|ty| ty == from_type) {
            return Err(PraxisError::ValidationFailed {
                message: format!("edge type '{rel_type}' cannot originate from '{from_type}'"),
            });
        }
        if !descriptor.to.iter().any(|ty| ty == to_type) {
            return Err(PraxisError::ValidationFailed {
                message: format!("edge type '{rel_type}' cannot target '{to_type}'"),
            });
        }

        if let Some(rule) = self.relationship_rules.get(rel_type)
            && rule.allow_self == Some(false)
            && edge.from == edge.to
        {
            return Err(PraxisError::ValidationFailed {
                message: format!("relationship '{rel_type}' forbids self-links"),
            });
        }

        if let Some(props) = edge.props.as_ref() {
            let map = props
                .as_object()
                .ok_or_else(|| PraxisError::ValidationFailed {
                    message: format!("edge '{}->{}' props must be an object", edge.from, edge.to),
                })?;
            validate_attributes(
                &descriptor.attributes,
                map,
                &self.attr_rules,
                |attr, reason| {
                    format!(
                        "edge '{}->{}' attribute '{}': {}",
                        edge.from, edge.to, attr.name, reason
                    )
                },
            )?;
        } else if descriptor.attributes.values().any(|attr| attr.required) {
            return Err(PraxisError::ValidationFailed {
                message: format!("edge type '{rel_type}' missing required attributes"),
            });
        }

        Ok(())
    }

    pub fn allows_duplicate(&self, rel_type: &str) -> bool {
        self.relationship_rules
            .get(rel_type)
            .and_then(|rule| rule.allow_duplicate)
            .unwrap_or(true)
    }
}

fn load_document(source: &MetaModelSource) -> PraxisResult<MetaModelDocument> {
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

fn merge_documents(
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

fn build_type_descriptors(types: &[MetaType]) -> PraxisResult<BTreeMap<String, TypeDescriptor>> {
    let mut by_id: BTreeMap<String, &MetaType> = BTreeMap::new();
    for ty in types {
        by_id.insert(ty.id.clone(), ty);
    }
    let mut cache: HashMap<String, TypeDescriptor> = HashMap::new();
    for ty in types {
        resolve_type_descriptor(ty.id.clone(), &by_id, &mut cache, &mut Vec::new())?;
    }
    Ok(cache.into_iter().collect())
}

fn resolve_type_descriptor(
    id: String,
    types: &BTreeMap<String, &MetaType>,
    cache: &mut HashMap<String, TypeDescriptor>,
    stack: &mut Vec<String>,
) -> PraxisResult<TypeDescriptor> {
    if let Some(desc) = cache.get(&id) {
        return Ok(desc.clone());
    }
    if stack.contains(&id) {
        return Err(PraxisError::IntegrityViolation {
            message: format!("meta-model type inheritance cycle detected at '{id}'"),
        });
    }
    let ty = types
        .get(&id)
        .copied()
        .ok_or_else(|| PraxisError::IntegrityViolation {
            message: format!("meta-model missing type '{id}'"),
        })?;
    stack.push(id.clone());
    let mut attributes: BTreeMap<String, MetaAttribute> = BTreeMap::new();
    if let Some(parent_id) = &ty.extends
        && types.contains_key(parent_id)
    {
        let parent_desc = resolve_type_descriptor(parent_id.clone(), types, cache, stack)?;
        attributes.extend(parent_desc.attributes);
    }
    stack.pop();
    for attribute in &ty.attributes {
        attributes.insert(attribute.name.clone(), attribute.clone());
    }
    let descriptor = TypeDescriptor { attributes };
    cache.insert(id.clone(), descriptor.clone());
    Ok(descriptor)
}

fn build_relationship_descriptors(
    relationships: &[MetaRelationship],
) -> BTreeMap<String, RelationshipDescriptor> {
    relationships
        .iter()
        .map(|rel| {
            let mut attrs = BTreeMap::new();
            for attr in &rel.attributes {
                attrs.insert(attr.name.clone(), attr.clone());
            }
            (
                rel.id.clone(),
                RelationshipDescriptor {
                    from: rel.from.clone(),
                    to: rel.to.clone(),
                    attributes: attrs,
                },
            )
        })
        .collect()
}

fn relationship_rules(
    validation: Option<&MetaValidationRules>,
) -> HashMap<String, RelationshipRule> {
    validation
        .and_then(|rules| rules.relationships.as_ref())
        .map(|map| {
            map.iter()
                .map(|(id, rule)| {
                    (
                        id.clone(),
                        RelationshipRule {
                            allow_self: rule.allow_self,
                            allow_duplicate: rule.allow_duplicate,
                        },
                    )
                })
                .collect()
        })
        .unwrap_or_default()
}

fn validate_attributes(
    expected: &BTreeMap<String, MetaAttribute>,
    provided: &serde_json::Map<String, Value>,
    rules: &AttributeRuleSet,
    context: impl Fn(&MetaAttribute, &str) -> String,
) -> PraxisResult<()> {
    for attr in expected.values() {
        if let Some(value) = provided.get(&attr.name) {
            if value.is_null() {
                return Err(PraxisError::ValidationFailed {
                    message: context(attr, "cannot be null"),
                });
            }
            attribute_value_ok(attr, value, rules, |reason| context(attr, &reason))?;
        } else if attr.required {
            return Err(PraxisError::ValidationFailed {
                message: context(attr, "is required"),
            });
        }
    }
    Ok(())
}

fn attribute_value_ok(
    attr: &MetaAttribute,
    value: &Value,
    rules: &AttributeRuleSet,
    format_error: impl Fn(String) -> String,
) -> PraxisResult<()> {
    match attr.value_type {
        MetaAttributeKind::String | MetaAttributeKind::Text => {
            let text = value
                .as_str()
                .ok_or_else(|| PraxisError::ValidationFailed {
                    message: format_error("expected string".into()),
                })?;
            let max = if attr.value_type == MetaAttributeKind::Text {
                rules.text_max
            } else {
                rules.string_max
            };
            if let Some(limit) = max
                && text.chars().count() > limit
            {
                return Err(PraxisError::ValidationFailed {
                    message: format_error(format!(
                        "exceeds max length {} ({} chars)",
                        limit,
                        text.chars().count()
                    )),
                });
            }
        }
        MetaAttributeKind::Number => {
            if !value.is_number() {
                return Err(PraxisError::ValidationFailed {
                    message: format_error("expected number".into()),
                });
            }
        }
        MetaAttributeKind::Boolean => {
            if !value.is_boolean() {
                return Err(PraxisError::ValidationFailed {
                    message: format_error("expected boolean".into()),
                });
            }
        }
        MetaAttributeKind::Enum => {
            let text = value
                .as_str()
                .ok_or_else(|| PraxisError::ValidationFailed {
                    message: format_error("expected string value for enum".into()),
                })?;
            let case_sensitive = rules.enum_case_sensitive;
            let matches = attr.enum_values.iter().any(|variant| {
                if case_sensitive {
                    variant == text
                } else {
                    variant.eq_ignore_ascii_case(text)
                }
            });
            if !matches {
                return Err(PraxisError::ValidationFailed {
                    message: format_error(format!(
                        "value '{}' not in [{}]",
                        text,
                        attr.enum_values.join(", ")
                    )),
                });
            }
        }
        MetaAttributeKind::Datetime => {
            let text = value
                .as_str()
                .ok_or_else(|| PraxisError::ValidationFailed {
                    message: format_error("expected ISO-8601 string".into()),
                })?;
            if OffsetDateTime::parse(text, &Rfc3339).is_err() {
                return Err(PraxisError::ValidationFailed {
                    message: format_error("invalid RFC3339 timestamp".into()),
                });
            }
        }
        MetaAttributeKind::Blob => {
            if !value.is_string() && !value.is_object() && !value.is_array() {
                return Err(PraxisError::ValidationFailed {
                    message: format_error("expected string/structured blob".into()),
                });
            }
        }
    }
    Ok(())
}

#[derive(Clone, Debug)]
struct TypeDescriptor {
    attributes: BTreeMap<String, MetaAttribute>,
}

#[derive(Clone, Debug)]
struct RelationshipDescriptor {
    from: Vec<String>,
    to: Vec<String>,
    attributes: BTreeMap<String, MetaAttribute>,
}

#[derive(Clone, Debug)]
struct AttributeRuleSet {
    string_max: Option<usize>,
    text_max: Option<usize>,
    enum_case_sensitive: bool,
}

impl AttributeRuleSet {
    fn from_validation(validation: Option<&MetaValidationRules>) -> Self {
        let attr_rules: Option<&MetaAttributeValidation> =
            validation.and_then(|rules| rules.attributes.as_ref());
        let string_max = attr_rules
            .and_then(|attrs| attrs.string.as_ref())
            .and_then(|rule: &MetaStringRule| rule.max_length);
        let text_max = attr_rules
            .and_then(|attrs| attrs.text.as_ref())
            .and_then(|rule: &MetaStringRule| rule.max_length);
        let enum_case_sensitive = attr_rules
            .and_then(|attrs| attrs.enum_rule.as_ref())
            .and_then(|rule: &MetaEnumRule| rule.case_sensitive)
            .unwrap_or(false);
        Self {
            string_max,
            text_max,
            enum_case_sensitive,
        }
    }
}

#[derive(Clone, Copy, Debug)]
struct RelationshipRule {
    allow_self: Option<bool>,
    allow_duplicate: Option<bool>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use aideon_mneme::temporal::{EdgeVersion, NodeVersion};
    use serde_json::json;

    #[test]
    fn validates_required_node_attributes() {
        let registry = MetaModelRegistry::embedded().expect("registry");
        let mut node = NodeVersion {
            id: "cap-1".into(),
            r#type: Some("Capability".into()),
            props: Some(json!({ "name": "Insight" })),
        };
        assert!(registry.validate_node(&node).is_ok());
        node.props = Some(json!({}));
        assert!(registry.validate_node(&node).is_err());
    }

    #[test]
    fn rejects_relationships_with_invalid_endpoints() {
        let registry = MetaModelRegistry::embedded().expect("registry");
        let from_type = "Capability";
        let to_type = "Capability"; // serves cannot target Capability
        let edge = EdgeVersion {
            id: None,
            from: "cap-a".into(),
            to: "cap-b".into(),
            r#type: Some("serves".into()),
            directed: Some(true),
            props: None,
        };
        assert!(registry.validate_edge(&edge, from_type, to_type).is_err());
    }

    #[test]
    fn enforces_enum_values() {
        let registry = MetaModelRegistry::embedded().expect("registry");
        let mut node = NodeVersion {
            id: "app-1".into(),
            r#type: Some("Application".into()),
            props: Some(json!({
                "name": "Insight Hub",
                "lifecycle": "Plan",
            })),
        };
        assert!(registry.validate_node(&node).is_ok());
        node.props = Some(json!({
            "name": "Insight Hub",
            "lifecycle": "Unknown",
        }));
        assert!(registry.validate_node(&node).is_err());
    }
}
