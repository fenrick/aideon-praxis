# Praxis Desktop Overview

This note summarises the **target** Praxis Desktop architecture that all new work must climb toward.
It mirrors the implementation guide in `docs/praxis-desktop-implementation-guide.md` and gives human
contributors a single reference for what “done” looks like.

## Target stack

| Layer                | Technology                                                    | Notes |
| -------------------- | ------------------------------------------------------------- | ----- |
| Desktop shell        | [Tauri](https://v2.tauri.app)                                 | Ships the React UI + Rust host as a single binary; capabilities locked down. |
| UI runtime           | React 18 + TypeScript                                         | Replaces the historical SvelteKit prototype. |
| Canvas engine        | [React Flow (XYFlow)](https://reactflow.dev/)                 | Node-based canvases, pan/zoom, selection, view transforms. |
| Design system        | [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS            | Copied-in primitives that we customise; no runtime dependency. |
| (Future) whiteboard  | [tldraw](https://tldraw.dev/)                                 | Optional layer for freeform sketching once licensing is cleared. |
| Twin/back-end access | Rust engines via typed Tauri commands (`praxisApi` wrappers) | All React code talks to the twin through IPC, never directly. |

## Core concepts

### Digital twin

Praxis keeps a **time-aware graph**: nodes, edges, commits, scenarios, plateaus. Every surface is a
projection over that twin, never a disconnected data source.

### Surfaces & widgets

- **Surfaces** are ways of looking at the twin: canvases, catalogues, matrices, dashboards.
- **Widgets** are concrete surface instances placed on a canvas with size, position, and
  configuration.
- **Canvas Runtime** (React) manages widget layout, global selection, filters, scenario/time state,
  and delegates data access to `praxisApi`.

### Sidebar / control plane

A persistent shadcn/ui-driven sidebar configures the active canvas/template, selection, filters,
imports/exports, and Chrona/Metis/Continuum widgets.

## Migration stance

- The checked-in SvelteKit renderer (`app/PraxisDesktop`) is a **legacy prototype**. Keep it working
  until the React runtime overtakes it, but treat new work as greenfield React + Tauri code.
- Documentation, ADRs, and guardrails must describe the React/Tauri direction so every contributor
  understands the destination.
- A new React workspace will live alongside the Svelte code until the cut-over.

## Phase checkpoints

1. **Phase 0** – Documentation alignment (this overview + implementation guide + README updates).
2. **Phase 1** – Bootstrap Tauri + React shell with shadcn layout and a sample Tauri command.
3. **Phase 2** – Twin bindings and IPC (`praxisApi`).
4. **Phase 3** – Canvas runtime skeleton with React Flow GraphWidget.
5. **Phase 4** – Catalogue/matrix widgets with shared selection.
6. **Phase 5** – Chart widgets + templates.
7. **Phase 6** – Chrona/Metis/Continuum extension hooks.

See the implementation guide for detail on each definition of done. Treat this page plus the guide
as the canonical reference before writing any UI code.
