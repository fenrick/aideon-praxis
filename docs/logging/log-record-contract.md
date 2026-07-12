# 3. The log-record contract

The fields every log record must carry, the fields required on specific conditions, the size limit on a line, and the
rule that source attribution must point to the true call site. Part of the [logging standard](./README.md).

---

## 3.1 Required fields

Every log record emitted by any layer **must** include:

- `timestamp` — UTC, ISO-8601
- `level` — `ERROR` / `WARN` / `INFO` / `DEBUG` / `TRACE`
- `syslog.severity` — 0–7 ([§2](./README.md#2-severity-model-syslog))
- `syslog.severity_text` — Emergency … Debug
- `message` — one sentence; no multi-line dumps
- `component` — a stable subsystem identifier (`core`, `workspace`, `sync`, `store`, `network`, `ui`)
- `event_name` — a stable snake_case identifier
- `correlation_id` — see [correlation and tracing](./correlation-and-tracing.md)
- `session_id` — random per app start; not PII
- `source` — see [§9](#9-source-attribution)

## 3.2 Conditionally required fields

On errors (severity 0–3):

- `error.kind` (a stable category), `error.message`, `error.stack` (WebView only, if safe), `error.cause` (Rust cause
  chain, summarised)

On user-visible errors:

- `user_impact` — one of `blocked` / `degraded` / `recoverable`
- `ui_surface` — `toast` / `dialog` / `screen` / `silent`

On data-changing operations:

- `resource.type` — `workspace` / `document` / `cache` / `config`
- `resource.id` — a non-PII identifier; hashed if needed

## 3.3 Strongly required for fleet support

- `build.version`, `build.commit`, `platform.os`, `platform.arch`

When tracing is enabled, records also carry `trace_id` and `span_id`
([correlation and tracing](./correlation-and-tracing.md)).

## 3.4 Field-design rules and line-size enforcement

- Fields **must** be stable across releases.
- Prefer short snake_case keys.
- Do not invent deeply nested structures unless the structure is repeated and meaningful.
- **A log record must stay small. The hard ceiling is 16 KB per line; the target is under 8 KB.** A record over the
  ceiling is truncated to the contract fields plus a `truncated: true` marker rather than dropped, and the over-size
  condition is itself a defect to fix — almost always it means a payload or a stack is being logged that should not be.
  Enforce the ceiling at the sink, before the line is written.

Do not log full request/response bodies, large payloads, or UI-state snapshots
([anti-patterns](./event-catalogue.md#69-anti-patterns-must-not)).

---

## 9. Source attribution

The origin of a log line **must** be recoverable. The system preserves, at minimum:

- **Rust:** module path and file/line, via the standard `log` macros and the configured logger
  ([how to log in Rust](./rust-host.md)).
- **WebView:** the `component` and `event_name` must be sufficient to locate the source
  ([how to log in the WebView](./webview-renderer.md)).

Rules:

- Rust standardised-field helpers **must** be macros (`macro_rules!`), not functions, so file/line/module resolve to the
  call site, not the helper.
- JS helpers **must** be shallow and **must not** be mandatory for all logging.
- If a helper makes the origin worse — if most lines appear to come from it — it is a defect and is removed.

---

## Related documents

| Document                                                   | What it covers                           |
| ---------------------------------------------------------- | ---------------------------------------- |
| [README.md](./README.md)                                   | Non-negotiables and the severity model.  |
| [correlation-and-tracing.md](./correlation-and-tracing.md) | `correlation_id`, `trace_id`, `span_id`. |
| [event-catalogue.md](./event-catalogue.md)                 | The events these fields describe.        |
| [privacy-and-redaction.md](./privacy-and-redaction.md)     | What `resource.id` hashing protects.     |
