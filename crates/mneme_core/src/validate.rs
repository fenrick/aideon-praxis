//! M1 write validation against the compiled effective schema
//! ([validation-rules], [metamodel README error-code set]).
//!
//! Every authoring write is checked here *before* any operation is appended, so
//! an invalid write never enters the op log. Node writes are checked against the
//! type's [`EffectiveSchema`]; edge writes additionally against the relationship's
//! [`EffectiveEdgeRule`] (endpoints, self-links, duplicates). Failures carry a
//! stable `code` from the documented validation error-code set.

use serde_json::Value as Json;

use crate::effective::{EffectiveEdgeRule, EffectiveSchema, EffectiveSlot};
use crate::schema::FieldKind;

/// A typed validation failure. `code()` yields the stable
/// [metamodel README](../../docs/data/fixtures/metamodel/README.md) error code.
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum ValidationError {
    /// The write names a type with no effective schema.
    UnknownType {
        /// The offending type key.
        key: String,
    },
    /// The edge names a relationship type with no rule.
    UnknownRelationshipType {
        /// The offending relationship key.
        key: String,
    },
    /// A required attribute is absent or null.
    MissingRequiredAttribute {
        /// The missing slot key.
        key: String,
    },
    /// A value is not of its slot's declared kind.
    WrongAttributeKind {
        /// The slot key.
        key: String,
        /// The expected kind.
        expected: FieldKind,
    },
    /// A `string`/`text` value exceeds its length cap.
    StringTooLong {
        /// The slot key.
        key: String,
        /// The character cap.
        max: u32,
    },
    /// An `enum` value is not a declared variant.
    EnumValueNotAllowed {
        /// The slot key.
        key: String,
        /// The rejected value.
        value: String,
    },
    /// An endpoint entity's type is not permitted for the relationship.
    EndpointTypeNotAllowed {
        /// The relationship key.
        key: String,
        /// `"src"` or `"dst"`.
        endpoint: &'static str,
        /// The offending entity type key.
        entity_type: String,
    },
    /// A self-referential edge where `allow_self` is false.
    SelfLinkNotAllowed {
        /// The relationship key.
        key: String,
    },
    /// A duplicate edge where `allow_duplicate` is false.
    DuplicateRelationship {
        /// The relationship key.
        key: String,
    },
}

impl ValidationError {
    /// The stable error code from the documented validation error-code set.
    #[must_use]
    pub fn code(&self) -> &'static str {
        match self {
            Self::UnknownType { .. } => "UNKNOWN_TYPE",
            Self::UnknownRelationshipType { .. } => "UNKNOWN_RELATIONSHIP_TYPE",
            Self::MissingRequiredAttribute { .. } => "MISSING_REQUIRED_ATTRIBUTE",
            Self::WrongAttributeKind { .. } => "WRONG_ATTRIBUTE_KIND",
            Self::StringTooLong { .. } => "STRING_TOO_LONG",
            Self::EnumValueNotAllowed { .. } => "ENUM_VALUE_NOT_ALLOWED",
            Self::EndpointTypeNotAllowed { .. } => "ENDPOINT_TYPE_NOT_ALLOWED",
            Self::SelfLinkNotAllowed { .. } => "SELF_LINK_NOT_ALLOWED",
            Self::DuplicateRelationship { .. } => "DUPLICATE_RELATIONSHIP",
        }
    }
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::UnknownType { key } => write!(f, "unknown type `{key}`"),
            Self::UnknownRelationshipType { key } => write!(f, "unknown relationship type `{key}`"),
            Self::MissingRequiredAttribute { key } => {
                write!(f, "missing required attribute `{key}`")
            }
            Self::WrongAttributeKind { key, expected } => {
                write!(f, "attribute `{key}` is not of kind {expected:?}")
            }
            Self::StringTooLong { key, max } => {
                write!(f, "attribute `{key}` exceeds max length {max}")
            }
            Self::EnumValueNotAllowed { key, value } => {
                write!(f, "value `{value}` is not an allowed variant of `{key}`")
            }
            Self::EndpointTypeNotAllowed {
                key,
                endpoint,
                entity_type,
            } => {
                write!(
                    f,
                    "`{entity_type}` is not an allowed {endpoint} endpoint of `{key}`"
                )
            }
            Self::SelfLinkNotAllowed { key } => write!(f, "`{key}` forbids self-links"),
            Self::DuplicateRelationship { key } => write!(f, "`{key}` forbids duplicate edges"),
        }
    }
}

impl std::error::Error for ValidationError {}

