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
