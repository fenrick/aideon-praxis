# Mneme Store – Aideon Suite module

## Purpose

Mneme Store provides the **concrete persistence implementation** for Mneme (migrations, database
connections, and storage performance). It implements the Mneme traits using SeaORM/SQLx-backed
datastores (SQLite in desktop mode by default).

## Responsibilities

- Database configuration, connection management, and migrations.
- Durable storage of ops, facts, and derived projections.
- Performance-sensitive read/write paths and indexes.

## Non-responsibilities

- No host IPC wiring (lives in `src-tauri`).
- No renderer/UI dependencies.
- No domain semantics beyond Mneme’s storage rules.

## Running and testing

- Rust tests (crate only): `cargo test -p aideon_mneme_store`
- Workspace checks: `pnpm run host:lint && pnpm run host:check`

## Design and architecture

See `crates/mneme_store/DESIGN.md` and the suite-level storage spec in `crates/mneme/DESIGN.md`.
