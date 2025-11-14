use serde::{Deserialize, Serialize};

/// JSON document describing the Praxis meta-model schema.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MetaModelDocument {
    pub version: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub types: Vec<MetaType>,
    #[serde(default)]
    pub relationships: Vec<MetaRelationship>,
    #[serde(default)]
    pub validation: Option<MetaValidationRules>,
}

/// Meta-model element type definition.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MetaType {
    pub id: String,
    #[serde(default)]
    pub label: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub extends: Option<String>,
    #[serde(default)]
    pub attributes: Vec<MetaAttribute>,
    #[serde(default, rename = "effectTypes")]
    pub effect_types: Vec<String>,
}

/// Attribute definition shared by node types and relationships.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MetaAttribute {
    pub name: String,
    #[serde(rename = "type")]
    pub value_type: MetaAttributeKind,
    #[serde(default)]
    pub required: bool,
    #[serde(default, rename = "enum")]
    pub enum_values: Vec<String>,
}

/// Primitive kinds supported by schema attributes.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MetaAttributeKind {
    String,
    Text,
    Number,
    Datetime,
    Enum,
    Boolean,
    Blob,
}

/// Relationship definition with optional multiplicity and attributes.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MetaRelationship {
    pub id: String,
    #[serde(default)]
    pub label: Option<String>,
    pub from: Vec<String>,
    pub to: Vec<String>,
    #[serde(default)]
    pub directed: Option<bool>,
    #[serde(default)]
    pub multiplicity: Option<MetaMultiplicity>,
    #[serde(default)]
    pub attributes: Vec<MetaAttribute>,
}

/// Optional multiplicity definition per relationship endpoint.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MetaMultiplicity {
    pub from: Option<String>,
    pub to: Option<String>,
}

/// Optional validation directives declared inside the meta-model document.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct MetaValidationRules {
    #[serde(default)]
    pub attributes: Option<MetaAttributeValidation>,
    #[serde(default)]
    pub relationships: Option<std::collections::BTreeMap<String, MetaRelationshipValidation>>, // keyed by relationship id
}

/// Aggregate validation hints for attribute kinds.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct MetaAttributeValidation {
    #[serde(default)]
    pub string: Option<MetaStringRule>,
    #[serde(default)]
    pub text: Option<MetaStringRule>,
    #[serde(default, rename = "enum")]
    pub enum_rule: Option<MetaEnumRule>,
}

/// Validation hints for string/text fields (e.g., max length).
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct MetaStringRule {
    #[serde(default, rename = "maxLength")]
    pub max_length: Option<usize>,
}

/// Validation hints specific to enum fields.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct MetaEnumRule {
    #[serde(default, rename = "caseSensitive")]
    pub case_sensitive: Option<bool>,
}

/// Validation hints keyed per relationship id.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct MetaRelationshipValidation {
    #[serde(default, rename = "allowSelf")]
    pub allow_self: Option<bool>,
    #[serde(default, rename = "allowDuplicate")]
    pub allow_duplicate: Option<bool>,
}
