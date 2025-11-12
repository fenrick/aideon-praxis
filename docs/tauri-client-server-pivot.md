# Tauri Client-Server Pivot Strategy

## Bottom line

Moving to **Svelte (UX) + Rust (host/compute)*- actually *makes the client-server pivot easier\*—provided you keep the renderer
speaking a **single, typed command surface**, and hide locality (local vs remote) behind **Rust service adapters**. Tauri’s
IPC already mirrors client-server message passing (Commands for request/response, Events for pub/sub, Channels for streaming),
so you can swap a local implementation for a remote one without touching the Svelte UI. Lock it down with **Capabilities/
Scopes*- and the\*\*Isolation pattern*- so the security posture holds when you add networking. ([Tauri][1])

## How this helps the transition (renderer stays stable)

**Design seam:** treat every UX action as a call through a small TypeScript port (e.g., `app/praxis-desktop/src/lib/ports/temporal.ts`) → Tauri **Command** → Rust service **trait** (port). You ship two adapters:

- \*_LocalAdapter (default):_- calls in-process Rust modules (graph/time/analytics).
- \*_RemoteAdapter (server mode):_- calls your server over HTTP/2 or WebSocket, then returns the same DTOs.

Because the renderer only knows about the command names and DTOs, you can flip `local ⇄ remote` by config without UI churn.
Tauri’s IPC primitives are designed for this style: **Commands\*- (RPC),**Events*- (fire-and-forget), \*\*Channels*-
(ordered streaming). ([Tauri][2])

Security remains crisp: **Capabilities\*- restrict which windows can invoke which commands/plugins;**Command scopes*-
limit parameters/resources; and the \*\*Isolation pattern*- sanitises/filters messages before Core sees them. ([Tauri][3])

This lines up with your own guardrails: \*no backend logic in renderer, deny-by-default, no renderer HTTP- and a clean
path to cloud/server mode in M5.

## What changes in the full design (assuming Tauri Isolation pattern)

### 1) API surface: Commands as your “internal RPC”

- **Keep the renderer API stable**: e.g. `stateAt`, `diff`, `plateaus`, `tco`. Each is a Tauri \*_Command_- backed by a
- Rust trait (`TemporalEngine`, `Analytics`, `TcoService`).
- Add **capability gating\*- and (optionally)**AppManifest::commands\*- to expose only those commands to the target
  window(s). ([Tauri][3])
- Use \*_Command Scopes_- for fine-grained control (e.g., restrict export paths or host allow-lists). ([Tauri][4])
- Your docs already frame these endpoints and SLOs—keep the DTOs identical for local vs remote.

### 2) Streaming & long-running work

- For progress/results streaming **inside the app**, use \*_Channels_- (ordered, back-pressured) or Events for small
  bursts; avoid dumping giant JSON—stream Arrow bytes or chunked payloads. ([Tauri][1])
- For **server push\*- (notifications, job updates) use the**WebSocket plugin\*- (Rust client exposed to JS) or terminate
  the socket in Rust and forward via Channel to the UI. ([Tauri][5])
- Tauri explicitly notes the Event system isn’t for high-throughput; prefer Channels when throughput/ordering matter. ([Tauri][6])

### 3) Network posture & permissions

- Introduce networking only when you enable **server mode**. Use **Capabilities\*- to allow specific plugins and**remote
  API access\*- (host allow-lists) for the window that needs it; keep others offline. Windows included in multiple
  capabilities **merge privileges**, so isolate admin panes in their own window if needed. ([Tauri][3])
- Avoid the \*_Localhost plugin_- unless you truly need it; it carries explicit security cautions. Prefer Tauri’s custom
  protocol. ([Tauri][7])
- This aligns with your “no open TCP ports in desktop mode” baseline.

### 4) Process model & boundary enforcement

- One \*_Core_- process orchestrates multiple WebViews and routes all IPC—good for centralising auth, rate-limits, and
  telemetry as you go multi-user/server. ([Tauri][8])
- Keep isolation on: validate/normalise incoming messages in the Isolation app before they reach Core; reject unknown
  commands, enforce input schemas, and map to scopes. ([Tauri][9])

### 5) Authn/z & secrets (server mode)

- Terminate OAuth/OIDC in Rust, store tokens in a secure store (e.g., Stronghold plugin), and expose only short-lived
  access to the renderer via **Commands**. Capabilities + permission sets keep this compartmentalised. ([Tauri][3])
- Your roadmap already calls for RBAC, audit, and mTLS—map that into the RemoteAdapter.

## Reference architecture (client ↔ server, unchanged UI)

