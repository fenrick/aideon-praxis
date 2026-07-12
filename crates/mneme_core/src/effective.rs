//! M1 effective-schema compilation — the derived projection of the authored
//! metamodel batch ([op-fact-schema-model], [slots-and-effective-schema]).
//!
//! The compiler resolves single inheritance depth-first, flattens parent slots
//! into each child (child-wins on a same-named slot), attaches the global
//! validation rules (length caps, enum case-sensitivity), records each slot's
//! stable `uuid`, and rejects inheritance cycles and unresolved parents as hard
//! errors. It is deterministic: recompiling from the same batch reproduces every
//! effective schema byte-for-byte under the canonical-JSON profile.
//!
//! This is a *derived* projection: it is never authored and is rebuilt from the
//! op log (the `AuthoredMetamodelBatch`) after a runtime wipe. It carries no
//! storage identifiers — types and slots are keyed by their stable domain
//! string ids, with UUIDs recorded only in the `uuid` field.

use serde::Serialize;

use crate::ids::Id;
use crate::schema::{AuthoredMetamodelBatch, FieldDef, FieldKind, TypeDef, TypeFieldDef};

/// A compile-time metamodel error. Rejected before any effective schema is
/// published, so no write ever validates against a bad schema.
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum CompileError {
    /// A type's `parent_type_id` names a type not in the batch.
    UnknownParent {
        /// The type whose parent is unresolved.
        type_key: String,
    },
    /// The `extends` chain forms a cycle.
    InheritanceCycle {
        /// The type at which the cycle was detected.
        type_key: String,
    },
    /// A `type_field` attachment names a `field_id` with no `FieldDef`.
    UnknownField {
        /// The type carrying the dangling attachment.
        type_key: String,
    },
}

impl std::fmt::Display for CompileError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::UnknownParent { type_key } => {
                write!(f, "type `{type_key}` extends an unknown parent type")
            }
            Self::InheritanceCycle { type_key } => {
                write!(f, "inheritance cycle detected at type `{type_key}`")
            }
            Self::UnknownField { type_key } => {
                write!(f, "type `{type_key}` attaches an unknown field")
            }
        }
    }
}

impl std::error::Error for CompileError {}

/// Slot cardinality as a stable schema-owned lower name.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Cardinality {
    /// A single scalar value.
    Single,
    /// Multiple concurrent scalar values on one field.
    Multi,
}

/// Whether a slot is declared on the type itself or flattened from a parent.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SlotSource {
    /// Declared on the compiled type.
    #[serde(rename = "self")]
    SelfDeclared,
    /// Flattened from an ancestor.
    Inherited,
}

/// A flattened, rule-attached slot descriptor.
#[derive(Clone, PartialEq, Debug, Serialize)]
pub struct EffectiveSlot {
    /// Stable slot key (attribute name; dotted names kept verbatim).
    pub key: String,
    /// Authored semantic kind.
    pub kind: FieldKind,
    /// Whether a write must supply a non-null value.
    pub required: bool,
    /// Single- or multi-valued.
    pub cardinality: Cardinality,
    /// Character cap for `string`/`text`; omitted for other kinds.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_length: Option<u32>,
    /// Allowed variants for `enum`; omitted for other kinds.
    #[serde(rename = "enum", skip_serializing_if = "Option::is_none")]
    pub enum_variants: Option<Vec<String>>,
    /// Enum case-sensitivity; omitted for non-enum kinds.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub case_sensitive: Option<bool>,
    /// Value format for `datetime` (`rfc3339`); omitted for other kinds.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,
    /// Slot's stable UUID (lower-case hyphenated).
    pub uuid: String,
    /// Where the slot was declared.
    pub source: SlotSource,
}

