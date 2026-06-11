# Mneme — Durable Operations, Facts, Schema, and the Derived Runtime

Mneme is the storage module for Aideon Desktop: it owns the append-only operation log,
time-valid facts, schema-as-data, content-addressed blobs, and the rebuildable derived
runtime that the rest of the application reads from.

## Workspace-canonical invariant

The **workspace folder is the source of truth**
([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md),
[ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md)).
The embedded database under `.aideon/runtime/` is a derived cache: delete it and rebuild
produces an identical effective graph with no data loss. Nothing authoritative lives only in
the database.

```
workspace/
├── model/
│   ├── ops/          ← append-only op segments — the canonical record
│   └── schema/       ← schema-as-data (type/field/rule batches)
├── objects/
│   └── sha256/       ← content-addressed blob store (ADR-0003)
└── .aideon/
    └── runtime/      ← derived: SQLite database + engine files (rebuildable)
```

See [DESKTOP-FIRST-WORKSPACE](../../03-design/DESKTOP-FIRST-WORKSPACE.md) for the full
workspace layout contract.

---

## Three crates

| Crate         | Role                                                                   |
| ------------- | ---------------------------------------------------------------------- |
| `mneme_core`  | Core types, op/fact/schema/time model, storage trait surface           |
| `mneme_store` | Embedded store implementation, projections, migrations                 |
| `mneme`       | Facade — re-exports both crates under `mneme::core` and `mneme::store` |

Consumers depend on `mneme`. Crate-internal implementation details live in `mneme_store`.
Types shared across the boundary — including the full `MnemeStore` supertrait — come from
`mneme_core`.

---

## The op / fact / schema model

### Operations (`OpEnvelope`)

Every mutation is an `OpEnvelope` stamped with an HLC asserted-time and appended to the
workspace op log:

```rust
pub struct OpEnvelope {
    pub op_id:       OpId,
    pub actor_id:    ActorId,
    pub asserted_at: Hlc,          // hybrid logical clock — portable i64 encoding
    pub op_type:     u16,          // OpType discriminant
    pub payload:     Vec<u8>,      // msgpack/cbor serialised OpPayload
    pub deps:        Vec<OpId>,
}
```

Op types cover the full mutation surface:

| `OpType`                            | Meaning                                          |
| ----------------------------------- | ------------------------------------------------ |
| `CreateNode` / `CreateEdge`         | New entity or edge with an existence interval    |
| `SetEdgeExistenceInterval`          | Modify edge existence without changing endpoints |
| `TombstoneEntity`                   | Soft-delete a node or edge                       |
| `SetProperty` / `ClearProperty`     | Time-valid typed property interval               |
| `OrSetUpdate` / `CounterUpdate`     | CRDT set and counter mutations                   |
| `UpsertMetamodelBatch`              | Batch type/field/rule schema update              |
| `CreateScenario` / `DeleteScenario` | What-if scenario lifecycle                       |

The op log is append-only and idempotent on ingest — the same `(partition, op_id)` pair is
a no-op on replay, making the log safe for export/import and sync.

### Time model

Mneme carries two orthogonal time axes on every fact:

| Axis              | Type                                                 | Semantics                                                              |
| ----------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| **Valid time**    | `ValidTime(i64)` — epoch microseconds UTC            | When the fact is true in the modelled world                            |
| **Asserted time** | `Hlc(i64)` — packed physical-micros + 12-bit counter | When the fact was recorded; used for audit, ordering, and tie-breaking |

The `Hlc` packs a physical timestamp into the upper bits and a monotone counter into the
lower 12 bits. This keeps HLC values comparable as plain `i64`s across nodes without a
coordination step.

The **Plan / Actual layer** (`Layer::Plan = 10`, `Layer::Actual = 20`) adds a third
precedence axis: Actual facts beat Plan facts at the same valid time.

Deterministic resolution at valid time `T` for a `(entity, field)` pair:

1. Valid containment: `valid_from ≤ T AND (valid_to IS NULL OR T < valid_to)`
2. Layer precedence: higher layer wins
3. Interval specificity: narrower interval wins; `NULL valid_to` is widest
4. Stable tie-break: higher `asserted_at`, then `op_id` lexicographic

See [TEMPORAL-AND-SCENARIO-CONTEXT](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) for
the full semantics contract.

### Schema-as-data (`MetamodelBatch`)

Mneme stores metamodel structures as partition-scoped data — not hard-coded enums. Praxis
submits a `MetamodelBatch`; Mneme persists and compiles it:

```rust
pub struct MetamodelBatch {
    pub types:              Vec<TypeDef>,
    pub fields:             Vec<FieldDef>,      // value_type, cardinality, merge_policy, is_indexed
    pub type_fields:        Vec<TypeFieldDef>,  // per-type field attachments + defaults
    pub edge_type_rules:    Vec<EdgeTypeRule>,  // endpoint constraints + semantic direction
    pub metamodel_version:  Option<String>,
    pub metamodel_source:   Option<String>,
}
```

