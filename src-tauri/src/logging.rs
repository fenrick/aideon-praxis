use once_cell::sync::OnceCell;
use serde_json::{Map, Value, json};
use specta::Type;
use time::OffsetDateTime;
use time::format_description::well_known::Rfc3339;

#[derive(Clone, Debug)]
pub struct LoggingContext {
    pub session_id: String,
    pub build_version: String,
    pub build_commit: Option<String>,
    pub platform_os: String,
    pub platform_arch: String,
}

static CONTEXT: OnceCell<LoggingContext> = OnceCell::new();

pub fn init_context(session_id: String) -> Option<&'static LoggingContext> {
    CONTEXT
        .set(LoggingContext {
            session_id,
            build_version: env!("CARGO_PKG_VERSION").to_string(),
            build_commit: option_env!("GIT_COMMIT_HASH").map(|s| s.to_string()),
            platform_os: std::env::consts::OS.to_string(),
            platform_arch: std::env::consts::ARCH.to_string(),
        })
        .ok();
    CONTEXT.get()
}

/// The event-specific fields of a single structured log record.
pub struct LogEntry<'a> {
    pub severity: u8,
    pub component: &'a str,
    pub event_name: &'a str,
    pub message: &'a str,
    pub correlation_id: &'a str,
    pub metadata: Option<Value>,
}

/// The originating source location for a log record.
pub struct SourceLocation<'a> {
    pub module: &'a str,
    pub file: &'a str,
    pub line: u32,
}

pub fn log_record(entry: LogEntry, source: SourceLocation) {
    let level = severity_to_level(entry.severity);
    let mut record = base_record(&entry, level);
    insert_context(&mut record);
    record.insert("source".into(), source_value(&source));
    merge_metadata(&mut record, entry.metadata);

    let encoded = encode_record(record);
    log::log!(target: "tauri", level, "{}", encoded);
}

fn current_timestamp() -> String {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_else(|_| {
            OffsetDateTime::now_utc()
                .format(&Rfc3339)
                .unwrap_or_default()
        })
}

fn base_record(entry: &LogEntry, level: log::Level) -> Map<String, Value> {
    let mut record = Map::new();
    record.insert("timestamp".into(), Value::String(current_timestamp()));
    record.insert(
        "level".into(),
        Value::String(level_to_str(level).to_string()),
    );
    record.insert("syslog.severity".into(), Value::from(entry.severity));
    record.insert(
        "syslog.severity_text".into(),
        Value::String(severity_text(entry.severity).to_string()),
    );
    record.insert("message".into(), Value::String(entry.message.to_string()));
    record.insert(
        "component".into(),
        Value::String(entry.component.to_string()),
    );
    record.insert(
        "event_name".into(),
        Value::String(entry.event_name.to_string()),
    );
    record.insert(
        "correlation_id".into(),
        Value::String(entry.correlation_id.to_string()),
    );
    record
}

fn insert_context(record: &mut Map<String, Value>) {
    let Some(ctx) = CONTEXT.get() else {
        record.insert("session_id".into(), Value::String("unknown".into()));
        return;
    };
    record.insert("session_id".into(), Value::String(ctx.session_id.clone()));
    record.insert(
        "build".into(),
        json!({
            "version": ctx.build_version,
            "commit": ctx.build_commit.as_deref().unwrap_or("unknown"),
        }),
    );
    record.insert(
        "platform".into(),
        json!({
            "os": ctx.platform_os,
            "arch": ctx.platform_arch,
        }),
    );
}

fn source_value(source: &SourceLocation) -> Value {
    json!({
        "layer": "rust",
        "module": source.module,
        "file": source.file,
        "line": source.line,
    })
}

fn merge_metadata(record: &mut Map<String, Value>, metadata: Option<Value>) {
    if let Some(Value::Object(map)) = metadata {
        for (key, value) in map {
            record.entry(key).or_insert(value);
        }
    }
}

fn encode_record(record: Map<String, Value>) -> String {
    serde_json::to_string(&Value::Object(record))
        .unwrap_or_else(|_| "{\"message\":\"log serialization failed\"}".to_string())
}

fn severity_to_level(severity: u8) -> log::Level {
    match severity {
        0..=3 => log::Level::Error,
        4 => log::Level::Warn,
        5 | 6 => log::Level::Info,
        7 => log::Level::Debug,
        _ => log::Level::Info,
    }
}

fn level_to_str(level: log::Level) -> &'static str {
    match level {
        log::Level::Error => "ERROR",
        log::Level::Warn => "WARN",
        log::Level::Info => "INFO",
        log::Level::Debug => "DEBUG",
        log::Level::Trace => "TRACE",
    }
}

fn severity_text(severity: u8) -> &'static str {
    match severity {
        0 => "Emergency",
        1 => "Alert",
        2 => "Critical",
        3 => "Error",
        4 => "Warning",
        5 => "Notice",
        6 => "Informational",
        7 => "Debug",
        _ => "Informational",
    }
}

#[derive(serde::Serialize, Type)]
pub struct LoggingContextDto {
    pub session_id: String,
    pub build_version: String,
    pub build_commit: Option<String>,
    pub platform_os: String,
    pub platform_arch: String,
}

pub fn get_logging_context() -> std::result::Result<LoggingContextDto, String> {
    if let Some(ctx) = CONTEXT.get() {
        Ok(LoggingContextDto {
            session_id: ctx.session_id.clone(),
            build_version: ctx.build_version.clone(),
            build_commit: ctx.build_commit.clone(),
            platform_os: ctx.platform_os.clone(),
            platform_arch: ctx.platform_arch.clone(),
        })
    } else {
        Err("logging context not initialised".into())
    }
}

#[macro_export]
macro_rules! log_event {
    (
        severity = $severity:expr,
        component = $component:expr,
        event = $event:expr,
        message = $message:expr $(,
        correlation_id = $correlation:expr)? $(,
        metadata = $metadata:expr)? $(,)?
    ) => {{
        let correlation = $crate::log_event!(@corr $($correlation)?);
        let metadata = $crate::log_event!(@meta $($metadata)?);
        $crate::logging::log_record(
            $crate::logging::LogEntry {
                severity: $severity,
                component: $component,
                event_name: $event,
                message: $message,
                correlation_id: correlation,
                metadata,
            },
            $crate::logging::SourceLocation {
                module: module_path!(),
                file: file!(),
                line: line!(),
            },
        );
    }};
    (@corr $value:expr) => { $value };
    (@corr) => { "unknown" };
    (@meta $value:expr) => { Some($value) };
    (@meta) => { None };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn init_context_and_get_logging_context_roundtrip() {
        let session_id = "test-session".to_string();
        let ctx = init_context(session_id.clone());
        assert!(ctx.is_some());
        let dto = get_logging_context().expect("context should be initialised");
        assert_eq!(dto.session_id, session_id);
        assert_eq!(dto.build_version, env!("CARGO_PKG_VERSION"));
    }

    #[test]
    fn severity_helpers_cover_text_mappings() {
        assert_eq!(severity_to_level(0), log::Level::Error);
        assert_eq!(severity_to_level(5), log::Level::Info);
        assert_eq!(level_to_str(log::Level::Warn), "WARN");
        assert_eq!(severity_text(3), "Error");
    }
}
