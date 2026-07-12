//! M1 validation exit tests: the accept/reject cases the build contract pins
//! ([M1-meaning], [validation-rules]). Node and edge writes are checked against
//! the compiled effective schema; each rejected case carries its documented
//! error code.

use mneme_core::effective::{
    Cardinality, EffectiveEdgeRule, EffectiveSchema, EffectiveSlot, SlotSource,
};
use mneme_core::schema::FieldKind;
use mneme_core::validate::{EdgeContext, validate_edge, validate_node};
use serde_json::json;

fn slot(key: &str, kind: FieldKind, required: bool) -> EffectiveSlot {
    EffectiveSlot {
        key: key.to_owned(),
        kind,
        required,
        cardinality: Cardinality::Single,
        max_length: matches!(kind, FieldKind::String).then_some(256),
        enum_variants: None,
        case_sensitive: None,
        format: None,
        uuid: "00000000-0000-4000-8000-000000000000".to_owned(),
        source: SlotSource::SelfDeclared,
    }
}

fn enum_slot(key: &str, variants: &[&str]) -> EffectiveSlot {
    EffectiveSlot {
        enum_variants: Some(variants.iter().map(|s| (*s).to_owned()).collect()),
        case_sensitive: Some(false),
        ..slot(key, FieldKind::Enum, false)
    }
}

/// Capability: `name` required string, `tier` optional enum Strategic/Core/Supporting.
fn capability() -> EffectiveSchema {
    EffectiveSchema {
        type_id: "Capability".to_owned(),
        label: "Capability".to_owned(),
        category: Some("Business".to_owned()),
        uuid: "88c36fbe-5c8e-5485-92eb-952a4636be57".to_owned(),
        extends: None,
        inheritance_chain: vec!["Capability".to_owned()],
        slots: vec![
            slot("name", FieldKind::String, true),
            enum_slot("tier", &["Strategic", "Core", "Supporting"]),
        ],
        effect_types: vec![],
    }
}

/// `accesses` edge: BusinessProcess/Application → DataEntity, no self, no duplicate,
/// required `mode` enum.
fn accesses_rule() -> EffectiveEdgeRule {
    EffectiveEdgeRule {
        key: "accesses".to_owned(),
        allowed_src: vec!["BusinessProcess".to_owned(), "Application".to_owned()],
        allowed_dst: vec!["DataEntity".to_owned()],
        allow_self: false,
        allow_duplicate: false,
        multiplicity_src: "many".to_owned(),
        multiplicity_dst: "many".to_owned(),
    }
}

fn accesses_schema() -> EffectiveSchema {
    EffectiveSchema {
        type_id: "accesses".to_owned(),
        label: "Accesses".to_owned(),
        category: None,
        uuid: "71bccc12-2ebd-5454-bff5-2f230e0a911f".to_owned(),
        extends: None,
        inheritance_chain: vec!["accesses".to_owned()],
        slots: vec![{
            let mut s = enum_slot("mode", &["read", "write", "readwrite"]);
            s.required = true;
            s
        }],
        effect_types: vec![],
    }
}

/// `serves`: Capability → ValueStreamStage, no self, duplicates allowed.
fn serves_rule() -> EffectiveEdgeRule {
    EffectiveEdgeRule {
        key: "serves".to_owned(),
        allowed_src: vec!["Capability".to_owned()],
        allowed_dst: vec!["ValueStreamStage".to_owned()],
        allow_self: false,
        allow_duplicate: true,
        multiplicity_src: "many".to_owned(),
        multiplicity_dst: "many".to_owned(),
    }
}

fn serves_schema() -> EffectiveSchema {
    EffectiveSchema {
        type_id: "serves".to_owned(),
        label: "Serves".to_owned(),
        category: None,
        uuid: "1da64e39-cb18-5fd8-a35d-7c42ed6e13b8".to_owned(),
        extends: None,
        inheritance_chain: vec!["serves".to_owned()],
        slots: vec![],
        effect_types: vec![],
    }
}

