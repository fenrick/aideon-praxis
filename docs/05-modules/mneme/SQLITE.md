# Mneme SQLite Embedded-Store Specification

SQLite is Mneme's default derived runtime engine — a rebuildable cache of the canonical workspace that holds the op log, entity/edge facts, typed property-fact tables, schema metadata, edge-type rules, projection tables, computed caches, indexed-field tables, analytics support tables, and infrastructure tables (jobs, change feed, HLC state).

Related documents:

- [README](README.md) — module overview
- [RUNTIME-AND-ENGINE](RUNTIME-AND-ENGINE.md) — storage engine trait and runtime lifecycle
- [../../06-adrs/ADR-0004-storage-engine-abstraction.md](../../06-adrs/ADR-0004-storage-engine-abstraction.md)
- [../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)
- [../../04-contracts/PROJECTION-AND-INVALIDATION.md](../../04-contracts/PROJECTION-AND-INVALIDATION.md)
- [../../03-design/DESKTOP-FIRST-WORKSPACE.md](../../03-design/DESKTOP-FIRST-WORKSPACE.md)

---

## Position in the Architecture

The SQLite database is a **derived, same-host-only cache**. It is never synced, never committed to a workspace VCS repository, and is fully rebuildable from the canonical op log. WAL files (`-wal`, `-shm`) and the engine state directory live under `.aideon/runtime` on the host machine.

Content-addressed binary objects live in `objects/sha256/` (referenced by hash) — they are not stored in the database.

---

## Portability Invariants

| Rule | Detail |
| --- | --- |
| Column types | Only `INTEGER`, `TEXT`, `REAL`, `BLOB` (SQLite affinity) |
| ID encoding | TEXT UUID strings (36 chars) on SQLite; UUID native on Postgres; `BINARY(16)` on MySQL — encoded in application code via `id_col()` |
| Valid time | `INTEGER` microseconds since epoch |
| HLC asserted time | `INTEGER` portable i64 (packed HLC) |
| Upserts | `INSERT ... ON CONFLICT` throughout; never raw `INSERT` with retry |
| JSON usage | Limited to metadata/rule-params fields and non-indexed values; never used for structured fact data |
| SQLite WAL | WAL mode is applied at open time; `-wal` / `-shm` files are same-host-only transient state |

---

## ID and Time Encoding

**IDs** are stored as TEXT UUID strings (`string_len(36)`) on SQLite. The `id_col()` helper in the migration crate centralises the per-backend mapping.

**Valid time** uses `INTEGER` microseconds since Unix epoch on all column names ending in `_valid_from`, `_valid_to`, or `_as_of_valid_time`.

**HLC asserted time** uses `INTEGER` — a packed portable i64 produced by `Hlc::as_i64()`. All columns ending in `_asserted_at_hlc`, `_computed_asserted_at_hlc`, or `_built_asserted_at_hlc` carry this encoding.

**Scenario overlay**: a nullable `scenario_id` column appears on every table that participates in scenario reads (entities, edges, facts, projection, index, ops). Baseline rows carry `scenario_id = NULL`; scenario overlay rows carry the scenario UUID.

---

## Migration Management

Migrations are implemented with **SeaORM migrations** in `crates/mneme_store/src/migration/`.

| Migration                       | Contents                                                  |
| ------------------------------- | --------------------------------------------------------- |
| `m20250101_000001_init`         | Full initial schema — all tables and indexes listed below |
| `m20251229_000002_ops_scenario` | Adds `scenario_id` column to `aideon_ops`                 |

Migrations run automatically at store open via `Migrator::up()`. SeaORM tracks its own applied-migration table (`seaql_migrations`). Mneme also maintains `aideon_schema_version` (see below) to record application-level schema versions with HLC timestamps and checksums.

---

## Table Families

### Infrastructure

