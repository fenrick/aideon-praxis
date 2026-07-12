# 4 & 11. Correlation, context propagation, and telemetry

How identifiers tie a user action to its host command, engine work, events, and log lines; how trace context propagates
across the IPC boundary; and how traces and metrics relate to logs. Part of the [logging standard](./README.md). The
governing decision is [ADR-0019](../06-adrs/ADR-0019-observability-and-trace-context.md).

---

## 4.1 Identifiers

- `session_id` — generated once per app start, in the Rust host, before the UI can trigger commands; shared to the
  WebView. Not PII.
- `correlation_id` — generated per user-initiated workflow / command-invocation boundary.
- `trace_id` and `span_id` — present when tracing is enabled; when present they **must** appear in every log line so
  logs and traces join.

## 4.2 Where IDs are created

- The Rust host **must** create `session_id` during early startup.
- The WebView **must** create a new `correlation_id` for each user-initiated workflow that triggers a host command, and
  a trace context for it.
- The Rust host **must** accept `correlation_id` on every command boundary and bind it to the command execution context.

## 4.3 Propagation rules

- Do not reuse a `correlation_id` across unrelated user actions.
- Correlation fields **must** be structured fields, never embedded in `message` text.
- Correlation fields **must not** contain PII.
- If correlation is missing, log `correlation_id="unknown"` and emit a Notice `correlation_missing` once per session —
  do not spam.

## 4.4 The correlation chain (renderer → host → engine → events → logs)

[ADR-0019](../06-adrs/ADR-0019-observability-and-trace-context.md) fixes the chain. One user action is reconstructable
end to end:

1. The renderer creates `correlation_id=c1` and a **W3C Trace Context** `traceparent`, and emits `ui_workflow_started`.
2. The renderer propagates the `traceparent` across the IPC boundary, so the host span is a **child** of the renderer's
   action span rather than an orphan.
3. The host opens a span per IPC command invocation, binds `c1`, and logs `command_invoked`.
4. Engine work and the events it emits ([ACCEPTED-WORK-AND-EVENTS.md](../04-contracts/ACCEPTED-WORK-AND-EVENTS.md),
   [PROJECTION-AND-INVALIDATION.md](../04-contracts/PROJECTION-AND-INVALIDATION.md)) carry the same `c1`.
5. A failure returns an error envelope carrying `c1` ([ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md)), so a
   UI error joins to the host logs and the span.

Every log line on both layers carries `c1`, plus `trace_id`/`span_id` when tracing is on. This satisfies the release
gate "one end-to-end workflow reconstructable from `correlation_id`"
([testing and quality gates](./testing-and-quality-gates.md)).

## 4.5 Command-boundary behaviour (mandatory)

At host command entry, emit `command_invoked`; at completion emit `command_completed` (Info) or `command_failed`
(Error). These three events **must** exist for every command invokable from the UI
([event catalogue](./event-catalogue.md#64-user-command-boundary-mandatory)).

---

## 11. Telemetry and its relationship to logs

This project captures telemetry alongside logs. The model is **OpenTelemetry**; the propagation format is **W3C Trace
Context** ([ADR-0019](../06-adrs/ADR-0019-observability-and-trace-context.md)).

### 11.1 Tracing

When tracing is enabled:

- The host **must** create a span per command invocation.
- Major workflow steps **must** be spans (or child spans).
- Logs **must** include `trace_id` and `span_id` so logs and traces join (OpenTelemetry logs↔traces correlation).

### 11.2 Metrics

When metrics are enabled, the host **must** emit:

- counters: `command_failures_total`, `job_failures_total`, `retries_total`
- histograms/timers: `command_duration_ms`, `job_duration_ms`

Metrics **must not** contain PII.

### 11.3 OpenTelemetry library guidance

- **Rust host:** use the OpenTelemetry Rust SDK (`opentelemetry`) wired behind the `tracing` facade via
  `tracing-opentelemetry`, so the `tracing` spans the host already creates export as OTel spans. This keeps span
  creation idiomatic and the exporter swappable.
- **WebView:** use the OpenTelemetry JavaScript SDK to mint the trace context and the `traceparent` propagated across
  IPC; the renderer is the trace root, so it owns the root span.
- **Propagation:** the only fixed contract is the **W3C Trace Context** `traceparent` representation crossing the IPC
  seam ([ADR-0019](../06-adrs/ADR-0019-observability-and-trace-context.md)). The exporter and backend are provisional —
  chosen per deployment — so code depends on the OTel API and the propagation format, never on a vendor SDK.
- **Default posture is local:** telemetry is captured locally and joined to the local NDJSON file
  ([where logs go](./where-logs-go.md)); the app does not ship telemetry over the network by default
  ([ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). Remote export is a documented deployment
  choice via the collector.

The trade-off: standardising on W3C Trace Context at the IPC seam fixes one wire format forever (changing it breaks
trace continuity and log joins), in exchange for a backend that stays swappable behind it.

---

## References & standards

_Normative:_

- **OpenTelemetry** — the tracing and metrics model; logs↔traces correlation
  ([ADR-0019](../06-adrs/ADR-0019-observability-and-trace-context.md)).
- W3C — **Trace Context** — the `traceparent` propagation format across IPC.

## Related documents

| Document                                                           | What it covers                                      |
| ------------------------------------------------------------------ | --------------------------------------------------- |
| [ADR-0019](../06-adrs/ADR-0019-observability-and-trace-context.md) | The observability decision this section implements. |
| [ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md)          | The error envelope carrying `correlation_id`.       |
| [event-catalogue.md](./event-catalogue.md)                         | The command-boundary and workflow events.           |
| [where-logs-go.md](./where-logs-go.md)                             | Where the joined telemetry and logs land.           |
