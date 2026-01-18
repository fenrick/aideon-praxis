//! Validate Tauri app config for CSP and windows mapping.

#[test]
fn csp_and_windows_config_are_defined() {
    let root = env!("CARGO_MANIFEST_DIR");
    let path = std::path::Path::new(root).join("tauri.conf.json");
    let data = std::fs::read_to_string(path).expect("read tauri.conf.json");
    let v: serde_json::Value = serde_json::from_str(&data).expect("parse json");
    let csp = &v["app"]["security"]["csp"]["policy"];
    assert!(csp.as_str().unwrap_or("").contains("default-src 'none'"));
    assert!(
        !csp.as_str().unwrap_or("").contains("'unsafe-eval'"),
        "production CSP must not require unsafe-eval"
    );
    for disallowed in ["http://", "https://", "ws://", "wss://"] {
        assert!(
            !csp.as_str().unwrap_or("").contains(disallowed),
            "production CSP must not allow remote resource loads ({disallowed})"
        );
    }

    let dev_csp = &v["app"]["security"]["csp"]["devPolicy"];
    assert!(
        !dev_csp.as_str().unwrap_or("").contains("https://"),
        "dev CSP must not allow remote HTTPS origins"
    );
    assert!(
        dev_csp.as_str().unwrap_or("").contains("127.0.0.1")
            || dev_csp.as_str().unwrap_or("").contains("localhost"),
        "dev CSP should be scoped to loopback origins"
    );

    assert_eq!(
        v["app"]["withGlobalTauri"].as_bool(),
        Some(false),
        "renderer must not rely on injected global Tauri APIs"
    );

    assert_eq!(
        v["build"]["devUrl"].as_str(),
        Some("http://127.0.0.1:1420"),
        "devUrl must be loopback-only"
    );
    // windows are created at runtime; ensure config has an array present (may be empty)
    let windows = &v["app"]["windows"];
    assert!(windows.is_array());
}
