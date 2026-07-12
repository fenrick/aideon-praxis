# SQLite specification

The schema of Mneme's default derived-runtime engine: the table families, WAL configuration, and the constraints that
hold it together. SQLite is the **current default** derived-runtime cache behind Mneme's storage trait — not the
datastore. The workspace folder is the datastore
([canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)); this database is a rebuildable cache
of it.

> **Filename note.** This file is referenced as `SQLITE.md` (uppercase) because the repository host's filesystem is
> case-insensitive: a lowercase `sqlite.md` would collide with this name. Incoming cross-links point here, and this file
> carries the full content.
>
> **Scope.** Sections marked **(M0)** describe the schema as built
> ([#314](https://github.com/aideon-ai/aideon-desktop/pull/314)). Sections marked **(M1–M4)** are design intent for
> future milestones — not built, retained to guide schema evolution.

---

## Position in the architecture

The SQLite database is a **derived, same-host-only cache**. It is never synced, never committed to a workspace VCS
repository, and is fully rebuildable from the canonical op log
([derived-runtime-and-projections](./derived-runtime-and-projections.md)). WAL files (`-wal`, `-shm`) and the engine
state directory live under `.aideon/runtime/` on the host machine. Content-addressed binary objects live in
`objects/sha256/` and are referenced by hash, never stored in the database
([content-addressed-blobs](./content-addressed-blobs.md)).

The schema follows SQLite's official guidance for WAL mode and pragmas (SQLite official documentation), the normative
reference for this engine's configuration.

---

## Portability invariants

The schema is written to be portable across the candidate engines and the optional hosted PostgreSQL adapter
([RUNTIME-AND-ENGINE](./RUNTIME-AND-ENGINE.md), [ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)). The
rules (M0-relevant rows first; future-milestone rows noted):

| Rule              | Detail                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Column types      | Only `INTEGER`, `TEXT`, `REAL`, `BLOB` (SQLite affinity).                                                       |
| ID encoding       | TEXT UUID strings (36 chars). Application code handles per-backend mapping; no DDL-level type switching at M0.  |
| HLC asserted time | `INTEGER` portable packed `i64` (`Hlc::as_i64()`) ([bitemporal-and-hlc](./bitemporal-and-hlc.md)).              |
| Upserts           | `INSERT … ON CONFLICT` throughout; never a raw `INSERT` with retry.                                             |
| WAL               | WAL mode is applied at open time; `-wal` / `-shm` are same-host-only transient state.                           |
| Valid time        | **(M1+)** `INTEGER` microseconds since epoch on every `_valid_from` / `_valid_to` / `_as_of_valid_time` column. |
| JSON usage        | **(M1+)** Limited to metadata and rule-params fields only; **never** structured fact data.                      |

---

## ID and time encoding

- **IDs** are TEXT UUID strings (36 chars).
- **HLC asserted time** is `INTEGER` — the packed `i64` from `Hlc::as_i64()` — on `asserted_at` (applied ops) and
  `last_hlc` (HLC state).
- **(M1+) Valid time** is `INTEGER` microseconds since the Unix epoch on every column ending `_valid_from`, `_valid_to`,
  or `_as_of_valid_time`.
- **(M1+) Scenario overlay** is a nullable `scenario_id` column on every table that participates in scenario reads.
  Baseline rows carry `scenario_id = NULL`; overlay rows carry the scenario UUID
  ([scenarios-and-layers](./scenarios-and-layers.md)).
- **(M0)** M0 is single-partition per workspace. `partition_id` appears in `aideon_applied_ops` and `aideon_replay_head`
  (scoping op ingest and replay); the actor, object, meta, and partition tables use single-column PKs because the
  partition identity is established at the workspace level.

---

## Schema version **(M0)**

`RUNTIME_SCHEMA_VERSION = 1` (declared in `crates/mneme_store/src/projection.rs`). The store checks this on open; a
mismatch forces a full rebuild rather than an incremental tail replay.

The schema is created by `init_schema()` via eight `CREATE TABLE IF NOT EXISTS` statements on every `open_runtime()`
call. There are no migration files — the derived runtime is a rebuildable cache wiped and recreated on demand.

---

## M0 foundation tables

All eight tables are **M0-owned**. Deleting `.aideon/runtime/` and reopening the workspace recreates all rows from
`model/ops/`, `model/schema/authored/`, and the content-addressed object store.

### `aideon_meta`

Key-value metadata about this runtime database instance.

```sql
CREATE TABLE IF NOT EXISTS aideon_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

| Key                      | Value                                 |
| ------------------------ | ------------------------------------- |
| `workspace_id`           | Workspace UUID (from `manifest.json`) |
| `partition_id`           | Canonical partition UUID              |
| `runtime_schema_version` | `"1"`                                 |

### `aideon_partitions`

Partition registry. M0 has exactly one partition per workspace.

```sql
CREATE TABLE IF NOT EXISTS aideon_partitions (
    partition_id TEXT PRIMARY KEY
);
```

### `aideon_actors`

Actor registry. Single-column PK because M0 is single-partition per workspace; partition identity is established at the
manifest level.

```sql
CREATE TABLE IF NOT EXISTS aideon_actors (
    actor_id           TEXT PRIMARY KEY,
    actor_kind         TEXT NOT NULL,
    display_name       TEXT NOT NULL,
    declaration_digest TEXT NOT NULL
);
```

### `aideon_applied_ops`

Applied-operation log projection — one row per operation applied from `model/ops/`. The canonical source of truth is the
segment files; this table is derived.

```sql
CREATE TABLE IF NOT EXISTS aideon_applied_ops (
    partition_id            TEXT    NOT NULL,
    op_id                   TEXT    NOT NULL,
    canonical_record_digest TEXT    NOT NULL,
    asserted_at             INTEGER NOT NULL,   -- packed HLC i64
    PRIMARY KEY (partition_id, op_id)
);
```

Replay idempotency: the upsert uses `ON CONFLICT DO NOTHING` so replaying the same `(partition_id, op_id)` with
identical digest is a no-op (`DuplicateNoop`). A digest mismatch is a `DuplicateDigestConflict` error.

### `aideon_schema_docs`

Authored schema-document registry — one row per `(package_id, version)` pair materialised to `model/schema/authored/`.
The op log is authoritative; on rebuild this table is populated before the file system is written.

```sql
CREATE TABLE IF NOT EXISTS aideon_schema_docs (
    package_id       TEXT NOT NULL,
    version          TEXT NOT NULL,
    relative_path    TEXT NOT NULL,
    canonical_digest TEXT NOT NULL,
    PRIMARY KEY (package_id, version)
);
```

### `aideon_objects`

Object index for the content-addressed blob store (`objects/sha256/`). A row here means the object exists durably on
disk; the blob itself is never stored in the database.

```sql
CREATE TABLE IF NOT EXISTS aideon_objects (
    sha256      TEXT    PRIMARY KEY,
    byte_length INTEGER NOT NULL
);
```

### `aideon_replay_head`

Per-partition replay frontier. Tracks how far the projection cursor has advanced through the canonical segment log.

```sql
CREATE TABLE IF NOT EXISTS aideon_replay_head (
    partition_id         TEXT    PRIMARY KEY,
    segment_seqno        INTEGER NOT NULL,   -- logical segment sequence number
    byte_offset          INTEGER NOT NULL,   -- next unread byte in that segment
    applied_record_count INTEGER NOT NULL,
    last_record_digest   TEXT                -- NULL on an empty log
);
```

The empty-log frontier is `(segment_seqno = 1, byte_offset = 0)`. An incremental tail replay resumes from this cursor
without re-reading the full log.

### `aideon_hlc_state`

Per-partition HLC watermark — the monotonicity anchor for `Hlc::now()`. Updated after each applied operation. On
rebuild, restored to `max(asserted_at)` across all canonical operations in the partition before write-enable. Never
authoritative over the op log ([bitemporal-and-hlc](./bitemporal-and-hlc.md),
[ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md)).

```sql
CREATE TABLE IF NOT EXISTS aideon_hlc_state (
    partition_id TEXT    PRIMARY KEY,
    last_hlc     INTEGER NOT NULL    -- packed HLC i64
);
```

---

## WAL configuration **(M0)**

Applied by `open_runtime()` on every database open:

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous  = NORMAL;
PRAGMA foreign_keys = ON;
```

WAL files (`praxis.sqlite-wal`, `praxis.sqlite-shm`) are co-located with the database file under `.aideon/runtime/`.
They are same-host transient state — never synced, versioned, or exported
([derived-runtime-and-projections](./derived-runtime-and-projections.md)).

---

## Secondary indexes **(M0)**

None at M0. The eight foundation tables carry only their declared primary keys. Secondary indexes will be added as
read-path access patterns are confirmed at M1 and beyond.

---

## `FoundationProjectionSnapshot` and the rebuild hash **(M0)**

`crates/mneme_store/src/rebuild.rs` computes a `foundation_rebuild_hash` (BLAKE3-256, hex-encoded) over a
`FoundationProjectionSnapshot` — a deterministic, canonical-JSON-ordered logical view of the eight M0 tables. The
snapshot contains:

- `workspace_id` (String)
- `partitions` (Vec\<PartitionSnapshot\>) — each carrying `applied_ops` (Vec of digest strings) and `replay_head`
- `schema_docs` (Vec\<SchemaDoc\>)
- `actors` (Vec\<ActorSnapshot\>)
- `objects` (Vec\<ObjectSnapshot\>)

This hash is the proof carried in the `ready_read_write` lifecycle event
([ADR-0040](../../06-adrs/ADR-0040-m0-host-validation-gate-and-proof-carrying-readiness.md)): the readiness signal
cannot be faked because it must carry the hash computed over the actual projection state, not emitted speculatively
before the projection runs.

---

## Forward-looking schema **(M1–M4)**

The following table families are design intent for future milestones — not built at M0, retained to guide schema
evolution deliberately.

### M1 — fact resolution + semantic validation

| Table family                                                    | Purpose                                                                                                                 |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `aideon_entities` / `aideon_edges` / `aideon_edge_exists_facts` | Entity + edge rows with bitemporal existence PK                                                                         |
| `aideon_prop_fact_{str,i64,f64,bool,time,ref,blob}`             | Typed property-fact tables; one per value type; `json` is not a valid twin-fact value — opaque documents are `BlobRef`s |
| `aideon_types` / `aideon_fields` / `aideon_type_fields`         | Compiled effective-schema metadata                                                                                      |
| `aideon_effective_schema_cache` / `aideon_type_schema_head`     | Materialised effective-schema blobs                                                                                     |
| `aideon_metamodel_versions`                                     | Applied metamodel-version log                                                                                           |
| `aideon_edge_type_rules`                                        | Endpoint allow-lists per edge type                                                                                      |

Typed property-fact tables share this bitemporal PK pattern (`partition_id`, `entity_id`, `field_id`, `valid_from`,
`asserted_at_hlc`, `op_id`) and common columns (`scenario_id` nullable, `valid_to` nullable, `valid_bucket`, `layer`,
`is_tombstone`, `<value_col>`). The PK covers both time axes plus `op_id` for deterministic resolution
([bitemporal-and-hlc](./bitemporal-and-hlc.md)).

### M2–M3 — resolution, integrity, analytics

| Table family                                                                                                       | Purpose                                        |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `aideon_change_feed`                                                                                               | Ordered change events for subscribers          |
| `aideon_integrity_{runs,findings,head}` / `aideon_validation_rules`                                                | Integrity scoring runs                         |
| `aideon_computed_rules` / `aideon_computed_cache_{str,i64,f64,bool,time,ref,blob}`                                 | Derived field computation                      |
| `aideon_idx_field_{str,i64,f64,bool,time,ref}`                                                                     | Value-equality indexes for `is_indexed` fields |
| `aideon_graph_projection_edges` / `aideon_pagerank_{runs,scores}` / `aideon_graph_{degree_stats,edge_type_counts}` | Materialised graph + analytics                 |

### M4 — background jobs

| Table               | Purpose                                                |
| ------------------- | ------------------------------------------------------ |
| `aideon_jobs`       | Persistent job queue; lease, attempts, dedupe, backoff |
| `aideon_job_events` | Per-job event log                                      |

The job-queue shape mirrors the durable run-ledger discipline [Continuum](../continuum/README.md) owns; M4 supersedes
the M0 in-process job runner without changing the `AcceptedJob`/`RunEvent` contract.

---

## Portability checklist

- [x] Columns use only `INTEGER`, `TEXT`, `REAL`, `BLOB`.
- [x] IDs are TEXT UUID strings (36 chars); HLC values encoded/decoded via `Hlc::as_i64()`.
- [x] Upserts use `INSERT … ON CONFLICT`.
- [x] WAL files excluded from workspace sync and export.
- [ ] _(M1+)_ JSON limited to metadata/params; no structured fact data in JSON columns.
- [ ] _(M1+)_ No SQLite-specific functions in core query logic.
- [ ] _(M1+)_ Large objects use `objects/sha256/` by hash; no inline binary.

---

## References & standards

_Normative:_

- SQLite official documentation (WAL mode, pragmas) — the default derived-runtime engine configuration.
- Semantic Versioning 2.0.0 — schema versioning ([ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md)).

## Related documents

| Document                                                                | What it covers                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------ |
| [Runtime and engine layout](./RUNTIME-AND-ENGINE.md)                    | The engine-neutral keyspace this schema realises.      |
| [The op / fact / schema model](./op-fact-schema-model.md)               | The primitives these tables store.                     |
| [Bitemporal model and the HLC](./bitemporal-and-hlc.md)                 | The two time axes in the fact-table keys.              |
| [Derived runtime and projections](./derived-runtime-and-projections.md) | Why this whole database is rebuildable.                |
| [ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)        | The storage abstraction this is one implementation of. |
| [Mneme README](./README.md)                                             | The module index.                                      |
