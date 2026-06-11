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

    for required in [
        "appcommands",
        "dialog:default",
        "log:default",
        "opener:default",
    ] {
        assert!(
            perms.contains(required),
            "default capability must include {required}"
        );
    }
}

#[test]
fn appcommands_permission_matches_ipc_manifest_contract() {
    // CARGO_MANIFEST_DIR is <repo>/src-tauri, so the repo root is one level up.
    let repo = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("repo root");

    let ipc_path = repo.join("docs/contracts/ipc-manifest.json");
    let ipc_raw = std::fs::read_to_string(&ipc_path)
        .unwrap_or_else(|_| panic!("read {}", ipc_path.display()));
    let ipc: serde_json::Value =
        serde_json::from_str(&ipc_raw).unwrap_or_else(|_| panic!("parse {}", ipc_path.display()));
    let ipc_commands = ipc["commands"]
        .as_array()
        .expect("ipc manifest commands array")
        .iter()
        .filter_map(|value| value.as_str())
        .map(str::to_string)
        .collect::<BTreeSet<String>>();

    let perm_path = repo.join("src-tauri/permissions/appcommands.toml");
    let perm_raw = std::fs::read_to_string(&perm_path)
        .unwrap_or_else(|_| panic!("read {}", perm_path.display()));
    let perm: toml::Value =
        toml::from_str(&perm_raw).unwrap_or_else(|_| panic!("parse {}", perm_path.display()));

    let permissions = perm
        .get("permission")
        .and_then(|value| value.as_array())
        .expect("permission array");

    let appcommands = permissions
        .iter()
        .find(|entry| entry.get("identifier").and_then(|v| v.as_str()) == Some("appcommands"))
        .expect("permission identifier=appcommands");

    let allow = appcommands
        .get("commands")
        .and_then(|value| value.get("allow"))
        .and_then(|value| value.as_array())
        .expect("commands.allow array");

    let allowed_commands = allow
        .iter()
        .filter_map(|value| value.as_str())
        .map(str::to_string)
        .collect::<BTreeSet<String>>();

    assert_eq!(
        allowed_commands, ipc_commands,
        "appcommands allowlist must match the IPC contract surface; rerun `cargo run -p aideon_xtask -- ipc-manifest` and update permissions before exposing new commands"
    );
}
