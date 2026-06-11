# Logging and Telemetry Standard (Tauri: Rust core + WebView)

This document is prescriptive. Follow it as written.

This project is a desktop application with two runtime layers:

- Rust: the Tauri core process and all trusted application logic.
- WebView: the renderer UI.

Logging is for diagnostics and auditability. Telemetry (traces and metrics) is for behaviour and performance analysis. Logs and telemetry MUST share correlation identifiers.

## 1. Non-negotiables

1. All production logs MUST be structured JSON (newline-delimited JSON / “NDJSON”).
2. Every operationally meaningful event MUST have a stable `event_name` and `component`.
3. Source attribution MUST point to the true call site. Do not create wrapper layers that cause logs to appear to come from a helper.
4. Secrets and personal data MUST NOT be logged.
5. Logs MUST be captured from both layers (Rust and WebView) and MUST be centralisable.
6. Correlation MUST work end-to-end: UI action → Rust command → result.
7. Logging MUST be safe under failure conditions (panic paths, partial initialisation, disk full) and must not crash the app.

## 2. Severity model (Syslog)

This project uses the eight Syslog severities. Every log record MUST include them.

Syslog severity values (RFC 5424):

- 0 Emergency
- 1 Alert
- 2 Critical
- 3 Error
- 4 Warning
- 5 Notice
- 6 Informational
- 7 Debug

Reference: RFC 5424. <https://datatracker.ietf.org/doc/html/rfc5424>

### 2.1 Mapping to logger levels

Libraries usually expose fewer levels. We therefore store Syslog severity as fields, and map to library level for filtering/routing.

Mapping rule (mandatory):

- severity 0–3 → library level `ERROR`
- severity 4 → library level `WARN`
- severity 5–6 → library level `INFO`
- severity 7 → library level `DEBUG`

If a library supports `TRACE`, reserve it for deliberate, time-boxed diagnostics only. `TRACE` is not part of Syslog 0–7.

### 2.2 How to choose severity

Use this decision table:

- Emergency (0): the app is unusable or unsafe and must shut down, or a core integrity condition is violated.
- Alert (1): immediate action required to prevent data loss or repeated failures.
- Critical (2): a major workflow is broken; user cannot proceed without recovery.
- Error (3): operation failed; a user-visible error is likely.
- Warning (4): operation succeeded or degraded, but action may be needed (retry, fallback, partial output).
- Notice (5): significant state change worth tracking (migrations applied, repair performed, connectivity state change).
- Informational (6): normal milestone events (command start/stop, background completion).
- Debug (7): developer diagnostics (branch decisions, timings, detailed internal states). Debug logs are generally disabled in production unless explicitly turned on.

## 3. Log record contract (required fields)

Every log record emitted by any layer MUST conform to this contract.

### 3.1 Required fields

- `timestamp` (UTC, ISO-8601)
- `level` (`ERROR`/`WARN`/`INFO`/`DEBUG`/`TRACE`)
- `syslog.severity` (0–7)
- `syslog.severity_text` (Emergency…Debug)
- `message` (one sentence; no multi-line dumps)
- `component` (stable subsystem identifier, e.g. `core`, `workspace`, `sync`, `store`, `network`, `ui`)
- `event_name` (stable identifier, snake_case)
- `correlation_id` (see Section 4)
- `session_id` (random per app start; not PII)
- `source` (see Section 9)

### 3.2 Conditionally required fields

On errors (syslog severity 0–3):

- `error.kind` (stable category)
- `error.message`
- `error.stack` (WebView only, if safe)
- `error.cause` (Rust cause chain summarised)

On user-visible errors:

- `user_impact` (one of `blocked|degraded|recoverable`)
- `ui_surface` (where it showed: `toast|dialog|screen|silent`)

On data-changing operations:

- `resource.type` (e.g. `workspace|document|cache|config`)
- `resource.id` (a non-PII identifier; hashed if needed)

### 3.3 Strongly required for fleet support

- `build.version`
- `build.commit`
- `platform.os`
- `platform.arch`

### 3.4 Allowed field design

- Fields MUST be stable across releases.
- Prefer short snake_case keys.
- Do not invent deeply nested structures unless it is repeated and meaningful.
- Keep log records small. If a record exceeds ~8–16 KB, you are almost certainly logging too much.

## 4. Correlation and context propagation (mandatory)

### 4.1 Identifiers

