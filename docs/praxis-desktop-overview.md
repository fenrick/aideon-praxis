# Praxis Desktop Overview

## Purpose

Provide a very high-level overview of the Praxis Desktop target stack for human readers and point to
the canonical design and implementation documents. Detailed architecture, design decisions, and
phased implementation steps live in ADRs and module/suite design docs.

## Summary

- Desktop shell: Tauri (React UI + Rust host, capabilities locked down).
- UI runtime: React 18 + TypeScript, replacing the historical SvelteKit prototype.
- Canvas engine: React Flow (XYFlow) for node-based canvases.
- Design system: shadcn/ui + Tailwind via `app/AideonDesignSystem`.
- Twin/back-end access: Rust engines via typed Tauri commands wrapped by `praxisApi`.

For full details, see:

- Suite & UX design: `docs/DESIGN.md`, `docs/UX-DESIGN.md`
- Design system: `docs/design-system.md`
- Implementation phases: `docs/praxis-desktop-implementation-guide.md`
- Migration tracker: `docs/praxis-desktop-svelte-migration.md`
- Related ADRs: `ADR-0001` (host migration), `ADR-0004` (design system stack), `ADR-0012` (client–server pivot)