Single inheritance is tracked via `parent_type_id`; cycle detection runs in application
code. The flattened effective schema — resolved inheritance chain, merged defaults,
constraint tightening — is compiled into `EffectiveSchema` and cached per type.

### Value types

Facts carry strongly-typed values:

```rust
pub enum Value {
    Str(String), I64(i64), F64(f64), Bool(bool),
    Time(ValidTime), Ref(Id), Blob(Vec<u8>), Json(JsonValue),
}
```

Typed fact tables in the database (`aideon_prop_fact_str`, `aideon_prop_fact_i64`, …) keep
each type separate for efficient range scans and index maintenance.

### Scenario overlays

Scenarios are first-class in the model: every write input carries `scenario_id: Option<ScenarioId>`.
`None` writes to the baseline; `Some(id)` writes to the overlay. Reads resolve
scenario-first then fall back to baseline. Scenario lifecycle is managed via `ScenarioApi`.

See [METAMODEL-PACKAGES](../../03-design/METAMODEL-PACKAGES.md) for how Praxis packages
interact with Mneme's schema surface.

---

## The `MnemeStore` supertrait

`mneme_core::api` defines the full storage trait surface as a composition of focused async
traits. `MnemeStore` is the blanket bound any concrete implementation must satisfy:

```
MnemeStore = MetamodelApi + GraphWriteApi + PropertyWriteApi + GraphReadApi
           + AnalyticsApi + AnalyticsResultsApi + SyncApi + ScenarioApi
           + MnemeProcessingApi + ChangeFeedApi + ValidationRulesApi
           + ComputedRulesApi + ComputedCacheApi + DiagnosticsApi
           + MnemeExportApi + MnemeImportApi + MnemeSnapshotApi
           + Send + Sync
```

No consumer module generates SQL or accesses the database directly. All access is through
these traits.

### Write surface

| Trait              | Responsibility                                                            |
| ------------------ | ------------------------------------------------------------------------- |
| `GraphWriteApi`    | Create nodes and edges, set edge existence intervals, tombstone entities  |
| `PropertyWriteApi` | Set/clear typed property intervals; OR-set and counter updates            |
| `MetamodelApi`     | Upsert metamodel batches, compile effective schemas, list edge type rules |
| `ScenarioApi`      | Create and delete scenario overlays                                       |

### Read surface

| Trait                 | Responsibility                                                              |
| --------------------- | --------------------------------------------------------------------------- |
| `GraphReadApi`        | Read entity at valid time, traverse edges, list entities with field filters |
| `AnalyticsApi`        | Directed projection edges, degree stats, edge-type counts                   |
| `AnalyticsResultsApi` | Store and retrieve PageRank run scores                                      |
| `ChangeFeedApi`       | Poll or subscribe to the per-partition change stream                        |

All reads accept `scenario_id` and `as_of_asserted_at` for audit-mode reads.

### Processing surface

`MnemeProcessingApi` exposes explicit controls for the derived-artefact pipeline:

```rust
trigger_rebuild_effective_schema(input)   // recompile type inheritance caches
trigger_refresh_integrity(input)          // connectivity + validity scan
trigger_refresh_analytics_projections(input)
trigger_retention(input)                  // apply retention policy
trigger_compaction(input)                 // compact superseded fact rows
run_processing_worker(input) -> u32       // drive the embedded job queue
list_jobs(partition, status, limit)
```

### Diagnostics surface

`DiagnosticsApi` exposes observability hooks:

```rust
get_integrity_head(partition, scenario_id) -> Option<IntegrityHead>
get_last_schema_compile(partition, type_id) -> Option<SchemaHead>
list_failed_jobs(partition, limit)
get_schema_manifest() -> SchemaManifest     // machine-readable table + index inventory
explain_resolution(input) -> ExplainResolutionResult   // which fact won and why
explain_traversal(input) -> ExplainTraversalResult     // why an edge is active at T
```

`explain_resolution` and `explain_traversal` return the full candidate set with precedence
scores — critical for trusting time-travel queries.

---

## The derived runtime

The database under `.aideon/runtime/` is the **derived** half of the system. It holds:

- Resolved entity and edge records (`aideon_entities`, `aideon_edges`)
- Typed fact rows (`aideon_prop_fact_*`, `aideon_edge_exists_facts`)
- Indexed field tables (`aideon_idx_field_*`) — maintained synchronously in the write path
- Graph projection tables (`aideon_graph_projection_edges`) — adjacency for analytics
- Schema caches (`aideon_effective_schema_cache`, `aideon_type_schema_head`)
- Job queue (`aideon_jobs`) — the embedded processing pipeline
- Change feed (`aideon_change_feed`) — in-transaction sequence for subscriptions
- Integrity, PageRank, and computed attribute caches

Destroying `.aideon/runtime/` and replaying the op log from `model/ops/` reconstructs an
identical effective graph. This is a tested correctness property, not just a design claim.

