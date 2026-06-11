# The Renderer Shell

How the one Aideon Desktop shell frames every workspace and how a workspace plugs into it. This file is for anyone building a workspace surface or the shell itself. The shell owns global chrome; a workspace supplies only its own navigation, toolbar, content, and inspector.

---

## The principle

There is one shell. Every workspace renders inside it; none ships its own chrome ([the-shell.md](../03-design/the-shell.md)). The shell owns global navigation, window and workspace switching, and the layout scaffolding; a workspace fills four slots. This keeps the product coherent — a user moving between Praxis, Metis, and Mneme meets one frame — and it is the reason a new workspace is a package that fills slots, not an application that owns a window.

The trade-off is that a workspace may not invent its own shell when its needs differ. A surface that genuinely needs a different frame is a signal to extend the shell contract, not to bypass it; bypassing it fractures the product.

## The four regions

The shell is four slots a workspace fills, matching the four regions fixed in [the-shell.md](../03-design/the-shell.md) and the [UX shell structure](../03-design/ux/shell-structure.md):

| Slot         | What the workspace supplies                                                    | Realised with                |
| ------------ | ------------------------------------------------------------------------------ | ---------------------------- |
| `navigation` | Workspace-specific navigation (Praxis: projects/scenarios tree)                | `Sidebar` proxy              |
| `toolbar`    | Workspace toolbar content, beside the global chrome and the viewpoint controls | `Menubar`/`Toolbar` proxy    |
| `content`    | The active workspace surface (canvas, catalogue, matrix, run results)          | `SidebarInset` + `Resizable` |
| `inspector`  | Selection-driven contextual details and forms                                  | `Resizable` + `Panel`        |

```
┌────────────────────────────────────────────────┐
│ Header / toolbar (global chrome + viewpoint + workspace toolbar) │
├──────────────┬───────────────────────────┬──────┤
│ navigation   │ content                   │ insp-│
│ (workspace)  │ (active workspace surface)│ ector│
├──────────────┴───────────────────────────┴──────┤
│ Footer / status (global status + job tray)       │
└──────────────────────────────────────────────────┘
```

The shell uses only design-system proxies for its structure — `Sidebar`, `SidebarInset`, `SidebarTrigger`, `Resizable`, `Menubar`/`Toolbar` ([ADR-0010](../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)); ad-hoc layout components must not be introduced. Default sizing keeps navigation and inspector narrow (≈ 20% each) with content as the dominant pane.

## The viewpoint is always visible

The viewpoint controls — as-of valid time, layer, scenario — live in the toolbar region and stay visible across every workspace ([ux/time-and-scenario-ux.md](../03-design/ux/time-and-scenario-ux.md)). Time is the coordinate system, never ambient: the shell shows which version of the twin the user is looking at, and changing it re-keys server-state ([state-architecture.md](./state-architecture.md)). The shared control is the [chrona-time](./chrona-time/README.md) surface, adopted by every workspace rather than re-implemented.

## The `WorkspaceModule` contract

A workspace is a package that registers a `WorkspaceModule`. The shell selects the active module and composes the four slots from it; a workspace never mounts the window itself.

- `AideonDesktopRoot` selects the active workspace and composes `AideonDesktopShell` with the four slots.
- Workspace modules register in `src/workspaces/registry.ts` and implement the contract in `src/workspaces/types.ts`.
- A module supplies its four slot components (e.g. `PraxisWorkspaceNavigation`, `PraxisWorkspaceToolbar`, `PraxisWorkspaceContent`, `PraxisWorkspaceInspector`).
- Each module owns a single state provider that the four slots consume, so state is owned once and not duplicated across slots ([state-architecture.md](./state-architecture.md)).

A workspace **must** keep a chrome-free surface variant (e.g. `PraxisWorkspaceSurface`) for standalone embedding in tests and previews, so the surface is testable without the full shell ([testing.md](./testing.md)).

## Keyboard and the native menu

Desktop keyboard shortcuts are registered in the Tauri native menu as accelerators and dispatched to the renderer; a browser preview keeps lightweight fallback handlers ([accessibility.md](./accessibility.md)). The command surface a shortcut invokes is always an IPC command or a renderer action, never a renderer-side privileged operation.

## Static-export constraints

The renderer is a static React bundle packaged into Tauri ([ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)), built with Next.js `output: "export"`. This shapes what a surface may do:

- Every screen **must** be renderable at build time; no request-time SSR, no `getServerSideProps`, no `next start`-only features.
- Client components are pre-rendered during `next build`; browser-only APIs (`window`, `localStorage`) **must** be accessed inside client effects, never at module top level.
- Route handlers are permitted only for static `GET` responses emitted during `next build`.
- The App Router (`app/`) is the canonical model for layouts, routing, and data boundaries.

The splash window stays visible for at least three seconds to avoid flash-on-load; the host closes it only after both frontend and backend setup signals complete, driven by host-owned events (`setup_progress`, `setup_backend_ready`) with `system_setup_state` read once on mount to avoid a missed-event race. Setup failures surface via `setup_failed` with an explicit recovery path ([error-loading-empty.md](./error-loading-empty.md)).

## Authority

This file defines the renderer shell end state. IPC, capability, and security contracts are owned by the host ([host/README.md](../05-modules/host/README.md)) and the [contracts folder](../04-contracts/CONTRACTS-AND-SCHEMAS.md) and take precedence where they overlap.

## References & standards

_Informative — recorded in the [standards register](../02-standards/STANDARDS-REGISTER.md):_

- Nielsen — **10 Usability Heuristics**, 1994. Visibility of system status, behind the always-visible viewpoint.

## Related documents

| Document                                                                                 | What it covers                                                  |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [the-shell.md](../03-design/the-shell.md)                                                | The canonical definition of the one shell and its four regions. |
| [ux/shell-structure.md](../03-design/ux/shell-structure.md)                              | The behavioural role of each region.                            |
| [package-layout.md](./package-layout.md)                                                 | How a workspace package mirrors a module and fills the slots.   |
| [state-architecture.md](./state-architecture.md)                                         | The single per-module state provider behind the slots.          |
| [ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)                    | The static-bundle/Tauri posture and the IPC seam.               |
| [ADR-0010](../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md) | The proxies the shell composes from.                            |