/// The compiled effective schema for one type.
#[derive(Clone, PartialEq, Debug, Serialize)]
pub struct EffectiveSchema {
    /// Stable domain type key.
    pub type_id: String,
    /// Display label.
    pub label: String,
    /// Authored classification.
    pub category: Option<String>,
    /// Type's stable UUID (lower-case hyphenated).
    pub uuid: String,
    /// Parent type key, or `null` if none.
    pub extends: Option<String>,
    /// Resolved chain, self first, root last.
    pub inheritance_chain: Vec<String>,
    /// Flattened, rule-attached slots in declaration order (parents first).
    pub slots: Vec<EffectiveSlot>,
    /// Plan-effect verbs the type declares; omitted when empty.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub effect_types: Vec<String>,
}

/// A relationship's structural rule, resolved to stable domain keys (never
/// storage UUIDs) so validation and the registry never see a raw storage id.
#[derive(Clone, PartialEq, Eq, Debug, Serialize)]
pub struct EffectiveEdgeRule {
    /// Stable relationship key (e.g. `serves`).
    pub key: String,
    /// Allowed source entity type keys.
    pub allowed_src: Vec<String>,
    /// Allowed destination entity type keys.
    pub allowed_dst: Vec<String>,
    /// Whether a self-referential edge is permitted.
    pub allow_self: bool,
    /// Whether a duplicate edge between the same ordered pair is permitted.
    pub allow_duplicate: bool,
    /// Source-side multiplicity bound.
    pub multiplicity_src: String,
    /// Destination-side multiplicity bound.
    pub multiplicity_dst: String,
}

/// Compile every node/edge type in `batch` into its effective schema.
///
/// # Errors
/// Returns [`CompileError`] for an unresolved parent, an inheritance cycle, or a
/// dangling field attachment — before any schema is published.
pub fn compile(batch: &AuthoredMetamodelBatch) -> Result<Vec<EffectiveSchema>, CompileError> {
    batch.types.iter().map(|t| compile_type(batch, t)).collect()
}

/// Compile each edge-type rule to its key-resolved form.
///
/// # Errors
/// Returns [`CompileError::UnknownParent`] (reused as "unresolved reference")
/// when a rule names an `edge_type_id` or endpoint `type_id` absent from the batch.
pub fn compile_edge_rules(
    batch: &AuthoredMetamodelBatch,
) -> Result<Vec<EffectiveEdgeRule>, CompileError> {
    batch
        .edge_type_rules
        .iter()
        .map(|rule| {
            let edge = find_type(batch, &rule.edge_type_id).ok_or_else(|| {
                CompileError::UnknownParent {
                    type_key: rule.edge_type_id.to_canonical_string(),
                }
            })?;
            let resolve = |ids: &[Id]| -> Result<Vec<String>, CompileError> {
                ids.iter()
                    .map(|tid| {
                        find_type(batch, tid).map(|t| t.key.clone()).ok_or_else(|| {
                            CompileError::UnknownParent {
                                type_key: edge.key.clone(),
                            }
                        })
                    })
                    .collect()
            };
            Ok(EffectiveEdgeRule {
                key: edge.key.clone(),
                allowed_src: resolve(&rule.allowed_src_type_ids)?,
                allowed_dst: resolve(&rule.allowed_dst_type_ids)?,
                allow_self: rule.allow_self,
                allow_duplicate: rule.allow_duplicate,
                multiplicity_src: rule.multiplicity_src.clone(),
                multiplicity_dst: rule.multiplicity_dst.clone(),
            })
        })
        .collect()
}

