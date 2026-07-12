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

fn field(field_id: &str, key: &str, kind: FieldKind, enum_values: &[&str]) -> FieldDef {
    FieldDef {
        field_id: id(field_id),
        key: key.to_owned(),
        label: key.to_owned(),
        value_type: match kind {
            FieldKind::Number => mneme_core::schema::ValueType::F64,
            FieldKind::Datetime => mneme_core::schema::ValueType::Time,
            FieldKind::Boolean => mneme_core::schema::ValueType::Bool,
            _ => mneme_core::schema::ValueType::Str,
        },
        semantic_kind: kind,
        enum_values: enum_values.iter().map(|s| (*s).to_owned()).collect(),
        cardinality_multi: false,
        is_indexed: false,
    }
}

fn attach(type_id: &str, field_id: &str, required: bool) -> TypeFieldDef {
    TypeFieldDef {
        type_id: id(type_id),
        field_id: id(field_id),
        is_required: required,
        default_value: None,
        override_default: false,
        tighten_required: false,
    }
}

fn node_type(type_id: &str, key: &str, label: &str, category: &str, effects: &[&str]) -> TypeDef {
    TypeDef {
        type_id: id(type_id),
        key: key.to_owned(),
        applies_to: EntityKind::Node,
        label: label.to_owned(),
        category: Some(category.to_owned()),
        effect_types: effects.iter().map(|s| (*s).to_owned()).collect(),
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

/// The seed batch for the two representative types under test, in the authoring
/// order the fixtures pin.
fn seed_batch() -> AuthoredMetamodelBatch {
    AuthoredMetamodelBatch {
        types: vec![
            node_type(CAPABILITY, "Capability", "Capability", "Business", &[]),
            node_type(
                PLAN_EVENT,
                "PlanEvent",
                "Plan Event",
                "Planning",
                &["create", "update", "delete", "link", "unlink"],
            ),
            node_type(
                APPLICATION,
                "Application",
                "Application",
                "Application",
                &[],
            ),
            node_type(
                VSS,
                "ValueStreamStage",
                "Value Stream Stage",
                "Business",
                &[],
            ),
        ],
        fields: vec![
            field(CAP_NAME, "name", FieldKind::String, &[]),
            field(
                CAP_TIER,
                "tier",
                FieldKind::Enum,
                &["Strategic", "Core", "Supporting"],
            ),
            field(
                CAP_LIFECYCLE,
                "lifecycle",
                FieldKind::Enum,
                &["Target", "Current", "Retire"],
            ),
            field(PE_NAME, "name", FieldKind::String, &[]),
            field(PE_EFFECTIVE_AT, "effective_at", FieldKind::Datetime, &[]),
            field(PE_CONFIDENCE, "confidence", FieldKind::Number, &[]),
            field(
                PE_SOURCE_PRIORITY,
                "source.priority",
                FieldKind::Enum,
                &["P0", "P1", "P2"],
            ),
            field(APP_NAME, "name", FieldKind::String, &[]),
            field(APP_VENDOR, "vendor", FieldKind::String, &[]),
            field(
                APP_DISPOSITION,
                "disposition",
                FieldKind::Enum,
                &["Invest", "Tolerate", "Migrate", "Eliminate"],
            ),
            field(
                APP_LIFECYCLE,
                "lifecycle",
                FieldKind::Enum,
                &["Plan", "Build", "Run", "Retire"],
            ),
            field(VSS_NAME, "name", FieldKind::String, &[]),
            field(VSS_PURPOSE, "purpose", FieldKind::String, &[]),
            field(VSS_OWNER, "owner", FieldKind::String, &[]),
        ],
        type_fields: vec![
            attach(CAPABILITY, CAP_NAME, true),
            attach(CAPABILITY, CAP_TIER, false),
            attach(CAPABILITY, CAP_LIFECYCLE, false),
            attach(PLAN_EVENT, PE_NAME, true),
            attach(PLAN_EVENT, PE_EFFECTIVE_AT, true),
            attach(PLAN_EVENT, PE_CONFIDENCE, false),
            attach(PLAN_EVENT, PE_SOURCE_PRIORITY, false),
            attach(APPLICATION, APP_NAME, true),
            attach(APPLICATION, APP_VENDOR, false),
            attach(APPLICATION, APP_DISPOSITION, false),
            attach(APPLICATION, APP_LIFECYCLE, false),
            attach(VSS, VSS_NAME, true),
            attach(VSS, VSS_PURPOSE, false),
            attach(VSS, VSS_OWNER, false),
        ],
        edge_type_rules: vec![],
        validation: validation(),
        metamodel_version: Some("1.0.0".to_owned()),
        metamodel_source: Some("core-v1.json".to_owned()),
    }
}

fn fixture_canonical(name: &str) -> Vec<u8> {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../docs/data/fixtures/metamodel")
        .join(name);
    let bytes = std::fs::read(&path).unwrap_or_else(|e| panic!("read {path:?}: {e}"));
    let mut value: serde_json::Value = serde_json::from_slice(&bytes).expect("fixture parses");
    // `notes` documents the oracle; it is not a compiler output.
    value
        .as_object_mut()
        .expect("fixture is an object")
        .remove("notes");
    canonical_json_bytes(&value).expect("fixture canonicalises")
}

fn compiled_canonical(type_key: &str) -> Vec<u8> {
    let batch = seed_batch();
    let schemas = compile(&batch).expect("compile succeeds");
    let schema = schemas
        .iter()
        .find(|s| s.type_id == type_key)
        .expect("type compiled");
    to_canonical_json_bytes(schema).expect("schema canonicalises")
}

#[test]
fn capability_compiles_to_its_fixture() {
    assert_eq!(
        compiled_canonical("Capability"),
        fixture_canonical("capability.effective-schema.json"),
        "compiled Capability must match its effective-schema fixture byte-for-byte"
    );
}

#[test]
fn plan_event_compiles_to_its_fixture() {
    assert_eq!(
        compiled_canonical("PlanEvent"),
        fixture_canonical("plan-event.effective-schema.json"),
        "compiled PlanEvent must match its effective-schema fixture (datetime/number/dotted enum + effect_types)"
    );
}

#[test]
fn application_compiles_to_its_fixture() {
    assert_eq!(
        compiled_canonical("Application"),
        fixture_canonical("application.effective-schema.json"),
        "compiled Application must match its effective-schema fixture (four slots, two enums)"
    );
}

#[test]
fn value_stream_stage_compiles_to_its_fixture() {
    assert_eq!(
        compiled_canonical("ValueStreamStage"),
        fixture_canonical("value-stream-stage.effective-schema.json"),
        "compiled ValueStreamStage must match its fixture (three string slots, no extends)"
    );
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
