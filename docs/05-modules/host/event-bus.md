# Event bus

How the host pushes events to the renderer, the events it emits, and the rule that the renderer must tolerate missed events. For a reader subscribing to host events or adding a new one.

The event model is part of the accepted-work contract ([ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)); the host owns event publication ([dependency rules](../../01-architecture/boundary/dependency-rules.md)).

---

## Host → renderer events

The host emits Tauri events to the renderer without the renderer polling. Renderer adapters subscribe in one place.

| Event                                   | Payload              |
| --------------------------------------- | -------------------- |
| `setup.backend_ready`                   | —                    |
| `workspace_opened`                      | workspace id         |
| `workspace_closed`                      | workspace id         |
| `mneme_change_event` (per subscription) | `ChangeEvent`        |
| `job.updated`                           | job metadata         |
| `job.completed`                         | job result reference |
| `integrity.warning`                     | rule + entities      |

Events carry the `correlation_id` of the workflow that produced them, so an event joins to the host span and log lines of the command that triggered it ([observability](./observability.md), [ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)). Engine work and the events it emits carry the same `correlation_id` as the command that started it.

---

## The missed-event rule

> The renderer **must** tolerate missed events. Fallback polling is permitted only as a safety net, not the primary update mechanism.

Events are the primary update channel — they are how the renderer learns a job progressed, a workspace opened, or an integrity warning fired — but a delivery is not guaranteed to be seen (a window may have been backgrounded, a subscription may have just attached). The renderer is therefore built to reconcile from a queryable source when it suspects it missed an event: it polls job state via the read commands as a backstop ([accepted work and backpressure](./accepted-work-and-backpressure.md)), and it treats the canonical store, reached through commands, as the truth an event merely _hints_ at. This mirrors the file-watching rule — a watch is a hint, re-read to validate ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).

The trade-off: building every renderer surface to reconcile from a query, not to trust an event stream as complete, is more work than assuming reliable delivery. The architecture accepts that because an event channel that the UI _assumed_ was lossless would show stale or missing state the moment one event was dropped, and honest state is a product obligation ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)).

---

## Worked example — a change event drives an integrity warning

A user commits a change via `praxis_task_apply_operations` with `correlation_id=c1`. The host appends the operations, emits a `mneme_change_event` to subscribers of that partition, and — because the change lowered a capability's integrity below the gate threshold — emits an `integrity.warning` carrying the rule and the affected entities, both stamped `c1`. The renderer updates its view from the change event; if the window had been backgrounded and missed the `integrity.warning`, the renderer reconciles on focus by querying the current integrity head, so the warning surfaces regardless of whether the event was seen.

---

## Related documents

| Document                                                                   | What it covers                       |
| -------------------------------------------------------------------------- | ------------------------------------ |
| [Accepted work and events](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) | The full event and job-state schema. |
| [Observability](./observability.md)                                        | The correlation IDs events carry.    |
| [Accepted work and backpressure](./accepted-work-and-backpressure.md)      | Fallback polling as a safety net.    |
| [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)   | Events over IPC; watch-as-hint.      |
| [Workspace lifecycle](./workspace-lifecycle.md)                            | The lifecycle events emitted here.   |
