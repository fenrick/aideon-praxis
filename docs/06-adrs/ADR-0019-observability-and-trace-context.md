# ADR-0019: Observability and Trace Context — OpenTelemetry + W3C Trace Context

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0006
- Relates-To: ADR-0016, ADR-0018

## Context

A failure in a desktop EA tool spans layers: a user action in the renderer, an IPC command in the host, work in an
engine, the events it emits, and the log lines each produces. [LOGGING_FRAMEWORK.md](../LOGGING_FRAMEWORK.md) already
mandates structured NDJSON logs, a `correlation_id` per user action, and `trace_id`/`span_id` fields when tracing is
enabled, and requires that at least one end-to-end workflow be reconstructable from `correlation_id`. What was
unrecorded is the _standard_ that governs how those identifiers are formed and propagated across the IPC boundary —
without it, the renderer and host can generate incompatible IDs and the trace breaks at the seam.

OpenTelemetry supplies the tracing model and the logs↔traces correlation; W3C Trace Context supplies the wire format for
propagating a trace across a boundary.

## Governance Framing

- **Decision type:** Stable seam (the trace-context propagation format across IPC) + invariant (every IPC command is a
  span; logs carry the trace identifiers).
- **Known future pressure:** more commands and workflows; hosted/sync deployments that extend the trace beyond the
  device; richer metrics.
- **What stays stable:** OpenTelemetry as the tracing model; W3C Trace Context as the propagation format; the
  correlation chain renderer→host→engine→events→logs.
- **What is provisional:** the exporter/backend and the sampling policy.
- **What is deferred:** distributed tracing across sync peers; remote trace shipping by default.
- **Why hard to reverse:** the propagation format is the contract at the IPC seam and is embedded in logs; changing it
  breaks trace continuity and log joins.

## Decision

- **Tracing uses OpenTelemetry; trace context propagates with W3C Trace Context.** The host creates a span per IPC
  command invocation ([LOGGING_FRAMEWORK.md §11](../LOGGING_FRAMEWORK.md)); major workflow steps are child spans. The
  renderer propagates trace context to the host using the W3C Trace Context `traceparent` representation across the IPC
  boundary, so the host span is a child of the renderer's action span rather than an orphan (OpenTelemetry; W3C Trace
  Context).

- **`traceparent` is an optional sibling of `requestId` in the IPC request envelope — not inside `payload`.** The
  contract is:

  ```ts
  type IpcRequest<T> = { requestId: string; traceparent?: string; payload: T };
  ```

  ```rust
  pub struct IpcRequest<T> { pub request_id: String, pub traceparent: Option<String>, pub payload: T }
  ```

  `traceparent` is transport/observability metadata, not domain data; placing it beside `requestId` keeps the payload
  schema stable. When present the host creates the IPC command span as a child of the supplied context; when absent the
  host starts a root span. `requestId`/`correlation_id` remain the product-level reconstruction fields — they must not
  be conflated with the span hierarchy. When present, `traceparent` must match the W3C format
  (`^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$`); an invalid value is an envelope error (`code: invalid_trace_context`),
  not a domain error. The raw invalid value must not be echoed back.

- **Correlation IDs tie renderer → host → engine → events → logs.** The renderer creates a `correlation_id` per
  user-initiated workflow and a trace context for it; the host binds both to the command execution context; engine work
  and the events it emits ([ACCEPTED-WORK-AND-EVENTS.md](../04-contracts/ACCEPTED-WORK-AND-EVENTS.md),
  [PROJECTION-AND-INVALIDATION.md](../04-contracts/PROJECTION-AND-INVALIDATION.md)) carry the same `correlation_id`;
  every log line on both layers includes it, plus `trace_id`/`span_id` when tracing is enabled. One user action is
  reconstructable end to end ([LOGGING_FRAMEWORK.md §13](../LOGGING_FRAMEWORK.md)).

- **Errors and events join the trace.** The error envelope carries the `correlation_id` of the failing command
  ([ADR-0016](./ADR-0016-error-envelope-rfc9457.md)), so a UI error joins to host logs and the span. An event's
  `eventId` and `correlation_id` ([ADR-0018](./ADR-0018-idempotency-and-deduplication.md)) let deduplicated processing
  be traced.

- **The default posture is local.** Telemetry is captured locally and joined to the local NDJSON log file
  ([LOGGING_FRAMEWORK.md §5](../LOGGING_FRAMEWORK.md)); the application does not ship telemetry over the network by
  default ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). A collector reads the local file; remote
  export is a documented deployment choice, not the default. Telemetry must not contain PII
  ([LOGGING_FRAMEWORK.md §10, §11.2](../LOGGING_FRAMEWORK.md)).

- **Metrics follow the logging standard.** When metrics are enabled the host emits the counters and timers required by
  [LOGGING_FRAMEWORK.md §11.2](../LOGGING_FRAMEWORK.md) (`command_failures_total`, `command_duration_ms`, …); this ADR
  records the standard, the logging framework records the catalogue.

## Considered Options

- **A bespoke correlation scheme (rejected):** the logging framework already defines correlation IDs, but without a
  standard propagation format the renderer and host IDs need not align; W3C Trace Context guarantees they do.
- **A vendor-specific tracing SDK (rejected):** locks the propagation format to one backend; OpenTelemetry + W3C Trace
  Context keep the backend swappable behind a standard wire format.
- **Tracing only in the host (rejected):** loses the renderer action as the trace root, so the first hop — the user
  action — is invisible; propagating from the renderer keeps the trace whole.

## Consequences

- A trace begins at the renderer action and continues unbroken through the host span and engine work to the events and
  log lines, joinable by `trace_id` and `correlation_id`.
- The release gate "one end-to-end workflow reconstructable from `correlation_id`"
  ([LOGGING_FRAMEWORK.md §13](../LOGGING_FRAMEWORK.md)) is satisfied by this propagation.
- The backend is swappable; only the propagation format is fixed.
- A worked example: a user runs an artefact; the renderer emits `ui_workflow_started` with `correlation_id=c1` and a
  `traceparent`; the host opens a span as that trace's child, logs `command_invoked` with `c1`, the rebuild it triggers
  emits events carrying `c1`, and a failure returns an envelope carrying `c1` — all joinable.

## Follow-ups / Open Questions

- ~~The exact IPC field carrying `traceparent` and its place in the request envelope.~~ **Decided:** optional
  `traceparent` sibling of `requestId` in `IpcRequest<T>`; see Decision above.
- The exporter/backend and sampling policy for local capture.
- Whether trace context extends across sync peers in hosted deployments.

## References & standards

- **OpenTelemetry** (traces, metrics, logs correlation) _(normative: tracing model)_.
- W3C — **Trace Context** _(normative: propagation format)_.
- **RFC 5424** (Syslog severities) _(informative: severity model, via the logging framework)_.

## Related documents

| Document                                                | What it covers                                                        |
| ------------------------------------------------------- | --------------------------------------------------------------------- |
| [LOGGING_FRAMEWORK.md](../LOGGING_FRAMEWORK.md)         | The structured-logging and correlation standard this ADR aligns with. |
| [ADR-0016](./ADR-0016-error-envelope-rfc9457.md)        | The error envelope carrying `correlation_id`.                         |
| [ADR-0018](./ADR-0018-idempotency-and-deduplication.md) | Event `eventId`/`correlation_id` used in dedup and tracing.           |
