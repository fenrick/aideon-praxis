# 7. How to log in Rust (the host)

How the Tauri core process initialises logging, attributes log lines to their call site, emits the JSON contract, and
survives panics. Part of the [logging standard](./README.md).

---

## 7.1 The sink

Rust **must** use the official Tauri logging plugin to initialise the global logger and write to LogDir
([where logs go](./where-logs-go.md)). Initialisation **must** happen once, and early — before meaningful work, but
after environment configuration is loaded.

## 7.2 Use the `log` macros (call-site attribution)

Application code **must** use the standard `log` macros (`log::error!`, `log::warn!`, `log::info!`, `log::debug!`) so
the logger records the true file, line, and module
([source attribution](./log-record-contract.md#9-source-attribution)).

Where standardised fields are needed, implement helpers as Rust **macros** (`macro_rules!`), never as functions:

- Do not implement `fn log_event(...)` and call it everywhere — that collapses every line's origin to the helper.
- If a helper becomes the apparent source of most log lines, it is a defect and is removed.

## 7.3 Emitting the JSON contract

Rust logs **must** be one JSON object per line. Build a JSON object containing the
[contract fields](./log-record-contract.md) and render it as the log message; do not rely on ad-hoc string formatting.
This keeps the LogDir sink behaviour independent of any one formatter.

## 7.4 Error logging

On any failure returned from a command:

- emit `command_failed` at Error level;
- set `syslog.severity` to 3 (Error) unless the failure threatens integrity, in which case use 0–2;
- populate `error.kind`, `error.message`, and a summarised cause chain.

Rust **must not** log raw error structs that might contain secrets
([privacy and redaction](./privacy-and-redaction.md)).

## 7.5 The panic hook

Rust **must** install a panic hook that emits a final Emergency/Alert record with minimal safe context. The hook
**must** avoid allocation where practical, **must not** deadlock, and **must** fall back to stderr if the logger is
unavailable. Do not log large stacks or internal dumps on the panic path.

```rust
use std::panic;

/// Install once, early in host startup — after the logger is initialised
/// where possible, but the hook must also work if it is not.
fn install_panic_hook(session_id: String) {
    let default = panic::take_hook();
    panic::set_hook(Box::new(move |info| {
        // Keep this allocation-light and side-effect-free beyond the log line.
        let location = info
            .location()
            .map(|l| format!("{}:{}", l.file(), l.line()))
            .unwrap_or_else(|| "unknown".to_owned());

        // One small JSON line; no payloads, no full backtrace.
        let line = format!(
            r#"{{"timestamp":"{ts}","level":"ERROR","syslog.severity":1,"syslog.severity_text":"Alert","message":"panic","component":"core","event_name":"panic","correlation_id":"unknown","session_id":"{sid}","source":{{"layer":"rust","location":"{loc}"}}}}"#,
            ts = now_iso8601_utc(),
            sid = session_id,
            loc = location,
        );

        // Prefer the configured logger; always fall back to stderr so the
        // panic is never lost if logging is down (disk full, partial init).
        if logger_is_ready() {
            log::error!("{line}");
        } else {
            eprintln!("{line}");
        }

        // Chain to the default hook so process behaviour is unchanged.
        default(info);
    }));
}
```

The `correlation_id` is `"unknown"` here because a panic is not bound to a command context; `session_id` ties the record
to the run. The hook logs once and chains to the default so the process still aborts as configured.

## 7.6 Performance

- Do not log inside hot loops.
- Guard Debug logs behind a runtime level check where they would be expensive.
- Avoid building the JSON object unless the event is enabled at the current level.

---

## Related documents

| Document                                                 | What it covers                                            |
| -------------------------------------------------------- | --------------------------------------------------------- |
| [log-record-contract.md](./log-record-contract.md)       | The fields the JSON object carries; source attribution.   |
| [event-catalogue.md](./event-catalogue.md)               | The events the host must emit.                            |
| [operational-edge-cases.md](./operational-edge-cases.md) | Pre-init and disk-full fallback the panic hook relies on. |
| [webview-renderer.md](./webview-renderer.md)             | The renderer counterpart.                                 |
