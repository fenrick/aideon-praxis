# Capabilities and CSP

How the host enforces the trust boundary in mechanism: Tauri capabilities, the permission bundle, the content-security policy, and the filesystem boundary. For a reader who needs to know what is allowed across the seam and where it is declared.

These mechanisms realise the decisions in [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) and the controls in [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md).

---

## Capabilities and permissions

Capabilities are declared in `src-tauri/capabilities/default.json` and cover all six window labels (`splash`, `main`, `settings`, `about`, `status`, `styleguide`). The active permission set is the `appcommands` bundle defined in `src-tauri/permissions/appcommands.toml`.

Every IPC command **must** appear in `appcommands.toml`; a command absent from the bundle is denied at the Tauri layer before the Rust handler is reached. This is default-deny: a command exists to the renderer only if it is explicitly allowed.

| Capability plugin | Purpose                                                                           |
| ----------------- | --------------------------------------------------------------------------------- |
| `core:default`    | Window, webview, app, and event primitives                                        |
| `appcommands`     | The full Aideon command surface ([IPC command surface](./ipc-command-surface.md)) |
| `log:default`     | Structured logging from the renderer                                              |
| `dialog:default`  | Native file and confirmation dialogs                                              |
| `opener:default`  | Open files or URLs in the OS default handler                                      |

The renderer gets **product** capabilities — narrow named commands — not **host** capabilities; there is no raw recursive filesystem access, shell execution, or plugin power unless a narrow case justifies it ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). Per-window scoping is the primary control against a window claiming a capability it lacks (the STRIDE _Spoofing_ and _Elevation of privilege_ categories — [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)).

---

## Content security policy

Production builds enforce a strict CSP. Remote assets are forbidden; dev-only exceptions exist only in debug builds. The renderer **must not** add `<script>` tags or dynamic imports from external origins. A strict CSP is what keeps an injected or tampered asset from loading hostile code into the WebView — a _Tampering_ control at the boundary.

---

## The filesystem boundary

The renderer never receives a filesystem path. The host resolves workspace storage roots per OS:

| Platform | Root                                         |
| -------- | -------------------------------------------- |
| macOS    | `~/Library/Application Support/AideonPraxis` |
| Windows  | `%APPDATA%\AideonPraxis`                     |
| Linux    | `~/.local/share/aideon`                      |

The `AIDEON_TEST_DATA_DIR` environment variable overrides the root in test and CI contexts. Because path resolution is the host's alone, a compromised renderer cannot name a path to read or write — it can only invoke a named command, which resolves paths inside the boundary ([workspace lifecycle](./workspace-lifecycle.md)).

---

## The trade-off named

Default-deny capabilities and a strict CSP close a door: adding renderer functionality is never free — a new capability is a new command in `appcommands.toml` and a new entry in the threat model. The architecture accepts that friction because every command that exists is a command that was deliberately allowed, which is exactly the property a release verified against OWASP ASVS 5.0 needs ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)).

---

## Related documents

| Document                                                                 | What it covers                                       |
| ------------------------------------------------------------------------ | ---------------------------------------------------- |
| [Process and trust boundary](./process-and-trust-boundary.md)            | Why the renderer is untrusted.                       |
| [IPC command surface](./ipc-command-surface.md)                          | The commands the `appcommands` bundle allows.        |
| [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) | The trust boundary and product-vs-host capabilities. |
| [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)           | The STRIDE categories these controls cover.          |
| [SECURITY.md](../../02-standards/SECURITY.md)                            | CSP, capability policy, and the ASVS mapping.        |
