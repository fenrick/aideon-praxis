# Observability

How the host makes a failure traceable across the boundary, and the error-recovery, circuit-breaker, and IPC-timeout obligations that keep a failure contained. For a reader debugging across the renderer/host/engine layers or designing the host's resilience.

Tracing is fixed by [ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md) (OpenTelemetry + W3C Trace Context) and the [logging framework](../../LOGGING_FRAMEWORK.md). The error-recovery, circuit-breaker, and timeout-SLA obligations below are **design intent** — the resilience contract the host is built to — labelled as such; the tracing contract is normative now.

---

## Tracing and correlation

A failure in the product spans layers: a user action in the renderer, an IPC command in the host, work in an engine, the events it emits, and the log lines each produces. The host makes that chain joinable:

- **Tracing uses OpenTelemetry; trace context propagates with W3C Trace Context** ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)). The host opens a span per IPC command invocation; major workflow steps are child spans. The renderer propagates a `traceparent` across the IPC boundary, so the host span is a child of the renderer's action span rather than an orphan.
- **A `correlation_id` ties renderer → host → engine → events → logs.** The renderer creates one per user workflow; the host binds it to the command execution; engine work and the events it emits carry it ([event bus](./event-bus.md)); every log line includes it, plus `trace_id`/`span_id` when tracing is enabled. One user action is reconstructable end to end ([logging framework](../../LOGGING_FRAMEWORK.md)).
- **Errors join the trace.** The error envelope carries the failing command's `correlation_id` ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)), so a UI error joins to host logs and the span ([IPC command surface](./ipc-command-surface.md)).
- **The default posture is local.** Telemetry is captured locally and joined to the local NDJSON log; nothing ships over the network by default, and telemetry must not contain PII ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)).

---

## The IPC timeout SLA

Every IPC command has a bounded response obligation: a command either completes within its budget, returns an `AcceptedJob` for long work ([accepted work and backpressure](./accepted-work-and-backpressure.md)), or returns a timeout error — it does not hang the caller indefinitely. The intent is a per-command timeout SLA that, when exceeded, returns a stable timeout error in the standard envelope and cancels the underlying work ([accepted work and backpressure](./accepted-work-and-backpressure.md)) rather than leaving it running. This bounds the worst case a single command can impose on the renderer thread and on host resources.

---

## Error recovery and the circuit breaker

The host's resilience intent contains a failure to its command and keeps the host up:

- **Error recovery.** An engine call that errors maps to a `HostError` and is contained to its command ([engine wiring](./engine-wiring.md)); the host stays up and other commands continue. A failed accepted job returns partial coverage and a terminal event, not a crash.
- **Circuit breaker.** When an engine repeatedly fails or times out, the host's intent is to _open a circuit_ on that engine's command path — fast-failing subsequent calls with a clear error for a cool-down window rather than piling more work onto a struggling engine, then probing to close the circuit when it recovers. This is the time-based complement to the bulkhead isolation that contains a fault to one engine ([engine wiring](./engine-wiring.md)).

Together these realise the _Denial of service_ posture of the threat model ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)): bounded work, backpressure, timeouts, and circuit breaking mean no single command or struggling engine can exhaust the host.

The trade-off: a circuit breaker can fast-fail a call that _would_ have succeeded had it waited, and a timeout can cancel work that was nearly done. The architecture accepts those occasional false trips because the alternative — unbounded waits and retries against a failing engine — degrades the whole process, and a fast, clear failure is recoverable where a hung host is not.

---

## Worked example — tracing an artefact execution to a failure

A user runs an artefact; the renderer emits `ui_workflow_started` with `correlation_id=c1` and a `traceparent`. The host opens a span as that trace's child, logs `command_invoked` with `c1`, and routes to Praxis via the harness. Praxis triggers a rebuild whose events carry `c1`. If the underlying engine call exceeds its timeout SLA, the host cancels the work, returns a timeout error envelope carrying `c1`, and — if this engine has been failing repeatedly — opens its circuit so the next calls fast-fail for a cool-down. Every line, event, and the error are joinable by `c1` and the trace, so the failure is reconstructable end to end.

---

## References & standards

_Normative:_

- **OpenTelemetry**; W3C — **Trace Context** ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)). The tracing model and propagation format.

## Related documents

| Document                                                              | What it covers                                                  |
| --------------------------------------------------------------------- | --------------------------------------------------------------- |
| [ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md) | OpenTelemetry and W3C Trace Context across the IPC seam.        |
| [Logging framework](../../LOGGING_FRAMEWORK.md)                       | Structured logging, correlation IDs, and metrics.               |
| [ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)          | The error envelope carrying `correlation_id`.                   |
| [Engine wiring](./engine-wiring.md)                                   | Bulkhead isolation, the spatial complement to circuit breaking. |
| [Accepted work and backpressure](./accepted-work-and-backpressure.md) | Backpressure and cancellation in the resilience posture.        |
| [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)        | The Denial-of-service posture these controls realise.           |
