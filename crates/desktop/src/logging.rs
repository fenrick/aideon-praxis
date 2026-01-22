use once_cell::sync::OnceCell;
use serde_json::{Map, Value, json};
use std::fmt::Display;
use time::OffsetDateTime;
use time::UtcOffset;
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

pub fn context() -> Option<&'static LoggingContext> {
    CONTEXT.get()
}

pub fn log_record(
    severity: u8,
    component: &str,
    event_name: &str,
    message: &str,
    correlation_id: &str,
    metadata: Option<Value>,
    module: &str,
    file: &str,
    line: u32,
) {
    let level = severity_to_level(severity);
    let level_name = level_to_str(level);
    let timestamp = OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_else(|_| {
            OffsetDateTime::now_utc()
                .format(&Rfc3339)
                .unwrap_or_default()
        });

    let mut record = Map::new();
    record.insert("timestamp".into(), Value::String(timestamp));
    record.insert("level".into(), Value::String(level_name.to_string()));
    record.insert("syslog.severity".into(), Value::from(severity as u8));
    record.insert(
        "syslog.severity_text".into(),
        Value::String(severity_text(severity).to_string()),
    );
    record.insert("message".into(), Value::String(message.to_string()));
    record.insert("component".into(), Value::String(component.to_string()));
    record.insert("event_name".into(), Value::String(event_name.to_string()));
    record.insert(
        "correlation_id".into(),
        Value::String(correlation_id.to_string()),
    );

    if let Some(ctx) = CONTEXT.get() {
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
    } else {
        record.insert("session_id".into(), Value::String("unknown".into()));
    }

    record.insert(
        "source".into(),
        json!({
            "layer": "rust",
            "module": module,
            "file": file,
            "line": line,
        }),
    );

    if let Some(payload) = metadata {
        if let Value::Object(map) = payload {
            for (key, value) in map {
                record.entry(key).or_insert(value);
            }
        }
    }

    let payload = Value::Object(record);
    let encoded = serde_json::to_string(&payload)
        .unwrap_or_else(|_| "{\"message\":\"log serialization failed\"}".to_string());
    log::log!(target: "tauri", level, "{}", encoded);
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

#[derive(serde::Serialize)]
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
            $severity,
            $component,
            $event,
            $message,
            correlation,
            metadata,
            module_path!(),
            file!(),
            line!(),
        );
    }};
    (@corr $value:expr) => { $value };
    (@corr) => { "unknown" };
    (@meta $value:expr) => { Some($value) };
    (@meta) => { None };
}
