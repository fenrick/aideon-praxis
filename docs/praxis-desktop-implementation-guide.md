# Praxis Desktop – React/Tauri Canvas Implementation Guide (for Coding Agents)

## Purpose

Explain **what we are building** in the Praxis desktop module, **how we’re building it**, and
**in what order**. This is an implementation guide focused on phased delivery of the React/Tauri
canvas; detailed architecture and boundaries live in `Architecture-Boundary.md` and
`docs/CODING_STANDARDS.md`.

We’re in an _evergreen build_ phase. There is no need to preserve legacy UI code or patterns. Existing SvelteKit artefacts can be treated as prototypes and replaced as we go, as long as we converge on a **stable, high-quality React + Tauri desktop app**.

The agent must:

- Work **phase by phase**, not attempt everything at once.
- Keep the codebase clean, typed, and well-documented as it goes.

---

## 2. Target stack and high-level architecture

### 2.1. Tech stack

The desktop app will be built on:

- **Tauri** as the desktop shell
  - Tauri lets us build native desktop apps using a web UI (React) and a Rust backend. ([Tauri][1])

- **React + TypeScript** for the frontend
- **React Flow (XYFlow)** as the primary **node-based canvas engine**
  - React Flow is a React library for interactive node-based editors and diagrams (flow graphs, mind maps, workflow builders, etc.). ([React Flow][2])

- **shadcn/ui + Tailwind CSS** for the design system, layout and shell
  - shadcn/ui is “the foundation for your design system”: open-code React components built with Radix and Tailwind that you copy into your repo and customise. ([Shadcn UI][3])

- **Optional later:** tldraw as a freeform whiteboard / infinite canvas layer, once licensing is resolved
  - tldraw is an infinite canvas SDK for React with real-time collaboration, used to build collaborative whiteboards. ([tldraw.dev][4])

### 2.2. Conceptual architecture (important for all phases)

**Digital Twin (Praxis core)**

- The engine: a time-aware graph of nodes and edges (stakeholders, services, value streams, capabilities, people, processes, information, technology, policies, events, etc.).
- Includes commits, scenarios, and history – this is the “truth”.

**Surfaces**

- Different ways of reading and editing the twin:
  - **Canvas** (graph/mind map, box-in-box, freeform layouts, annotations)
  - **Catalogues** (tables for bulk node/edge editing)
  - **Matrices** (cross-tables for relationships)
  - **Charts/Dashboards** (KPI tiles, charts, heatmaps, treemaps, timelines, Gantt, Kanban)

**Widgets**

- Concrete instances of surfaces placed on the canvas:
  - Graph widget, hierarchy widget, catalogue widget, matrix widget, chart widget, legend widget, etc.

- Each widget:
  - knows **what** it shows (view definition),
  - knows **where** it sits on the canvas (position, size),
  - reacts to global state (selection, filters, time, scenario).

**Canvas Runtime (React app)**

- Manages:
  - the infinite canvas and interactions (pan, zoom, select, drag, connect),
  - the widget layout and rendering,
  - global view state: selection, filters, time cursor, scenario, active template.

**Sidebar / Control Plane**

- Main control surface for:
  - selecting canvases/templates,
  - configuring widgets and views,
  - imports/exports and bulk operations,
  - filters and global time/scope.

**Chrona / Metis / Continuum**

- Operate on the same twin and **through the same canvas**:
  - Chrona: time and commit visualisation controls and widgets
  - Metis: reasoning overlays and insights widgets
  - Continuum: orchestration/control widgets (scenario runners, automations, etc.)

---

## 3. Guiding principles for the coding agent

The agent must:

1. **Respect the architecture above.**
   - Do not introduce separate, standalone UIs for catalogue/matrix/graph. They must be treated as _widgets_ on the canvas or docked panels that still use the same data layer.

2. **Work in phases, in order.**
   - Complete a phase and its Definition of Done (DoD) before starting the next.
   - Avoid cross-phase scope creep.

