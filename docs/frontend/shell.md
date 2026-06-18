# The Renderer Shell

How the one Aideon Desktop shell frames the product and how engines plug into it. This file is for anyone building an engine surface or the shell itself. The shell owns all chrome — navigation, toolbar, content surface, inspector; a licensed engine contributes only **widgets** that render inside the content surface.

---

## The principle

There is one shell, and it is owned by the platform, not by any engine ([the-shell.md](../03-design/the-shell.md)). The shell owns global navigation, the toolbar and viewpoint controls, the content surface, and the inspector; engines do not ship their own chrome and there is no per-module workspace to switch between. A user does not move between a "Praxis workspace" and a "Metis workspace" — they see one unified landscape, and a licensed engine simply adds widgets to it. This keeps the product coherent and is why an engine is a package that contributes widgets, not an application that owns a window.

Engines are gated by **licensing**: an unlicensed engine contributes nothing; a licensed one's widgets join the shared widget catalogue ([widget-catalog](#how-engines-contribute-widgets)). But **engines are not a navigation axis** — the user never navigates to "Praxis" or "Metis". The platform owns the **surfaces** (the navigable work destinations) and the chrome; engines contribute **typed capabilities and widgets** that compose _inside_ a surface. Licensing therefore decides which surface capabilities and widgets are available, quietly; engine/capability status appears in administration, diagnostics, or About, never in the rail ([hig/shell-and-navigation.md](../03-design/hig/shell-and-navigation.md)). The trade-off is that an engine may not invent its own shell when its needs differ. A surface that genuinely needs a different frame is a signal to extend the platform shell, not to bypass it; bypassing it fractures the product.

## The four regions

The shell is four regions the **platform** fills, matching the four regions fixed in [the-shell.md](../03-design/the-shell.md) and the [UX shell structure](../03-design/ux/shell-structure.md). `AideonDesktopShell` (`src/aideon/shell/`) takes a `navigation`, `toolbar`, `content`, and `inspector` prop; the platform supplies each from `src/platform/`:

| Region       | What the platform supplies                                                                                                                                                                                                                  | Component                           | Realised with                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------- |
| `navigation` | The platform-owned **destination rail**: available work surfaces, Workspace structure, and pinned/recent destinations. Engine licensing affects which surface capabilities and widget contributions exist but is **not** a navigation axis. | `PlatformNavigation`                | `Sidebar` proxy              |
| `toolbar`    | Full-width top toolbar: global chrome, the viewpoint controls, and layout-preset/temporal controls                                                                                                                                          | `AideonToolbar` + `PlatformToolbar` | `Menubar`/`Toolbar` proxy    |
| `content`    | The dominant content region that renders the **active surface instance**. Each surface composes platform- and engine-contributed widgets per its own fixed or user-editable composition contract.                                           | `PlatformContent`                   | `SidebarInset` + `Resizable` |
| `inspector`  | Selection-driven contextual details and forms                                                                                                                                                                                               | `PlatformInspector`                 | `Resizable` + `Panel`        |

```
┌────────────────────────────────────────────────────────────────┐
│ Toolbar (global chrome + viewpoint + layout-preset/temporal)     │
├──────────────┬───────────────────────────┬─────────────────────┤
│ navigation   │ content                   │ inspector            │
│ (surfaces +  │ (active surface           │ (selection details)  │
│  workspace   │  instance: composed       │                      │
│  structure)  │  widgets)                 │                      │
├──────────────┴───────────────────────────┴─────────────────────┤
│ Footer / status (global status + job tray)                       │
└──────────────────────────────────────────────────────────────────┘
```

The toolbar spans the full width above the navigation rail — this is a desktop application, not a web page. The shell uses only design-system proxies for its structure — `Sidebar`, `SidebarInset`, `SidebarTrigger`, `Resizable`, `Menubar`/`Toolbar` ([ADR-0010](../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)); ad-hoc layout components must not be introduced. Default sizing keeps navigation and inspector narrow with content as the dominant pane; the inspector is a collapsible drawer whose state persists.

## The viewpoint is always visible

The viewpoint controls — as-of valid time, layer, scenario — live in the toolbar region and stay visible across the whole shell ([ux/time-and-scenario-ux.md](../03-design/ux/time-and-scenario-ux.md)). Time is the coordinate system, never ambient: the shell shows which version of the twin the user is looking at, and changing it re-keys server-state ([state-architecture.md](./state-architecture.md)). The shared control is the [chrona-time](./chrona-time/README.md) surface, owned by the platform rather than re-implemented per engine.

## Surfaces — the navigation and composition unit

A **surface** is a platform-owned, navigable work destination (the eight in [ux/workspace-family.md](../03-design/ux/workspace-family.md)); a **widget** is a content component rendered _within_ a surface. Navigation selects a surface; `PlatformContent` renders that **active surface instance** — its composition and layout — not one undifferentiated workspace-wide widget canvas. A surface definition declares at least: `surface_id`, `label`, `purpose`, availability requirements, default composition, allowed widget contributions, toolbar contribution, inspector behaviour, empty-state behaviour, layout-persistence key, **viewpoint policy** (a surface owns a policy, not a hard default that overrides the shell on every navigation — see [hig/shell-and-navigation.md](../03-design/hig/shell-and-navigation.md)), and a **`composition_policy`** of `fixed` | `bounded` | `free`.

`composition_policy` is what keeps "widget" from becoming a universal UI model: the platform may _implement_ many surfaces with widgets internally, but only designated surfaces expose composition to users. Only a **`free`** surface (the modelling studio) offers extensive user composition; a **`bounded`** surface (scenario studio, executive briefing) allows a constrained set; a **`fixed`** surface (workspace home, artefact library, review, import, administration) is platform-composed and exposes neither Add widget nor compose mode.

