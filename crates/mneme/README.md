# Mneme Core – Aideon Suite module

## Purpose

Mneme Core is the persistence layer for Aideon Suite. It provides commit/ref/snapshot storage,
backed by SQLite today, and exposes shared DTOs used by higher-level engine crates.

## Responsibilities

- Define storage schemas and migrations for commits, refs, snapshots, and analytics events.
- Provide repository-style APIs to Praxis Engine and related crates.
- Hide database specifics behind well-defined traits so backends can be swapped.

## Relationships

- **Depends on:** SQLite/SeaORM (or other persistence libs as they are added).
- **Used by:** Praxis Engine, Metis Analytics, Continuum Orchestrator, Praxis Facade.

## Running and testing

- Rust tests (crate only): `cargo test -p aideon_mneme`
- Workspace checks: `pnpm run host:lint && pnpm run host:check`

## Design and architecture

Persistence and schema rules are described at a high level in `docs/storage/sqlite.md` and
`docs/meta/README.md`. As Mneme evolves, extend `crates/mneme/DESIGN.md` to capture
table layouts, migration strategy, and performance constraints.