// ---- node cases ----

#[test]
fn capability_with_name_and_valid_tier_validates() {
    let r = validate_node(
        &capability(),
        &json!({ "name": "Customer Insight", "tier": "Strategic" }),
    );
    assert!(r.is_ok(), "{r:?}");
}

#[test]
fn enum_match_is_case_insensitive() {
    let r = validate_node(&capability(), &json!({ "name": "x", "tier": "strategic" }));
    assert!(r.is_ok(), "lower-case enum must validate: {r:?}");
}

#[test]
fn out_of_range_enum_is_rejected() {
    let err =
        validate_node(&capability(), &json!({ "name": "x", "tier": "Tactical" })).unwrap_err();
    assert_eq!(err.code(), "ENUM_VALUE_NOT_ALLOWED");
}

#[test]
fn missing_required_name_is_rejected() {
    let err = validate_node(&capability(), &json!({ "tier": "Core" })).unwrap_err();
    assert_eq!(err.code(), "MISSING_REQUIRED_ATTRIBUTE");
}

#[test]
fn wrong_kind_name_is_rejected() {
    let err = validate_node(&capability(), &json!({ "name": 42 })).unwrap_err();
    assert_eq!(err.code(), "WRONG_ATTRIBUTE_KIND");
}

#[test]
fn overlong_string_is_rejected() {
    let long = "a".repeat(257);
    let err = validate_node(&capability(), &json!({ "name": long })).unwrap_err();
    assert_eq!(err.code(), "STRING_TOO_LONG");
}

// ---- edge cases ----

#[test]
fn accesses_with_mode_validates() {
    let ctx = EdgeContext {
        src_type: "Application",
        dst_type: "DataEntity",
        is_self: false,
        duplicate_exists: false,
    };
    let r = validate_edge(
        &accesses_rule(),
        &accesses_schema(),
        &ctx,
        &json!({ "mode": "readwrite" }),
    );
    assert!(r.is_ok(), "{r:?}");
}

#[test]
fn accesses_without_mode_is_rejected() {
    let ctx = EdgeContext {
        src_type: "Application",
        dst_type: "DataEntity",
        is_self: false,
        duplicate_exists: false,
    };
    let err = validate_edge(&accesses_rule(), &accesses_schema(), &ctx, &json!({})).unwrap_err();
    assert_eq!(err.code(), "MISSING_REQUIRED_ATTRIBUTE");
}

#[test]
fn duplicate_accesses_is_rejected() {
    let ctx = EdgeContext {
        src_type: "Application",
        dst_type: "DataEntity",
        is_self: false,
        duplicate_exists: true,
    };
    let err = validate_edge(
        &accesses_rule(),
        &accesses_schema(),
        &ctx,
        &json!({ "mode": "read" }),
    )
    .unwrap_err();
    assert_eq!(err.code(), "DUPLICATE_RELATIONSHIP");
}

#[test]
fn serves_self_link_is_rejected() {
    let ctx = EdgeContext {
        src_type: "Capability",
        dst_type: "ValueStreamStage",
        is_self: true,
        duplicate_exists: false,
    };
    let err = validate_edge(&serves_rule(), &serves_schema(), &ctx, &json!({})).unwrap_err();
    assert_eq!(err.code(), "SELF_LINK_NOT_ALLOWED");
}

#[test]
fn application_serves_valuestreamstage_wrong_src_is_rejected() {
    // serves.from is [Capability]; an Application source is not allowed.
    let ctx = EdgeContext {
        src_type: "Application",
        dst_type: "ValueStreamStage",
        is_self: false,
        duplicate_exists: false,
    };
    let err = validate_edge(&serves_rule(), &serves_schema(), &ctx, &json!({})).unwrap_err();
    assert_eq!(err.code(), "ENDPOINT_TYPE_NOT_ALLOWED");
}
