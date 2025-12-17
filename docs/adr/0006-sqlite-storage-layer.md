# ADR-0006: SQLite Storage Layer for Commits/Refs/Snapshots

## Status

Accepted

## Context

Aideon Suite needs an embedded, durable store for commits, refs, and snapshots in desktop mode that:

- Works well with Tauri and local-first usage.
- Can later be migrated to a server-grade backend (e.g., PostgreSQL-family, FoundationDB).
- Keeps schema and DTOs aligned with Mneme Core and Praxis Engine.

Early experiments stored state in memory or ad-hoc files; we need a more principled storage story.

## Decision

Use **SQLite 3 in WAL mode** as the default storage engine for Mneme Core in desktop builds:

- Configure WAL mode with `synchronous=NORMAL` and `foreign_keys=ON`.
- Store commits, refs, and snapshots in dedicated tables (`commits`, `refs`, `snapshots`) using
  `TEXT`/`INTEGER`/`BLOB` columns, with DTOs serialised as JSON blobs where needed.
- Use `INSERT ... ON CONFLICT ...` upserts and simple, portable indexes so the schema can be mapped
  to PostgreSQL-family databases later.

Mneme Core (`crates/mneme`) is responsible for migrations and DDL; Praxis Engine and
other crates use only its repository-style APIs.

## Consequences

- Desktop builds gain an ACID-compliant data store with low operational overhead.
- Server/cloud deployments can swap in different `CommitStore` implementations (e.g., Postgres) by
  recreating the schema and reusing DTO serialisation.
- Schema-specific tuning and migrations must stay in Mneme Core; other crates should not embed raw
  SQL beyond carefully reviewed queries.

## References

- `docs/storage/sqlite.md` – schema and migration details
- `crates/mneme/src/sqlite.rs` – SQLite-specific implementation
- `docs/DESIGN.md` – high-level data/integration overview
