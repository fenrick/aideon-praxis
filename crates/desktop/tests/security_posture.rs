//! Regression guards for desktop security invariants.

use std::collections::BTreeSet;

#[test]
fn only_allowlisted_tauri_plugins_are_enabled() {
    let root = env!("CARGO_MANIFEST_DIR");
    let path = std::path::Path::new(root).join("src/app.rs");
    let data = std::fs::read_to_string(path).expect("read src/app.rs");

    let mut plugins = BTreeSet::<String>::new();
    for cap in regex::Regex::new(r"tauri_plugin_([a-z0-9_]+)::(init|Builder)")
        .expect("regex")
        .captures_iter(&data)
    {
        let name = cap.get(1).expect("plugin name").as_str();
        plugins.insert(name.to_string());
    }

    let allowlist = BTreeSet::from_iter(
        ["dialog", "log", "opener"]
            .into_iter()
            .map(|name| name.to_string()),
    );

    assert_eq!(
        plugins, allowlist,
        "unexpected tauri plugins enabled; update capabilities + contracts before adding plugins"
    );
}

#[test]
fn default_capability_maps_enabled_plugins() {
    let root = env!("CARGO_MANIFEST_DIR");
    let path = std::path::Path::new(root).join("capabilities/default.json");
    let data = std::fs::read_to_string(path).expect("read capabilities/default.json");
    let v: serde_json::Value = serde_json::from_str(&data).expect("parse json");

    let perms = v["permissions"]
        .as_array()
        .expect("permissions array")
        .iter()
        .filter_map(|value| value.as_str())
        .collect::<BTreeSet<_>>();

    for required in ["dialog:default", "log:default", "opener:default"] {
        assert!(
            perms.contains(required),
            "default capability must include {required}"
        );
    }
}