| Table | Purpose |
| --- | --- |
| `aideon_schema_version` | Application schema version log; columns: `version` (PK, TEXT), `applied_asserted_at_hlc` (INTEGER), `checksum` (TEXT), `app_version` (TEXT nullable) |
| `aideon_partitions` | Registered partitions; columns: `partition_id` (PK), `created_at_asserted` (INTEGER), `created_by_actor` (nullable ID) |
| `aideon_actors` | Actors within a partition; PK: `(partition_id, actor_id)`, plus `metadata_json` (TEXT nullable), `created_at_asserted` (INTEGER) |
| `aideon_hlc_state` | Per-partition HLC watermark; PK: `partition_id`, column: `last_hlc` (INTEGER) |
| `aideon_change_feed` | Ordered change events; PK: `(partition_id, sequence)`, columns: `op_id`, `asserted_at_hlc`, `entity_id` (nullable), `change_kind` (TINYINT), `payload_json` (TEXT nullable) |

### Op Log

| Table | Purpose |
| --- | --- |
| `aideon_ops` | Operation log; PK: `(partition_id, op_id)`, columns: `actor_id`, `asserted_at_hlc`, `tx_id` (nullable), `op_type` (SMALLINT), `payload` (BLOB), `schema_version_hint` (TEXT nullable), `ingested_asserted_at_hlc` (INTEGER nullable), `scenario_id` (nullable — added in migration 2) |
| `aideon_op_deps` | Causal dependencies between ops; PK: `(partition_id, op_id, dep_op_id)` |

### Entities and Edges

| Table | Purpose |
| --- | --- |
| `aideon_entities` | Entity rows; PK: `(partition_id, entity_id)`, scenario overlay via `scenario_id` (nullable), columns include `entity_kind` (TINYINT), `type_id` (nullable), `is_deleted` (BOOLEAN), `acl_group_id` (TEXT nullable), `owner_actor_id` (nullable), `visibility` (TINYINT nullable), `created_op_id`, `updated_op_id`, `created_asserted_at_hlc`, `updated_asserted_at_hlc` |
| `aideon_edges` | Edge rows; PK: `(partition_id, edge_id)`, scenario overlay via `scenario_id` (nullable), columns: `src_entity_id`, `dst_entity_id`, `edge_type_id` (nullable) |
| `aideon_edge_exists_facts` | Bitempoal existence facts for edges; PK: `(partition_id, edge_id, valid_from, asserted_at_hlc, op_id)`, scenario overlay, columns: `valid_to` (nullable), `valid_bucket` (INTEGER nullable), `layer` (TINYINT), `is_tombstone` (BOOLEAN) |

### Typed Property-Fact Tables

Each table holds bitemporal property facts for one value type. They share the same structure — the only difference is the value column.

| Table                   | Value column          | SQLite type                    |
| ----------------------- | --------------------- | ------------------------------ |
| `aideon_prop_fact_str`  | `value_text`          | TEXT                           |
| `aideon_prop_fact_i64`  | `value_i64`           | INTEGER (BIGINT)               |
| `aideon_prop_fact_f64`  | `value_f64`           | REAL (DOUBLE)                  |
| `aideon_prop_fact_bool` | `value_bool`          | INTEGER (BOOLEAN)              |
| `aideon_prop_fact_time` | `value_time`          | INTEGER (BIGINT, microseconds) |
| `aideon_prop_fact_ref`  | `value_ref_entity_id` | TEXT UUID                      |
| `aideon_prop_fact_blob` | `value_blob`          | BLOB                           |
| `aideon_prop_fact_json` | `value_json`          | TEXT                           |

Common columns on all property-fact tables (PK: `(partition_id, entity_id, field_id, valid_from, asserted_at_hlc, op_id)`):

```
partition_id   TEXT  NOT NULL
scenario_id    TEXT  NULL          -- scenario overlay; NULL = baseline
entity_id      TEXT  NOT NULL
field_id       TEXT  NOT NULL
valid_from     INTEGER NOT NULL    -- microseconds
valid_to       INTEGER NULL
valid_bucket   INTEGER NULL
layer          TINYINT NOT NULL
asserted_at_hlc INTEGER NOT NULL   -- packed HLC i64
op_id          TEXT NOT NULL
is_tombstone   BOOLEAN NOT NULL
<value_col>    ...  NOT NULL
```

### Schema Metadata

