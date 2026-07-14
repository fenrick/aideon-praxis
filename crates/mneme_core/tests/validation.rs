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

/// An edge rule's endpoint and multiplicity policy, grouped so the builder takes
/// one cohesive spec rather than a string-heavy argument list.
struct EdgeRuleSpec<'a> {
    key: &'a str,
    allowed_src: &'a [&'a str],
    allowed_dst: &'a [&'a str],
    allow_self: bool,
    allow_duplicate: bool,
}

/// Build an effective edge rule with `many`/`many` multiplicity, the common
/// shape across these fixtures.
fn edge_rule(spec: EdgeRuleSpec<'_>) -> EffectiveEdgeRule {
    let own = |xs: &[&str]| xs.iter().map(|s| (*s).to_owned()).collect();
    EffectiveEdgeRule {
        key: spec.key.to_owned(),
        allowed_src: own(spec.allowed_src),
        allowed_dst: own(spec.allowed_dst),
        allow_self: spec.allow_self,
        allow_duplicate: spec.allow_duplicate,
        multiplicity_src: "many".to_owned(),
        multiplicity_dst: "many".to_owned(),
    }
}

/// `accesses` edge: BusinessProcess/Application → DataEntity, no self, no duplicate,
/// required `mode` enum.
fn accesses_rule() -> EffectiveEdgeRule {
    edge_rule(EdgeRuleSpec {
        key: "accesses",
        allowed_src: &["BusinessProcess", "Application"],
        allowed_dst: &["DataEntity"],
        allow_self: false,
        allow_duplicate: false,
    })
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
    edge_rule(EdgeRuleSpec {
        key: "serves",
        allowed_src: &["Capability"],
        allowed_dst: &["ValueStreamStage"],
        allow_self: false,
        allow_duplicate: true,
    })
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

/// An edge write's runtime context, borrowing the endpoint type keys.
fn edge_ctx<'a>(
    src_type: &'a str,
    dst_type: &'a str,
    is_self: bool,
    duplicate_exists: bool,
) -> EdgeContext<'a> {
    EdgeContext {
        src_type,
        dst_type,
        is_self,
        duplicate_exists,
    }
}

#[test]
fn accesses_with_mode_validates() {
    let ctx = edge_ctx("Application", "DataEntity", false, false);
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
    let ctx = edge_ctx("Application", "DataEntity", false, false);
    let err = validate_edge(&accesses_rule(), &accesses_schema(), &ctx, &json!({})).unwrap_err();
    assert_eq!(err.code(), "MISSING_REQUIRED_ATTRIBUTE");
}

#[test]
fn duplicate_accesses_is_rejected() {
    let ctx = edge_ctx("Application", "DataEntity", false, true);
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
    let ctx = edge_ctx("Capability", "ValueStreamStage", true, false);
    let err = validate_edge(&serves_rule(), &serves_schema(), &ctx, &json!({})).unwrap_err();
    assert_eq!(err.code(), "SELF_LINK_NOT_ALLOWED");
}

#[test]
fn application_serves_valuestreamstage_wrong_src_is_rejected() {
    // serves.from is [Capability]; an Application source is not allowed.
    let ctx = edge_ctx("Application", "ValueStreamStage", false, false);
    let err = validate_edge(&serves_rule(), &serves_schema(), &ctx, &json!({})).unwrap_err();
    assert_eq!(err.code(), "ENDPOINT_TYPE_NOT_ALLOWED");
}
