# SQLite specification

The schema of Mneme's default derived-runtime engine: the table families, indexes, WAL configuration, migrations, and the foreign-key, uniqueness, and JSON-column constraints that hold it together. SQLite is the **current default** derived-runtime cache behind Mneme's storage trait — not the datastore. The workspace folder is the datastore ([canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)); this database is a rebuildable cache of it.

> **Filename note.** This file is referenced as `SQLITE.md` (uppercase) because the repository host's filesystem is case-insensitive: a lowercase `sqlite.md` would collide with this name. Incoming cross-links point here, and this file carries the full content.

---

## Position in the architecture

The SQLite database is a **derived, same-host-only cache**. It is never synced, never committed to a workspace VCS repository, and is fully rebuildable from the canonical op log ([derived-runtime-and-projections](./derived-runtime-and-projections.md)). WAL files (`-wal`, `-shm`) and the engine state directory live under `.aideon/runtime/` on the host machine. Content-addressed binary objects live in `objects/sha256/` and are referenced by hash, never stored in the database ([content-addressed-blobs](./content-addressed-blobs.md)).

The schema follows SQLite's official guidance for WAL mode and pragmas (SQLite official documentation), the normative reference for this engine's configuration.

---

## Portability invariants

The schema is written to be portable across the candidate engines and the optional hosted PostgreSQL adapter ([RUNTIME-AND-ENGINE](./RUNTIME-AND-ENGINE.md), [ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)). The rules:

| Rule              | Detail                                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Column types      | Only `INTEGER`, `TEXT`, `REAL`, `BLOB` (SQLite affinity).                                                                           |
| ID encoding       | TEXT UUID strings (36 chars) on SQLite; UUID native on Postgres; `BINARY(16)` on MySQL — chosen in application code via `id_col()`. |
| Valid time        | `INTEGER` microseconds since epoch.                                                                                                 |
| HLC asserted time | `INTEGER` portable packed `i64` ([bitemporal-and-hlc](./bitemporal-and-hlc.md)).                                                    |
| Upserts           | `INSERT … ON CONFLICT` throughout; never a raw `INSERT` with retry.                                                                 |
| JSON usage        | Limited to metadata and rule-params fields and non-indexed values; **never** structured fact data.                                  |
| WAL               | WAL mode is applied at open time; `-wal` / `-shm` are same-host-only transient state.                                               |

