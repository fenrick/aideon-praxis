# UI Guidelines

This desktop app uses a modern, toolbar‑driven layout:

- Top toolbar (left‑aligned): grouped icon buttons similar to ribbons. Icons
  are Fluent 2 via Iconify. Idle state uses regular outline; active/toggled
  uses filled variant and picks up the accent color.
- Left sidebar: tree for navigation across catalogues, meta‑model, and views.
- Main content: detail panel for the selected tree item (objects, catalogues,
  meta‑models, visualisations, etc.).
- Bottom status bar: connection/health and short messages.

Icons

- Library: `@iconify/svelte` v6 (Svelte 5‑ready). Use Fluent 2 names:
  - Idle: `fluent:<name>-<size>-regular`
  - Active: `fluent:<name>-<size>-filled`
- Buttons inherit current text color; active state uses `--accent`.

Platform styling

- Windows: we also register `@fluentui/web-components` for native feel.
- macOS (planned): Puppertino‑style components.
- Linux/others (planned): shadcn‑svelte look‑and‑feel.

Renderer boundaries

- No backend logic in the renderer; talk to the host via the typed `window.aideon`
  bridge only. See `app/desktop/src/renderer/tauri-shim.ts`.