| Table | Purpose |
| --- | --- |
| `aideon_types` | Type definitions; PK: `(partition_id, type_id)`, columns: `applies_to` (TINYINT), `label` (TEXT), `is_abstract` (BOOLEAN), `is_deleted` (BOOLEAN), `updated_asserted_at_hlc` |
| `aideon_type_extends` | Single-parent type hierarchy; PK: `(partition_id, type_id)`, column: `parent_type_id` |
| `aideon_fields` | Field definitions; PK: `(partition_id, field_id)`, columns: `label`, `value_type` (TINYINT), `cardinality` (TINYINT), `merge_policy` (TINYINT), `is_indexed` (BOOLEAN), `disallow_overlap` (BOOLEAN), `is_deleted` (BOOLEAN), `updated_asserted_at_hlc` |
| `aideon_type_fields` | Field bindings to types; PK: `(partition_id, type_id, field_id)`, columns: `is_required`, `override_default`, `tighten_required`, `disallow_overlap` (nullable), per-type default value columns (one per value type, all nullable), `updated_asserted_at_hlc` |
| `aideon_effective_schema_cache` | Materialised effective schema blobs; PK: `(partition_id, type_id, schema_version_hash)`, columns: `blob` (BLOB), `built_asserted_at_hlc` |
| `aideon_type_schema_head` | Current schema version hash per type; PK: `(partition_id, type_id)`, columns: `schema_version_hash`, `updated_asserted_at_hlc` |
| `aideon_metamodel_versions` | Applied metamodel version log; PK: `(partition_id, version)`, columns: `source` (TEXT nullable), `op_id` (nullable), `created_asserted_at_hlc` |

### Edge-Type Semantics

| Table | Purpose |
| --- | --- |
| `aideon_edge_type_rules` | Allowed endpoint types and direction semantics per edge type; PK: `(partition_id, edge_type_id)`, columns: `allowed_src_type_ids_json` (TEXT), `allowed_dst_type_ids_json` (TEXT), `semantic_direction` (TEXT nullable) |

### Projection and Analytics

| Table | Purpose |
| --- | --- |
| `aideon_graph_projection_edges` | Materialised view of currently-active edges for graph algorithms; PK: `(partition_id, edge_id)`, scenario overlay, columns: `src_entity_id`, `dst_entity_id`, `edge_type_id` (nullable), `weight` (REAL, default 1.0), `updated_asserted_at_hlc` |
| `aideon_pagerank_runs` | PageRank run metadata; PK: `(partition_id, run_id)`, columns: `as_of_valid_time` (nullable), `as_of_asserted_at_hlc` (nullable), `params_json`, `created_asserted_at_hlc` |
| `aideon_pagerank_scores` | PageRank scores per entity per run; PK: `(partition_id, run_id, entity_id)`, column: `score` (REAL) |
| `aideon_graph_degree_stats` | Degree statistics per entity; PK: `(partition_id, scenario_id, entity_id, as_of_valid_time)`, columns: `out_degree`, `in_degree` (INTEGER), `computed_asserted_at_hlc` |
| `aideon_graph_edge_type_counts` | Edge counts per type per scenario; PK: `(partition_id, scenario_id, edge_type_id)`, columns: `count` (INTEGER), `computed_asserted_at_hlc` |

### Integrity

| Table | Purpose |
| --- | --- |
| `aideon_integrity_runs` | Integrity check run metadata; PK: `(partition_id, run_id)`, scenario overlay, columns: `as_of_valid_time` (nullable), `as_of_asserted_at_hlc` (nullable), `params_json`, `created_asserted_at_hlc` |
| `aideon_integrity_findings` | Individual findings from an integrity run; columns: `partition_id`, `run_id`, `finding_type` (TEXT), `severity` (TINYINT), `subject_entity_id` (nullable), `details_json` |
| `aideon_integrity_head` | Most recent integrity run per partition/scenario; PK: `(partition_id, scenario_id)`, columns: `run_id`, `updated_asserted_at_hlc` |

### Validation and Computed Rules

