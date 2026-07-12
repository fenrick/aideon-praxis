# 6. The event catalogue

The mandatory events, by category. These are definition statements, not examples: each event listed **must** be emitted
at the stated severity when its condition occurs. Part of the [logging standard](./README.md). Every event carries the
[log-record contract](./log-record-contract.md) fields, including `correlation_id`.

---

## 6.1 Lifecycle

- `app_start` (Notice) — include build + platform + `session_id`
- `app_ready` (Info) — the UI is interactive
- `app_shutdown` (Notice) — the normal exit path
- `app_crash_detected` (Alert) — startup found evidence of a prior abnormal termination

## 6.2 Configuration and migration

- `config_loaded` (Info)
- `migration_start` (Notice)
- `migration_step` (Notice) — include `migration.name`, `migration.step`
- `migration_complete` (Notice)
- `migration_failed` (Critical) — the app cannot continue safely

## 6.3 Persistence and state

- `state_opened` (Info)
- `state_corrupt_detected` (Alert)
- `state_repair_started` (Notice)
- `state_repair_completed` (Notice)
- `state_repair_failed` (Critical)

## 6.4 User command boundary

For every invokable command
([correlation and tracing §4.5](./correlation-and-tracing.md#45-command-boundary-behaviour-mandatory)):

- `command_invoked` (Info)
- `command_completed` (Info)
- `command_failed` (Error)

If the command triggers a multi-step workflow, also emit `workflow_step` (Info/Notice) with `workflow.name`,
`workflow.step`, and an `elapsed_ms` where available.

## 6.5 Background work and retries

- `job_started` (Info), `job_completed` (Info), `job_failed` (Error)
- `retry_scheduled` (Warning) — include `retry.count`, `retry.delay_ms`
- `retry_exhausted` (Alert)

## 6.6 Network and external dependencies

- `network_state_changed` (Notice) — include `network.state` (`online` / `offline` / `degraded`)
- `request_failed` (Warning/Error) — include `http.status` if present and `error.kind`

Do not log URLs with embedded tokens or query parameters that may contain PII
([privacy and redaction](./privacy-and-redaction.md)).

## 6.7 Security and permission boundaries

- `permission_denied` (Warning) — include `permission.name`
- `capability_blocked` (Warning) — include `capability.name`

## 6.8 UI

- `ui_error_shown` (Error) — only when the user sees an error; include `ui_surface` and `user_impact`
- `ui_workflow_started` (Info)
- `ui_workflow_completed` (Info)

UI events **must** carry `correlation_id` and **must** forward to the same log file.

## 6.9 Anti-patterns (MUST NOT)

- logging per-frame render activity
- logging polling ticks
- logging large payloads by default
- logging full request/response bodies or UI-state snapshots

---

## Related documents

| Document                                                   | What it covers                                         |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| [log-record-contract.md](./log-record-contract.md)         | The fields every event carries.                        |
| [correlation-and-tracing.md](./correlation-and-tracing.md) | The command-boundary events and the correlation chain. |
| [rust-host.md](./rust-host.md)                             | How the host emits these events.                       |
| [webview-renderer.md](./webview-renderer.md)               | How the renderer emits the UI events.                  |
