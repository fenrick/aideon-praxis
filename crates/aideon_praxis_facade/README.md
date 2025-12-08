# Praxis Facade – Aideon Suite module

## Purpose

Praxis Facade provides a higher-level Rust interface over Praxis Engine and related crates. It
orchestrates common operations so the host and tools can work with a simpler API surface.

## Responsibilities

- Wrap lower-level engine operations (commits, snapshots, queries) in cohesive use-case APIs.
- Coordinate calls into Chrona/Metis/Continuum where composite operations are needed.
- Provide a stable boundary for future server mode without exposing storage internals.

## Relationships

- **Depends on:** Praxis Engine, Mneme Core, and other engine crates as they mature.
- **Used by:** Aideon Host and potential future server/CLI entry points.

## Running and testing

- Rust tests (crate only): `cargo test -p aideon_praxis_facade`
- Workspace checks: `pnpm run host:lint && pnpm run host:check`

## Design and architecture

See `Architecture-Boundary.md` for suite-level layering. As the facade solidifies, extend
`crates/aideon_praxis_facade/DESIGN.md` to describe internal modules and orchestration patterns.
