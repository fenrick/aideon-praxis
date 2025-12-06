//! Praxis meta-model validation logic.

use crate::error::{PraxisError, PraxisResult};
use crate::meta::model::{AttributeRuleSet, RelationshipRule, TypeDescriptor};
use aideon_mneme::meta::{MetaAttribute, MetaAttributeKind};
use aideon_mneme::temporal::{EdgeVersion, NodeVersion};
use serde_json::Value;
use std::collections::{BTreeMap, HashMap};
use time::OffsetDateTime;
use time::format_description::well_known::Rfc3339;

use super::model::RelationshipDescriptor;

pub(super) fn validate_node(
    node: &NodeVersion,
    types: &BTreeMap<String, TypeDescriptor>,
    attr_rules: &AttributeRuleSet,
) -> PraxisResult<()> {
    let type_id = node
        .r#type
        .as_ref()
        .ok_or_else(|| PraxisError::ValidationFailed {
            message: format!("node '{}' missing type", node.id),
        })?;
    let descriptor = types
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
        validate_attributes(&descriptor.attributes, map, attr_rules, |attr, reason| {
            format!("node '{}' attribute '{}': {}", node.id, attr.name, reason)
        })?;
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

pub(super) fn validate_edge(
    edge: &EdgeVersion,
    from_type: &str,
    to_type: &str,
    relationships: &BTreeMap<String, RelationshipDescriptor>,
    relationship_rules: &HashMap<String, RelationshipRule>,
    attr_rules: &AttributeRuleSet,
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
    let descriptor = relationships
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

    if let Some(rule) = relationship_rules.get(rel_type)
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
        validate_attributes(&descriptor.attributes, map, attr_rules, |attr, reason| {
            format!(
                "edge '{}->{}' attribute '{}': {}",
                edge.from, edge.to, attr.name, reason
            )
        })?;
    } else if descriptor.attributes.values().any(|attr| attr.required) {
        return Err(PraxisError::ValidationFailed {
            message: format!("edge type '{rel_type}' missing required attributes"),
        });
    }

    Ok(())
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
