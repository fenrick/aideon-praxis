//! Validate Tauri app config for CSP and windows mapping.

#[test]
fn csp_and_windows_config_are_defined() {
    let root = env!("CARGO_MANIFEST_DIR");
    let path = std::path::Path::new(root).join("tauri.conf.json");
    let data = std::fs::read_to_string(path).expect("read tauri.conf.json");
    let v: serde_json::Value = serde_json::from_str(&data).expect("parse json");
    let csp = &v["app"]["security"]["csp"]["policy"];
    assert!(csp.as_str().unwrap_or("").contains("default-src 'none'"));
    // windows are created at runtime; ensure config has an array present (may be empty)
    let windows = &v["app"]["windows"];
    assert!(windows.is_array());
}
