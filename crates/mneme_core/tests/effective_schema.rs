//! Oracle test for the M1 effective-schema compiler: compiling representative
//! seed types must reproduce the committed effective-schema fixtures
//! (`docs/data/fixtures/metamodel/*.effective-schema.json`) byte-for-byte under
//! the canonical-JSON profile, and be deterministic across recompiles.
//!
//! The fixtures carry a human `notes` field documenting the oracle; it is not a
//! compiler output, so it is stripped before the byte comparison.

use std::path::PathBuf;

use mneme_core::canonical::{canonical_json_bytes, to_canonical_json_bytes};
use mneme_core::effective::compile;
use mneme_core::ids::Id;
use mneme_core::schema::{
    AuthoredMetamodelBatch, AuthoredValidationRules, EntityKind, FieldDef, FieldKind, TypeDef,
    TypeFieldDef,
};

fn id(s: &str) -> Id {
    s.parse().expect("valid uuid")
}

/// A field definition's authoring inputs, grouped so the builder takes one
/// cohesive spec rather than a string-heavy argument list.
struct FieldSpec<'a> {
    field_id: &'a str,
    key: &'a str,
    kind: FieldKind,
    enum_values: &'a [&'a str],
}

fn field(spec: FieldSpec<'_>) -> FieldDef {
    FieldDef {
        field_id: id(spec.field_id),
        key: spec.key.to_owned(),
        label: spec.key.to_owned(),
        value_type: match spec.kind {
            FieldKind::Number => mneme_core::schema::ValueType::F64,
            FieldKind::Datetime => mneme_core::schema::ValueType::Time,
            FieldKind::Boolean => mneme_core::schema::ValueType::Bool,
            _ => mneme_core::schema::ValueType::Str,
        },
        semantic_kind: spec.kind,
        enum_values: spec.enum_values.iter().map(|s| (*s).to_owned()).collect(),
        cardinality_multi: false,
        is_indexed: false,
    }
}

/// A type↔field attachment's authoring inputs.
struct AttachSpec<'a> {
    type_id: &'a str,
    field_id: &'a str,
    required: bool,
}

fn attach(spec: AttachSpec<'_>) -> TypeFieldDef {
    TypeFieldDef {
        type_id: id(spec.type_id),
        field_id: id(spec.field_id),
        is_required: spec.required,
        default_value: None,
        override_default: false,
        tighten_required: false,
    }
}

/// A node type's authoring inputs.
struct NodeSpec<'a> {
    type_id: &'a str,
    key: &'a str,
    label: &'a str,
    category: &'a str,
    effects: &'a [&'a str],
}

fn node_type(spec: NodeSpec<'_>) -> TypeDef {
    TypeDef {
        type_id: id(spec.type_id),
        key: spec.key.to_owned(),
        applies_to: EntityKind::Node,
        label: spec.label.to_owned(),
        category: Some(spec.category.to_owned()),
        effect_types: spec.effects.iter().map(|s| (*s).to_owned()).collect(),
        is_abstract: false,
        parent_type_id: None,
    }
}

fn validation() -> AuthoredValidationRules {
    AuthoredValidationRules {
        string_max_length: Some(256),
        text_max_length: Some(4096),
        enum_case_sensitive: false,
    }
}

const CAPABILITY: &str = "88c36fbe-5c8e-5485-92eb-952a4636be57";
const CAP_NAME: &str = "a1fc3738-3b42-5737-b0ed-1eba8774623c";
const CAP_TIER: &str = "935bc847-8e37-5ba3-9af9-7547fddce21f";
const CAP_LIFECYCLE: &str = "0b94086b-18e7-5f46-b01f-0ba456451e40";

const PLAN_EVENT: &str = "4ec5772b-2eb6-53f0-885a-b39afce94c3f";
const PE_NAME: &str = "77dfe604-8ab0-524d-b177-30ce43827609";
const PE_EFFECTIVE_AT: &str = "d7b202c2-5581-5cfe-812e-10f2fc7cbb41";
const PE_CONFIDENCE: &str = "9e6d4ec5-7fb8-5c8c-b84a-2844bd09606e";
const PE_SOURCE_PRIORITY: &str = "327ff9e7-d8e8-5681-b296-9f38b564399b";

