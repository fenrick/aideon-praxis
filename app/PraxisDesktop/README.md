# @aideon/PraxisDesktop – Aideon Suite module

## Purpose

Praxis Desktop is the legacy SvelteKit SPA bundle for the Aideon Praxis desktop app. It is kept on
life support while the React-based Praxis Canvas under `app/PraxisCanvas` fully replaces it.
Changes here should be limited to maintenance required to keep the desktop build operational.

## Responsibilities

- Provide the existing Svelte-based renderer until React Canvas achieves full parity.
- Talk to the Tauri host via `@tauri-apps/api/core` helper modules under `src/lib/ports/**`.
- Respect security constraints: no renderer HTTP, no backend logic in the renderer, strict CSP.

## Relationships

- **Depends on:** Tauri host IPC, Praxis Adapters/Praxis DTOs (where wired).
- **Used by:** Desktop bundle during the Svelte → React migration period.

## Running and testing

- Dev server: `pnpm --filter @aideon/PraxisDesktop dev`
- Build: `pnpm --filter @aideon/PraxisDesktop build`
- Tests: `pnpm --filter @aideon/PraxisDesktop test`

Avoid DOM-heavy tests where possible; prefer unit tests for state, adapters, and preload bridges
(see `AGENTS.md` and `docs/testing-strategy.md`).

## Design and architecture

Historic UX/layout rules for Praxis Desktop are captured in `docs/UX-DESIGN.md` and
`docs/praxis-desktop-svelte-migration.md`. New UX and design-system work must target Praxis Canvas
and the Aideon Design System instead of extending this Svelte renderer.

## Related global docs

- Suite design: `docs/DESIGN.md`
- Architecture and layering: `Architecture-Boundary.md`
- UX goals: `docs/UX-DESIGN.md`
- Testing strategy: `docs/testing-strategy.md`
