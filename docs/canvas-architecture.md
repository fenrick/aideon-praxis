Canvas (M1) — Layout, Save, and Time

Overview

- Purpose: Provide an interactive canvas for architectural diagrams with auto‑layout, manual positioning, and save/restore tied to the product’s time‑first model.
- Scope (M1): Nodes rendered as shapes; pan/zoom, selection, marquee, drag with grid snap; ELK‑based auto‑layout; explicit save to host. Edges/groups/z‑order are modeled at the API layer and will be rendered next.

Intent and Principles

- Time‑first: Layout snapshots are saved per asOf (and optional scenario) so canvases can evolve over time without rewriting history.
- Respect placement: The renderer respects existing x/y on load; auto‑layout is a user action or a first‑time bootstrap. Default layout is org.eclipse.elk.rectpacking.
- Boundaries: Layout is a UI concern (elkjs in renderer). Persistence and time/versioning live in the host/worker behind typed IPC and DTOs.
- Replaceable storage: The save API is modeled to allow swapping local JSON persistence for a proper StorageAdapter later without touching UI.

Renderer Design

- ELK wrapper: app/praxis-desktop/src/lib/canvas/layout/elk.ts wraps elkjs (bundled build). API: layoutShapesWithElk(shapes, { algorithm, spacing }).
- Shape store: app/praxis-desktop/src/lib/canvas/shape-store.ts
  - initDefaultShapes()/reloadScene(asOf): fetch raw nodes from host; if all x/y are 0 or missing, run ELK once; otherwise use positions as‑is.
  - relayout(options): re‑run ELK and update positions.
  - saveLayout(asOf, scenario?, docId=default): post current node geometry/z/group to host.
- Scene UI: app/praxis-desktop/src/lib/canvas/Scene.svelte adds Relayout and Save actions, grid spacing overlay, and z‑index style. It receives asOf from MainView for save.

Host/DTOs

- DTOs in Praxis (crates/praxis-engine/src/canvas.rs):
  - CanvasNode { id, typeId, x, y, w, h, z, label?, groupId? }
  - CanvasEdge { id, source, target, label?, z? }
  - CanvasGroup { id, name?, parentId?, z? }
  - CanvasLayoutSaveRequest { docId, asOf, scenario?, nodes[], edges[], groups[] }
- Tauri commands (crates/praxis-host/src/scene.rs):
  - canvas_scene(as_of?): returns raw nodes for bootstrap/demo. Renderer performs layout if needed.
  - canvas_save_layout(payload): persists JSON to OS data dir under AideonPraxis/canvas/<docId>/layout-<asOf>.json.

Scenarios and Time

- Scenarios are branches, not timeline; every saved canvas snapshot is keyed by asOf, with scenario optional.
- Loading defaults: If asOf is omitted by caller, use the product’s notion of “now” (or a graph‑provided date) at the host/worker layer. MainView passes the current worker asOf to Scene to make Save explicit.
- Timeline vs Scenario: A canvas with a timeline is a scenario diagram; default load remains its asOf; dynamic content (e.g., heatmaps/labels) may vary with “now” but geometry remains stable unless user relayouts or moves nodes.

What’s Built vs What’s Next

- Built now
  - ELK layout in renderer (rectpacking default).
  - Respect saved positions; relayout on demand.
  - Save geometry (per asOf) with z/group modeled; host persists JSON snapshot.
  - Grid overlay/spacing; selection/marquee/drag/snap; pan/zoom.
- To do next (high level)
  - Render and edit edges; persist in save payload.
  - Grouping UX (groups of groups): selection, move as a unit, sub‑select, z‑order tools.
  - “Now” source: allow a canvas doc to define its own notion of now; host/worker to resolve default asOf on load.
  - Undo/Blame timeline: append‑only CanvasEvent stream with author/timestamp, enabling time travel and audit. Snapshots can be derived views.
  - StorageAdapter: move persistence behind adapters; swap JSON file for local/remote stores transparently.
  - WebWorker ELK adapter for very large canvases; keep rectpacking the default algorithm.

Developer Notes

- Tests: See app/praxis-desktop/tests/elk.layout.test.ts for ELK sanity; IPC boundary tests allow elkjs in renderer.
- CI: pnpm run ci runs Node lint/typecheck/tests/format and Rust clippy/check/fmt. svelte-check warnings are tracked but non‑blocking for now (deprecated runes patterns/a11y).
- Security: No renderer HTTP; no open ports; typed IPC only. Elkjs is UI‑only.