const APPLICATION: &str = "c8d3aeef-d3d2-5143-9c63-7e11c2f019a2";
const APP_NAME: &str = "03e12e7f-c494-5387-bb4f-a8c472ea6e79";
const APP_VENDOR: &str = "8555b467-6189-5783-a813-8dd0a385f7d4";
const APP_DISPOSITION: &str = "d4c7fcfa-3c4c-5ceb-abd3-1fc14e28c273";
const APP_LIFECYCLE: &str = "8d8a3e48-9771-509a-a473-76fa166504b5";

const VSS: &str = "9472618f-07ce-555f-9582-2b1fd330de68";
const VSS_NAME: &str = "578015f8-6bfd-5eb8-8e25-e61514dcca20";
const VSS_PURPOSE: &str = "dac8b144-6faa-5b56-84bb-c429765108f4";
const VSS_OWNER: &str = "52707e42-820c-5fc9-8d9c-82b66f07ee99";

/// The seed batch for the representative types under test, in the authoring
/// order the fixtures pin.
fn seed_batch() -> AuthoredMetamodelBatch {
    AuthoredMetamodelBatch {
        types: seed_types(),
        fields: seed_fields(),
        type_fields: seed_type_fields(),
        edge_type_rules: vec![],
        validation: validation(),
        metamodel_version: Some("1.0.0".to_owned()),
        metamodel_source: Some("core-v1.json".to_owned()),
    }
}

fn seed_types() -> Vec<TypeDef> {
    vec![
        node_type(NodeSpec {
            type_id: CAPABILITY,
            key: "Capability",
            label: "Capability",
            category: "Business",
            effects: &[],
        }),
        node_type(NodeSpec {
            type_id: PLAN_EVENT,
            key: "PlanEvent",
            label: "Plan Event",
            category: "Planning",
            effects: &["create", "update", "delete", "link", "unlink"],
        }),
        node_type(NodeSpec {
            type_id: APPLICATION,
            key: "Application",
            label: "Application",
            category: "Application",
            effects: &[],
        }),
        node_type(NodeSpec {
            type_id: VSS,
            key: "ValueStreamStage",
            label: "Value Stream Stage",
            category: "Business",
            effects: &[],
        }),
    ]
}

fn seed_fields() -> Vec<FieldDef> {
    // (field_id, key, kind, enum_values) rows, mapped through the builder so the
    // authoring table stays compact and the builder keeps one cohesive spec.
    let rows: &[(&str, &str, FieldKind, &[&str])] = &[
        (CAP_NAME, "name", FieldKind::String, &[]),
        (
            CAP_TIER,
            "tier",
            FieldKind::Enum,
            &["Strategic", "Core", "Supporting"],
        ),
        (
            CAP_LIFECYCLE,
            "lifecycle",
            FieldKind::Enum,
            &["Target", "Current", "Retire"],
        ),
        (PE_NAME, "name", FieldKind::String, &[]),
        (PE_EFFECTIVE_AT, "effective_at", FieldKind::Datetime, &[]),
        (PE_CONFIDENCE, "confidence", FieldKind::Number, &[]),
        (
            PE_SOURCE_PRIORITY,
            "source.priority",
            FieldKind::Enum,
            &["P0", "P1", "P2"],
        ),
        (APP_NAME, "name", FieldKind::String, &[]),
        (APP_VENDOR, "vendor", FieldKind::String, &[]),
        (
            APP_DISPOSITION,
            "disposition",
            FieldKind::Enum,
            &["Invest", "Tolerate", "Migrate", "Eliminate"],
        ),
        (
            APP_LIFECYCLE,
            "lifecycle",
            FieldKind::Enum,
            &["Plan", "Build", "Run", "Retire"],
        ),
        (VSS_NAME, "name", FieldKind::String, &[]),
        (VSS_PURPOSE, "purpose", FieldKind::String, &[]),
        (VSS_OWNER, "owner", FieldKind::String, &[]),
    ];
    rows.iter()
        .map(|&(field_id, key, kind, enum_values)| {
            field(FieldSpec {
                field_id,
                key,
                kind,
                enum_values,
            })
        })
        .collect()
}