| Table | Purpose |
| --- | --- |
| `aideon_validation_rules` | Declared validation rules; PK: `(partition_id, rule_id)`, columns: `scope_kind` (TINYINT), `scope_id` (nullable), `severity` (TINYINT), `template_kind` (TEXT), `params_json`, `updated_asserted_at_hlc` |
| `aideon_computed_rules` | Computed field derivation rules; PK: `(partition_id, rule_id)`, columns: `target_type_id` (nullable), `output_field_id` (nullable), `template_kind`, `params_json`, `updated_asserted_at_hlc` |

### Computed Caches

One cache table per value type. These hold pre-computed derived fact values keyed by the rule version hash that produced them. PK: `(partition_id, entity_id, field_id, valid_from, rule_version_hash)`.

| Table                        | Value column          | SQLite type |
| ---------------------------- | --------------------- | ----------- |
| `aideon_computed_cache_str`  | `value_text`          | TEXT        |
| `aideon_computed_cache_i64`  | `value_i64`           | INTEGER     |
| `aideon_computed_cache_f64`  | `value_f64`           | REAL        |
| `aideon_computed_cache_bool` | `value_bool`          | INTEGER     |
| `aideon_computed_cache_time` | `value_time`          | INTEGER     |
| `aideon_computed_cache_ref`  | `value_ref_entity_id` | TEXT UUID   |
| `aideon_computed_cache_blob` | `value_blob`          | BLOB        |
| `aideon_computed_cache_json` | `value_json`          | TEXT        |

Common computed-cache columns: `partition_id`, `entity_id`, `field_id`, `valid_from`, `valid_to` (nullable), `<value_col>`, `rule_version_hash` (TEXT), `computed_asserted_at_hlc` (INTEGER).

### Indexed Fields

One index table per value type. These support fast lookup-by-value queries for fields marked `is_indexed = true`. PK: `(partition_id, field_id, entity_id, valid_from, asserted_at_hlc)`.

| Table                   | Value column          | SQLite type       |
| ----------------------- | --------------------- | ----------------- |
| `aideon_idx_field_str`  | `value_text_norm`     | TEXT (normalised) |
| `aideon_idx_field_i64`  | `value_i64`           | INTEGER           |
| `aideon_idx_field_f64`  | `value_f64`           | REAL              |
| `aideon_idx_field_bool` | `value_bool`          | INTEGER           |
| `aideon_idx_field_time` | `value_time`          | INTEGER           |
| `aideon_idx_field_ref`  | `value_ref_entity_id` | TEXT UUID         |

Common indexed-field columns (in schema order): `partition_id`, `scenario_id` (nullable), `field_id`, `<value_col>`, `entity_id`, `valid_from`, `valid_to` (nullable), `valid_bucket` (nullable), `asserted_at_hlc`, `layer` (TINYINT).

### Background Jobs

| Table | Purpose |
| --- | --- |
| `aideon_jobs` | Persistent job queue; PK: `(partition_id, job_id)`, columns: `job_type` (TEXT), `status` (TINYINT), `priority` (INTEGER), `attempts`, `max_attempts`, `lease_expires_at` (nullable), `next_run_after` (nullable), `created_asserted_at_hlc`, `updated_asserted_at_hlc`, `payload` (BLOB), `dedupe_key` (TEXT nullable), `last_error` (TEXT nullable); unique index on `(partition_id, job_type, dedupe_key, status)` |
| `aideon_job_events` | Per-job event log; PK: `(partition_id, job_id, event_time)`, column: `message` (TEXT) |

---

## Key Indexes

The init migration creates the following secondary indexes in addition to the primary keys above. All are non-unique unless noted.

**Op log**

- `(partition_id, asserted_at_hlc)` — timeline scan
- `(partition_id, actor_id, asserted_at_hlc)` — per-actor timeline
- `(partition_id, tx_id)` — transaction lookup

**Entities**

- `(partition_id, entity_kind, type_id)` — kind/type filter
- `(partition_id, updated_asserted_at_hlc)` — recency scan

**Edges**

