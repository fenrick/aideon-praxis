# Logging and telemetry framework

The prescriptive standard for diagnostics and telemetry in this Tauri application — structured logs and traces across
the renderer (WebView) and the Rust host, joined by correlation identifiers end to end. This standard is normative;
follow it as written. It is decomposed into the [`logging/`](./logging/README.md) folder because it runs well past four
screens ([DOCUMENTATION-STANDARD.md §4](./02-standards/DOCUMENTATION-STANDARD.md)); this file is the index.

Logging is for diagnostics and auditability; telemetry (traces and metrics) is for behaviour and performance analysis.
Logs and telemetry **must** share correlation identifiers. The propagation standard — OpenTelemetry plus W3C Trace
Context, correlating renderer → host → engine → events → logs — is set by
**[ADR-0019](./06-adrs/ADR-0019-observability-and-trace-context.md)**.

## The standard, by section

The section numbers below are stable; incoming cross-links (including
[ADR-0019](./06-adrs/ADR-0019-observability-and-trace-context.md)) target them.

| §   | Topic                                                                            | File                                                                                    |
| --- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | Non-negotiables; the two runtime layers                                          | [logging/README.md](./logging/README.md)                                                |
| 2   | Severity model (Syslog RFC 5424) and level mapping                               | [logging/README.md](./logging/README.md)                                                |
| 3   | The log-record contract (required and conditional fields); line-size enforcement | [logging/log-record-contract.md](./logging/log-record-contract.md)                      |
| 4   | Correlation and context propagation; OTel + W3C Trace Context                    | [logging/correlation-and-tracing.md](./logging/correlation-and-tracing.md)              |
| 5   | Where logs go: per-OS LogDir paths; central-collector config                     | [logging/where-logs-go.md](./logging/where-logs-go.md)                                  |
| 6   | When to log: the mandatory event catalogue                                       | [logging/event-catalogue.md](./logging/event-catalogue.md)                              |
| 7   | How to log in Rust (host); the panic hook                                        | [logging/rust-host.md](./logging/rust-host.md)                                          |
| 8   | How to log in the WebView (renderer)                                             | [logging/webview-renderer.md](./logging/webview-renderer.md)                            |
| 9   | Source attribution                                                               | [logging/log-record-contract.md](./logging/log-record-contract.md#9-source-attribution) |
| 10  | Privacy, PII redaction, and the redaction-review process                         | [logging/privacy-and-redaction.md](./logging/privacy-and-redaction.md)                  |
| 11  | Telemetry — tracing and metrics; OTel library guidance                           | [logging/correlation-and-tracing.md](./logging/correlation-and-tracing.md)              |
| 12  | Operational edge cases                                                           | [logging/operational-edge-cases.md](./logging/operational-edge-cases.md)                |
| 13  | Quality gates; testing logging                                                   | [logging/testing-and-quality-gates.md](./logging/testing-and-quality-gates.md)          |

Start at [logging/README.md](./logging/README.md), which carries the non-negotiables, the severity model, and the full
Contents list.

## Related documents

| Document                                                          | What it covers                                 |
| ----------------------------------------------------------------- | ---------------------------------------------- |
| [logging/README.md](./logging/README.md)                          | The standard's entry point and Contents.       |
| [ADR-0019](./06-adrs/ADR-0019-observability-and-trace-context.md) | OpenTelemetry + W3C Trace Context propagation. |
| [STANDARDS-REGISTER.md](./02-standards/STANDARDS-REGISTER.md)     | The Observability bibliography entry.          |
