# 13. Testing logging, and the release gates

How logging is tested, and the gates a change must clear before it is complete. Part of the
[logging standard](./README.md). Logging is a contract; like any contract, it is tested rather than assumed.

---

## Testing logging

- **Contract conformance.** A test asserts that emitted records carry the
  [required fields](./log-record-contract.md#31-required-fields) — `component`, `event_name`, `syslog.severity`,
  `correlation_id`, `session_id`, `source` — and that severity maps to the library level correctly
  ([§2.1](./README.md#21-mapping-to-logger-levels-mandatory)).
- **Schema/parse.** A test parses produced lines as JSON and confirms they are valid NDJSON the
  [central collector](./where-logs-go.md) can ingest.
- **Source attribution.** A test confirms Rust records resolve to the true file/line/module, not a helper
  ([source attribution](./log-record-contract.md#9-source-attribution)).
- **Redaction.** A test asserts that any approved sensitive field is redacted on the written line, per the
  [redaction-review process](./privacy-and-redaction.md#103-the-redaction-review-process). Redaction is a gate, not a
  hope.
- **Line size.** A test confirms an over-size record is truncated to the contract fields with `truncated: true`, never
  written whole ([§3.4](./log-record-contract.md#34-field-design-rules-and-line-size-enforcement)).
- **Failure modes.** Rotation is tested for disk-full, permission-denied, and concurrent writes
  ([where logs go §5.3](./where-logs-go.md#53-retention-and-rotation)); the panic hook is tested to emit one safe record
  and fall back to stderr ([rust-host §7.5](./rust-host.md#75-the-panic-hook)).
- **End-to-end correlation.** A test reconstructs one full workflow — renderer action → host command → engine work →
  events → result — by `correlation_id`, confirming the chain holds across the IPC seam
  ([correlation and tracing §4.4](./correlation-and-tracing.md#44-the-correlation-chain-renderer--host--engine--events--logs)).

## Release gates

A change touching logging is not complete until:

1. operational events include `component`, `event_name`, `syslog.severity`, and `correlation_id`;
2. source attribution is correct (Rust file/line/module not collapsed to a helper);
3. logs are NDJSON and can be ingested by the central collector;
4. redaction rules are verified by test;
5. line-size enforcement is verified;
6. at least one end-to-end workflow can be reconstructed using `correlation_id` (the gate
   [ADR-0019](../06-adrs/ADR-0019-observability-and-trace-context.md) satisfies through W3C Trace Context propagation).

---

## Appendix A: example log records (NDJSON)

Lifecycle start:

```json
{
  "timestamp": "2026-01-20T10:12:33.123Z",
  "level": "INFO",
  "syslog.severity": 5,
  "syslog.severity_text": "Notice",
  "message": "Application started",
  "component": "core",
  "event_name": "app_start",
  "correlation_id": "startup",
  "session_id": "7c8b3e2f-8d4d-4f5b-9a6e-2b2c2a7f7f2c",
  "source": { "layer": "rust", "module": "app::startup", "file": "src/main.rs", "line": 42 },
  "build": { "version": "1.4.0", "commit": "abc123" },
  "platform": { "os": "windows", "arch": "x86_64" }
}
```

Command failure (joinable to the UI error below by `correlation_id`):

```json
{
  "timestamp": "2026-01-20T10:13:10.002Z",
  "level": "ERROR",
  "syslog.severity": 3,
  "syslog.severity_text": "Error",
  "message": "Command failed",
  "component": "workspace",
  "event_name": "command_failed",
  "correlation_id": "b4c3c2d1-0a12-4c2d-9c77-1e9d2b0d5f3a",
  "session_id": "7c8b3e2f-8d4d-4f5b-9a6e-2b2c2a7f7f2c",
  "source": {
    "layer": "rust",
    "module": "workspace::open",
    "file": "src/workspace.rs",
    "line": 118
  },
  "error": {
    "kind": "workspace_open_failed",
    "message": "Workspace metadata is invalid",
    "cause": "io_error: permission denied"
  },
  "user_impact": "blocked",
  "ui_surface": "dialog"
}
```

UI error shown (same `correlation_id`):

```json
{
  "timestamp": "2026-01-20T10:13:10.110Z",
  "level": "ERROR",
  "syslog.severity": 3,
  "syslog.severity_text": "Error",
  "message": "User-visible error displayed",
  "component": "ui",
  "event_name": "ui_error_shown",
  "correlation_id": "b4c3c2d1-0a12-4c2d-9c77-1e9d2b0d5f3a",
  "session_id": "7c8b3e2f-8d4d-4f5b-9a6e-2b2c2a7f7f2c",
  "source": { "layer": "webview", "module": "ui/workspace/open.ts", "function": "onOpenWorkspace" },
  "error": { "kind": "workspace_open_failed", "message": "Workspace could not be opened" },
  "user_impact": "blocked",
  "ui_surface": "dialog"
}
```

The two error records share `correlation_id=b4c3c2d1-…`, so the UI error and the host failure join into one
reconstructable workflow.

---

## Related documents

| Document                                                           | What it covers                              |
| ------------------------------------------------------------------ | ------------------------------------------- |
| [log-record-contract.md](./log-record-contract.md)                 | The fields the conformance test checks.     |
| [correlation-and-tracing.md](./correlation-and-tracing.md)         | The chain the end-to-end test reconstructs. |
| [privacy-and-redaction.md](./privacy-and-redaction.md)             | The redaction the gate verifies.            |
| [ADR-0019](../06-adrs/ADR-0019-observability-and-trace-context.md) | The propagation that satisfies gate 6.      |