3. **Prefer clarity over cleverness.**
   - Strong typing, small components, clear function names, consistent conventions.
   - Follow existing linting/formatting/test patterns from the repo.

4. **Keep everything twin-centric.**
   - No local ad-hoc models that diverge from the digital twin.
   - All surfaces and widgets are projections of the twin, not separate data stores.

---

## 4. Implementation phases

### Phase 0 – Documentation clean-up and alignment

**Goal:** Make the repo docs reflect the _target_ React/Tauri canvas architecture and remove misleading historical references.

**Tasks:**

1. Identify existing docs (README, `/docs`, ADRs, architecture diagrams) that describe:
   - SvelteKit as the main UI,
   - older UI metaphors (single “page” reports, static diagrams, etc.).

2. Add or update:
   - A short **“Praxis Desktop Overview”** doc explaining:
     - React + Tauri + shadcn/ui + React Flow stack,
     - the twin / surfaces / widgets / canvas runtime concepts (section 2.2 above).

   - This implementation guide (current document) in `/docs`.

3. Clearly mark any Svelte UI references as **legacy/prototype** and state that the React app is the target.

**Definition of Done (Phase 0):**

- Top-level README points to the updated architecture and this guide.
- No major doc still describes SvelteKit as the primary UI or contradicts the React/Tauri decision.
- Coding agent can “read the docs” and see a consistent story: digital twin + React/Tauri canvas.

---

### Phase 1 – Bootstrap Tauri + React + shadcn shell

**Goal:** Create a clean Tauri + React desktop shell with a basic layout: sidebar + main area, using shadcn/ui + Tailwind.

**Tasks:**

1. **Create or confirm the Tauri + React project setup.**
   - Use `create-tauri-app` or an equivalent template to scaffold a React+Tauri project (keep the repo’s existing package manager and Tauri version consistent). ([Tauri][1])

2. **Set up Tailwind CSS and shadcn/ui.**
   - Integrate Tailwind with the React app.
   - Install shadcn/ui and generate a minimal set of base components (Button, Input, Card, Tabs, Sidebar/Nav primitives). ([Shadcn UI][3])
   - Run `pnpm dlx shadcn@latest mcp init --client codex` to setup the mcp server support for adding into codex mcp support

3. **Build a basic layout using shadcn/ui.**
   - Application frame with:
     - Left sidebar (placeholder navigation + sections),
     - Main content area (empty placeholder),
     - Optional top bar for project name / scenario.

4. **Wire up a minimal Tauri IPC call.**
   - Simple example (e.g. “ping” command in Rust, called from React) to confirm Rust ↔ React integration is working end-to-end.

**Definition of Done (Phase 1):**

- `tauri dev` (or equivalent) runs a desktop app with:
  - a working React UI,
  - shadcn-styled shell (no default CRA/boilerplate look),
  - a sidebar + main content layout.

- At least one Tauri command is callable from React and logs/prints expected results.
- All new components obey repo lint/format rules and compile without TypeScript errors.

> **Status (14 Nov 2025):** `app/PraxisCanvas` renders the shadcn shell (sidebar, header, cards)
> with Tailwind theming, and the worker health card calls the host via `praxisApi`. The React Flow
> runtime already lives inside this shell, so Phase 1 is fully complete.

---

### Phase 2 – Twin core TypeScript bindings + IPC layer

**Goal:** Provide a clean TypeScript API for the UI to interact with the twin engine via Tauri, independent of any specific UI component.

**Tasks:**

1. Define TypeScript types for core twin concepts:
   - `Node`, `Edge`, `NodeType`, `EdgeType`,
   - `Commit`, `Scenario`, `TimeCursor`,
   - `ViewDefinition` (for graph/table/matrix/chart queries).