- `session_id`: generated once per app start in Rust; shared to WebView.
- `correlation_id`: generated per user action / command invocation boundary.
- `trace_id` and `span_id`: present when tracing is enabled (Section 11). When present, they MUST be included in logs.

### 4.2 Where IDs are created

- Rust MUST create `session_id` during early startup (before the UI can trigger commands).
- The WebView MUST create a new `correlation_id` for each user-initiated workflow that triggers a Rust command.
- Rust MUST accept `correlation_id` on every command boundary and bind it to the command execution context.

### 4.3 Rules for propagation

- Do not reuse a `correlation_id` across unrelated user actions.
- Correlation fields MUST be structured fields, not embedded in message text.
- Correlation fields MUST NOT contain PII.
- If correlation is missing, log `correlation_id="unknown"` and emit a Notice `correlation_missing` once per session (do not spam).

### 4.4 Required command boundary behaviour

At Rust command entry, emit:

- `command_invoked` (Info/Notice depending on sensitivity)

At completion, emit one of:

- `command_completed` (Info)
- `command_failed` (Error)

These three events MUST exist for every command that can be invoked from the UI.

## 5. Where logs go (single local truth)

The single local source of truth for production diagnostics MUST be the Tauri application log file in the OS log directory.

Implementation rules:

- Rust logs MUST be written via the official Tauri logging plugin into LogDir.
- WebView logs MUST be forwarded into the same Tauri logging pipeline.

Tauri logging plugin (v2): <https://v2.tauri.app/plugin/logging/>
Tauri JS log API: <https://v2.tauri.app/reference/javascript/log/>

### 5.1 Centralisation

Centralisation MUST be handled by a log collector/agent (Vector, Fluent Bit, or equivalent) reading the local NDJSON log file and shipping it to your log platform.

The application MUST NOT implement bespoke network log shipping unless a documented requirement exists.

### 5.2 Log retention and rotation

- The application MUST keep logs bounded in size.
- Prefer platform/logging plugin rotation if available.
- If rotation is not available in the plugin, implement a deterministic policy at the file level (maximum size + maximum files) without impacting runtime stability.

Minimum acceptable policy for production builds:

- Max file size: 10–50 MB
- Max files: 5–20

Rotation MUST be tested for:

- disk full
- permissions denied
- concurrent writes

### 5.3 Support bundles

The application MUST be able to produce a support bundle that includes:

- the latest log files
- build version/commit
- platform info
- a timestamp

The bundle MUST NOT include secrets or raw user content.

## 6. When to log (definition statements)

This section defines mandatory events. These are not “examples”.

### 6.1 Lifecycle (mandatory)

- `app_start` (Notice): include build + platform + session_id
- `app_ready` (Info): UI is interactive
- `app_shutdown` (Notice): normal exit path

Also emit:

- `app_crash_detected` (Alert): if startup detects evidence of prior abnormal termination

### 6.2 Configuration and migration (mandatory)

- `config_loaded` (Info)
- `migration_start` (Notice)
- `migration_step` (Notice): include `migration.name` and `migration.step`
- `migration_complete` (Notice)
- `migration_failed` (Critical): if the app cannot continue safely

### 6.3 Persistence and state (mandatory)

- `state_opened` (Info)
- `state_corrupt_detected` (Alert)
- `state_repair_started` (Notice)
- `state_repair_completed` (Notice)
- `state_repair_failed` (Critical)

### 6.4 User command boundary (mandatory)

For every invokable command:

- `command_invoked` (Info)
- `command_completed` (Info)
- `command_failed` (Error)

If the command triggers a multi-step workflow, also emit:

- `workflow_step` (Info/Notice): include `workflow.name`, `workflow.step`, and an `elapsed_ms` if available

### 6.5 Background work and retries (mandatory)

- `job_started` (Info)
- `job_completed` (Info)
- `job_failed` (Error)
- `retry_scheduled` (Warning): include `retry.count` and `retry.delay_ms`
- `retry_exhausted` (Alert)

### 6.6 Network and external dependencies (mandatory)

- `network_state_changed` (Notice): include `network.state` (e.g. `online|offline|degraded`)
- `request_failed` (Warning/Error): include `http.status` if present and `error.kind`

Do not log URLs with embedded tokens or query params that may contain PII.

### 6.7 Security and permission boundaries (mandatory)

- `permission_denied` (Warning): include `permission.name`
- `capability_blocked` (Warning): include `capability.name`

