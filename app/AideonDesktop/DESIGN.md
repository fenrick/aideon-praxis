# Aideon Desktop – UX Shell Design

## Purpose

- Aideon Desktop is the primary UX shell for the desktop product. All workspaces (Praxis workspace and future tools) render inside this shell instead of shipping their own chrome.
- The shell owns global navigation, window/tool switching, and layout scaffolding; individual workspaces supply only their content.

## Layout regions

- **Top toolbar:** global actions, workspace switching, and app-level menus.
- **Left tree:** navigation for projects, workspaces, and nodes.
- **Centre workspace:** hosts the active workspace surface (Praxis workspace initially).
- **Right properties panel:** contextual details and forms for the current selection.

## Principles

- Every workspace renders inside the shell; no separate sidebars or headers per workspace.
- Use design-system primitives for all shell structure (Sidebar, Resizable, Menubar/Toolbar). Do not introduce ad‑hoc layout components.
- Keep the shell local-first and Tauri-friendly: no renderer HTTP, typed IPC only.

## Tree and properties panels

- Left tree shows projects/workspaces using the design-system sidebar menus. `DesktopTree` now reads scenario/workspace summaries from the Praxis adapters (`listScenarios` via the canvas module) and renders them under a Scenarios project group.
- Right properties panel consumes selection propagated from the Praxis workspace via the shell. Shell owns selection state and passes it into `DesktopPropertiesPanel`.

## Shell layout contract

The shell is defined by a small set of slots that callers fill:

- `tree` – navigation tree content.
- `toolbar` – top toolbar or menubar content.
- `main` – workspace surface (Praxis workspace surface today).
- `properties` – contextual inspector/details.

Layout sketch:

```
[ Toolbar / Menubar ]
[ Sidebar ][ Main workspace ][ Properties ]
```

The implementation uses the design-system proxies for Sidebar, Resizable, and Menubar/Toolbar components. Default sizing keeps the sidebar and properties panels narrow (≈20%) with the main workspace as the dominant pane.

## Entry point

- `AideonDesktopRoot` is the React entry that composes `DesktopShell` with toolbar/tree/main/properties slots.
- Tauri loads the `app/AideonDesktop` bundle (`index.html` → `src/main.tsx` → `AideonDesktopRoot`); Praxis workspace surfaces mount inside the centre slot rather than owning the window.
