# The op / fact / schema model

The three primitives Mneme stores and the relationship between them: the canonical **operation**, the derived **fact**, and **schema-as-data**. This is the file to read to understand what is actually written to disk and what is computed on the way out. Terms follow the project glossary ([`CONTEXT.md`](../../../CONTEXT.md)).

---

## The primitive is the operation, not the fact

Mneme stores **operations**, not facts. An operation is the canonical, append-only mutation recorded in the op log — create, update, delete, link, unlink, and so on. A fact is the derived temporal claim the resolver computes _from_ operations on read. The op log is the durable primitive; facts are resolution inputs ([canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)). This is the event-sourcing discipline: the log is truth, the read model is derived _(Fowler; Young, Event Sourcing & CQRS)_.

The distinction is load-bearing because it is why the derived runtime is safe to delete: every fact is reconstructible by replaying the operations that produced it.

### The operation envelope

Every mutation is an `OpEnvelope`, stamped with an HLC asserted time and appended to the workspace op log:

```rust
pub struct OpEnvelope {
    pub op_id:       OpId,      // stable identifier; tie-break key of last resort
    pub actor_id:    ActorId,   // who asserted it
    pub asserted_at: Hlc,       // hybrid logical clock — packed portable i64
    pub op_type:     u16,       // OpType discriminant
    pub payload:     Vec<u8>,   // serialised OpPayload (msgpack/cbor)
    pub deps:        Vec<OpId>, // causal dependencies
}
```

