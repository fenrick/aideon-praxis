use aideon_praxis_lib::StateAtPayload;

#[test]
fn stateatpayload_camelcase_roundtrip() {
    // Incoming JSON uses camelCase keys
    let json_in = r#"{
        "asOf": "2025-01-01",
        "scenario": null,
        "confidence": null,
        "nodes": 7,
        "edges": 11
    }"#;

    // Deserialize into the host's payload type
    let v: StateAtPayload = serde_json::from_str(json_in).expect("deserialize");

    // Outgoing JSON must keep camelCase
    let out = serde_json::to_string(&v).expect("serialize");
    assert!(out.contains("\"asOf\""), "must serialize camelCase asOf");
    assert!(out.contains("\"nodes\":7"));
    assert!(out.contains("\"edges\":11"));
}