### 6.8 UI (mandatory)

- `ui_error_shown` (Error): only when the user sees an error; include `ui_surface` and `user_impact`
- `ui_workflow_started` (Info)
- `ui_workflow_completed` (Info)

UI events MUST still carry `correlation_id` and MUST forward to the same log file.

### 6.9 Anti-patterns (MUST NOT)

- logging per-frame render activity
- logging polling ticks
- logging large payloads by default
- logging full request/response bodies

## 7. How to log in Rust (Tauri core)

### 7.1 Use the Tauri log plugin as the sink

Rust MUST use the official Tauri logging plugin to initialise the global logger and write to LogDir.

Rules:

- Logging initialisation MUST happen once.
- Logging initialisation MUST happen early (before meaningful work), but after any environment configuration is loaded.

Reference: <https://v2.tauri.app/plugin/logging/>

### 7.2 Use `log` macros for application logs (call-site attribution)

Rust application code MUST use the standard `log` macros:

- `log::error!`
- `log::warn!`
- `log::info!`
- `log::debug!`

This preserves file/line/module attribution in the logger.

Where you need standardised fields, implement helpers as Rust macros (`macro_rules!`), not functions.

Rules:

- Do not implement `fn log_event(...)` and call it everywhere.
- If a helper becomes the apparent source of most log lines, it is a defect and must be removed.

### 7.3 Enforcing the JSON schema in Rust

Rust logs MUST be emitted as a single JSON object per line.

Implementation rule:

- Build a JSON object containing the schema fields and render it as the log message.
- Do not rely on ad-hoc formatting.

This is intentional: it avoids dependence on a specific formatter while keeping LogDir sink behaviour.

### 7.4 Error logging in Rust

On any failure returned from a command:

- Emit `command_failed` at Error level.
- Set `syslog.severity` to 3 (Error) unless the failure threatens integrity, in which case use 0–2.
- Populate `error.kind`, `error.message`, and a summarised cause chain.

Rust MUST not log raw error structs if they might include secrets.

### 7.5 Panic and crash behaviour

- Rust MUST install a panic hook that emits a final Emergency/Alert log record with minimal safe context.
- The panic hook MUST avoid allocations where practical and MUST not deadlock.
- If the logger is unavailable, the panic hook MUST fallback to stderr.

Do not attempt to log large stacks or internal dumps in the panic path.

### 7.6 Performance requirements

- Do not log inside hot loops.
- Guard Debug logs behind runtime level checks where they would be expensive.
- Avoid expensive JSON building unless the event is enabled at the current level.

## 8. How to log in the WebView (renderer)

The WebView MUST forward logs using `@tauri-apps/plugin-log`.

Reference: <https://v2.tauri.app/reference/javascript/log/>

### 8.1 Call-site attribution rules

- Log operational events at the call site.
- Avoid deep wrapper layers.

A shallow helper is permitted only if:

- it is not mandatory for all logging
- it does not remove the ability to find the origin module/component

### 8.2 Severity mapping

- severity 0–3 → `error(...)`
- severity 4 → `warn(...)`
- severity 5–6 → `info(...)`
- severity 7 → `debug(...)`

`trace(...)` is permitted only for targeted, time-boxed diagnostics.

### 8.3 Error handling rules

- When catching an error that will be shown to the user, log `ui_error_shown` with severity 3 (Error).
- If the error is recoverable (user can retry), set `user_impact="recoverable"`.

Do not log full UI state snapshots.

## 9. Source attribution (do not lose the origin)

The system MUST preserve, at minimum:

- Rust: module path and file/line (via the Rust `log` macros and configured logger)
- WebView: the `component` and `event_name` must be sufficient to locate the source

Rules:

- Rust helpers MUST be macros, not functions.
- JS helpers MUST be shallow and MUST NOT be mandatory.
- If a helper makes origin worse, remove it.

## 10. Privacy and security (mandatory)

Do not log:

- secrets (keys, tokens, passwords, seed phrases)
- personal data unless there is a written, reviewed exception
- raw user content by default

If you must reference a sensitive identifier:

- hash it or truncate it
- name the field accordingly (e.g. `user_id_hash`, `token_suffix`)

Redaction MUST occur before writing the log line.

## 11. Telemetry (traces and metrics) and its relationship to logs

This project captures telemetry alongside logs.

### 11.1 Tracing

When tracing is enabled:

