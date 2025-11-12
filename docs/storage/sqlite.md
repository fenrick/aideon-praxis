# SQLite Storage Layer

## Decision summary

- **Engine**: SQLite 3 in WAL mode with `synchronous=NORMAL` and `foreign_keys=ON` via the
  `aideon-mneme` crate (`crates/mneme`).
- **Why**: Gives us an embedded, ACID-compliant database for desktop builds while keeping the
  schema portable to PostgreSQL-family databases (or FoundationDB) when we stand up cloud-hosted
  workers.
- **Scope**: Persists commit metadata, branch refs, and serialized snapshots inside a single
  `praxis.sqlite` file managed by the host.

## Schema (migration v1)

```sql
CREATE TABLE commits (
  commit_id     TEXT PRIMARY KEY,
  branch        TEXT NOT NULL,
  parents_json  TEXT NOT NULL,
  author        TEXT,
  time          TEXT,
  message       TEXT NOT NULL,
  tags_json     TEXT NOT NULL,
  change_count  INTEGER NOT NULL,
  summary_json  TEXT NOT NULL,
  changes_json  TEXT NOT NULL
);
CREATE INDEX commits_branch_idx ON commits(branch);
CREATE INDEX commits_time_idx   ON commits(time);
CREATE INDEX commits_parent_idx ON commits(parents_json);

CREATE TABLE refs (
  branch        TEXT PRIMARY KEY,
  commit_id     TEXT,
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE snapshots (
  snapshot_key  TEXT PRIMARY KEY,
  bytes         BLOB NOT NULL
);
```

All JSON blobs hold the canonical DTOs (`CommitSummary`, `ChangeSet`), so migrating to Postgres or
CockroachDB later only requires replaying migrations + COPY/ingest.

## Migration + DDL management

- Implemented with `rusqlite_migration`; see `run_migrations` in `crates/mneme/src/sqlite.rs`.
- Every schema change gets its own migration entry. Keep SQL portable and avoid SQLite-specific
  functions in production queries (other than `strftime('%s','now')` used for `updated_at`).

## Portability checklist

1. Stick to `INTEGER`, `TEXT`, `REAL`, `BLOB` columns.
2. Keep app-generated IDs (BLAKE3) and ISO-8601 timestamps so other engines do not inject metadata.
3. Use `INSERT ... ON CONFLICT ...` for upserts—works in both SQLite and PostgreSQL.
4. Keep JSON logic in views/DAOs, not scattered SQL fragments.
5. Track snapshot metadata in the `snapshot_tags` table so every logical snapshot maps back to a commit/tag combination instead of storing raw blobs.
6. Wrap search/full-text needs behind a DAO so we can swap SQLite FTS5 for `tsvector` later.

## File locations

Desktop mode stores everything under `AppData/AideonPraxis/.praxis/praxis.sqlite`. The Tauri host
(`crates/tauri/src/worker.rs`) creates the directory and opens the DB at startup via
`aideon_mneme::SqliteDb::open`.

For server/cloud deployments, point `PraxisEngine::with_sqlite` at any mounted volume or swap in a
new `CommitStore` implementation (e.g., Postgres, FoundationDB) while keeping the same trait.

## Future swaps

- **Managed Postgres / Distributed SQL**: Recreate the schema, store JSON columns as `jsonb`, add
  GIN indexes for schema-aware queries, and reuse the same `CommitStore` trait.
- **FoundationDB**: Map commits/refs/snapshots to hierarchical keys (`/commits/<id>`, etc.) inside a
  transactional KV store; reuse hashing + serialization logic.

Document any deviations from these rules in the relevant ADR/plan updates so Guardrail WS-A stays in
sync with persistence changes.