2. Implement a `praxisApi` module (or similar) in TypeScript that wraps all Tauri calls, for example:
   - `getGraphView(viewDefinition): Promise<GraphViewModel>`
   - `getCatalogueView(viewDefinition): Promise<CatalogueViewModel>`
   - `getMatrixView(viewDefinition): Promise<MatrixViewModel>`
   - `applyOperations(operations): Promise<CommitResult>`
   - `listScenarios(): Promise<Scenario[]>`

3. Implement matching Tauri commands on the Rust side that:
   - call into the existing Rust twin engine where possible,
   - or use placeholder implementations if the engine isn’t fully ready yet (but keep the contracts stable).

4. Add basic error handling and logging in the API layer (no UI references).

**Definition of Done (Phase 2):**

- React app can call `praxisApi` methods from anywhere without knowing Tauri details.
- Round-trip Rust ↔ React works for at least:
  - A simple graph view query,
  - A simple “mutating” operation (even if it’s a stub).

- Types in the `praxisApi` module compile cleanly under strict TypeScript settings.

> **Status (14 Nov 2025):** `app/PraxisCanvas/src/praxis-api.ts` defines the shared view contracts
> (nodes, edges, catalogues, matrices, operations, scenarios) and calls the typed host commands in
> `crates/aideon_praxis_host/src/praxis_api.rs`. The React shell consumes
> `listScenarios()`, `getGraphView()`, `getCatalogueView()`, and `getMatrixView()`; `applyOperations()`
> still returns a mock commit id until the worker mutation path is wired.

---

### Phase 3 – Canvas Runtime skeleton with React Flow (GraphWidget v1)

**Goal:** Stand up the core canvas runtime using React Flow, with a minimal `GraphWidget` that talks to the twin via `praxisApi`.

**Tasks:**

1. Install and configure **React Flow (@xyflow/react)**. ([React Flow][2])

2. Create a `CanvasRuntime` React component that:
   - Owns a list of widgets (for now, just one Graph widget).
   - Owns a global view state object (selection, filters, time cursor, scenario, active template).

3. Define a `Widget` model in TypeScript:
   - `id: string`
   - `kind: "graph" | ...` (others added later)
   - `position: { x: number; y: number }`
   - `size: { width: number; height: number }`
   - `viewDefinitionId: string`
   - `config: Record<string, unknown>` (for widget-specific settings).

4. Implement a minimal **GraphWidget**:
   - Uses `<ReactFlow />` to render nodes and edges from a `GraphViewModel`. ([React Flow][5])
   - On mount:
     - calls `praxisApi.getGraphView(...)` to fetch initial data.

   - On interaction:
     - node/edge selection updates global selection state.
     - simple node move/delete events emit placeholder operations via `praxisApi.applyOperations(...)` (even if the backend persists nothing yet).

5. Embed `CanvasRuntime` in the main content area of the shell created in Phase 1.

**Definition of Done (Phase 3):**

- Desktop app opens to a canvas area with a working Graph widget.
- Canvas supports at minimum:
  - pan, zoom, node selection (via React Flow defaults),
  - selection propagated to a simple sidebar “selection inspector” (name/id list is fine).

- All graph data is loaded via `praxisApi`, not hard-coded.
- Node/edge selection changes are reflected in global state.

> **Status (14 Nov 2025):** The React shell hosts a `CanvasRuntime` component backed by React Flow.
> A `GraphWidget` fetches twin data via `praxisApi.getGraphView`, renders the nodes, and reports
> selections/stats back to the new dashboard inspector. With the shared selection state wired up,
> work now pushes into the Phase 4 widgets.

---

### Phase 4 – Catalogue and Matrix widgets on the canvas

**Goal:** Bring **catalogues** (tables) and **matrices** (cross-tables) into the same canvas runtime as widgets, with shared selection and twin backing.

**Tasks:**

1. Extend the `Widget` model to include:
   - `"catalogue"` and `"matrix"` kinds.

