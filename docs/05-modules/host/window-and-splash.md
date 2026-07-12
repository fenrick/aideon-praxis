# Window and splash

The window model, splash gating at startup, and the isolation between windows. For a reader who needs to know which
windows exist and how startup completes.

---

## The window model

| Label        | Purpose                   |
| ------------ | ------------------------- |
| `splash`     | Startup gating screen     |
| `main`       | Primary workspace shell   |
| `settings`   | Preferences               |
| `status`     | Health, jobs, diagnostics |
| `about`      | Version, licences         |
| `styleguide` | UI development reference  |

Labels are stable and never change — they are referenced by the `system_window_open` command and by the capability
declarations. Capabilities are granted to all six labels via `capabilities/default.json`
([capabilities and CSP](./capabilities-and-csp.md)). The host owns window creation, labelling, sizing, and
platform-native styling (Mica on Windows, the correct titlebar on macOS).

---

## Splash gating

Startup completes only when **both** the backend and the frontend signal completion:

| Task     | Signal                                                                               |
| -------- | ------------------------------------------------------------------------------------ |
| Backend  | `run_backend_setup()` succeeds and calls `system_setup_complete { task: "backend" }` |
| Frontend | The renderer splash screen calls `system_setup_complete { task: "frontend" }`        |

`SetupState` (managed as a `Mutex<SetupState>`) tracks both flags. When both are true, the splash window closes after a
three-second minimum display time and the main window becomes visible. Gating on both signals means the main window is
never shown before the engines are wired ([engine wiring](./engine-wiring.md)) and the renderer is ready — the user
never sees a half-initialised shell.

---

## Window isolation

Windows are isolated by capability scope, not merely by convention. Each window label carries its own capability grant,
so a window can only invoke the commands its label is permitted ([capabilities and CSP](./capabilities-and-csp.md)).
This is the _Spoofing_ control at the boundary — a window cannot claim a capability it was not granted
([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)). The practical consequence is that the `status` window
can remain usable for diagnostics and recovery even when the `main` workspace shell is in read-only recovery mode
([workspace lifecycle](./workspace-lifecycle.md)) — the windows do not share a single trust context that a failure in
one collapses.

---

## Worked example — startup to main window

The host process starts and opens the `splash` window. `run_backend_setup()` initialises the engines via the harness
and, on success, calls `system_setup_complete { task: "backend" }`; the renderer, once its splash screen has loaded,
calls `system_setup_complete { task: "frontend" }`. `SetupState` now has both flags set; the host waits out the
three-second minimum, closes `splash`, and shows `main`. Had backend setup failed, the splash would not gate open to
`main`; the `status` window — separately capable — could be opened to show the diagnostics instead.

---

## Related documents

| Document                                                       | What it covers                                                 |
| -------------------------------------------------------------- | -------------------------------------------------------------- |
| [Capabilities and CSP](./capabilities-and-csp.md)              | The per-window capability scoping that isolates windows.       |
| [Workspace lifecycle](./workspace-lifecycle.md)                | Recovery mode and the Status window's role.                    |
| [Engine wiring](./engine-wiring.md)                            | Backend setup wiring the engines before the main window shows. |
| [IPC command surface](./ipc-command-surface.md)                | `system_window_open` and `system_setup_complete`.              |
| [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md) | Per-window scoping as the Spoofing control.                    |