| Surface          | `composition_policy` | Surface            | `composition_policy`   |
| ---------------- | -------------------- | ------------------ | ---------------------- |
| Modelling studio | `free`               | Review & contrib   | `fixed` (or `bounded`) |
| Scenario studio  | `bounded`            | Executive briefing | `bounded`              |
| Workspace home   | `fixed`              | Import & mapping   | `fixed` (workflow)     |
| Artefact library | `fixed`              | Administration     | `fixed`                |

## Composing a surface — Add widget, compose mode, layout

**Add widget** is one canonical action on a composable (`free`/`bounded`) surface, reachable three ways that all open the **same widget-library dialog**: the surface toolbar, an on-canvas `+` (in compose mode), and the native command menu / palette (a shortcut for users who know the name — not a separate catalogue, since the dialog is the discovery path that can _explain_ the widgets). The dialog lists contributions filtered by `surface allowed contributions ∩ build-enabled ∩ licensed capabilities ∩ workspace-supported features`; each entry shows label, plain description, icon, owning business capability where useful, a small static preview, default size, and any important scope/data requirement. Selecting one creates an instance at its `defaultSize` in the first available position. A contribution the user cannot access is **omitted quietly** (no "upgrade to unlock" clutter) — but a saved composition that already contains a now-unavailable contribution shows an explicit **unavailable-widget placeholder**, never a silent deletion of the user's work.

**Compose mode is distinct from work mode** ([hig/tables-and-dashboards.md](../03-design/hig/tables-and-dashboards.md)). In work mode widget content is interactive (graph selection, editing); move/resize are disabled and handles/remove controls hidden. In compose mode move/resize/add/remove controls appear, widget content does not consume layout drag gestures, the surface carries an unmistakable compose-state treatment, and move/resize/add/remove are **keyboard-accessible**. Compose edits a **draft layout** with explicit **Done** / **Cancel** / **Reset layout**: `saved layout → enter compose → edit draft → Done persists / Cancel restores`. A crash or restart mid-compose discards only the uncommitted draft — layout is UI state, never twin content, so canonical model work is unaffected. `fixed` surfaces expose neither Add widget nor compose mode.

**Layout persistence is _not_ keyed by the viewpoint.** Changing valid time, layer, or scenario changes the _data shown_, never the arrangement. The layout key is `workspace_id + local user/profile + surface_id + surface_instance/destination_id + layout_preset_id`; the viewpoint is a separate state coordinate. A saved structure may carry **both** a saved composition/layout **and** an optional recorded viewpoint as **distinct fields**; opening it may visibly apply both, but changing the live viewpoint afterwards never silently forks a new layout.

## How engines contribute widgets

An engine is a package under `src/engines/<module>/` that exports an `EngineDefinition`; the platform composes the shell once and renders the licensed engines' widgets into the **active surface**. An engine never mounts the window, supplies chrome, or appears as a navigation destination.

- `AideonDesktopRoot` (`src/root.tsx`) composes the shell once: `LicensingProvider → HostPlatformProvider → AideonDesktopShell`, passing `PlatformNavigation`, `AideonToolbar` (with `PlatformToolbar`), `PlatformContent`, and `PlatformInspector`.
- An `EngineDefinition` (`src/platform/engine.ts`) is `{ id, label, widgets, renderWidget(widget, context) }`. Each entry in `widgets` is a `WidgetContribution` — `{ engineId, type, label, description, icon, defaultSize, createWidget }` — describing one widget type the engine offers.
- Engines are registered in `src/platform/engines.ts` (`ENGINES`); today only `PRAXIS_ENGINE` (`src/engines/praxis/engine.tsx`) is registered. There is no `WorkspaceModule` and no per-module registry — the platform owns composition.
- `useLicensing()` (`src/platform/licensing.tsx`) gates which engines' capabilities and widgets are available (quietly — never as a navigation label); `useWidgetCatalog()` (`src/platform/widget-catalog.ts`) flattens the licensed engines' `widgets` into one catalogue and routes `renderWidget(widget, context)` to the owning engine. `PlatformContent` renders the **active surface instance** from its composition; within a **composable** surface (chiefly the modelling studio) the [widget library dialog](./package-layout.md) adds widgets from the catalogue, gated by the surface's allowed contributions.
- The platform owns a single state provider, `HostPlatformProvider` (`src/platform/host-platform-provider.tsx`), consumed via `useHostPlatform()`; state — the active surface, **Workspace structure** (scenarios, saved structures, artefacts, review work — _not_ a "project tree"; "project" has no single canonical meaning here), layout presets, selection, temporal cursor, surface composition/layout, inspector patch — is owned once for the whole shell, not duplicated per engine ([state-architecture.md](./state-architecture.md)).

An engine **must** keep a chrome-free surface variant (e.g. `PraxisCanvasSurface`) for standalone embedding in tests and previews, so a widget is testable without the full shell ([testing.md](./testing.md)).

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

| Document                                                                                 | What it covers                                                        |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [the-shell.md](../03-design/the-shell.md)                                                | The canonical definition of the one shell and its four regions.       |
| [ux/shell-structure.md](../03-design/ux/shell-structure.md)                              | The behavioural role of each region.                                  |
| [package-layout.md](./package-layout.md)                                                 | How `src/platform/` and `src/engines/<module>` packages are laid out. |
| [state-architecture.md](./state-architecture.md)                                         | The single platform state provider behind the shell.                  |
| [ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)                    | The static-bundle/Tauri posture and the IPC seam.                     |
| [ADR-0010](../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md) | The proxies the shell composes from.                                  |
