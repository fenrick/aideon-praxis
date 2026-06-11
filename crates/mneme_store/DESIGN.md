# Mneme Store – Internal Design

## Purpose & scope

Mneme Store is the persistence layer for Mneme. It is responsible for database wiring, migrations, and storage performance while remaining isolated from the host UI/runtime.

## Allowed dependencies / frameworks

- Rust 2024 with workspace defaults.
- SeaORM + SQLx (portable, no raw SQL in runtime paths where avoidable).
- `tokio` for async.
- `serde`/`serde_json` for payload encoding where needed.
- `tracing` + `log` facade for observability.

## Constraints and invariants

- No Tauri or renderer dependencies.
- No sockets/servers in desktop mode; store is in-process.
- Schema evolution is forward-only with explicit migrations.
- Partition/workspace scoping is mandatory in storage APIs.
- Time-first semantics are enforced at the storage boundary (valid time + asserted time + layer + scenario).

## Persistence responsibilities

- Maintain append-only ops as the durable source of record.
- Maintain fact tables and derived projections/indexes that are rebuildable.
- Provide bounded queries (limits are explicit; no unbounded scans by default).
- Support job-related persistence primitives required for durable job orchestration.

## Migrations

- Migrations live under `crates/mneme_store/src/migration/`.
- Migration tests must run in CI (at least SQLite).
- Schema manifest snapshots are kept under `crates/mneme_store/schema_manifest.json`.

## Interactions

- Implements Mneme traits defined in `crates/mneme_core`.
- Called by the host (`src-tauri`) through engine adapters/traits.
