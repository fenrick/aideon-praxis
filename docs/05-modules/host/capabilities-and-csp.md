# Capabilities and CSP

How the host enforces the trust boundary in mechanism: Tauri capabilities, the permission bundle, the content-security
policy, and the filesystem boundary. For a reader who needs to know what is allowed across the seam and where it is
declared.

These mechanisms realise the decisions in [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) and
the controls in [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md).

---

## Capabilities and permissions

Capabilities are declared in `src-tauri/capabilities/default.json` and cover all six window labels (`splash`, `main`,
`settings`, `about`, `status`, `styleguide`). The active permission set is the `appcommands` bundle defined in
`src-tauri/permissions/appcommands.toml`.

Every IPC command **must** appear in `appcommands.toml`; a command absent from the bundle is denied at the Tauri layer
before the Rust handler is reached. This is default-deny: a command exists to the renderer only if it is explicitly
allowed.

| Capability plugin | Purpose                                                                           |
| ----------------- | --------------------------------------------------------------------------------- |
| `core:default`    | Window, webview, app, and event primitives                                        |
| `appcommands`     | The full Aideon command surface ([IPC command surface](./ipc-command-surface.md)) |
| `log:default`     | Structured logging from the renderer                                              |
| `dialog:default`  | Native file and confirmation dialogs                                              |
| `opener:default`  | Open files or URLs in the OS default handler                                      |

The renderer gets **product** capabilities — narrow named commands — not **host** capabilities; there is no raw
recursive filesystem access, shell execution, or plugin power unless a narrow case justifies it
([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). Per-window scoping is the primary control
against a window claiming a capability it lacks (the STRIDE _Spoofing_ and _Elevation of privilege_ categories —
[ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)).

### Per-window command scoping

Mutating and accepted-work commands are granted **only to the workspace-bearing window** (`main`); read surfaces are
granted by least-privilege per window, not blanket-granted, because even reads can expose workspace paths, actor
details, model content, or diagnostics. A child window opened from `main` does **not** inherit `main`'s grants — it
receives its own explicit capability label.

**Event delivery follows the same scoping as commands.** Run, step, job, lifecycle, readiness, and accepted-work events
are **window-scoped by default** (emitted to the owning workspace window, not broadcast); a window that cannot invoke a
command must not automatically receive operational metadata about its jobs. The `status` window's "event subscription"
entry below is an **explicit, capability-granted exception**, not the default. Broadcast is reserved for app-wide
signals (setup/health). See [host event-bus](./event-bus.md).

| Window                | Permitted command surface                                                          |
| --------------------- | ---------------------------------------------------------------------------------- |
| `main` (workspace)    | Workspace reads, supported writes, accepted jobs, rebuild controls                 |
| `splash`              | Minimal readiness / start-up status only                                           |
| `about`               | Static application/version information                                             |
| `status`              | Job-status reads and event subscription only — not job start/cancel unless granted |
| `styleguide`          | No host model commands                                                             |
| recovery (if present) | Explicit recovery commands only (and the high-privilege import/`ingest_ops` path)  |

Two M0 consequences of this model:

- **Deferred-feature commands are omitted from every M0 bundle.** `create_scenario`/`delete_scenario` (scenarios → M2)
  and `or_set_update`/`counter_update` (CRDT → M6) are not in any window's `appcommands` set, so an attempt is a
  capability denial **before** the Rust handler — distinct from `UNSUPPORTED_FEATURE`, which is for an authorised
  command a workspace/engine version cannot satisfy
  ([mvp-command-registry](../../build-contracts/mvp-command-registry.md)).
- **`ingest_ops` is not an ordinary authoring grant.** Because it admits already-minted canonical envelopes verbatim
  (identity, asserted time, provenance), it sits behind a separate high-privilege capability for an
  internal/recovery/import path only — never `main`'s general authoring components
  ([ADR-0038](../../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)). Ordinary authoring
  constructs intents the host validates into _new_ operations.

---

## Content security policy

Production builds enforce a strict CSP. Remote assets are forbidden; dev-only exceptions exist only in debug builds. The
renderer **must not** add `<script>` tags or dynamic imports from external origins. A strict CSP is what keeps an
injected or tampered asset from loading hostile code into the WebView — a _Tampering_ control at the boundary.

---

## The filesystem boundary

The renderer never receives a filesystem path. The host resolves workspace storage roots per OS:

| Platform | Root                                         |
| -------- | -------------------------------------------- |
| macOS    | `~/Library/Application Support/AideonPraxis` |
| Windows  | `%APPDATA%\AideonPraxis`                     |
| Linux    | `~/.local/share/aideon`                      |

The `AIDEON_TEST_DATA_DIR` environment variable overrides the root in test and CI contexts. Because path resolution is
the host's alone, a compromised renderer cannot name a path to read or write — it can only invoke a named command, which
resolves paths inside the boundary ([workspace lifecycle](./workspace-lifecycle.md)).

---

## Artefact execution under the capability model

An executing [artefact](../../03-design/artefacts/README.md) needs no capability of its own, because it never crosses
the seam in either direction as code. The renderer invokes a narrow named command — `praxis_artefact_execute_graph`,
`_catalogue`, `_matrix`, and the like ([IPC command surface](./ipc-command-surface.md)) — which is allowed in
`appcommands.toml` like any other command, default-deny. The command routes to Praxis behind its trait; Praxis reads the
twin and returns a result that is **data, not instructions**
([artefact execution boundary](../../01-architecture/boundary/artefact-execution-boundary.md),
[ADR-0033](../../06-adrs/ADR-0033-artefact-execution-model.md)).

Three properties of the capability model bound what an artefact reaches, with no per-artefact policy:

- **The engine has no host capabilities.** Praxis resolves no filesystem path and opens no socket; path resolution stays
  in the host (the filesystem boundary, above), so an artefact cannot name a file or a network target.
- **The result carries no capability.** Because the result is data the renderer interprets, it cannot invoke a plugin, a
  shell, or another command — the renderer holds only product capabilities, and a result is not one.
- **Blobs are referenced, not inlined.** An artefact result names a blob by `sha256`; the bytes are fetched, if needed,
  through a separate capability-gated command, so a result never smuggles file contents across the seam.

The sandbox is therefore the absence of capability, enforced by construction rather than by configuration. The
boundary's threat analysis is owned by the [security standard](../../02-standards/security/threat-model.md); the
process-side statement of what an artefact may and may not reach is in
[process and trust boundary](./process-and-trust-boundary.md).

## The trade-off named

Default-deny capabilities and a strict CSP close a door: adding renderer functionality is never free — a new capability
is a new command in `appcommands.toml` and a new entry in the threat model. The architecture accepts that friction
because every command that exists is a command that was deliberately allowed, which is exactly the property a release
verified against OWASP ASVS 5.0 needs ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)).

---

## Related documents

| Document                                                                 | What it covers                                       |
| ------------------------------------------------------------------------ | ---------------------------------------------------- |
| [Process and trust boundary](./process-and-trust-boundary.md)            | Why the renderer is untrusted.                       |
| [IPC command surface](./ipc-command-surface.md)                          | The commands the `appcommands` bundle allows.        |
| [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) | The trust boundary and product-vs-host capabilities. |
| [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)           | The STRIDE categories these controls cover.          |
| [ADR-0033](../../06-adrs/ADR-0033-artefact-execution-model.md)           | The read-only artefact-execution model.              |
| [SECURITY.md](../../02-standards/SECURITY.md)                            | CSP, capability policy, and the ASVS mapping.        |