fn seed_type_fields() -> Vec<TypeFieldDef> {
    // (type_id, field_id, required) rows for each type↔field attachment.
    let rows: &[(&str, &str, bool)] = &[
        (CAPABILITY, CAP_NAME, true),
        (CAPABILITY, CAP_TIER, false),
        (CAPABILITY, CAP_LIFECYCLE, false),
        (PLAN_EVENT, PE_NAME, true),
        (PLAN_EVENT, PE_EFFECTIVE_AT, true),
        (PLAN_EVENT, PE_CONFIDENCE, false),
        (PLAN_EVENT, PE_SOURCE_PRIORITY, false),
        (APPLICATION, APP_NAME, true),
        (APPLICATION, APP_VENDOR, false),
        (APPLICATION, APP_DISPOSITION, false),
        (APPLICATION, APP_LIFECYCLE, false),
        (VSS, VSS_NAME, true),
        (VSS, VSS_PURPOSE, false),
        (VSS, VSS_OWNER, false),
    ];
    rows.iter()
        .map(|&(type_id, field_id, required)| {
            attach(AttachSpec {
                type_id,
                field_id,
                required,
            })
        })
        .collect()
}

/// One oracle case: a compiled type key, its committed fixture file, and the
/// assertion message. Grouping the three strings keeps the runner off a
/// string-heavy argument list.
struct OracleCase {
    type_key: &'static str,
    fixture: &'static str,
    message: &'static str,
}

/// Compile the seed batch and assert the named type matches its committed
/// effective-schema fixture byte-for-byte under the canonical-JSON profile.
fn assert_compiles_to_fixture(case: &OracleCase) {
    let batch = seed_batch();
    let schemas = compile(&batch).expect("compile succeeds");
    let schema = schemas
        .iter()
        .find(|s| s.type_id == case.type_key)
        .expect("type compiled");
    let compiled = to_canonical_json_bytes(schema).expect("schema canonicalises");

    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../docs/data/fixtures/metamodel")
        .join(case.fixture);
    let bytes = std::fs::read(&path).unwrap_or_else(|e| panic!("read {path:?}: {e}"));
    let mut value: serde_json::Value = serde_json::from_slice(&bytes).expect("fixture parses");
    // `notes` documents the oracle; it is not a compiler output.
    value
        .as_object_mut()
        .expect("fixture is an object")
        .remove("notes");
    let expected = canonical_json_bytes(&value).expect("fixture canonicalises");

    assert_eq!(compiled, expected, "{}", case.message);
}

#[test]
fn capability_compiles_to_its_fixture() {
    assert_compiles_to_fixture(&OracleCase {
        type_key: "Capability",
        fixture: "capability.effective-schema.json",
        message: "compiled Capability must match its effective-schema fixture byte-for-byte",
    });
}

#[test]
fn plan_event_compiles_to_its_fixture() {
    assert_compiles_to_fixture(&OracleCase {
        type_key: "PlanEvent",
        fixture: "plan-event.effective-schema.json",
        message: "compiled PlanEvent must match its effective-schema fixture (datetime/number/dotted enum + effect_types)",
    });
}

#[test]
fn application_compiles_to_its_fixture() {
    assert_compiles_to_fixture(&OracleCase {
        type_key: "Application",
        fixture: "application.effective-schema.json",
        message: "compiled Application must match its effective-schema fixture (four slots, two enums)",
    });
}

#[test]
fn value_stream_stage_compiles_to_its_fixture() {
    assert_compiles_to_fixture(&OracleCase {
        type_key: "ValueStreamStage",
        fixture: "value-stream-stage.effective-schema.json",
        message: "compiled ValueStreamStage must match its fixture (three string slots, no extends)",
    });
}

#[test]
fn recompile_is_byte_identical() {
    let batch = seed_batch();
    let first = to_canonical_json_bytes(&compile(&batch).unwrap()).unwrap();
    let second = to_canonical_json_bytes(&compile(&batch).unwrap()).unwrap();
    assert_eq!(
        first, second,
        "recompiling the same batch must be byte-identical"
    );
}
