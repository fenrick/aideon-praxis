# 8. How to log in the WebView (the renderer)

How the renderer forwards logs into the host pipeline, attributes them, and maps severities. Part of the
[logging standard](./README.md).

The WebView **must** forward logs using `@tauri-apps/plugin-log`, so renderer logs land in the same LogDir NDJSON file
as host logs ([where logs go](./where-logs-go.md)).

---

## 8.1 Call-site attribution

- Log operational events at the call site.
- Avoid deep wrapper layers. A shallow helper is permitted only if it is not mandatory for all logging and does not
  remove the ability to find the origin module/component
  ([source attribution](./log-record-contract.md#9-source-attribution)).

## 8.2 Severity mapping

- severity 0–3 → `error(...)`
- severity 4 → `warn(...)`
- severity 5–6 → `info(...)`
- severity 7 → `debug(...)`

`trace(...)` is permitted only for targeted, time-boxed diagnostics
([§2.1](./README.md#21-mapping-to-logger-levels-mandatory)).

## 8.3 Error handling

- When catching an error that will be shown to the user, log `ui_error_shown` at severity 3 (Error) with `ui_surface`
  and `user_impact` ([event catalogue §6.8](./event-catalogue.md#68-ui)).
- If the error is recoverable (the user can retry), set `user_impact="recoverable"`.

Do not log full UI-state snapshots.

## 8.4 Correlation

The renderer creates the `correlation_id` and the W3C Trace Context for each user-initiated workflow and propagates the
`traceparent` across the IPC boundary ([correlation and tracing §4](./correlation-and-tracing.md)). Every renderer log
line carries `correlation_id`, and `trace_id`/`span_id` when tracing is on.

---

## Related documents

| Document                                                   | What it covers                                                 |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| [correlation-and-tracing.md](./correlation-and-tracing.md) | The renderer is the trace root; how `traceparent` crosses IPC. |
| [event-catalogue.md](./event-catalogue.md)                 | The UI events the renderer emits.                              |
| [where-logs-go.md](./where-logs-go.md)                     | The shared LogDir file renderer logs forward into.             |
| [rust-host.md](./rust-host.md)                             | The host counterpart.                                          |
