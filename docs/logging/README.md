# Logging and telemetry standard

The prescriptive standard for diagnostics and telemetry in this Tauri application. It is normative — follow it as
written. This README carries the non-negotiables and the severity model (§1–2); the rest of the standard is the focused
files below. The parent stub is [`../LOGGING_FRAMEWORK.md`](../LOGGING_FRAMEWORK.md).

This project is a desktop application with two runtime layers:

- **Rust** — the Tauri core (host) process and all trusted application logic.
- **WebView** — the renderer UI.

Logging is for diagnostics and auditability; telemetry (traces and metrics) is for behaviour and performance analysis.
Logs and telemetry **must** share correlation identifiers. The propagation standard is set by
[ADR-0019](../06-adrs/ADR-0019-observability-and-trace-context.md) (OpenTelemetry + W3C Trace Context).

---

## Contents

1. [Non-negotiables](#1-non-negotiables)
2. [Severity model (Syslog)](#2-severity-model-syslog)
3. [The log-record contract](./log-record-contract.md) — required and conditional fields; line-size enforcement; §9
   source attribution.
4. [Correlation and tracing](./correlation-and-tracing.md) — correlation IDs, W3C Trace Context propagation, §11
   telemetry, OTel library guidance.
5. [Where logs go](./where-logs-go.md) — per-OS LogDir paths, central-collector config, rotation, support bundles.
6. [The event catalogue](./event-catalogue.md) — the mandatory events, by category.
7. [How to log in Rust](./rust-host.md) — the host sink, call-site attribution, the panic hook.
8. [How to log in the WebView](./webview-renderer.md) — the renderer forwarding rules.
9. [Privacy and redaction](./privacy-and-redaction.md) — PII rules and the redaction-review process.
10. [Operational edge cases](./operational-edge-cases.md) — pre-init, disk-full, rate-limiting, clock issues.
11. [Testing and quality gates](./testing-and-quality-gates.md) — how logging is tested and the release gates.

---

## 1. Non-negotiables

1. All production logs **must** be structured JSON, newline-delimited (NDJSON).
2. Every operationally meaningful event **must** carry a stable `event_name` and `component`.
3. Source attribution **must** point to the true call site. Do not create wrapper layers that make logs appear to come
   from a helper ([source attribution](./log-record-contract.md#9-source-attribution)).
4. Secrets and personal data **must not** be logged ([privacy and redaction](./privacy-and-redaction.md)).
5. Logs **must** be captured from both layers (Rust and WebView) and **must** be centralisable
   ([where logs go](./where-logs-go.md)).
6. Correlation **must** work end to end: UI action → host command → engine → events → result
   ([correlation and tracing](./correlation-and-tracing.md)).
7. Logging **must** be safe under failure (panic paths, partial initialisation, disk full) and **must not** crash the
   app ([operational edge cases](./operational-edge-cases.md)).

---

## 2. Severity model (Syslog)

This project uses the eight Syslog severities (**RFC 5424**). Every log record **must** carry both `syslog.severity`
(0–7) and `syslog.severity_text`.

| Severity | Name          | Use it when                                                                                           |
| -------- | ------------- | ----------------------------------------------------------------------------------------------------- |
| 0        | Emergency     | The app is unusable or unsafe and must shut down, or a core integrity condition is violated.          |
| 1        | Alert         | Immediate action is required to prevent data loss or repeated failure.                                |
| 2        | Critical      | A major workflow is broken; the user cannot proceed without recovery.                                 |
| 3        | Error         | An operation failed; a user-visible error is likely.                                                  |
| 4        | Warning       | An operation succeeded or degraded, but action may be needed (retry, fallback, partial output).       |
| 5        | Notice        | A significant state change worth tracking (migration applied, repair performed, connectivity change). |
| 6        | Informational | A normal milestone (command start/stop, background completion).                                       |
| 7        | Debug         | Developer diagnostics (branch decisions, timings); generally disabled in production.                  |

### 2.1 Mapping to logger levels (mandatory)

Libraries expose fewer levels, so store the Syslog severity as a field and map to the library level for filtering and
routing:

- severity 0–3 → library level `ERROR`
- severity 4 → `WARN`
- severity 5–6 → `INFO`
- severity 7 → `DEBUG`

If a library supports `TRACE`, reserve it for deliberate, time-boxed diagnostics; it is **not** part of Syslog 0–7.

---

## References & standards

_Normative:_

- **RFC 5424** — Syslog severities.
- **OpenTelemetry**; W3C — **Trace Context** — the tracing model and propagation format
  ([ADR-0019](../06-adrs/ADR-0019-observability-and-trace-context.md);
  [standards register](../02-standards/STANDARDS-REGISTER.md), Observability).

## Related documents

| Document                                                           | What it covers                                 |
| ------------------------------------------------------------------ | ---------------------------------------------- |
| [ADR-0019](../06-adrs/ADR-0019-observability-and-trace-context.md) | OpenTelemetry + W3C Trace Context propagation. |
| [`../LOGGING_FRAMEWORK.md`](../LOGGING_FRAMEWORK.md)               | The index stub mapping sections to files.      |
| [STANDARDS-REGISTER.md](../02-standards/STANDARDS-REGISTER.md)     | The Observability bibliography entry.          |
