# Audit and Logging

What is auditable, and how logging captures it without leaking secrets or PII. This realises the logging-and-audit concern of [controls-asvs.md](./controls-asvs.md) (ASVS V7) and links the observability decision ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)), the planned governance module [Themis](../../06-adrs/ADR-0030-governance-themis.md), and the structured-logging standard ([LOGGING_FRAMEWORK.md](../../LOGGING_FRAMEWORK.md)).

## Audit derives, it does not duplicate

Every governed action is attributable through the **append-only op log** ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)) and correlated by trace context ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)). Audit is a _view_ over canonical material plus observability, not a second source of truth ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). This is the Repudiation control ([threat-model.md](./threat-model.md)): a mutation cannot exist without a recorded, attributable operation, so "who did what" is answerable from the op log rather than a parallel store that could drift from it.

The planned governance module **Themis** defines _what must be auditable and retained_ — it does not keep a duplicate log ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). Retention interacts with the append-only invariant: deleting content for retention is itself a recorded, forward-only operation, never an in-place erase ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md) open question).

## Structured logs with correlation

Logging follows the structured-logging standard ([LOGGING_FRAMEWORK.md](../../LOGGING_FRAMEWORK.md)): NDJSON lines, a `correlation_id` per user-initiated workflow, and `trace_id`/`span_id` when tracing is enabled. The identifiers are formed and propagated to a standard so a trace is not broken at the IPC seam ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)):

- the host creates a span per IPC command; major workflow steps are child spans;
- the renderer propagates trace context with the W3C Trace Context `traceparent` across IPC, so the host span is a child of the renderer's action span, not an orphan;
- correlation IDs tie renderer → host → engine → events → logs, so one user action is reconstructable end to end ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md));
- the error envelope carries the failing command's `correlation_id` ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)), so a UI error joins to the host trace.

The release gate "one end-to-end workflow reconstructable from `correlation_id`" ([LOGGING_FRAMEWORK.md](../../LOGGING_FRAMEWORK.md)) is the verification of this correlation chain ([controls-asvs.md](./controls-asvs.md)).

## Never log a secret or PII

Logs are an Information-disclosure surface ([threat-model.md](./threat-model.md)), so:

- **No secret appears in a log line**, even at debug level ([secrets-and-keys.md](./secrets-and-keys.md)).
- **No PII appears in a log or telemetry record**; log lines route through the same redaction discipline as exports ([pii-and-export-redaction.md](./pii-and-export-redaction.md), [CODING-STANDARDS.md §14](../CODING-STANDARDS.md#14-pii-handling)).
- **An error's `detail`/`details` carry no secret, stack trace, or personal data** ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)) — they carry a stable code, a category, a recovery hint, and the correlation ID.

## Local by default

Telemetry is captured locally and joined to the local NDJSON log file; the application does not ship telemetry over the network by default ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md), [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). A collector reads the local file; remote export is a documented deployment choice, not the default. The tracing backend is swappable behind the standard wire format; only the propagation format is fixed.

## References & standards

_Normative:_

- **OpenTelemetry**; W3C **Trace Context**. _(tracing model and propagation — [ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md))_
- **OWASP ASVS 5.0** — V7 Error/Logging. _([controls-asvs.md](./controls-asvs.md))_

_Informative:_

- **RFC 5424** (Syslog severities). _(severity model, via the logging framework)_

Recorded in the [standards register](../STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                                    | What it covers                                   |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| [LOGGING_FRAMEWORK.md](../../LOGGING_FRAMEWORK.md)                                                          | The structured-logging and correlation standard. |
| [ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)                                       | The tracing and trace-context decision.          |
| [ADR-0030 — Governance (Themis)](../../06-adrs/ADR-0030-governance-themis.md)                               | What must be auditable and retained.             |
| [secrets-and-keys.md](./secrets-and-keys.md) · [pii-and-export-redaction.md](./pii-and-export-redaction.md) | What must never be logged.                       |
