//! Schema-as-data: the authored, unflattened metamodel definitions carried by
//! the `upsert-metamodel-batch` operation.
//!
//! The batch holds **only** authored source — it does not carry inherited
//! fields, resolved defaults, flattened endpoint rules, or compiled validation;
//! those are derived M1 outputs ([op-fact-schema-model]). M0 records the batch
//! after structural validation and materialises it under
//! `model/schema/authored/`; it does not compile or semantically validate it.

use serde::{Deserialize, Serialize};

use crate::ids::Id;
use crate::value::Value;

/// Whether a type applies to nodes (entities) or edges (relationships).
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EntityKind {
    /// An entity type.
    Node,
    /// A relationship type.
    Edge,
}

/// The declarable field value types — the same algebra as [`crate::value`].
/// `json` is intentionally absent.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ValueType {
    /// UTF-8 string.
    Str,
    /// 64-bit integer.
    I64,
    /// Finite float.
    F64,
    /// Boolean.
    Bool,
    /// Valid-time coordinate.
    Time,
    /// Entity reference.
    Ref,
    /// Content-addressed binary reference.
    Blob,
}

/// A metamodel type definition (authored source).
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TypeDef {
    /// Metamodel symbol UUID (UUIDv5).
    pub type_id: Id,
    /// Whether the type applies to nodes or edges.
    pub applies_to: EntityKind,
    /// Human-readable label.
    pub label: String,
    /// Whether the type is abstract (not directly instantiable).
    pub is_abstract: bool,
    /// Single-inheritance parent; cycles are an M1 rejection, not M0.
    pub parent_type_id: Option<Id>,
}

/// A field/slot definition (authored source).
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FieldDef {
    /// Attribute symbol UUID (UUIDv5).
    pub field_id: Id,
    /// Human-readable label.
    pub label: String,
    /// The field's value type.
    pub value_type: ValueType,
    /// Whether the field admits multiple concurrent values.
    pub cardinality_multi: bool,
    /// Whether the field is indexed in the derived runtime.
    pub is_indexed: bool,
    /// Whether overlapping valid-time intervals are disallowed.
    pub disallow_overlap: bool,
}

/// A per-type field attachment with defaults (authored source).
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TypeFieldDef {
    /// The type this attachment is for.
    pub type_id: Id,
    /// The field being attached.
    pub field_id: Id,
    /// Whether the field is required on this type.
    pub is_required: bool,
    /// Default value when none is asserted.
    pub default_value: Option<Value>,
    /// Whether this attachment overrides an inherited default.
    pub override_default: bool,
    /// Whether this attachment tightens the inherited required flag.
    pub tighten_required: bool,
    /// Per-attachment overlap override.
    pub disallow_overlap: Option<bool>,
}

/// An edge-type endpoint rule (authored source).
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct EdgeTypeRule {
    /// The relationship type the rule governs.
    pub edge_type_id: Id,
    /// Allowed source entity types.
    pub allowed_src_type_ids: Vec<Id>,
    /// Allowed destination entity types.
    pub allowed_dst_type_ids: Vec<Id>,
    /// Optional semantic direction label.
    pub semantic_direction: Option<String>,
}

/// The `upsert-metamodel-batch` payload: authored, unflattened definitions.
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AuthoredMetamodelBatch {
    /// Type definitions.
    pub types: Vec<TypeDef>,
    /// Field definitions.
    pub fields: Vec<FieldDef>,
    /// Per-type field attachments.
    pub type_fields: Vec<TypeFieldDef>,
    /// Edge endpoint rules.
    pub edge_type_rules: Vec<EdgeTypeRule>,
    /// The package version this batch publishes (immutable once published).
    pub metamodel_version: Option<String>,
    /// Source metadata for the batch.
    pub metamodel_source: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn value_type_enum_rejected() {
        let err = serde_json::from_str::<ValueType>("\"enum\"");
        assert!(err.is_err());
    }
}