For the full keyspace layout, engine bake-off, and single-writer queue model, see
[RUNTIME-AND-ENGINE.md](./RUNTIME-AND-ENGINE.md).

For the embedded SQLite schema in detail, see [SQLITE.md](./SQLITE.md).

---

## Storage trait and engine pluggability

The storage engine is pluggable behind a narrow trait boundary
([ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)). SQLite is the embedded
baseline and test oracle. `redb`, RocksDB, and LMDB/MDBX are bake-off candidates depending
on measured write/read profiles. The workspace contract — canonical op segments, derived
runtime — remains identical whichever engine is active.

Hosted PostgreSQL is an optional adapter behind the same persistence interface. It is never
the source of truth: the workspace folder and its op segments are always canonical.

---

## Single-writer queue

Every open workspace runs one writer actor. UI commands post to it; it batches small writes,
writes blobs via atomic temp-file rename, appends ops, updates primary indexes and projection
rows inside a transaction, then queues longer projection and analytics work. Reads are served
from database snapshots. This formalises the serialised-write constraint that all candidate
embedded engines share.

`WriteOptions { bulk_mode: bool }` lets callers signal bulk import: only synchronously-
maintained derived artefacts (indexes, projection rows) are updated inline; schema compile
and integrity jobs are coalesced and deferred to the worker.

---

## Content-addressed blobs

Large binary values are not inlined into fact rows. They are written to
`objects/sha256/<hash>` in the workspace, referenced by hash in property facts
([ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md)).
`Value::Ref(Id)` or a `Value::Str` containing the hash is the stable reference; the blob
store is addressed and immutable.

---

## Derived artefact pipeline (three consistency tiers)

| Tier                     | When updated                 | Examples                                                                      |
| ------------------------ | ---------------------------- | ----------------------------------------------------------------------------- |
| **Sync-in-tx**           | Inside the write transaction | Field index tables, projection edge rows, entity timestamps, change feed rows |
| **Near-real-time async** | Job queue, bounded latency   | Effective schema cache, connectivity checks, pre-aggregations                 |
| **Batch / on-demand**    | Scheduled or triggered       | PageRank scores, integrity audits, compaction                                 |

Jobs are deduplicated by a `dedupe_key` — bulk ingest of a thousand metamodel ops enqueues
one schema-compile job per type, not a thousand. Failures are retried with backoff; they
never corrupt authoritative data.

See [PROJECTION-AND-INVALIDATION](../../04-contracts/PROJECTION-AND-INVALIDATION.md) for the
contract between Mneme's projection layer and consumer modules.

---

## Export, import, and replay

The op log is the canonical export format. Mneme ships streaming export and import APIs
(`MnemeExportApi`, `MnemeImportApi`) producing NDJSON records:

```
{ record_type: "header", format_version, partition_id, exported_at_asserted, … }
{ record_type: "op", op_id, actor_id, asserted_at, op_type, payload_base64, deps }
{ record_type: "footer", op_count, checksum }   // BLAKE3 over all op records
```

Import is idempotent and order-robust. Derived artefacts are never exported; they are always
rebuilt after import by the processing worker.

`MnemeSnapshotApi` provides an accelerated path: export entity + fact state at a given
asserted-at, then replay only the tail ops on restore. Snapshot plus tail replay produces
identical resolution to full replay.

---

## Boundaries

Mneme does not own:

- The default EA metamodel or business vocabulary — Praxis owns that
- Task or artefact semantics
- Application shell or workspace lifecycle UX
- Analytics meaning — Metis owns computed scores and insights
- Arbitrary SQL access for any consumer

---

## Architecture and ADR references

| Document                                                                             | What it covers                                        |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| [ARCHITECTURE-BOUNDARY](../../01-architecture/ARCHITECTURE-BOUNDARY.md)              | Module seam definitions                               |
| [DESKTOP-FIRST-WORKSPACE](../../03-design/DESKTOP-FIRST-WORKSPACE.md)                | Workspace folder layout                               |
| [METAMODEL-PACKAGES](../../03-design/METAMODEL-PACKAGES.md)                          | How Praxis publishes to Mneme                         |
| [TEMPORAL-AND-SCENARIO-CONTEXT](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | Bi-temporal + scenario contract                       |
| [PROJECTION-AND-INVALIDATION](../../04-contracts/PROJECTION-AND-INVALIDATION.md)     | Projection lifecycle contract                         |
| [ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)               | Workspace-is-canonical-authority                      |
| [ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md)                      | Portable workspace format                             |
| [ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md)                 | Content-addressed blob store                          |
| [ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)                     | Storage engine abstraction                            |
| [RUNTIME-AND-ENGINE.md](./RUNTIME-AND-ENGINE.md)                                     | Keyspace layout, engine bake-off, single-writer queue |
| [SQLITE.md](./SQLITE.md)                                                             | Embedded SQLite schema specification                  |
