# @aideon/app — Desktop UI (SvelteKit)

SvelteKit SPA bundle for the Aideon Praxis desktop app. The renderer talks to
the Tauri host over a minimal, typed IPC bridge. No backend logic or HTTP calls
live in the renderer.

Key points

- Context isolation on; no Node integration in the renderer.
- Strict CSP; assets are served from disk in dev (no dev server).
- Renderer invokes host commands (e.g., temporal `state_at`) via a small bridge
  object attached to `window.aideon`.

Scripts

- `pnpm --filter @aideon/app dev` — `svelte-kit dev` with static adapter fallback.
- `pnpm --filter @aideon/app build` — `svelte-kit build` (adapter-static to `dist/renderer`).
- `pnpm --filter @aideon/app test` — unit tests (renderer/adapters).

Testing notes

- Avoid DOM‑heavy tests where possible. Prefer unit tests for state, adapters,
  and preload bridges. See AGENTS.md for guidance.

Security

- No renderer HTTP. Host/worker run locally; desktop mode opens no TCP ports.
- IPC bridge is minimal and typed; see `crates/tauri/src/lib.rs`.

UI

- Toolbar‑driven layout with grouped icon buttons (ribbon‑like), left sidebar
  tree, main content area, and bottom status bar.
- Icons: Iconify Fluent 2 (`@iconify/svelte` v6). Use regular for idle and
  filled for active/toggled; active adopts `--accent` color.

Canvas & Layout (M1)

- Auto‑layout is handled client‑side via elkjs (default: `org.eclipse.elk.rectpacking`).
- The renderer respects existing positions; “Relayout” is an explicit user action or a first‑time bootstrap when nodes have no geometry.
- “Save layout” persists geometry per `asOf` to the host. The host writes a JSON snapshot under the OS app data folder. Storage is behind a DTO so it can be swapped later.
- API/data model (modeled in Rust DTOs) includes nodes, edges, and groups (including nested groups). Rendering currently focuses on nodes; edges/groups are next.

Paths

- ELK wrapper: `src/lib/canvas/layout/elk.ts`
- Shape store: `src/lib/canvas/shape-store.ts` (`relayout`, `saveLayout`, `reloadScene`)
- Scene controls: `src/lib/canvas/Scene.svelte` (Relayout/Save buttons)

Dev

- Dev server: `pnpm --filter @aideon/app dev`
- Typecheck: `pnpm --filter @aideon/app check`
- Tests: `pnpm --filter @aideon/app test`