- Rust MUST create a span per command invocation.
- Major workflow steps MUST be spans (or child spans).
- Logs MUST include `trace_id` and `span_id` so logs and traces can be joined.

Reference: OpenTelemetry logs spec (TraceId/SpanId correlation). <https://opentelemetry.io/docs/specs/otel/logs/>

### 11.2 Metrics

When metrics are enabled, Rust MUST emit:

- counters: `command_failures_total`, `job_failures_total`, `retries_total`
- histograms/timers: `command_duration_ms`, `job_duration_ms`

Metrics MUST not contain PII.

## 12. Operational edge cases (explicit rules)

### 12.1 Logging before initialisation

If any code runs before logging is initialised:

- it MUST log to stderr only, and
- it MUST emit a Notice `logging_not_ready` once logging becomes available.

### 12.2 Disk full / permission denied

If the log file cannot be written:

- do not crash
- fall back to stderr
- emit a single Alert `logging_write_failed` per session (rate-limited)

### 12.3 Rate limiting and spam control

- Repeated identical warnings/errors MUST be rate-limited.
- Use counters for repeated conditions (e.g. `suppressed_count`).

### 12.4 Debug mode activation

Debug logging in production MUST be explicit:

- enabled only via a deliberate user action (support mode) or a clearly documented config flag
- time-bounded (auto-disable after a duration)

When debug is enabled, emit:

- `debug_logging_enabled` (Notice)
- `debug_logging_disabled` (Notice)

### 12.5 Clock issues

Timestamps MUST be UTC ISO-8601. If system time is clearly invalid (e.g. before a reasonable epoch), emit `clock_invalid` (Warning) once per session.

## 13. Quality gates (release requirements)

A change is not complete until:

1. Operational events include `component`, `event_name`, `syslog.severity`, and `correlation_id`.
2. Source attribution is correct (Rust file/line/module not collapsed to a helper).
3. Logs are NDJSON and can be ingested by the central collector.
4. Redaction rules are verified.
5. At least one end-to-end workflow can be reconstructed using `correlation_id`.

## Appendix A: Example log records (NDJSON)

Lifecycle start:

```json
{
  "timestamp": "2026-01-20T10:12:33.123Z",
  "level": "INFO",
  "syslog.severity": 5,
  "syslog.severity_text": "Notice",
  "message": "Application started",
  "component": "core",
  "event_name": "app_start",
  "correlation_id": "startup",
  "session_id": "7c8b3e2f-8d4d-4f5b-9a6e-2b2c2a7f7f2c",
  "source": { "layer": "rust", "module": "app::startup", "file": "src/main.rs", "line": 42 },
  "build": { "version": "1.4.0", "commit": "abc123" },
  "platform": { "os": "windows", "arch": "x86_64" }
}
```

Command failure:

```json
{
  "timestamp": "2026-01-20T10:13:10.002Z",
  "level": "ERROR",
  "syslog.severity": 3,
  "syslog.severity_text": "Error",
  "message": "Command failed",
  "component": "workspace",
  "event_name": "command_failed",
  "correlation_id": "b4c3c2d1-0a12-4c2d-9c77-1e9d2b0d5f3a",
  "session_id": "7c8b3e2f-8d4d-4f5b-9a6e-2b2c2a7f7f2c",
  "source": {
    "layer": "rust",
    "module": "workspace::open",
    "file": "src/workspace.rs",
    "line": 118
  },
  "error": {
    "kind": "workspace_open_failed",
    "message": "Workspace metadata is invalid",
    "cause": "io_error: permission denied"
  },
  "user_impact": "blocked",
  "ui_surface": "dialog"
}
```

UI error shown:

```json
{
  "timestamp": "2026-01-20T10:13:10.110Z",
  "level": "ERROR",
  "syslog.severity": 3,
  "syslog.severity_text": "Error",
  "message": "User-visible error displayed",
  "component": "ui",
  "event_name": "ui_error_shown",
  "correlation_id": "b4c3c2d1-0a12-4c2d-9c77-1e9d2b0d5f3a",
  "session_id": "7c8b3e2f-8d4d-4f5b-9a6e-2b2c2a7f7f2c",
  "source": { "layer": "webview", "module": "ui/workspace/open.ts", "function": "onOpenWorkspace" },
  "error": { "kind": "workspace_open_failed", "message": "Workspace could not be opened" },
  "user_impact": "blocked",
  "ui_surface": "dialog"
}
```
