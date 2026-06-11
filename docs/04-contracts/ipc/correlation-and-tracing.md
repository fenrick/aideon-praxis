# Correlation and tracing

How one user action stays traceable across the renderer→host→engine→events→logs chain. Tracing uses OpenTelemetry; trace context propagates with W3C Trace Context. The decision is [ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md), aligned with [LOGGING_FRAMEWORK.md](../../LOGGING_FRAMEWORK.md).

---

## The three identifiers

| Identifier      | Scope                       | Carried where                                                                                                 |
| --------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `requestId`     | One IPC call                | The [request/response envelope](./envelope.md); pairs a response to its call.                                 |
| `correlationId` | One user-initiated workflow | The request, every event the workflow emits, the error envelope, and every log line.                          |
| `eventId`       | One emitted event           | Each [event](../accepted-work-and-events/event-model.md); the dedup key ([idempotency.md](./idempotency.md)). |

`requestId` is per-call; `correlationId` spans a whole workflow (which may be several calls and many events); `eventId` identifies a single event for deduplication.

## W3C Trace Context across the boundary

The renderer creates a `correlationId` and a trace context per user-initiated workflow, and propagates the trace to the host using the W3C Trace Context `traceparent` representation across the IPC boundary. The host opens a span per IPC command invocation as a **child** of the renderer's action span, rather than an orphan — so the first hop, the user action, is the trace root rather than being invisible. Major workflow steps are child spans.

The exact request field carrying `traceparent` is being finalised ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md), open questions); it is recorded here as design intent until fixed in the generated envelope.

## The chain, end to end

The renderer binds `correlationId` and trace context to a workflow; the host binds both to the command execution context; engine work and the [events](../accepted-work-and-events/event-model.md) it emits carry the same `correlationId`; every log line on both layers includes it, plus `trace_id`/`span_id` when tracing is enabled. One user action is reconstructable end to end ([LOGGING_FRAMEWORK.md §13](../../LOGGING_FRAMEWORK.md)).

Errors join the same trace: the [error envelope](./error-envelope.md) carries the `correlationId` of the failing command, so a UI error joins to host logs and the span.

## Posture

The default posture is local: telemetry is captured locally and joined to the local NDJSON log file; the application does not ship telemetry over the network by default ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). Telemetry must not contain PII. Remote export is a documented deployment choice, not the default.

## Worked example

A user runs the [graph-slice artefact](./envelope.md). The renderer emits `ui_workflow_started` with `correlationId = c1` and a `traceparent`; the host opens a span as that trace's child and logs `command_invoked` with `c1`; the rebuild it triggers emits [run events](../accepted-work-and-events/event-model.md) carrying `c1`; a failure returns an [error envelope](./error-envelope.md) carrying `c1` — all joinable by `trace_id` and `correlationId`.

## References & standards

- **OpenTelemetry** _(normative: tracing model)_.
- W3C — **Trace Context** _(normative: propagation format)_.

## Related documents

| Document                                                                              | What it covers                                                    |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)                 | The observability and trace-context decision.                     |
| [LOGGING_FRAMEWORK.md](../../LOGGING_FRAMEWORK.md)                                    | The structured-logging and correlation standard this aligns with. |
| [accepted-work-and-events/event-model.md](../accepted-work-and-events/event-model.md) | The events that carry `correlationId` and `eventId`.              |
| [Host: observability](../../05-modules/host/observability.md)                         | The host-side span and log implementation.                        |