/// Validate a node write's `props` against the type's effective schema.
///
/// # Errors
/// Returns the first [`ValidationError`] found: a missing required attribute, a
/// wrong-kind value, an over-length string, or a disallowed enum value.
pub fn validate_node(schema: &EffectiveSchema, props: &Json) -> Result<(), ValidationError> {
    validate_slots(&schema.slots, props)
}

/// The runtime context an edge write needs beyond the metamodel: the endpoint
/// entity type keys, whether the endpoints are identical, and whether an edge of
/// this type already connects the same ordered pair.
pub struct EdgeContext<'a> {
    /// Source entity's type key.
    pub src_type: &'a str,
    /// Destination entity's type key.
    pub dst_type: &'a str,
    /// Whether source and destination are the same entity.
    pub is_self: bool,
    /// Whether an edge of this type already connects the same ordered pair.
    pub duplicate_exists: bool,
}

/// Validate an edge write against its relationship rule and effective schema.
///
/// Structural checks (endpoints, self, duplicate) run first, then the edge's
/// attribute slots.
///
/// # Errors
/// Returns the first [`ValidationError`]: endpoint-type, self-link, duplicate, or
/// an attribute failure.
pub fn validate_edge(
    rule: &EffectiveEdgeRule,
    schema: &EffectiveSchema,
    ctx: &EdgeContext<'_>,
    props: &Json,
) -> Result<(), ValidationError> {
    if !rule.allowed_src.iter().any(|t| t == ctx.src_type) {
        return Err(ValidationError::EndpointTypeNotAllowed {
            key: rule.key.clone(),
            endpoint: "src",
            entity_type: ctx.src_type.to_owned(),
        });
    }
    if !rule.allowed_dst.iter().any(|t| t == ctx.dst_type) {
        return Err(ValidationError::EndpointTypeNotAllowed {
            key: rule.key.clone(),
            endpoint: "dst",
            entity_type: ctx.dst_type.to_owned(),
        });
    }
    if ctx.is_self && !rule.allow_self {
        return Err(ValidationError::SelfLinkNotAllowed {
            key: rule.key.clone(),
        });
    }
    if ctx.duplicate_exists && !rule.allow_duplicate {
        return Err(ValidationError::DuplicateRelationship {
            key: rule.key.clone(),
        });
    }
    validate_slots(&schema.slots, props)
}

/// Shared slot checks for node and edge attribute sets.
fn validate_slots(slots: &[EffectiveSlot], props: &Json) -> Result<(), ValidationError> {
    let obj = props.as_object();
    for slot in slots {
        let present = obj.and_then(|o| o.get(&slot.key)).filter(|v| !v.is_null());
        match present {
            None => {
                if slot.required {
                    return Err(ValidationError::MissingRequiredAttribute {
                        key: slot.key.clone(),
                    });
                }
            }
            Some(value) => check_value(slot, value)?,
        }
    }
    Ok(())
}

fn check_value(slot: &EffectiveSlot, value: &Json) -> Result<(), ValidationError> {
    match slot.kind {
        FieldKind::String | FieldKind::Text => {
            let s = value.as_str().ok_or_else(|| wrong_kind(slot))?;
            if let Some(max) = slot.max_length
                && s.chars().count() > max as usize
            {
                return Err(ValidationError::StringTooLong {
                    key: slot.key.clone(),
                    max,
                });
            }
        }
        FieldKind::Number => {
            if !value.is_number() {
                return Err(wrong_kind(slot));
            }
        }
        FieldKind::Boolean => {
            if !value.is_boolean() {
                return Err(wrong_kind(slot));
            }
        }
        FieldKind::Datetime => {
            let s = value.as_str().ok_or_else(|| wrong_kind(slot))?;
            if ::time::OffsetDateTime::parse(s, &::time::format_description::well_known::Rfc3339)
                .is_err()
            {
                return Err(wrong_kind(slot));
            }
        }
        FieldKind::Enum => {
            let s = value.as_str().ok_or_else(|| wrong_kind(slot))?;
            let variants = slot.enum_variants.as_deref().unwrap_or(&[]);
            let case_sensitive = slot.case_sensitive.unwrap_or(true);
            let ok = variants.iter().any(|v| {
                if case_sensitive {
                    v == s
                } else {
                    v.eq_ignore_ascii_case(s)
                }
            });
            if !ok {
                return Err(ValidationError::EnumValueNotAllowed {
                    key: slot.key.clone(),
                    value: s.to_owned(),
                });
            }
        }
        FieldKind::Blob => {
            // A blob slot carries a reference (string/object); no scalar check here.
        }
    }
    Ok(())
}

fn wrong_kind(slot: &EffectiveSlot) -> ValidationError {
    ValidationError::WrongAttributeKind {
        key: slot.key.clone(),
        expected: slot.kind,
    }
}
