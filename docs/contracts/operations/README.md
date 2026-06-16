# Operation schemas

The machine-readable shape of every Mneme operation kind: the shared append-only `OpEnvelope` and one JSON Schema per op kind for the **typed payload object** it carries. These are **tier-2 contracts** in the [contract precedence](../../build-contracts/README.md#contract-precedence) — versioned, machine-readable shapes that are the single source of truth for an operation's structure. The _meaning_ of these shapes is owned by the Mneme module docs ([op-fact-schema-model](../../05-modules/mneme/op-fact-schema-model.md)); the _shape_ is owned here. The byte-exact serialisation of a record is fixed by the [canonical-JSON profile](../../04-contracts/canonical-json.md) and the record/identity/commit decision by [ADR-0038](../../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md).

Every schema is JSON Schema 2020-12 with an `$id`, and every field name and type is grounded in the Rust DTOs in [`crates/mneme_core/src/`](../../../crates/mneme_core/src) (`ops.rs`, `schema.rs`, `value.rs`, `ids.rs`, `time.rs`) so the schema and the code cannot drift in meaning without a visible change to one of them.

## The canonical operation record

A `model/ops/` record is one canonical-JSON object: a shared **envelope** wrapping a **typed payload object** for its kind. The payload is a structured object per the matching `<kind>.schema.json` — **not opaque `Vec<u8>`, not base64**. Opaque bytes may persist only as a _validated cache_ of the canonical encoding (`StoredCanonicalOp { parsed, canonical_bytes }`) or as SQLite projection columns; they are never the contract ([ADR-0038](../../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)).

The envelope fields, all present in every record:

| Field            | Type                               | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `op_id`          | UUID string                        | Permanent identity with `partition_id`; minted once on the authoring path, preserved verbatim on replay.                                                                                                                                                                                                                                                                                                                                                      |
| `actor_id`       | UUID string                        | _Who_ asserted the operation — a logical `actor_id`, **never a device** (device identity never appears in canonical material). Provenance per [ADR-0038](../../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md).                                                                                                                                                                                                                  |
| `asserted_at`    | decimal **string**                 | _When_ it entered canonical history: a full-range HLC coordinate as a decimal string, never a JSON number ([canonical-JSON profile](../../04-contracts/canonical-json.md)).                                                                                                                                                                                                                                                                                   |
| `kind`           | stable kebab-case string           | The portable discriminator (e.g. `set-property-interval`). The `u16` code never appears in the record.                                                                                                                                                                                                                                                                                                                                                        |
| `format_version` | integer                            | Canonical-JSON profile / record version; a bump is a refuse-or-degrade event, never silent.                                                                                                                                                                                                                                                                                                                                                                   |
| `origin`         | object                             | _Through which process_ the operation arose (provenance, distinct from `actor_id`): `{ "kind": "manual" }`, or an `import`/`connector`/`generated`/`system` origin with kind-specific fields. Required `kind`; see `op-envelope.schema.json` `$defs/origin`. One actor produces operations through many runs, so origin lives on the operation, not in mutable actor metadata. Both `actor_id` (who) and `origin` (through what) are provenance per ADR-0038. |
| `deps`           | array of UUID strings (`[]` empty) | Causal dependencies by `op_id`.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `payload`        | typed object                       | Conforms to the matching `<kind>.schema.json` below.                                                                                                                                                                                                                                                                                                                                                                                                          |

### The discriminator and the kind registry

The record stores **only** the stable kebab-case `kind` name — never an integer `op_type`, and never both (a record carrying both would be a contradictory state). The `u16` code is an internal compact discriminator that lives **only** in the kind registry and the SQLite projection; it never reaches the canonical bytes. Codes and names are never reassigned, and removed kinds stay reserved.

| Code | Kind                          | Schema / status                                                                                                                |
| ---- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1    | `create-node`                 | [create-node.schema.json](./create-node.schema.json)                                                                           |
| 2    | `create-edge`                 | [create-edge.schema.json](./create-edge.schema.json)                                                                           |
| 3    | `tombstone-entity`            | [tombstone-entity.schema.json](./tombstone-entity.schema.json)                                                                 |
| 4    | `set-property-interval`       | [set-property-interval.schema.json](./set-property-interval.schema.json)                                                       |
| 5    | `clear-property-interval`     | [clear-property-interval.schema.json](./clear-property-interval.schema.json)                                                   |
| 6    | `or-set-update`               | [or-set-update.schema.json](./or-set-update.schema.json)                                                                       |
| 7    | `counter-update`              | [counter-update.schema.json](./counter-update.schema.json)                                                                     |
| 8    | `upsert-metamodel-batch`      | [upsert-metamodel-batch.schema.json](./upsert-metamodel-batch.schema.json)                                                     |
| 9    | `create-scenario`             | _Design intent — inline `OpPayload` variant, not yet schema'd (see below)._                                                    |
| 10   | `delete-scenario`             | _Design intent — inline `OpPayload` variant, not yet schema'd (see below)._                                                    |
| 11   | `set-edge-existence-interval` | [set-edge-existence-interval.schema.json](./set-edge-existence-interval.schema.json)                                           |
| 12   | `actor-declare`               | [actor-declare.schema.json](./actor-declare.schema.json) — _design intent; reserved, not yet an `OpType` variant (see below)._ |

Codes mirror the `OpType` discriminant in [`crates/mneme_core/src/ops.rs`](../../../crates/mneme_core/src/ops.rs); the kebab `kind` names are the portable contract.

> **Not drift-checked yet.** These schemas are authored ahead of the CI assertion that pins them to the Rust DTOs. Adding `operations/` to the contract drift check (alongside the existing `*-manifest.json` checks under `tests/contracts/`) is a follow-up, tracked by the M0 build contract. Until then they are authoritative-by-review, not authoritative-by-test.

## Canonical conventions these schemas encode

These are the canonical contract names, not the Rust/serde debug names — the writer normalises parsed input into the one canonical form before append ([canonical-JSON profile](../../04-contracts/canonical-json.md)).

- **`Id`** (and its wrappers `PartitionId`, `ActorId`, `OpId`, `ScenarioId`) is a lower-case hyphenated UUID string. A ULID string is accepted on parse but normalised to UUID before append.
- **`Hlc`**, **`ValidTime`**, and any full-range 64-bit coordinate (including the `CounterUpdate.delta` and the `i64`/`time` value tags) are **decimal strings**, never JSON numbers. `Hlc` packs physical microseconds in the upper bits and a 12-bit counter in the lower bits; `ValidTime` is epoch microseconds UTC.
- **Enum and value tags use stable schema-owned lower/kebab names**, never Rust variant spellings. `Layer` → `plan` | `actual`; `SetOp` → `add` | `remove`; `EntityKind` → `node` | `edge`; `ValueType` → `str|i64|f64|bool|time|ref|blob|json`; `MergePolicy` → `lww|mv|or-set|counter|text`. The `Value` tag is an object with exactly one lower variant key, e.g. `{ "str": "Migrate" }`, `{ "i64": "7" }`, `{ "ref": "<uuid>" }`. (The _value inside_ — an authored string like `"Migrate"` — is preserved verbatim, not lower-cased.)
- **All fields are present.** An absent optional value is explicit `null`, an empty collection is `[]`/`{}`, and a Rust `#[serde(default)]` field (e.g. `FieldDef.disallow_overlap`) is materialised explicitly — never omitted.

## The schemas

The envelope schema is [op-envelope.schema.json](./op-envelope.schema.json); the per-kind payload schemas pin the typed `payload` object a record of that `kind` carries.

| Payload schema                                                                       | Kind (code)                        | What it pins                                                                               |
| ------------------------------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------ |
| [create-node.schema.json](./create-node.schema.json)                                 | `create-node` (1)                  | A new node entity instance.                                                                |
| [create-edge.schema.json](./create-edge.schema.json)                                 | `create-edge` (2)                  | A new edge with an existence interval and endpoints.                                       |
| [tombstone-entity.schema.json](./tombstone-entity.schema.json)                       | `tombstone-entity` (3)             | A soft-delete by supersession.                                                             |
| [set-property-interval.schema.json](./set-property-interval.schema.json)             | `set-property-interval` (4)        | A typed property value over a valid-time interval.                                         |
| [clear-property-interval.schema.json](./clear-property-interval.schema.json)         | `clear-property-interval` (5)      | Closing a property claim over a valid-time interval.                                       |
| [or-set-update.schema.json](./or-set-update.schema.json)                             | `or-set-update` (6)                | A CRDT OR-Set add/remove.                                                                  |
| [counter-update.schema.json](./counter-update.schema.json)                           | `counter-update` (7)               | A CRDT counter delta.                                                                      |
| [upsert-metamodel-batch.schema.json](./upsert-metamodel-batch.schema.json)           | `upsert-metamodel-batch` (8)       | A schema-as-data batch (types, fields, type-fields, edge rules).                           |
| [set-edge-existence-interval.schema.json](./set-edge-existence-interval.schema.json) | `set-edge-existence-interval` (11) | An edge existence-interval change, optionally a tombstone.                                 |
| [actor-declare.schema.json](./actor-declare.schema.json)                             | `actor-declare` (12)               | A canonical actor-registry declaration: `declared_actor_id`, `actor_kind`, `display_name`. |

The two scenario-lifecycle kinds — `create-scenario` (9) and `delete-scenario` (10) — are **design intent**: inline `OpPayload` variants in [`ops.rs`](../../../crates/mneme_core/src/ops.rs) without a dedicated `*Input` struct, deferred to a later increment and not schema'd here. Their registry codes 9 and 10 are reserved and never reassigned.

`actor-declare` (12) is also **design intent**: it is schema'd here ([actor-declare.schema.json](./actor-declare.schema.json)) ahead of the code, but it is **not yet an `OpType` variant** in [`ops.rs`](../../../crates/mneme_core/src/ops.rs) (which carries codes 1–11). Code 12 is reserved for it and never reassigned. An actor is introduced by an `actor-declare` operation; later operations reference its `declared_actor_id` as their `actor_id`, and the runtime `aideon_actors` table is a projection rebuilt from these declarations ([ADR-0038](../../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)).

## Fixtures

Validating example payloads — one `*.valid.json` and one `*.invalid.json` per op kind — live under [`docs/data/fixtures/operations/`](../../data/fixtures/operations/README.md) and use the seed identifiers from [`core-v1.json`](../../data/meta/core-v1.json) and [`baseline.yaml`](../../data/base/baseline.yaml). Each valid fixture validates against its schema; each invalid fixture fails for the reason its sibling README records.

## Related documents

| Document                                                                                               | What it covers                                          |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| [ADR-0038](../../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)          | The canonical record, identity, commit, and replay.     |
| [canonical-JSON profile](../../04-contracts/canonical-json.md)                                         | The byte-exact serialisation a record is encoded in.    |
| [op-fact-schema-model](../../05-modules/mneme/op-fact-schema-model.md)                                 | The semantics of operations, facts, and schema-as-data. |
| [identifier-generation-and-provenance](../../05-modules/mneme/identifier-generation-and-provenance.md) | How the identifiers in these payloads are minted.       |
| [M0 build contract](../../build-contracts/M0-foundation.md)                                            | The milestone these schemas and fixtures serve.         |
| [build-contracts/README](../../build-contracts/README.md)                                              | Contract precedence; these are tier-2.                  |
