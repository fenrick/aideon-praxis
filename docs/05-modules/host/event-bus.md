# Event bus

How the host pushes events to the renderer, the events it emits, and the rule that the renderer must tolerate missed
events. For a reader subscribing to host events or adding a new one.

The event model is part of the accepted-work contract
([ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)); the host owns event publication
([dependency rules](../../01-architecture/boundary/dependency-rules.md)).

---

## Host → renderer events

The host emits Tauri events to the renderer without the renderer polling. Renderer adapters subscribe in one place.

| Event                                   | Payload                                                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `setup.backend_ready`                   | —                                                                                                                                     |
| `workspace.lifecycle.changed`           | `{ workspace_id, state, job_id?, error_code?, canonical_tail, replay_head?, mode }` ([workspace-lifecycle](./workspace-lifecycle.md)) |
| `mneme_change_event` (per subscription) | `ChangeEvent`                                                                                                                         |
| `job.updated`                           | job metadata                                                                                                                          |
| `job.completed`                         | job result reference                                                                                                                  |
| `integrity.warning`                     | rule + entities                                                                                                                       |

Events carry the `correlation_id` of the workflow that produced them, so an event joins to the host span and log lines
of the command that triggered it ([observability](./observability.md),
[ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)). Engine work and the events it emits carry the
same `correlation_id` as the command that started it.

---

## Event scoping (window-targeted by default)

> Host events are **window-scoped by default**. Run, step, job, workspace-lifecycle, readiness, and accepted-work events
> are emitted to the **owning workspace window** using `emit_to` (or the equivalent window-targeted mechanism) — not
> broadcast. **Broadcast is reserved for genuinely app-wide signals**, such as setup completion (`setup.backend_ready`)
> or global host-health changes. A window may subscribe once and filter by `run_id` **within its own scoped event
> stream**, but it must not receive another window's workspace job progress by default.

This preserves the same trust shape as the command side: if a window cannot invoke a command, it must not automatically
receive operational metadata about that command's jobs. Per-window scoping is the primary control against spoofing and
elevation of privilege ([capabilities-and-csp](./capabilities-and-csp.md),
[ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)); although M0 progress events are mostly activity
metadata, later events will carry workspace ids, paths, actor references, diagnostics, and error codes — starting scoped
avoids a later security clean-up. Any cross-window monitor (e.g. the `status` window's "event subscription" grant) is an
**explicit, capability-granted exception**, never the default broadcast.

---

## The missed-event rule

> The renderer **must** tolerate missed events. Fallback polling is permitted only as a safety net, not the primary
> update mechanism.

Events are the primary update channel — they are how the renderer learns a job progressed, a workspace opened, or an
integrity warning fired — but a delivery is not guaranteed to be seen (a window may have been backgrounded, a
subscription may have just attached). The renderer is therefore built to reconcile from a queryable source when it
suspects it missed an event: it polls job state via the read commands as a backstop
([accepted work and backpressure](./accepted-work-and-backpressure.md)), and it treats the canonical store, reached
through commands, as the truth an event merely _hints_ at. This mirrors the file-watching rule — a watch is a hint,
re-read to validate ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).

The trade-off: building every renderer surface to reconcile from a query, not to trust an event stream as complete, is
more work than assuming reliable delivery. The architecture accepts that because an event channel that the UI _assumed_
was lossless would show stale or missing state the moment one event was dropped, and honest state is a product
obligation ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)).

---

## Worked example — a change event drives an integrity warning

A user commits a change via `praxis_task_apply_operations` with `correlation_id=c1`. The host appends the operations,
emits a `mneme_change_event` to subscribers of that partition, and — because the change lowered a capability's integrity
below the gate threshold — emits an `integrity.warning` carrying the rule and the affected entities, both stamped `c1`.
The renderer updates its view from the change event; if the window had been backgrounded and missed the
`integrity.warning`, the renderer reconciles on focus by querying the current integrity head, so the warning surfaces
regardless of whether the event was seen.

---

## Related documents

| Document                                                                   | What it covers                       |
| -------------------------------------------------------------------------- | ------------------------------------ |
| [Accepted work and events](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) | The full event and job-state schema. |
| [Observability](./observability.md)                                        | The correlation IDs events carry.    |
| [Accepted work and backpressure](./accepted-work-and-backpressure.md)      | Fallback polling as a safety net.    |
| [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)   | Events over IPC; watch-as-hint.      |
| [Workspace lifecycle](./workspace-lifecycle.md)                            | The lifecycle events emitted here.   |