The op log is **append-only and idempotent on ingest**: the same `(partition, op_id)` pair is a no-op on replay. This is what makes the log safe for export, import, and sync — replaying a package twice yields the same twin ([export-import-replay](./export-import-replay.md), [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).

### The operation surface

| `OpType`                            | Meaning                                                            |
| ----------------------------------- | ------------------------------------------------------------------ |
| `CreateNode` / `CreateEdge`         | A new entity or relationship with an existence interval.           |
| `SetEdgeExistenceInterval`          | Modify a relationship's existence without changing its endpoints.  |
| `TombstoneEntity`                   | Soft-delete an entity or relationship — supersession, not erasure. |
| `SetProperty` / `ClearProperty`     | A time-valid typed property interval on a slot.                    |
| `OrSetUpdate` / `CounterUpdate`     | CRDT set and counter mutations, for convergent merge under sync.   |
| `UpsertMetamodelBatch`              | A batch type/field/rule schema update (schema-as-data).            |
| `CreateScenario` / `DeleteScenario` | Scenario overlay lifecycle.                                        |

The vocabulary uses the graph projection terms **node** and **edge** at the storage layer deliberately: an operation is a graph-projection mutation. In domain prose the same things are **entities** and **relationships** ([`CONTEXT.md`](../../../CONTEXT.md)).

---

## The fact

A **fact** is a temporal claim about a [slot](../../../CONTEXT.md), derived from the op log and consumed by the resolver. A fact carries a value, a slot, a [layer](../../../CONTEXT.md), a [scenario](../../../CONTEXT.md), a valid-time interval, and an asserted time. Its valid-time interval is half-open, `[valid_from, valid_to)`, with `valid_to` optionally null for an open-ended claim.

A fact is never edited in place. A change is a later operation that derives a newer or superseding fact; the resolver decides which fact wins at a given viewpoint by the precedence chain in [bitemporal-and-hlc](./bitemporal-and-hlc.md). The two time axes a fact carries are:

| Axis              | Type                                                 | Semantics                                                                |
| ----------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| **Valid time**    | `ValidTime(i64)` — epoch microseconds UTC            | When the fact is true in the modelled world.                             |
| **Asserted time** | `Hlc(i64)` — packed physical-micros + 12-bit counter | When the fact was recorded; the audit axis and the resolver's tie-break. |

The two are fully decoupled: a fact may be asserted now with a valid-from in the future (planning) or in the past (a late correction). See [bitemporal-and-hlc](./bitemporal-and-hlc.md) for why both exist and how the HLC is packed.

---

## Value types

Facts carry strongly-typed values, not opaque blobs:

```rust
pub enum Value {
    Str(String), I64(i64), F64(f64), Bool(bool),
    Time(ValidTime), Ref(Id), Blob(Vec<u8>), Json(JsonValue),
}
```

Each value type has its own typed fact table in the derived runtime (`aideon_prop_fact_str`, `aideon_prop_fact_i64`, …), so range scans and index maintenance stay efficient and type-correct. The full table family is specified in [sqlite](./SQLITE.md). `Value::Blob` is the exception: large binary values are not inlined into a fact row but written to the content-addressed store and referenced by hash ([content-addressed-blobs](./content-addressed-blobs.md)).

---

## Schema-as-data

Mneme stores the [metamodel](../../../CONTEXT.md) as partition-scoped _data_, not as hard-coded enums. [Praxis](../praxis/README.md) authors the metamodel and submits a `MetamodelBatch`; Mneme persists and compiles it. This is what lets a workspace carry its own modelling language portably.

```rust
pub struct MetamodelBatch {
    pub types:             Vec<TypeDef>,
    pub fields:            Vec<FieldDef>,      // value_type, cardinality, merge_policy, is_indexed
    pub type_fields:       Vec<TypeFieldDef>,  // per-type field attachments + defaults
    pub edge_type_rules:   Vec<EdgeTypeRule>,  // endpoint constraints + semantic direction
    pub metamodel_version: Option<String>,
    pub metamodel_source:  Option<String>,
}
```

Single inheritance is tracked by `parent_type_id`; cycle detection runs in application code before a batch is accepted. The flattened **effective schema** — the resolved inheritance chain with merged defaults and tightened constraints — is compiled to `EffectiveSchema` and cached per type. The effective schema is derived: it is never authored directly and is rebuilt from the metamodel ([`CONTEXT.md`](../../../CONTEXT.md), [METAMODEL-PACKAGES](../../03-design/METAMODEL-PACKAGES.md)).

The seed metamodel that worked examples across this corpus draw on is [`core-v1.json`](../../data/meta/core-v1.json): entity types `ValueStreamStage`, `Capability`, `BusinessProcess`, `Application`, `DataEntity`, `TechnologyComponent`, `PlanEvent`; relationship types `serves`, `realises`, `accesses`, `hosts`, `plan_effect`.

---

## Worked example — asserting a disposition

The seed entity `Automation Orchestrator` (`n:application:automation-orchestrator`, an `Application`) carries a `disposition` slot. The metamodel ([`core-v1.json`](../../data/meta/core-v1.json)) defines `disposition` as an enum over `Invest`, `Tolerate`, `Migrate`, `Eliminate`.

An architect records that the application is to be migrated, effective the start of the fiscal year:

1. A `SetProperty` operation is appended, payload: slot = `(automation-orchestrator, disposition)`, value = `Str("Migrate")`, `valid_from` = `2026-01-01T00:00:00Z`, `valid_to` = null, layer = `actual`, scenario = baseline. It is stamped with `asserted_at = Hlc::now()`.
2. Mneme writes the op to `model/ops/`, then derives a fact: `disposition = "Migrate" [2026-01-01, null)` in the `actual` layer of the base case, Asserted content.
3. A read of `(automation-orchestrator, disposition)` at the viewpoint _{as-of valid time 2026-06-11, latest belief, layer actual, base case}_ returns `Migrate`, Fresh, because that fact contains the requested instant and no later fact supersedes it.

If a correction later asserts `disposition = "Eliminate" [2026-01-01, null)` with a larger HLC, the resolver prefers it by the _latest asserted time_ rule — without deleting the earlier fact, which remains visible to a belief-pinned read. The mechanics are in [bitemporal-and-hlc](./bitemporal-and-hlc.md).

---

## References & standards

_Normative:_

- Fowler; Young — **Event Sourcing & CQRS**. The append-only operation log is truth; facts are the derived read model.

_Informative:_

- Shapiro et al. — _Conflict-free Replicated Data Types_, 2011. The convergence basis for the `OrSetUpdate` and `CounterUpdate` operations under merge.

## Related documents

| Document                                                                             | What it covers                                                |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| [Bitemporal model and the HLC](./bitemporal-and-hlc.md)                              | The two time axes and the resolution precedence chain.        |
| [Scenarios and layers](./scenarios-and-layers.md)                                    | How `scenario_id` and layer participate in a fact's identity. |
| [SQLite specification](./SQLITE.md)                                                  | The typed fact tables these values land in.                   |
| [Temporal and scenario context](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The authoritative resolution contract.                        |
| [METAMODEL-PACKAGES](../../03-design/METAMODEL-PACKAGES.md)                          | How Praxis publishes schema-as-data to Mneme.                 |
