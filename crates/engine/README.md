# Praxis Engine – Aideon Suite module

## Purpose

Praxis Engine is the core time-aware graph engine for Aideon Suite. It owns commits, branches,
snapshots, scenarios, and schema validation for the digital twin.

## Responsibilities

- Maintain the commit graph and snapshot materialisation for the twin.
- Enforce the meta-model and relationship constraints.
- Implement `state_at`, `diff`, and related temporal operations used by Chrona and the canvas.
- Expose traits and types consumed by Aideon Host and other engine crates.

## Relationships

- **Depends on:** Mneme Core for persistence, shared DTOs for commits/refs/snapshots.
- **Used by:** Aideon Host, Praxis Facade, Chrona Visualisation, Metis Analytics, Continuum Orchestrator.

## Running and testing

- Rust tests (crate only): `cargo test -p aideon_engine`
- Workspace Rust checks: `pnpm run host:lint && pnpm run host:check`

## Design and architecture

Praxis Engine follows the time-first commit model described in `Architecture-Boundary.md` and
`docs/DESIGN.md`. Internal modules (graph, commits, meta-model, importer) are outlined in
`crates/engine/DESIGN.md`.
