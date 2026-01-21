use aideon_desktop_lib::logging::log_event;
use logtest::Logger;
use serde_json::Value;

#[test]
fn log_event_produces_structured_ndjson() {
    let mut logger = Logger::start();
    log_event!(
        severity = 5,
        component = "core",
        event = "app_start",
        message = "booting",
        correlation_id = "corr",
        metadata = serde_json::json!({ "phase": "starting" })
    );

    let record = logger
        .pop()
        .expect("expected log_event to emit at least one record");
    let payload: Value =
        serde_json::from_str(&record.args()).expect("parse json from log_event output");
    assert_eq!(payload["component"], "core");
    assert_eq!(payload["event_name"], "app_start");
    assert_eq!(payload["syslog.severity"], 5);
    assert_eq!(payload["correlation_id"], "corr");
    assert_eq!(payload["session_id"], "unknown", "context not initialised in tests");
    assert_eq!(payload["phase"], "starting");
    assert_eq!(payload["build"]["version"], env!("CARGO_PKG_VERSION"));
    assert_eq!(payload["platform"]["os"], std::env::consts::OS);
    assert_eq!(payload["platform"]["arch"], std::env::consts::ARCH);
}
