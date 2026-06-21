//! Validate the canonical types against the authored operation fixtures under
//! `docs/data/fixtures/operations/`. A `*.valid.json` record must parse and
//! round-trip; a `*.invalid.json` record must be rejected for its documented
//! reason ([operation fixtures README]).

use std::path::PathBuf;

use mneme_core::ops::parse_record;

fn fixtures_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../docs/data/fixtures/operations")
        .canonicalize()
        .expect("fixtures directory exists")
}

fn read_json(name: &str) -> serde_json::Value {
    let path = fixtures_dir().join(name);
    let bytes = std::fs::read(&path).unwrap_or_else(|e| panic!("read {path:?}: {e}"));
    serde_json::from_slice(&bytes).unwrap_or_else(|e| panic!("parse {path:?}: {e}"))
}

const VALID_FIXTURES: &[&str] = &[
    "create-node.valid.json",
    "create-edge.valid.json",
    "tombstone-entity.valid.json",
    "set-property-interval.valid.json",
    "clear-property-interval.valid.json",
    "set-edge-existence-interval.valid.json",
    "upsert-metamodel-batch.valid.json",
    "actor-declare.valid.json",
];

const INVALID_FIXTURES: &[&str] = &[
    "op-envelope.invalid.json",
    "create-node.invalid.json",
    "create-edge.invalid.json",
    "tombstone-entity.invalid.json",
    "set-property-interval.invalid.json",
    "clear-property-interval.invalid.json",
    "set-edge-existence-interval.invalid.json",
    "upsert-metamodel-batch.invalid.json",
    "actor-declare.invalid.json",
];

#[test]
fn every_valid_fixture_parses() {
    for name in VALID_FIXTURES {
        let value = read_json(name);
        parse_record(&value).unwrap_or_else(|e| panic!("{name} should parse: {e}"));
    }
}

#[test]
fn every_valid_fixture_round_trips_byte_stably() {
    for name in VALID_FIXTURES {
        let value = read_json(name);
        let env = parse_record(&value).unwrap();
        // Re-parse the canonicalised record; the digest must be identical.
        let reparsed = parse_record(&env.canonical_value().unwrap()).unwrap();
        assert_eq!(
            env.canonical_record_digest().unwrap(),
            reparsed.canonical_record_digest().unwrap(),
            "{name} digest must be stable across re-canonicalisation"
        );
    }
}

#[test]
fn the_envelope_valid_fixture_parses() {
    let value = read_json("op-envelope.valid.json");
    parse_record(&value).expect("op-envelope.valid.json should parse");
}

#[test]
fn every_invalid_fixture_is_rejected() {
    for name in INVALID_FIXTURES {
        let value = read_json(name);
        assert!(
            parse_record(&value).is_err(),
            "{name} must be rejected, not accepted"
        );
    }
}