/// Compile a single type into its effective schema.
///
/// # Errors
/// See [`compile`].
pub fn compile_type(
    batch: &AuthoredMetamodelBatch,
    ty: &TypeDef,
) -> Result<EffectiveSchema, CompileError> {
    let chain = inheritance_chain(batch, ty)?;

    // Root → self so parent slots land first and a child slot overrides by key.
    let mut slots: Vec<EffectiveSlot> = Vec::new();
    for (depth, link) in chain.iter().rev().enumerate() {
        // `depth == chain.len() - 1` is the compiled type itself.
        let is_self = depth == chain.len() - 1;
        for attachment in type_fields_for(batch, &link.type_id) {
            let field = find_field(batch, &attachment.field_id).ok_or_else(|| {
                CompileError::UnknownField {
                    type_key: ty.key.clone(),
                }
            })?;
            let slot = build_slot(batch, field, attachment, is_self);
            match slots.iter_mut().find(|s| s.key == slot.key) {
                Some(existing) => *existing = slot, // child-wins, keeps position
                None => slots.push(slot),
            }
        }
    }

    let extends = ty
        .parent_type_id
        .as_ref()
        .and_then(|pid| find_type(batch, pid))
        .map(|p| p.key.clone());

    Ok(EffectiveSchema {
        type_id: ty.key.clone(),
        label: ty.label.clone(),
        category: ty.category.clone(),
        uuid: ty.type_id.to_canonical_string(),
        extends,
        inheritance_chain: chain.iter().map(|t| t.key.clone()).collect(),
        slots,
        effect_types: ty.effect_types.clone(),
    })
}

/// Resolve the inheritance chain (self first, root last), rejecting cycles and
/// unresolved parents.
fn inheritance_chain<'a>(
    batch: &'a AuthoredMetamodelBatch,
    ty: &'a TypeDef,
) -> Result<Vec<&'a TypeDef>, CompileError> {
    let mut chain: Vec<&TypeDef> = vec![ty];
    let mut current = ty;
    while let Some(parent_id) = current.parent_type_id.as_ref() {
        let parent = find_type(batch, parent_id).ok_or_else(|| CompileError::UnknownParent {
            type_key: ty.key.clone(),
        })?;
        if chain.iter().any(|t| t.type_id == parent.type_id) {
            return Err(CompileError::InheritanceCycle {
                type_key: ty.key.clone(),
            });
        }
        chain.push(parent);
        current = parent;
    }
    Ok(chain)
}

fn build_slot(
    batch: &AuthoredMetamodelBatch,
    field: &FieldDef,
    attachment: &TypeFieldDef,
    is_self: bool,
) -> EffectiveSlot {
    let (max_length, enum_variants, case_sensitive, format) = match field.semantic_kind {
        FieldKind::String => (batch.validation.string_max_length, None, None, None),
        FieldKind::Text => (batch.validation.text_max_length, None, None, None),
        FieldKind::Enum => (
            None,
            Some(field.enum_values.clone()),
            Some(batch.validation.enum_case_sensitive),
            None,
        ),
        FieldKind::Datetime => (None, None, None, Some("rfc3339".to_owned())),
        FieldKind::Number | FieldKind::Boolean | FieldKind::Blob => (None, None, None, None),
    };
    EffectiveSlot {
        key: field.key.clone(),
        kind: field.semantic_kind,
        required: attachment.is_required,
        cardinality: if field.cardinality_multi {
            Cardinality::Multi
        } else {
            Cardinality::Single
        },
        max_length,
        enum_variants,
        case_sensitive,
        format,
        uuid: field.field_id.to_canonical_string(),
        source: if is_self {
            SlotSource::SelfDeclared
        } else {
            SlotSource::Inherited
        },
    }
}

fn find_type<'a>(batch: &'a AuthoredMetamodelBatch, type_id: &Id) -> Option<&'a TypeDef> {
    batch.types.iter().find(|t| &t.type_id == type_id)
}

fn find_field<'a>(batch: &'a AuthoredMetamodelBatch, field_id: &Id) -> Option<&'a FieldDef> {
    batch.fields.iter().find(|f| &f.field_id == field_id)
}

fn type_fields_for<'a>(
    batch: &'a AuthoredMetamodelBatch,
    type_id: &'a Id,
) -> impl Iterator<Item = &'a TypeFieldDef> {
    batch
        .type_fields
        .iter()
        .filter(move |tf| &tf.type_id == type_id)
}
