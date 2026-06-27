//! Schema↔Rust DTO drift check ([#289]).
//!
//! For each M0 operation kind, the test:
//!   1. Deserialises a committed valid fixture into the typed `OpPayload`,
//!   2. Re-serialises the payload to JSON and extracts the field names,
//!   3. Reads `docs/contracts/operations/<kind>.schema.json` and extracts its
//!      `properties` keys.
//!   4. Asserts the two sets are identical.
//!
//! The comparison uses real serde output — not a hand-maintained list — so it
//! fails automatically when a field is added to a Rust struct without a matching
//! schema update, or vice versa.
//!
//! Skipped: `upsert-metamodel-batch` at the top-level only (its payload nests
//! deep sub-schemas; the outer field set is still checked here).
//!
//! [#289]: https://github.com/fenrick/aideon-desktop/issues/289

use std::collections::BTreeSet;
use std::path::PathBuf;

use mneme_core::parse_record;

struct Case {
    kind: &'static str,
    schema_file: &'static str,
    fixture_file: &'static str,
}

const CASES: &[Case] = &[
    Case {
        kind: "create-node",
        schema_file: "create-node.schema.json",
        fixture_file: "create-node.valid.json",
    },
    Case {
        kind: "create-edge",
        schema_file: "create-edge.schema.json",
        fixture_file: "create-edge.valid.json",
    },
    Case {
        kind: "tombstone-entity",
        schema_file: "tombstone-entity.schema.json",
        fixture_file: "tombstone-entity.valid.json",
    },
    Case {
        kind: "set-property-interval",
        schema_file: "set-property-interval.schema.json",
        fixture_file: "set-property-interval.valid.json",
    },
    Case {
        kind: "clear-property-interval",
        schema_file: "clear-property-interval.schema.json",
        fixture_file: "clear-property-interval.valid.json",
    },
    Case {
        kind: "set-edge-existence-interval",
        schema_file: "set-edge-existence-interval.schema.json",
        fixture_file: "set-edge-existence-interval.valid.json",
    },
    Case {
        kind: "upsert-metamodel-batch",
        schema_file: "upsert-metamodel-batch.schema.json",
        fixture_file: "upsert-metamodel-batch.valid.json",
    },
    Case {
        kind: "actor-declare",
        schema_file: "actor-declare.schema.json",
        fixture_file: "actor-declare.valid.json",
    },
];

fn contracts_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../docs/contracts/operations")
        .canonicalize()
        .expect("contracts directory exists")
}

fn fixtures_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../docs/data/fixtures/operations")
        .canonicalize()
        .expect("fixtures directory exists")
}

#[test]
fn op_payload_fields_match_schema_properties() {
    for case in CASES {
        // 1. Parse fixture → typed OpEnvelope
        let fixture_path = fixtures_dir().join(case.fixture_file);
        let raw =
            std::fs::read(&fixture_path).unwrap_or_else(|e| panic!("read {fixture_path:?}: {e}"));
        let fixture_value: serde_json::Value =
            serde_json::from_slice(&raw).unwrap_or_else(|e| panic!("parse {fixture_path:?}: {e}"));

        let envelope = parse_record(&fixture_value)
            .unwrap_or_else(|e| panic!("{} fixture should parse: {e}", case.kind));

        // 2. Re-serialise the payload → get the struct's serde field names
        let payload_json = serde_json::to_value(&envelope.payload)
            .unwrap_or_else(|e| panic!("{} payload serialize: {e}", case.kind));

        let struct_keys: BTreeSet<String> = payload_json
            .as_object()
            .unwrap_or_else(|| panic!("{} payload serialised to non-object", case.kind))
            .keys()
            .cloned()
            .collect();

        // 3. Read schema → extract `properties` keys
        let schema_path = contracts_dir().join(case.schema_file);
        let raw =
            std::fs::read(&schema_path).unwrap_or_else(|e| panic!("read {schema_path:?}: {e}"));
        let schema: serde_json::Value =
            serde_json::from_slice(&raw).unwrap_or_else(|e| panic!("parse {schema_path:?}: {e}"));

        let schema_keys: BTreeSet<String> = schema["properties"]
            .as_object()
            .unwrap_or_else(|| panic!("{} schema has no top-level `properties`", case.kind))
            .keys()
            .cloned()
            .collect();

        // 4. Assert parity
        assert_eq!(
            struct_keys,
            schema_keys,
            "{kind} DTO↔schema drift detected.\n\
             Fields in Rust struct but missing from schema: {only_struct:?}\n\
             Fields in schema but missing from Rust struct: {only_schema:?}\n\
             Update docs/contracts/operations/{schema_file} to fix.",
            kind = case.kind,
            only_struct = struct_keys.difference(&schema_keys).collect::<Vec<_>>(),
            only_schema = schema_keys.difference(&struct_keys).collect::<Vec<_>>(),
            schema_file = case.schema_file,
        );
    }
}
