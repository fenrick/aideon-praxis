# Operation schemas

The machine-readable shape of every Mneme operation kind: the shared append-only `OpEnvelope` and one JSON Schema per op kind for the typed payload it carries. These are **tier-2 contracts** in the [contract precedence](../../build-contracts/README.md#contract-precedence) — versioned, machine-readable shapes that are the single source of truth for an operation's structure. The _meaning_ of these shapes is owned by the Mneme module docs ([op-fact-schema-model](../../05-modules/mneme/op-fact-schema-model.md)); the _shape_ is owned here.

Every schema is JSON Schema 2020-12 with an `$id`, and every field name and type is grounded in the Rust DTOs in [`crates/mneme_core/src/`](../../../crates/mneme_core/src) (`ops.rs`, `schema.rs`, `value.rs`, `ids.rs`, `time.rs`) so the schema and the code cannot drift in meaning without a visible change to one of them.

> **Not drift-checked yet.** These schemas are authored ahead of the CI assertion that pins them to the Rust DTOs. Adding `operations/` to the contract drift check (alongside the existing `*-manifest.json` checks under `tests/contracts/`) is a follow-up, tracked by the M0 build contract. Until then they are authoritative-by-review, not authoritative-by-test.

## Serde conventions these schemas encode

- **`Id`** (and its wrappers `PartitionId`, `ActorId`, `OpId`, `ScenarioId`) serialise as a canonical UUID string. A ULID string is accepted on parse but the on-wire form is UUID.
- **`Hlc`** and **`ValidTime`** serialise as a signed 64-bit integer (`i64`). `Hlc` packs physical microseconds in the upper bits and a 12-bit counter in the lower bits; `ValidTime` is epoch microseconds UTC.
- **Enums are externally tagged** (serde default). `Layer` → `"Plan"` | `"Actual"`; `SetOp` → `"Add"` | `"Remove"`; `EntityKind` → `"Node"` | `"Edge"`; `ValueType`/`MergePolicy` by variant name. The `Value` enum is an object with exactly one variant key, e.g. `{ "Str": "Migrate" }`, `{ "I64": 7 }`, `{ "Ref": "<uuid>" }`.
- **`Option<T>`** fields are nullable; `#[serde(default)]` fields (e.g. `FieldDef.disallow_overlap`) may be omitted.

## The schemas

| Schema                                                                               | Op kind (`OpType`)              | What it pins                                                                                   |
| ------------------------------------------------------------------------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| [op-envelope.schema.json](./op-envelope.schema.json)                                 | _(shared envelope)_             | The canonical append record: `op_id`, `actor_id`, `asserted_at`, `op_type`, `payload`, `deps`. |
| [create-node.schema.json](./create-node.schema.json)                                 | `CreateNode` (1)                | A new node entity instance.                                                                    |
| [create-edge.schema.json](./create-edge.schema.json)                                 | `CreateEdge` (2)                | A new edge with an existence interval and endpoints.                                           |
| [tombstone-entity.schema.json](./tombstone-entity.schema.json)                       | `TombstoneEntity` (3)           | A soft-delete by supersession.                                                                 |
| [set-property-interval.schema.json](./set-property-interval.schema.json)             | `SetProperty` (4)               | A typed property value over a valid-time interval.                                             |
| [clear-property-interval.schema.json](./clear-property-interval.schema.json)         | `ClearProperty` (5)             | Closing a property claim over a valid-time interval.                                           |
| [or-set-update.schema.json](./or-set-update.schema.json)                             | `OrSetUpdate` (6)               | A CRDT OR-Set add/remove.                                                                      |
| [counter-update.schema.json](./counter-update.schema.json)                           | `CounterUpdate` (7)             | A CRDT counter delta.                                                                          |
| [upsert-metamodel-batch.schema.json](./upsert-metamodel-batch.schema.json)           | `UpsertMetamodelBatch` (8)      | A schema-as-data batch (types, fields, type-fields, edge rules).                               |
| [set-edge-existence-interval.schema.json](./set-edge-existence-interval.schema.json) | `SetEdgeExistenceInterval` (11) | An edge existence-interval change, optionally a tombstone.                                     |

The two scenario-lifecycle kinds — `CreateScenario` (9) and `DeleteScenario` (10) — are inline `OpPayload` variants without a dedicated `*Input` struct; they are deferred to a later increment and are not schema'd here.

## Fixtures

Validating example payloads — one `*.valid.json` and one `*.invalid.json` per op kind — live under [`docs/data/fixtures/operations/`](../../data/fixtures/operations/README.md) and use the seed identifiers from [`core-v1.json`](../../data/meta/core-v1.json) and [`baseline.yaml`](../../data/base/baseline.yaml). Each valid fixture validates against its schema; each invalid fixture fails for the reason its sibling README records.

## Related documents

| Document                                                                                               | What it covers                                          |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| [op-fact-schema-model](../../05-modules/mneme/op-fact-schema-model.md)                                 | The semantics of operations, facts, and schema-as-data. |
| [identifier-generation-and-provenance](../../05-modules/mneme/identifier-generation-and-provenance.md) | How the identifiers in these payloads are minted.       |
| [M0 build contract](../../build-contracts/M0-foundation.md)                                            | The milestone these schemas and fixtures serve.         |
| [build-contracts/README](../../build-contracts/README.md)                                              | Contract precedence; these are tier-2.                  |
