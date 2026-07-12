//! End-to-end seed oracle: publishing the embedded `core-v1.json` to the
//! canonical batch and compiling that batch must reproduce every committed
//! effective-schema fixture byte-for-byte. Unlike a hand-built batch this
//! exercises the real publish pipeline, so it cannot drift from the seed.

use super::publish_embedded_core;
use mneme_core::canonical::{canonical_json_bytes, to_canonical_json_bytes};
use mneme_core::effective::compile;

fn fixture_canonical(name: &str) -> Vec<u8> {
    let path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../docs/data/fixtures/metamodel")
        .join(name);
    let bytes = std::fs::read(&path).unwrap_or_else(|e| panic!("read {path:?}: {e}"));
    let mut value: serde_json::Value = serde_json::from_slice(&bytes).expect("fixture parses");
    value
        .as_object_mut()
        .expect("fixture is object")
        .remove("notes");
    canonical_json_bytes(&value).expect("canonicalise fixture")
}

fn assert_type_matches(type_key: &str, fixture: &str) {
    let batch = publish_embedded_core().expect("publish seed");
    let schemas = compile(&batch).expect("compile seed");
    let schema = schemas
        .iter()
        .find(|s| s.type_id == type_key)
        .unwrap_or_else(|| panic!("{type_key} compiled"));
    assert_eq!(
        to_canonical_json_bytes(schema).unwrap(),
        fixture_canonical(fixture),
        "{type_key} must compile to its fixture from the published seed batch"
    );
}

#[test]
fn seed_capability_matches_fixture() {
    assert_type_matches("Capability", "capability.effective-schema.json");
}

#[test]
fn seed_application_matches_fixture() {
    assert_type_matches("Application", "application.effective-schema.json");
}

#[test]
fn seed_value_stream_stage_matches_fixture() {
    assert_type_matches(
        "ValueStreamStage",
        "value-stream-stage.effective-schema.json",
    );
}

#[test]
fn seed_plan_event_matches_fixture() {
    assert_type_matches("PlanEvent", "plan-event.effective-schema.json");
}

#[test]
fn seed_publishes_all_types_and_relationships() {
    let batch = publish_embedded_core().expect("publish seed");
    // 8 entity types + 5 relationships in core-v1.json.
    let nodes = batch
        .types
        .iter()
        .filter(|t| t.applies_to == mneme_core::schema::EntityKind::Node)
        .count();
    let edges = batch
        .types
        .iter()
        .filter(|t| t.applies_to == mneme_core::schema::EntityKind::Edge)
        .count();
    assert_eq!(nodes, 8, "eight entity types");
    assert_eq!(edges, 5, "five relationship types");
    assert_eq!(
        batch.edge_type_rules.len(),
        5,
        "one endpoint rule per relationship"
    );
}

#[test]
fn accesses_rule_forbids_duplicates() {
    let batch = publish_embedded_core().expect("publish seed");
    let rules = mneme_core::effective::compile_edge_rules(&batch).expect("edge rules");
    let accesses = rules
        .iter()
        .find(|r| r.key == "accesses")
        .expect("accesses rule");
    assert!(
        !accesses.allow_duplicate,
        "accesses forbids duplicates per the seed"
    );
    assert!(!accesses.allow_self, "accesses forbids self-links");
    let serves = rules
        .iter()
        .find(|r| r.key == "serves")
        .expect("serves rule");
    assert!(
        serves.allow_duplicate,
        "serves permits duplicates per the seed"
    );
}