The deliberate constraint named: keeping structured fact data **out** of JSON columns costs some authoring convenience (a fact's value cannot be an arbitrary nested document) but buys typed, indexable, range-scannable fact tables — the property the resolver depends on ([op-fact-schema-model](./op-fact-schema-model.md)). JSON is permitted only where the value is genuinely opaque metadata.

---

## ID and time encoding

- **IDs** are TEXT UUID strings (`string_len(36)`) on SQLite; the `id_col()` helper centralises the per-backend mapping.
- **Valid time** is `INTEGER` microseconds since the Unix epoch on every column ending `_valid_from`, `_valid_to`, or `_as_of_valid_time`.
- **HLC asserted time** is `INTEGER` — the packed `i64` from `Hlc::as_i64()` — on every column ending `_asserted_at_hlc`, `_computed_asserted_at_hlc`, or `_built_asserted_at_hlc`.
- **Scenario overlay** is a nullable `scenario_id` column on every table that participates in scenario reads. Baseline rows carry `scenario_id = NULL`; overlay rows carry the scenario UUID ([scenarios-and-layers](./scenarios-and-layers.md)).

Partition isolation runs through every primary key: `partition_id` is the first key column on every table, so one workspace's rows never resolve against another's, and a per-partition scan is an index prefix.

---

## Migrations

Migrations use **SeaORM migrations** in `crates/mneme_store/src/migration/`. They run automatically at store open via `Migrator::up()`; SeaORM tracks its applied-migration table (`seaql_migrations`). Mneme also maintains `aideon_schema_version` to record application-level schema versions with HLC timestamps and checksums.

| Migration                       | Contents                                                |
| ------------------------------- | ------------------------------------------------------- |
| `m20250101_000001_init`         | The full initial schema — all tables and indexes below. |
| `m20251229_000002_ops_scenario` | Adds `scenario_id` to `aideon_ops`.                     |

Migrations are forward-only, versioned per [ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md) (Semantic Versioning 2.0.0); a schema newer than the binary understands is rejected with `SCHEMA_TOO_NEW` rather than partially interpreted ([failure-modes](./failure-modes.md)).

---

## Table families

### Infrastructure

| Table                   | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aideon_schema_version` | Application schema-version log; `version` (PK), `applied_asserted_at_hlc`, `checksum`, `app_version` (nullable).                                                                                                                                                                                                                                                                                                                                                                   |
| `aideon_partitions`     | Registered partitions; `partition_id` (PK), `created_at_asserted`, `created_by_actor` (nullable).                                                                                                                                                                                                                                                                                                                                                                                  |
| `aideon_actors`         | Actors within a partition; PK `(partition_id, actor_id)`, `metadata_json` (nullable), `created_at_asserted`.                                                                                                                                                                                                                                                                                                                                                                       |
| `aideon_hlc_state`      | Per-partition HLC watermark; PK `partition_id`, `last_hlc` (nullable — unset on an empty partition). The monotonicity anchor for `Hlc::now()`, scoped to `(workspace_id, partition_id)`. **Derived runtime state**: on rebuild it is restored to `max(asserted_at)` across the partition's valid canonical operations before write-enable, never authority over the op log ([bitemporal-and-hlc](./bitemporal-and-hlc.md), [ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md)). |
| `aideon_change_feed`    | Ordered change events; PK `(partition_id, sequence)`, `op_id`, `asserted_at_hlc`, `entity_id` (nullable), `change_kind`, `payload_json` (nullable).                                                                                                                                                                                                                                                                                                                                |

### Op log

| Table            | Purpose                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aideon_ops`     | The operation log; PK `(partition_id, op_id)`, `actor_id`, `asserted_at_hlc`, `tx_id` (nullable), `op_type`, `payload` (BLOB), `schema_version_hint` (nullable), `ingested_asserted_at_hlc` (nullable), `scenario_id` (nullable). The `(partition_id, op_id)` PK is what makes ingest idempotent ([export-import-replay](./export-import-replay.md)). |
| `aideon_op_deps` | Causal dependencies between ops; PK `(partition_id, op_id, dep_op_id)`.                                                                                                                                                                                                                                                                               |

### Entities and edges

| Table                      | Purpose                                                                                                                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aideon_entities`          | Entity rows; PK `(partition_id, entity_id)`, scenario overlay via `scenario_id`; `entity_kind`, `type_id` (nullable), `is_deleted`, `created_op_id`, `updated_op_id`, `created_asserted_at_hlc`, `updated_asserted_at_hlc`. |
| `aideon_edges`             | Edge rows; PK `(partition_id, edge_id)`, scenario overlay; `src_entity_id`, `dst_entity_id`, `edge_type_id` (nullable).                                                                                                     |
| `aideon_edge_exists_facts` | Bitemporal existence facts for edges; PK `(partition_id, edge_id, valid_from, asserted_at_hlc, op_id)`, scenario overlay; `valid_to` (nullable), `valid_bucket` (nullable), `layer`, `is_tombstone`.                        |

### Typed property-fact tables

One table per value type; identical structure but for the value column. The split keeps each value type indexable and range-scannable ([op-fact-schema-model](./op-fact-schema-model.md)).

| Table                   | Value column          | SQLite type      |
| ----------------------- | --------------------- | ---------------- |
| `aideon_prop_fact_str`  | `value_text`          | TEXT             |
| `aideon_prop_fact_i64`  | `value_i64`           | INTEGER          |
| `aideon_prop_fact_f64`  | `value_f64`           | REAL             |
| `aideon_prop_fact_bool` | `value_bool`          | INTEGER          |
| `aideon_prop_fact_time` | `value_time`          | INTEGER (micros) |
| `aideon_prop_fact_ref`  | `value_ref_entity_id` | TEXT UUID        |
| `aideon_prop_fact_blob` | `value_blob`          | BLOB             |
| `aideon_prop_fact_json` | `value_json`          | TEXT             |

Common columns (PK `(partition_id, entity_id, field_id, valid_from, asserted_at_hlc, op_id)` — the bitemporal key):

```text
partition_id    TEXT    NOT NULL
scenario_id     TEXT    NULL          -- scenario overlay; NULL = baseline
entity_id       TEXT    NOT NULL
field_id        TEXT    NOT NULL
valid_from      INTEGER NOT NULL      -- microseconds
valid_to        INTEGER NULL          -- NULL = open-ended (widest interval)
valid_bucket    INTEGER NULL
layer           TINYINT NOT NULL
asserted_at_hlc INTEGER NOT NULL      -- packed HLC i64
op_id           TEXT    NOT NULL
is_tombstone    BOOLEAN NOT NULL
<value_col>     …       NOT NULL
```

The PK includes both time axes (`valid_from`, `asserted_at_hlc`) and `op_id`, so the four-rule resolution chain has a deterministic key to order on, down to the op-id tie-break ([bitemporal-and-hlc](./bitemporal-and-hlc.md)).

### Schema metadata

| Table                           | Purpose                                                                                                                                                                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `aideon_types`                  | Type definitions; PK `(partition_id, type_id)`; `applies_to`, `label`, `is_abstract`, `is_deleted`, `updated_asserted_at_hlc`.                                                                                                                                                                               |
| `aideon_type_extends`           | Single-parent hierarchy; PK `(partition_id, type_id)`, `parent_type_id`. Cycle detection runs in application code.                                                                                                                                                                                           |
| `aideon_fields`                 | Field definitions; PK `(partition_id, field_id)`; `label`, `value_type`, `cardinality`, `is_indexed`, `disallow_overlap`, `is_deleted`, `updated_asserted_at_hlc`. No `merge_policy` column — the convergence axis is M6, not MVP ([ADR-0034](../../06-adrs/ADR-0034-merge-correctness-and-convergence.md)). |
| `aideon_type_fields`            | Field bindings to types; PK `(partition_id, type_id, field_id)`; `is_required`, `override_default`, `tighten_required`, `disallow_overlap` (nullable), per-type default columns, `updated_asserted_at_hlc`.                                                                                                  |
| `aideon_effective_schema_cache` | Materialised effective-schema blobs; PK `(partition_id, type_id, schema_version_hash)`; `blob`, `built_asserted_at_hlc`. Derived; rebuilt from the metamodel.                                                                                                                                                |
| `aideon_type_schema_head`       | Current schema-version hash per type; PK `(partition_id, type_id)`; `schema_version_hash`, `updated_asserted_at_hlc`.                                                                                                                                                                                        |
| `aideon_metamodel_versions`     | Applied metamodel-version log; PK `(partition_id, version)`; `source` (nullable), `op_id` (nullable), `created_asserted_at_hlc`.                                                                                                                                                                             |

### Edge-type semantics

| Table                    | Purpose                                                                                                                                                                                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aideon_edge_type_rules` | Allowed endpoint types and direction per edge type; PK `(partition_id, edge_type_id)`; `allowed_src_type_ids_json`, `allowed_dst_type_ids_json`, `semantic_direction` (nullable). The endpoint allow-lists are JSON because they are opaque sets, not structured fact data. |

### Projection and analytics

| Table                           | Purpose                                                                                                                                                                                                                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aideon_graph_projection_edges` | Materialised currently-active edges for graph algorithms; PK `(partition_id, edge_id)`, scenario overlay; `src_entity_id`, `dst_entity_id`, `edge_type_id` (nullable), `weight` (default 1.0), `updated_asserted_at_hlc`. The adjacency Metis reads ([RUNTIME-AND-ENGINE](./RUNTIME-AND-ENGINE.md)). |
| `aideon_pagerank_runs`          | PageRank run metadata; PK `(partition_id, run_id)`; `as_of_valid_time` (nullable), `as_of_asserted_at_hlc` (nullable), `params_json`, `created_asserted_at_hlc`.                                                                                                                                     |
| `aideon_pagerank_scores`        | Scores per entity per run; PK `(partition_id, run_id, entity_id)`, `score`.                                                                                                                                                                                                                          |
| `aideon_graph_degree_stats`     | Degree statistics; PK `(partition_id, scenario_id, entity_id, as_of_valid_time)`; `out_degree`, `in_degree`, `computed_asserted_at_hlc`.                                                                                                                                                             |
| `aideon_graph_edge_type_counts` | Edge counts per type per scenario; PK `(partition_id, scenario_id, edge_type_id)`; `count`, `computed_asserted_at_hlc`.                                                                                                                                                                              |

### Integrity, validation, and computed rules

| Table                       | Purpose                                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `aideon_integrity_runs`     | Integrity-run metadata; PK `(partition_id, run_id)`, scenario overlay; `as_of_valid_time` (nullable), `as_of_asserted_at_hlc` (nullable), `params_json`, `created_asserted_at_hlc`.  |
| `aideon_integrity_findings` | Findings from a run; `partition_id`, `run_id`, `finding_type`, `severity`, `subject_entity_id` (nullable), `details_json`.                                                           |
| `aideon_integrity_head`     | Most recent run per partition/scenario; PK `(partition_id, scenario_id)`; `run_id`, `updated_asserted_at_hlc`.                                                                       |
| `aideon_validation_rules`   | Declared validation rules; PK `(partition_id, rule_id)`; `scope_kind`, `scope_id` (nullable), `severity`, `template_kind`, `params_json`, `updated_asserted_at_hlc`.                 |
| `aideon_computed_rules`     | Computed-field derivation rules; PK `(partition_id, rule_id)`; `target_type_id` (nullable), `output_field_id` (nullable), `template_kind`, `params_json`, `updated_asserted_at_hlc`. |

Integrity scores are Inferred content on the unified scale ([DOCUMENTATION-STANDARD §8](../../02-standards/DOCUMENTATION-STANDARD.md), [ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)); these tables cache the runs, not author them.

### Computed caches and indexed fields

One **computed-cache** table per value type (`aideon_computed_cache_str`, `…_i64`, `…_f64`, `…_bool`, `…_time`, `…_ref`, `…_blob`, `…_json`), holding pre-computed derived values keyed by the rule-version hash that produced them. PK `(partition_id, entity_id, field_id, valid_from, rule_version_hash)`; common columns `valid_to` (nullable), `<value_col>`, `rule_version_hash`, `computed_asserted_at_hlc`.

One **indexed-field** table per value type (`aideon_idx_field_str`, `…_i64`, `…_f64`, `…_bool`, `…_time`, `…_ref`), supporting fast lookup-by-value for fields marked `is_indexed = true`. PK `(partition_id, field_id, entity_id, valid_from, asserted_at_hlc)`; columns in schema order `partition_id`, `scenario_id` (nullable), `field_id`, `<value_col>`, `entity_id`, `valid_from`, `valid_to` (nullable), `valid_bucket` (nullable), `asserted_at_hlc`, `layer`. The string variant stores a normalised `value_text_norm`.

### Background jobs

| Table               | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aideon_jobs`       | Persistent job queue; PK `(partition_id, job_id)`; `job_type`, `status`, `priority`, `attempts`, `max_attempts`, `lease_expires_at` (nullable), `next_run_after` (nullable), `created_asserted_at_hlc`, `updated_asserted_at_hlc`, `payload` (BLOB), `dedupe_key` (nullable), `last_error` (nullable). **Unique index** on `(partition_id, job_type, dedupe_key, status)` — the deduplication constraint ([derived-runtime-and-projections](./derived-runtime-and-projections.md)). |
| `aideon_job_events` | Per-job event log; PK `(partition_id, job_id, event_time)`, `message`.                                                                                                                                                                                                                                                                                                                                                                                                              |

The job-queue shape mirrors the durable run-ledger discipline [Continuum](../continuum/README.md) owns; lease, attempts, and backoff are the same primitives ([Continuum retry and backoff](../continuum/retry-and-backoff.md)).

---

## Key indexes

The init migration creates these secondary indexes in addition to the primary keys; all non-unique unless noted.

**Op log:** `(partition_id, asserted_at_hlc)` timeline scan; `(partition_id, actor_id, asserted_at_hlc)` per-actor timeline; `(partition_id, tx_id)` transaction lookup.

**Entities:** `(partition_id, entity_kind, type_id)`; `(partition_id, updated_asserted_at_hlc)` recency.

**Edges:** `(partition_id, src_entity_id, edge_type_id, edge_id)` outbound; `(partition_id, dst_entity_id, edge_type_id, edge_id)` inbound; `(partition_id, edge_type_id, edge_id)` type scan.

**Edge-exists facts:** `(partition_id, edge_id, valid_from)`; `(partition_id, edge_id, valid_to)`; `(partition_id, valid_from)`; `(partition_id, valid_bucket)`.

**Property-fact tables** (each of the eight): `_from_idx (partition_id, scenario_id, entity_id, field_id, valid_from)`; `_to_idx (…, valid_to)`; `_field_from_idx (partition_id, scenario_id, field_id, valid_from)`; `_field_to_idx (…, valid_to)`; `_bucket_idx (partition_id, valid_bucket)`. These are the access paths the containment range scan rides ([RUNTIME-AND-ENGINE](./RUNTIME-AND-ENGINE.md)).

**Schema tables:** types `(partition_id, applies_to, type_id)`, `(partition_id, label)`; fields `(partition_id, value_type)`, `(partition_id, label)`; type-extends `(partition_id, parent_type_id)`; type-fields `(partition_id, type_id)`, `(partition_id, field_id)`.

**Graph projection:** `(partition_id, scenario_id, src_entity_id)`; `(partition_id, scenario_id, dst_entity_id)`; `(partition_id, scenario_id, edge_type_id, src_entity_id)`.

**Indexed-field tables** (each): `_entity_idx (partition_id, scenario_id, field_id, entity_id)`; `_bucket_idx (partition_id, valid_bucket)`; `_lookup_idx (partition_id, scenario_id, field_id, <value_col>)` — the value-equality lookup.

**Jobs:** `(partition_id, status, priority, created_asserted_at_hlc)` pending; `(partition_id, status, next_run_after, priority)` ready-to-run; `(partition_id, lease_expires_at)` lease expiry; `(partition_id, job_type, dedupe_key, status)` UNIQUE deduplication.

---

## Configuration

The store config is `mneme.json` in the Mneme base directory (typically `.aideon/runtime/`). On first open, `MnemeConfig::load_or_init()` writes defaults if absent.

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
// Hosted Postgres (optional adapter only — same Mneme API, never canonical)
{ "database": { "backend": "postgres", "url": "postgres://user:pass@host/db" } }
```

WAL files (`praxis.sqlite-wal`, `praxis.sqlite-shm`) are co-located with the database and are same-host transient state — never synced, versioned, or exported.

---

## Worked example — where Automation Orchestrator's disposition lands

Asserting `disposition = "Migrate"` on `Automation Orchestrator` ([op-fact-schema-model](./op-fact-schema-model.md)) touches these tables in one write transaction:

1. `aideon_ops` gains one row: the `SetProperty` operation, keyed `(partition_id, op_id)`, stamped `asserted_at_hlc`.
2. `aideon_prop_fact_str` gains one row: `value_text = "Migrate"`, `valid_from = 2026-01-01` micros, `valid_to = NULL`, `layer = actual`, `scenario_id = NULL`, keyed on the full bitemporal PK.
3. `aideon_idx_field_str` gains a row if `disposition` is `is_indexed`, enabling "which applications are `Migrate`?" as a `_lookup_idx` scan.
4. `aideon_change_feed` gains an ordered row so subscribers learn of the change.
5. `aideon_hlc_state.last_hlc` advances to the new HLC, preserving monotonicity.

A read of the slot scans `aideon_prop_fact_str` by `_from_idx`, keeps the containing fact, and applies the resolution chain — all within the partition prefix. None of this is canonical: deleting the database and replaying `aideon_ops` from the canonical op log reproduces every one of these rows ([derived-runtime-and-projections](./derived-runtime-and-projections.md)).

---

## Portability checklist

- [ ] Columns use only `INTEGER`, `TEXT`, `REAL`, `BLOB`.
- [ ] IDs and HLC values encoded/decoded in application code (`id_col()`, `Hlc::as_i64()`).
- [ ] Upserts use `INSERT … ON CONFLICT`.
- [ ] JSON limited to metadata/params; no structured fact data in JSON columns.
- [ ] No SQLite-specific functions in core query logic.
- [ ] WAL files excluded from workspace sync and export.
- [ ] No binary larger than `max_blob_bytes` stored inline; large objects use `objects/sha256/` by hash.

---

## References & standards

_Normative:_

- SQLite official documentation (WAL mode, pragmas) — the default derived-runtime engine configuration.
- Semantic Versioning 2.0.0 — forward-only schema/migration versioning ([ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md)).

## Related documents

| Document                                                                | What it covers                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------ |
| [Runtime and engine layout](./RUNTIME-AND-ENGINE.md)                    | The engine-neutral keyspace this schema realises.      |
| [The op / fact / schema model](./op-fact-schema-model.md)               | The primitives these tables store.                     |
| [Bitemporal model and the HLC](./bitemporal-and-hlc.md)                 | The two time axes in the fact-table keys.              |
| [Derived runtime and projections](./derived-runtime-and-projections.md) | Why this whole database is rebuildable.                |
| [ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)        | The storage abstraction this is one implementation of. |
| [Mneme README](./README.md)                                             | The module index.                                      |
