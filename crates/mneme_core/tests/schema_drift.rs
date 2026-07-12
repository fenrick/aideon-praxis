//! Schema↔Rust DTO drift check ([#371]).
//!
//! For every `<kind>.schema.json` in `docs/contracts/operations/` (excluding
//! the shared envelope schema), the test:
//!   1. Derives the fixture name: `<kind>.valid.json`
//!   2. Deserialises the fixture into the typed `OpPayload`,
//!   3. Re-serialises the payload to JSON and extracts the field names,
//!   4. Reads the schema and extracts its top-level `properties` keys.
//!   5. Asserts the two sets are identical.
//!
//! **No manual registration required.** Adding a new `<kind>.schema.json` to
//! `docs/contracts/operations/` automatically adds it to the drift check. The
//! test will fail if the schema has no corresponding `.valid.json` fixture or
//! if the Rust DTO fields diverge from the schema `properties`.
//!
//! [#371]: https://github.com/aideon-ai/aideon-desktop/issues/371

use std::collections::BTreeSet;
use std::path::PathBuf;

use mneme_core::parse_record;

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

/// Discover all `<kind>.schema.json` files in the contracts directory,
/// excluding the shared envelope schema (which has no payload DTO).
fn discover_op_kind_schemas() -> Vec<String> {
    let dir = contracts_dir();
    let mut kinds: Vec<String> = std::fs::read_dir(&dir)
        .unwrap_or_else(|e| panic!("read {dir:?}: {e}"))
        .filter_map(|entry| {
            let name = entry.ok()?.file_name().into_string().ok()?;
            if name.ends_with(".schema.json") && name != "op-envelope.schema.json" {
                Some(name.trim_end_matches(".schema.json").to_owned())
            } else {
                None
            }
        })
        .collect();
    kinds.sort();
    kinds
}

#[test]
fn op_payload_fields_match_schema_properties() {
    let kinds = discover_op_kind_schemas();
    assert!(
        !kinds.is_empty(),
        "no op-kind schemas discovered — check docs/contracts/operations/"
    );

    for kind in &kinds {
        let schema_file = format!("{kind}.schema.json");
        let fixture_file = format!("{kind}.valid.json");

        // 1. Parse fixture → typed OpEnvelope
        let fixture_path = fixtures_dir().join(&fixture_file);
        let raw =
            std::fs::read(&fixture_path).unwrap_or_else(|e| panic!("read {fixture_path:?}: {e}"));
        let fixture_value: serde_json::Value =
            serde_json::from_slice(&raw).unwrap_or_else(|e| panic!("parse {fixture_path:?}: {e}"));

        let envelope = parse_record(&fixture_value)
            .unwrap_or_else(|e| panic!("{kind} fixture should parse: {e}"));

        // 2. Re-serialise the payload → get the struct's serde field names
        let payload_json = serde_json::to_value(&envelope.payload)
            .unwrap_or_else(|e| panic!("{kind} payload serialize: {e}"));

        let struct_keys: BTreeSet<String> = payload_json
            .as_object()
            .unwrap_or_else(|| panic!("{kind} payload serialised to non-object"))
            .keys()
            .cloned()
            .collect();

        // 3. Read schema → extract `properties` keys
        let schema_path = contracts_dir().join(&schema_file);
        let raw =
            std::fs::read(&schema_path).unwrap_or_else(|e| panic!("read {schema_path:?}: {e}"));
        let schema: serde_json::Value =
            serde_json::from_slice(&raw).unwrap_or_else(|e| panic!("parse {schema_path:?}: {e}"));

        let schema_keys: BTreeSet<String> = schema["properties"]
            .as_object()
            .unwrap_or_else(|| panic!("{kind} schema has no top-level `properties`"))
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
            only_struct = struct_keys.difference(&schema_keys).collect::<Vec<_>>(),
            only_schema = schema_keys.difference(&struct_keys).collect::<Vec<_>>(),
        );
    }
}