2. Implement **CatalogueWidget**:
   - Use shadcn/ui table patterns and the existing table engine in the repo (or TanStack Table if appropriate) to render rows/columns for nodes/edges. ([shadcn.io][6])
   - Data source: `praxisApi.getCatalogueView(viewDefinition)`.
   - Row selection updates global selection state and highlights corresponding nodes in GraphWidget.

3. Implement **MatrixWidget**:
   - Render a grid where:
     - rows = a set of nodes/values,
     - columns = another set of nodes/values,
     - cells = presence/strength/attributes of relationships.

   - Data source: `praxisApi.getMatrixView(viewDefinition)`.
   - Selection and edits propagate back through `praxisApi.applyOperations(...)`.

4. Allow placement of catalogue/matrix widgets:
   - As floating resizable panels on the canvas; or
   - As docked panes adjacent to the canvas, still driven by the widget model.

**Definition of Done (Phase 4):**

- User can:
  - see a catalogue widget **and** graph widget at the same time,
  - select a row in the catalogue and see matching nodes highlighted in the graph (and vice versa).

- User can:
  - see a matrix widget **and** graph widget at the same time with a coherent mapping of selections.

- All data for these widgets comes from the twin via `praxisApi` (no mock data in components).

> **Status (14 Nov 2025):** Graph, catalogue, and matrix widgets now co-exist in
> `CanvasRuntime`. Selection flows bidirectionally across widgets and into the sidebar inspector,
> satisfying Phase 4’s core interoperability goals.

---

### Phase 5 – Dashboards, charts, and templates

**Goal:** Introduce dashboard/chart widgets and a basic templates system that can express “C-suite” vs “Explorer” canvases.

**Tasks:**

1. Choose a charting library suited to dashboards (e.g. Recharts) and integrate it into the React app.

2. Implement **ChartWidget**:
   - Supports at least:
     - KPI card (single metric),
     - line/area chart,
     - bar chart.

   - Data source: `praxisApi.getChartView(viewDefinition)` (you can define this method as needed).

3. Implement a simple **template** format:
   - A template is a JSON description of:
     - Widgets (types, positions, sizes),
     - Their viewDefinition bindings,
     - Any global settings (time window, filters).

4. Seed two or more example templates:
   - “Executive overview” canvas:
     - a small number of metrics and high-level views.

   - “Explorer” canvas:
     - more widgets, including catalogue/matrix/graph for deeper analysis.

5. Add UI in the sidebar to:
   - Select a template,
   - Save the current widget layout as a new named template (basic implementation is fine).

**Definition of Done (Phase 5):**

- At least one template with a graph + charts + catalogue is selectable and loads deterministic layouts.
- Switching templates reconfigures the canvas without breaking widget bindings.
- Chart widgets show data derived from the twin, not hard-coded demo data.

> **Status (14 Nov 2025):** CanvasRuntime now includes KPI, line, and bar chart widgets powered by
> `praxisApi.getChartView`, and the shell exposes a template selector + save action that swaps the
> widget layout in-place. Templates instantiate deterministic widgets from JSON descriptors, meeting
> the Phase 5 baseline.

---

### Phase 6 – Hooks for Chrona, Metis, Continuum (skeleton only)

**Goal:** Create clear extension points on the canvas for Chrona, Metis, and Continuum, even if their deeper logic is not implemented yet.

**Tasks:**

1. Add placeholder widget kinds / hooks:
   - `ChronaTimelineWidget` – time scrubber / commit history widget.
   - `MetisInsightWidget` – panel showing reasoning/insights about current selection.
   - `ContinuumControlWidget` – controls for running scenarios/automations.

2. Wire:
   - Time cursor in global state to Chrona widget.
   - Selection and twin queries to Metis widget.
   - Scenario selection to Continuum widget.

3. Keep their internal logic minimal or stubbed; focus on contracts and placement.

**Definition of Done (Phase 6):**

- There are visible spots on the canvas or sidebar where Chrona/Metis/Continuum widgets can live.
- Global state supports time cursor and scenario selection in a way those widgets can consume.

---

## 5. Global quality expectations and Definition of Done

