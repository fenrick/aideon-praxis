# @aideon/app — Desktop UI

Electron host + Svelte renderer for Aideon Praxis. The renderer talks to the
host over a minimal, typed IPC bridge exposed by preload or Tauri. No backend
logic or HTTP calls live in the renderer.

Key points

- Context isolation on; no Node integration in the renderer.
- Strict CSP; assets are served from disk in dev (no dev server).
- Renderer invokes host commands (e.g., temporal `state_at`) via a small bridge
  object attached to `window.aideon`.

Scripts

- `yarn dev` — watch build and run Electron with splash+main windows.
- `yarn build` — typecheck + bundle (Vite/tsup); outputs to `dist/`.
- `yarn test` — unit tests (renderer/adapters).

Testing notes

- Avoid DOM‑heavy tests where possible. Prefer unit tests for state, adapters,
  and preload bridges. See AGENTS.md for guidance.

Security

- No renderer HTTP. Host/worker run locally; desktop mode opens no TCP ports.
- IPC bridge is minimal and typed; see `packages/host/src/lib.rs`.

UI

- Toolbar‑driven layout with grouped icon buttons (ribbon‑like), left sidebar
  tree, main content area, and bottom status bar.
- Icons: Iconify Fluent 2 (`@iconify/svelte` v6). Use regular for idle and
  filled for active/toggled; active adopts `--accent` color.
