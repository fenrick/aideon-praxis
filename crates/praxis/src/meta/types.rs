//! Canonical meta-model document types for Praxis.

use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MetaModelDocument {
    pub version: String,
    pub description: Option<String>,
    pub types: Vec<MetaType>,
    pub relationships: Vec<MetaRelationship>,
    pub validation: Option<MetaValidationRules>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MetaType {
    pub id: String,
    #[serde(default)]
    pub uuid: Option<String>,
    pub label: Option<String>,
    pub category: Option<String>,
    pub extends: Option<String>,
    #[serde(default)]
    pub attributes: Vec<MetaAttribute>,
    #[serde(rename = "effectTypes", default)]
    pub effect_types: Option<Vec<String>>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Type)]
pub struct MetaAttribute {
    pub name: String,
    #[serde(default)]
    pub uuid: Option<String>,
    #[serde(rename = "type")]
    pub value_type: MetaAttributeKind,
    #[serde(default)]
    pub required: bool,
    #[serde(rename = "enum", default)]
    pub enum_values: Vec<String>,
    /// `single` (default) or `multi`; declared explicitly in the seed.
    #[serde(default)]
    pub cardinality: Option<String>,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "snake_case")]
pub enum MetaAttributeKind {
    String,
    Text,
    Number,
    Boolean,
    Enum,
    Datetime,
    Blob,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MetaRelationship {
    pub id: String,
    #[serde(default)]
    pub uuid: Option<String>,
    pub label: Option<String>,
    pub from: Vec<String>,
    pub to: Vec<String>,
    pub directed: Option<bool>,
    pub multiplicity: Option<MetaMultiplicity>,
    /// Whether a self-referential edge is permitted (declared inline in the seed).
    #[serde(rename = "allowSelf", default)]
    pub allow_self: Option<bool>,
    /// Whether duplicate edges between the same pair are permitted.
    #[serde(rename = "allowDuplicate", default)]
    pub allow_duplicate: Option<bool>,
    #[serde(default)]
    pub attributes: Vec<MetaAttribute>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MetaMultiplicity {
    pub from: String,
    pub to: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MetaValidationRules {
    pub attributes: Option<MetaAttributeRules>,
    pub relationships: Option<HashMap<String, MetaRelationshipValidation>>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MetaAttributeRules {
    pub string: Option<MetaStringRule>,
    pub text: Option<MetaStringRule>,
    #[serde(rename = "enum")]
    pub enum_rule: Option<MetaEnumRule>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MetaStringRule {
    #[serde(rename = "maxLength")]
    pub max_length: Option<usize>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MetaEnumRule {
    #[serde(rename = "caseSensitive")]
    pub case_sensitive: Option<bool>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MetaRelationshipValidation {
    #[serde(rename = "allowSelf")]
    pub allow_self: Option<bool>,
    #[serde(rename = "allowDuplicate")]
    pub allow_duplicate: Option<bool>,
}