```bash
Svelte UI
  └─ TypeScript port helpers (invoke)
       └─ Tauri Command: Temporal/Analytics/TCO
            ├─ LocalAdapter (default): Rust modules (graph_core, time_engine, analytics)
            └─ RemoteAdapter (server): HTTP/2 or WS client
                 └─ Channels/Events → UI for progress/updates
```

- \*_Switch_- via config/env: `mode=local|remote`.
- **Same DTOs/SLOs**, so the UX doesn’t care where the work runs. This matches your M5 “flip to server mode” acceptance criteria.

## Concrete design decisions (recommended)

1. **Define ports (traits) once in Rust**
   `trait TemporalEngine { fn state_at(&self, q: StateAt) -> Stream<Chunk>; fn diff(&self, q: Diff) -> Stream<Chunk>; }`
   - \*_LocalEngine_- uses in-process Rust libs (petgraph/polars/etc.).
   - **RemoteEngine\*- uses an HTTP/WebSocket client and**Channels\*- to stream chunks to the UI. ([Tauri][1])

1. \*_Keep DTOs identical_- to your current `/state_at`, `/diff`, `/tco` contracts. Use Arrow for large payloads.

1. **Streaming strategy**
   - UI subscribes to a Channel per long-running command.
   - Server push → WebSocket → Rust → Channel → UI. Events only for small lifecycle signals. ([Tauri][5])

1. **Security controls**
   - Capabilities: per-window, least privilege; add \*_remote API access_- only when in server mode.
   - \*_Command scopes_- for resource paths/host allow-lists; test the deny-paths.
   - Keep Isolation code validating payloads/schemas. ([Tauri][3])
   - This is consistent with your “no renderer HTTP / deny-by-default” standards.

1. **Do \*not- move business invariants into Svelte**
   - Svelte handles view-model shaping, progressive rendering, and local caching only. All rules/time-materialisation/
     analytics stay in Rust so you can relocate them to the server later without re-teaching the UI. (Matches your “renderer
     boundaries”.)

## Risks to watch (and how to mitigate)

- \*_Throughput/latency over IPC:_- Avoid large JSON responses; stream via Channels/Arrow. The docs call this out
  explicitly. ([Tauri][1])
- **Permission creep as you add networking:\*- Capabilities are per window; windows in multiple capabilities **merge
  permissions\*\*—split high-privilege tasks into their own window/webview. ([Tauri][3])
- \*_Localhost plugin misuse:_- tempting for quick wins but documented as risky—prefer custom protocol + scoped
  HTTP/WebSocket clients. ([Tauri][7])

## 10-day pivot plan (keeps momentum)

1. **Day 1–2:\*- Introduce `TemporalEngine`/`Analytics` traits;**LocalAdapter\*- wraps your current Rust code. Wire
   Commands to traits. (Renderer unchanged.)
1. **Day 3–4:\*- Add**Channel-based\*- streaming for `state_at/diff` (progress + chunked results). ([Tauri][1])
1. **Day 5–6:\*- Build**RemoteAdapter*- (HTTP/2 + optional WebSocket). Use\*\*Capabilities*- to allow specific hosts only. ([Tauri][3])
1. \*_Day 7:_- Flip via config flag `mode=remote` and run end-to-end with a stub server.
1. \*_Day 8–10:_- Harden: command scopes, Isolation validators, and tests that prove no renderer HTTP and deny-by-default
   remain in force. ([Tauri][4])

### Why this fits your plan

- Matches M5 goals (_switch local↔remote without code changes_), keeps SLOs/DTOs stable, and respects your renderer
  boundary rules.
- Aligns with Tauri’s **process model\*- (single Core, many WebViews), **IPC primitives**, **Capabilities/Scopes**, and
  **Isolation\*- security story. ([Tauri][8])

If useful, I can draft the Rust trait signatures and a tiny `mode=remote` adapter skeleton (Command → trait → async
Channel → Svelte store) so you can drop it straight into the spike.

[1]: https://v2.tauri.app/develop/calling-rust/ 'Calling Rust from the Frontend - Tauri'
[2]: https://v2.tauri.app/concept/inter-process-communication/ 'Inter-Process Communication - Tauri'
[3]: https://v2.tauri.app/security/capabilities/ 'Capabilities | Tauri'
[4]: https://v2.tauri.app/security/scope/ 'Command Scopes - Tauri'
[5]: https://v2.tauri.app/plugin/websocket/ 'Websocket - Tauri'
[6]: https://v2.tauri.app/develop/calling-frontend/ 'Calling the Frontend from Rust - Tauri'
[7]: https://v2.tauri.app/plugin/localhost/ 'Localhost | Tauri'
[8]: https://v2.tauri.app/concept/process-model/ 'Process Model - Tauri'
[9]: https://v2.tauri.app/concept/inter-process-communication/isolation/ 'Isolation Pattern - Tauri'