The agent must treat these as **non-negotiable** across all phases:

1. **Type safety**
   - All new frontend code is in TypeScript with no `any` unless absolutely necessary (and commented).
   - Shared types for twin entities are defined once and reused.

2. **Code organisation**
   - Clear separation between:
     - `praxisApi` (Tauri IPC and twin calls),
     - canvas runtime and widgets,
     - generic design system components (from shadcn/ui) vs Praxis-specific components.

   - No React components should call Tauri directly; they must go through `praxisApi`.

3. **Styling and design system**

- All UI elements (except highly experimental ones) should use shadcn/ui components or be composed from them. ([Shadcn UI][3])
- All UI elements (except highly experimental ones) should use shadcn/ui components or be composed from them. ([Shadcn UI][3])
- Generate components through the official shadcn CLI (`pnpm dlx shadcn@latest add <component>`) so `components.json` stays in sync with [ui.shadcn.com](https://ui.shadcn.com/) and every primitive (Select, Table, Dialog, etc.) shares the same design tokens.
  - Tailwind classes should be consistent with existing Tailwind config and design tokens.

4. **Testing and linting**
   - All new code must pass existing lint and format checks.
   - Where test frameworks already exist, add at least basic unit or integration tests for:
     - `praxisApi` contracts,
     - core canvas runtime behaviour (smoke tests),
     - critical widgets (GraphWidget, CatalogueWidget).

5. **Documentation**
   - Each phase should add/update short docs as needed:
     - where the main React app entry is,
     - where `praxisApi` lives,
     - how to add a new widget type,
     - how templates are defined.

6. **Incremental, working software**
   - After each phase, the app must **start and be usable** (even if limited).
   - No phase should leave the main branch in a broken state.

---

## 6. Specific instructions to the coding agent

When you (the coding agent) start work:

1. **Read the updated docs first.**
   - This guide, plus the “Praxis Desktop Overview” and any architecture diagrams.
   - Align on terminology: twin, surfaces, widgets, canvas runtime, templates.

2. **Identify the current phase.**
   - Do **not** start work on later phases until the current phase’s Definition of Done is fully met.

3. **Plan before coding.**
   - For each phase, outline:
     - files/modules to add or modify,
     - interfaces to introduce,
     - risk points (e.g. IPC contracts, library integration).

4. **Work in small, coherent steps.**
   - Prefer multiple small, self-contained changes over one large change that spans many concerns.
   - Keep each step buildable and testable.

5. **Follow repository coding standards.**
   - Use the existing package manager, linting, formatting, and testing tools already defined.
   - Do not introduce new tooling unless there is a clear reason and it is documented.

6. **Stay aligned with the canvas-first model.**
   - When in doubt:
     - ask: “Is this a projection over the twin?”
     - ask: “Can this be expressed as a widget on the canvas?”

   - Avoid re-introducing “single A4 page” metaphors or isolated screens that don’t fit into the canvas + widgets + sidebar control plane.

---

You can now drop this doc into the repo and treat it as the playbook for the LLM coding agent. If you’d like, we can next draft a matching `/docs/architecture-overview.md` with diagrams and slightly more business-friendly language for humans, and keep this one as the “agent-facing” implementation spec.

[1]: https://v2.tauri.app/start/create-project/?utm_source=chatgpt.com 'Create a Project'
[2]: https://reactflow.dev/?utm_source=chatgpt.com 'React Flow: Node-Based UIs in React'
[3]: https://ui.shadcn.com/?utm_source=chatgpt.com 'The Foundation for your Design System - shadcn/ui'
[4]: https://tldraw.dev/?utm_source=chatgpt.com 'tldraw: Infinite Canvas SDK for React'
[5]: https://reactflow.dev/api-reference/react-flow?utm_source=chatgpt.com 'The ReactFlow component'
[6]: https://www.shadcn.io/ui?utm_source=chatgpt.com 'Shadcn UI React Components'
