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

/// Parse the snake_case command set the generated client dispatches.
fn generated_surface(repo: &std::path::Path) -> BTreeSet<String> {
    let client_path = repo.join("src/adapters/ipc-bindings.gen.ts");
    let client = std::fs::read_to_string(&client_path)
        .unwrap_or_else(|_| panic!("read {}", client_path.display()));
    let mut set = BTreeSet::<String>::new();
    for (idx, _) in client.match_indices("TAURI_INVOKE(\"") {
        let rest = &client[idx + "TAURI_INVOKE(\"".len()..];
        if let Some(end) = rest.find('"') {
            set.insert(rest[..end].to_string());
        }
    }
    assert!(!set.is_empty(), "no commands parsed from generated client");
    set
}

/// The `commands.allow` set of a permission file.
fn permission_allow(repo: &std::path::Path, file: &str, identifier: &str) -> BTreeSet<String> {
    let path = repo.join("src-tauri/permissions").join(file);
    let raw = std::fs::read_to_string(&path).unwrap_or_else(|_| panic!("read {}", path.display()));
    let parsed: toml::Value =
        toml::from_str(&raw).unwrap_or_else(|_| panic!("parse {}", path.display()));
    let permission = parsed
        .get("permission")
        .and_then(|v| v.as_array())
        .expect("permission array")
        .iter()
        .find(|e| e.get("identifier").and_then(|v| v.as_str()) == Some(identifier))
        .unwrap_or_else(|| panic!("permission identifier={identifier}"));
    permission
        .get("commands")
        .and_then(|v| v.get("allow"))
        .and_then(|v| v.as_array())
        .expect("commands.allow array")
        .iter()
        .filter_map(|v| v.as_str())
        .map(str::to_string)
        .collect()
}

#[test]
fn read_and_mutating_permissions_partition_the_generated_surface() {
    let repo = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("repo root");
    let generated = generated_surface(repo);
    let read = permission_allow(repo, "appcommands.toml", "appcommands");
    let mutating = permission_allow(repo, "appcommands-mutating.toml", "appcommands-mutating");

    // Deny-by-default + no drift: every generated command has exactly one
    // permission, and no permission entry outlives its command (ADR-0039).
    let union: BTreeSet<_> = read.union(&mutating).cloned().collect();
    assert_eq!(
        union, generated,
        "read ∪ mutating must equal the generated command surface"
    );
    let overlap: Vec<_> = read.intersection(&mutating).collect();
    assert!(
        overlap.is_empty(),
        "a command must be read XOR mutating, not both: {overlap:?}"
    );
}

#[test]
fn mutating_commands_are_granted_only_to_the_main_window() {
    // Per-window scoping (#318, ADR-0023): mutating + accepted-work commands are
    // reachable only from the workspace-bearing `main` window. Any capability
    // that grants `appcommands-mutating` must target exactly `["main"]`.
    let repo = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("repo root");
    let cap_dir = repo.join("src-tauri/capabilities");

    let mut granting_windows = BTreeSet::<String>::new();
    let mut found = false;
    for entry in std::fs::read_dir(&cap_dir).expect("read capabilities dir") {
        let path = entry.expect("dir entry").path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        let cap: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(&path).expect("read capability"))
                .expect("parse capability");
        let grants_mutating = cap["permissions"]
            .as_array()
            .into_iter()
            .flatten()
            .any(|p| p.as_str() == Some("appcommands-mutating"));
        if grants_mutating {
            found = true;
            for window in cap["windows"].as_array().into_iter().flatten() {
                if let Some(w) = window.as_str() {
                    granting_windows.insert(w.to_string());
                }
            }
        }
    }
    assert!(found, "no capability grants appcommands-mutating");
    assert_eq!(
        granting_windows,
        BTreeSet::from(["main".to_string()]),
        "mutating commands must be granted to the main window only, got {granting_windows:?}"
    );
}