- `(partition_id, src_entity_id, edge_type_id, edge_id)` — outbound traversal
- `(partition_id, dst_entity_id, edge_type_id, edge_id)` — inbound traversal
- `(partition_id, edge_type_id, edge_id)` — type scan

**Edge-exists facts**

- `(partition_id, edge_id, valid_from)`
- `(partition_id, edge_id, valid_to)`
- `(partition_id, valid_from)`
- `(partition_id, valid_bucket)`

**Property-fact tables** (shared pattern applied to all eight tables)

- `_from_idx`: `(partition_id, scenario_id, entity_id, field_id, valid_from)`
- `_to_idx`: `(partition_id, scenario_id, entity_id, field_id, valid_to)`
- `_field_from_idx`: `(partition_id, scenario_id, field_id, valid_from)`
- `_field_to_idx`: `(partition_id, scenario_id, field_id, valid_to)`
- `_bucket_idx`: `(partition_id, valid_bucket)`

**Schema tables**

- Types: `(partition_id, applies_to, type_id)`, `(partition_id, label)`
- Fields: `(partition_id, value_type)`, `(partition_id, label)`
- Type-extends: `(partition_id, parent_type_id)`
- Type-fields: `(partition_id, type_id)`, `(partition_id, field_id)`

**Graph projection**

- `(partition_id, scenario_id, src_entity_id)`
- `(partition_id, scenario_id, dst_entity_id)`
- `(partition_id, scenario_id, edge_type_id, src_entity_id)`

**Indexed-field tables** (per table)

- `_entity_idx`: `(partition_id, scenario_id, field_id, entity_id)`
- `_bucket_idx`: `(partition_id, valid_bucket)`
- `_lookup_idx`: `(partition_id, scenario_id, field_id, <value_col>)` — enables value-equality lookup

**Jobs**

- `(partition_id, status, priority, created_asserted_at_hlc)` — pending queue
- `(partition_id, status, next_run_after, priority)` — ready-to-run queue
- `(partition_id, lease_expires_at)` — lease expiry
- `(partition_id, job_type, dedupe_key, status)` UNIQUE — deduplication

---

## File Locations and Configuration

The config file for the store is `mneme.json`, located in the Mneme base directory (typically `.aideon/runtime/` within the workspace). On first open, `MnemeConfig::load_or_init()` creates the file with SQLite defaults if it does not exist.

```jsonc
// SQLite (default — path relative to base dir, or absolute)
{
  "database": { "backend": "sqlite", "path": "praxis.sqlite" },
  "pool": {
    "max_connections": 10,
    "min_connections": 1,
    "connect_timeout_ms": 1000,
    "acquire_timeout_ms": 1000,
    "idle_timeout_ms": 60000,
  },
  "limits": {
    "max_op_payload_bytes": 1048576,
    "max_blob_bytes": 4194304,
    "max_mv_values": 100,
    "max_pending_jobs": 10000,
    "max_ingest_batch": 5000,
  },
  "integrity": { "record_overlap_warnings": true },
  "validation_mode": "error",
}
```

```jsonc
// Hosted Postgres (optional adapter only — same Mneme API)
{
  "database": { "backend": "postgres", "url": "postgres://user:pass@host/db" },
}
```

`MnemeConfig::sqlite_path()` resolves relative paths against the base directory. Absolute paths are used as-is. The default filename when no path is specified is `praxis.sqlite`.

WAL files (`praxis.sqlite-wal`, `praxis.sqlite-shm`) are co-located with the database file and are same-host transient state — they are never synced, versioned, or included in workspace exports.

---

## Portability Checklist

- [ ] All columns use only `INTEGER`, `TEXT`, `REAL`, or `BLOB`
- [ ] IDs and HLC values are encoded and decoded in application code (`id_col()`, `Hlc::as_i64()`)
- [ ] Upserts use `INSERT ... ON CONFLICT`
- [ ] JSON is limited to metadata/params fields; no structured fact data in JSON columns
- [ ] SQLite-specific functions are not used in core query logic
- [ ] WAL files are excluded from workspace sync and export
- [ ] No binary content larger than `max_blob_bytes` is stored inline; large objects use `objects/sha256/` with hash reference
