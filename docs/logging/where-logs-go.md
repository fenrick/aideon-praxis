# 5. Where logs go

The single local source of truth for production diagnostics, the per-OS paths it lands in, how it is centralised, and how it rotates. Part of the [logging standard](./README.md).

The single local source of truth **must** be the Tauri application log file in the OS log directory (LogDir). Rust logs **must** be written via the official Tauri logging plugin into LogDir; WebView logs **must** be forwarded into the same pipeline ([how to log in the WebView](./webview-renderer.md)).

---

## 5.1 Per-OS LogDir paths

The Tauri logging plugin resolves LogDir per platform. For an app whose identifier is `<bundle-id>` (and product name `<app>`), the production log files land in:

| OS      | LogDir                                                                   | Example                                                  |
| ------- | ------------------------------------------------------------------------ | -------------------------------------------------------- |
| macOS   | `~/Library/Logs/<bundle-id>/`                                            | `~/Library/Logs/com.aideon.desktop/`                     |
| Windows | `%LOCALAPPDATA%\<bundle-id>\logs\`                                       | `C:\Users\<user>\AppData\Local\com.aideon.desktop\logs\` |
| Linux   | `$XDG_DATA_HOME/<bundle-id>/logs/` or `~/.local/share/<bundle-id>/logs/` | `~/.local/share/com.aideon.desktop/logs/`                |

These follow the platform conventions the Tauri plugin's `LogDir` target uses; the resolved path is reported in the support bundle ([§5.3](#53-support-bundles)) so a supporter never has to guess it. Do not hard-code these paths in application code — read them from the plugin's path API.

## 5.2 Centralisation — the central collector

Centralisation **must** be handled by a log collector/agent reading the local NDJSON file and shipping it to the log platform. The application **must not** implement bespoke network log shipping unless a documented requirement exists ([ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md), local-by-default posture).

Use **Vector** or **Fluent Bit** (or an equivalent). The collector is configured to:

- **tail the LogDir NDJSON file** (the per-OS path above), not stdout, so it survives app restarts;
- **parse each line as JSON** and pass the contract fields through unchanged — the collector does not re-shape the schema;
- **never re-introduce PII** — it ships exactly what the app wrote, after the app's own redaction ([privacy and redaction](./privacy-and-redaction.md));
- **carry the trace identifiers** (`trace_id`, `span_id`, `correlation_id`) so the platform can join logs to traces.

Sketch of a Vector source/sink (illustrative, not a committed config):

```toml
[sources.aideon_logs]
type = "file"
include = ["~/Library/Logs/com.aideon.desktop/*.log"]   # per-OS LogDir
[transforms.parse]
type = "remap"
inputs = ["aideon_logs"]
source = '. = parse_json!(.message)'
[sinks.platform]
type = "..."          # the log platform; deployment choice
inputs = ["parse"]
```

The collector and backend are a deployment concern, swappable; the only fixed contract is that the app writes NDJSON to LogDir.

## 5.3 Retention and rotation

- The application **must** keep logs bounded in size.
- Prefer the logging plugin's own rotation. If unavailable, implement a deterministic file-level policy (max size + max files) without affecting runtime stability.
- Minimum acceptable policy for production builds: **max file size 10–50 MB, max files 5–20.**
- Rotation **must** be tested for disk-full, permission-denied, and concurrent-write conditions ([testing and quality gates](./testing-and-quality-gates.md)).

## 5.4 Support bundles

The application **must** be able to produce a support bundle containing the latest log files, the build version/commit, platform info, the resolved LogDir path, and a timestamp. The bundle **must not** include secrets or raw user content ([privacy and redaction](./privacy-and-redaction.md)).

---

## References & standards

_Normative:_

- **Tauri logging plugin (v2)** — the LogDir sink and JS log API (the local-truth file).
- **Vector** / **Fluent Bit** — the central-collector agent reading the local NDJSON ([standards register](../02-standards/STANDARDS-REGISTER.md), Observability).

## Related documents

| Document                                                              | What it covers                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [README.md](./README.md)                                              | Non-negotiables: logs captured from both layers and centralisable. |
| [privacy-and-redaction.md](./privacy-and-redaction.md)                | What the collector must never re-introduce.                        |
| [operational-edge-cases.md](./operational-edge-cases.md)              | Disk-full and permission-denied behaviour.                         |
| [ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) | The local-by-default trust posture.                                |
