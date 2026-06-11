# Usage telemetry

Usage telemetry is opt-in, secret-free event emission that helps understand how the product behaves in use — which workflows run, where errors surface, how long jobs take. It is not analytics over the twin, and it is not a second event-sourcing system. This document sets out the posture, the privacy rules, the two places telemetry may originate, and the bounded event families it carries.

> **Implementation status.** Parts of the emission path described here are **design intent**; the event families and the minimum shape are the specification the implementation conforms to. The structured-logging contract telemetry rides on is normative now — see [LOGGING_FRAMEWORK.md](../../LOGGING_FRAMEWORK.md).

---

## Posture — opt-in by default

No telemetry is emitted by default. A user or a deployment configuration must explicitly enable it; until then, nothing leaves the device for this purpose. This matches the host's local-first posture: telemetry is captured locally and joined to the local NDJSON log file, and the application does not ship it over the network by default ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md); [LOGGING_FRAMEWORK.md §5](../../LOGGING_FRAMEWORK.md)). Remote export is a documented deployment choice, never an assumed one.

The trade-off is named: opt-in telemetry means the product ships with less visibility into real usage than an always-on scheme would give, and aggregate behaviour is only observable for the population that opts in. The design accepts that cost rather than emit anything a user has not agreed to.

---

## Privacy and secret rules

Telemetry must carry less than logs, not more. The following rules are obligations, not preferences.

- **No secrets.** No keys, tokens, passwords, credentials, or seed phrases appear in any payload, ever. Redaction happens before the event is constructed, not after ([LOGGING_FRAMEWORK.md §10](../../LOGGING_FRAMEWORK.md)).
- **No PII by default.** Personal data is excluded by default. A `user_context` field is included only when deployment policy explicitly permits it, and even then it must never carry secrets.
- **Correlation IDs, not free text.** Events tie together by `correlation_id` ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)), not by free-text descriptions that can leak content. A `correlation_id` must not contain PII.
- **Bounded event families.** The event families are a fixed, enumerated set (below). There are no unbounded streams and no event without a declared consumer.

---

## Two emitters, and only two

Telemetry originates from exactly two places. No other code path emits it, and there are no third-party browser trackers.

1. **The Tauri host (Rust).** Host-level events — accepted-work lifecycle, IPC errors, application session milestones. The host is the trust boundary ([Host](../../05-modules/host/README.md)) and the enforcement point for the opt-in gate.
2. **The renderer (TypeScript), through an injectable sink.** UI interaction events are emitted to a sink rather than to the network directly. The renderer must not make HTTP calls to external endpoints for telemetry. The sink's default in development is the console; any production emission requires a **host-provided sink**, and that sink enforces the opt-in gate. The renderer therefore cannot emit production telemetry without the host's consent, by construction.

This keeps the trust boundary intact: the renderer proposes events, the host decides whether any leave the device, and the gate lives on the trusted side ([ADR-0006, via ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)).

---

## Minimum event shape

Every telemetry event conforms to this minimum shape. Fields beyond it belong to a specific event family and stay stable across releases.

```typescript
{
  event_type:     string;          // stable identifier, e.g. "job.accepted"
  occurred_at:    string;          // ISO-8601, UTC
  correlation_id: string;          // ties related events together; no PII
  workspace_id?:  string;          // non-PII identifier, where relevant
  scenario_id?:   string;          // where relevant
  user_context?:  object | null;   // only when policy permits; never secrets
}
```

`correlation_id` is the same identifier that threads the logs and the trace for a user action ([LOGGING_FRAMEWORK.md §4](../../LOGGING_FRAMEWORK.md); W3C Trace Context, via [ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)), so a telemetry event joins to the host span and the log lines for the same workflow.

---

## Event families

### Host / Tauri events

| `event_type`        | Emitted when                                                   |
| ------------------- | -------------------------------------------------------------- |
| `job.accepted`      | An analytics or other heavy job enters the accepted-work queue |
| `job.completed`     | A job completes successfully                                   |
| `job.failed`        | A job fails with an error code                                 |
| `app.session_start` | An application session begins                                  |
| `ipc.error`         | A typed IPC command returns a structured error                 |

### Renderer events

| `event_type`             | Emitted when                                      |
| ------------------------ | ------------------------------------------------- |
| `template.change`        | Template selection changed                        |
| `template.create_widget` | A widget is added from the registry               |
| `selection.change`       | Selection updated — counts only, never entity IDs |
| `time.cursor`            | The time context (viewpoint coordinate) changed   |
| `inspector.save`         | A property save is dispatched                     |
| `error.ui`               | A user-visible error banner is shown              |

The accepted-work events (`job.*`) and the `ipc.error` event correspond to the host work and error contract ([ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)); they observe rather than replace it.

---

## Non-goals

- **Do not duplicate Metis output.** An analytical result ([metis-analytics.md](./metis-analytics.md)) must never be copied into a telemetry payload; telemetry counts that a ranking was requested, not what it contained.
- **Do not store raw PII or secrets by default.** The privacy rules above are absolute for the default posture.
- **Do not create unbounded streams.** Every event family is enumerated and has a declared consumer; per-frame, per-tick, and large-payload events are forbidden ([LOGGING_FRAMEWORK.md §6.9](../../LOGGING_FRAMEWORK.md)).
- **Do not become a second event-sourcing system.** The op log is the canonical history of the twin; telemetry is diagnostic and behavioural, and is never canonical.

---

## Worked example — accepted analytics job, end to end

A user runs the blast-radius analysis on `Stream Processor` ([metis-analytics.md](./metis-analytics.md)). With telemetry enabled, the renderer creates a `correlation_id` for the workflow and emits `template.change` if the surface switched. The host accepts the job and emits `job.accepted` with that same `correlation_id` and the `workspace_id`; when Metis finishes it emits `job.completed`. Every event carries the one `correlation_id`, so the telemetry, the host span, and the NDJSON log lines for this single action join end to end ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)). No entity IDs from the impact set appear in any payload — the analytical content stays out of telemetry, and the `selection.change` event, if emitted, carries counts only.

---

## References & standards

_Normative:_

- **OpenTelemetry**; W3C — **Trace Context**. Correlation and trace propagation across the IPC boundary, so telemetry joins logs and traces.

_Informative:_

- **RFC 5424** (Syslog severities), via the logging framework's severity model.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                      | What it covers                                                                   |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [LOGGING_FRAMEWORK.md](../../LOGGING_FRAMEWORK.md)                            | The structured-logging, correlation, and privacy standard telemetry conforms to. |
| [ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)         | Observability and the W3C Trace Context propagation telemetry uses.              |
| [Host module README](../../05-modules/host/README.md)                         | The trust boundary that gates emission and provides the renderer sink.           |
| [ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) | The job and event contract the `job.*` events observe.                           |
| [metis-analytics.md](./metis-analytics.md)                                    | The analytics engine telemetry must not duplicate.                               |
