# Aideon Praxis — UX Design Ground Rules (M0 → M1)

Date: 2025-10-28

Status: Draft (implements M0 baseline; informs M1 scope)

## Goals

- Feel native and respectful on each OS while retaining a coherent visual language.
- Keep menus and window chrome platform-native where possible; keep the in-content component kit small, fast, and token-driven.
- Allow quick OS “preview” toggles in dev (Style Guide) without rebuilds.

## 1) Window & Chrome

- Menus: use platform-native menus (Tauri Menu API). No HTML top nav.
- Titlebar: default to system window chrome. Allow optional frameless+drag regions per OS in a later ADR.
- Effects: optional per-OS vibrancy/mica when available; keep it opt-in.

## 2) Component Strategies by OS

- Windows-first: Fluent UI Web Components (FAST) for in-content widgets.
- macOS-first: keep native menus + minimalist custom title area; prefer system fonts and restrained controls; Puppertino is acceptable for in-content CSS where needed.
- Neutral: shadcn-svelte style using Tailwind utilities. Tailwind is not loaded globally; it is injected only when Neutral is selected in the Style Guide.

We will not lock into a single third-party kit; we compose small wrappers where needed.

## 3) Theming & Tokens

- Tokens live in `app/desktop/src/lib/styles/tokens.css`. Theme composition and platform overrides live in `app/desktop/src/lib/styles/theme.css`.
- Primary token: `--color-accent` drives primary buttons, focus rings, selected state.
- Platform dev-preview:
  - mac: `--color-accent: #0a84ff`
  - win: `--color-accent: #0078d4`
  - linux: `--color-accent: #16a34a`
- Future: read system theme and accent where APIs permit; allow user override.

## 4) Interaction & A11y

- Keyboard: Cmd on macOS, Ctrl on Windows/Linux. Define accelerators in the native menu.
- Focus rings: use tokenized visible focus; avoid removing outlines.
- Tabs: close affordance must be keyboard-operable.
- Split panes: mouse drag; keyboard adjustment optional (arrows) where a11y rules allow.

## 5) Dev Experience

- A Style Guide window (Debug → UI Style Guide) previews tokens and controls; includes a platform toggle (auto/mac/win/linux) to preview platform accents and token overrides.
- The Style Guide does not ship to production.

## 6) Implementation Notes

- Keep renderer code free of backend logic; use typed IPC only.
- Keep per-OS tweaks purely in CSS tokens or shallow component wrappers; avoid forking components by OS.

## 7) Acceptance

- Switching the Style Guide platform toggle updates `--color-accent` live; Primary buttons, Switches and focus rings visibly change.
- Menus are native on all three OSes.
- Lint/typecheck/tests pass; no “non reactive update” warnings.
- Selecting Windows registers Fluent 2 components; selecting macOS injects Puppertino CSS; selecting Neutral injects Tailwind CSS and removes other injected styles.
- Slot deprecation: tolerated in M0; plan a follow-up to migrate to Svelte 5 snippets in M1.
