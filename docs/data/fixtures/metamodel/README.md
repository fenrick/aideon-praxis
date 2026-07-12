# Metamodel v1 effective-schema fixtures

The expected **compiled effective schema** for representative seed types, as JSON, plus the complete validation
error-code set. These are the M1 oracle: the flattened slot set a conformant metamodel compiler must produce after
inheritance resolution, so two implementations cannot diverge on flattening or on which writes are rejected. They are
tier-4 tested fixtures under the [contract precedence](../../../build-contracts/README.md#contract-precedence); the
authority on _meaning_ is the [metamodel design](../../../03-design/metamodel/README.md), and the source these are
compiled from is [`core-v1.json`](../../meta/core-v1.json) (version `1.0.0` — **this is metamodel v1**).

---

## What the oracle is

The metamodel is **authored** as `core-v1.json` and **compiled** into an effective schema per type. The
[effective schema](../../../03-design/metamodel/slots-and-effective-schema.md) is the flattened, derived slot-and-rule
set after `extends` is resolved depth-first, parent slots are flattened into the child, child declarations override
same-named parent ones, and the global [validation rules](../../../03-design/metamodel/validation-rules.md) are
attached. It is never authored directly; it is what `validate_node` checks every write against and what the resolver
reads to know a type's slots.

Each `*.effective-schema.json` here is the expected compiled output for one type. A compiler is conformant for that type
when its compiled effective schema equals the fixture under a canonical serialisation. Re-compiling from the same source
must reproduce the fixture byte-for-byte ([metamodel-ownership](../../../05-modules/praxis/metamodel-ownership.md): the
persisted batch is a derived projection — delete it and Praxis recompiles the same thing).

The fixtures cover four representative types, chosen to exercise every compilation path the seed has:

| Fixture                                                                                  | Type               | Exercises                                                                                                                      |
| ---------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| [`capability.effective-schema.json`](./capability.effective-schema.json)                 | `Capability`       | No `extends`; one required string + two enum slots. The simplest flattening (identity).                                        |
| [`application.effective-schema.json`](./application.effective-schema.json)               | `Application`      | No `extends`; four slots, two of them enums whose variant lists differ from other types'.                                      |
| [`value-stream-stage.effective-schema.json`](./value-stream-stage.effective-schema.json) | `ValueStreamStage` | `extends: Stage` where `Stage` is **not declared** — the unresolved-supertype gap, recorded honestly.                          |
| [`plan-event.effective-schema.json`](./plan-event.effective-schema.json)                 | `PlanEvent`        | Two required slots, a `datetime`, a `number`, and a dotted-name (`source.priority`) enum slot; plus type-level `effect_types`. |

### The fixture shape

Each fixture is an object with: `type_id`, `label`, `category`, `uuid` (the type's stable UUID from the seed), `extends`
(the declared parent or `null`), `inheritance_chain` (the resolved chain, root last), and `slots` — an array of
flattened slot descriptors. Each slot carries:

| Field            | Meaning                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `key`            | The slot key (attribute name; dotted names kept verbatim).                                                                                                   |
| `kind`           | The attribute kind: `string`, `text`, `number`, `enum`, `datetime`, `boolean`, `blob`.                                                                       |
| `required`       | Whether a write must supply a non-null value.                                                                                                                |
| `max_length`     | Present for `string` (256) and `text` (4096) per the global rules.                                                                                           |
| `enum`           | The declared variant list, for `enum` kind.                                                                                                                  |
| `case_sensitive` | `false` for every enum (`enum.caseSensitive = false` globally).                                                                                              |
| `format`         | `rfc3339` for `datetime`.                                                                                                                                    |
| `uuid`           | The slot's stable UUID, **read from the seed, never minted here**.                                                                                           |
| `source`         | `self` for a slot the type declares; `inherited` for one flattened from a parent. In the seed, no fixture has an `inherited` slot (no resolvable `extends`). |

`max_length` values come from the seed's global `validation` block (`string.maxLength = 256`, `text.maxLength = 4096`);
they are attached to every slot of that kind at compile time, not declared per slot in `core-v1.json`.

---

## The validation error-code set

These are the codes a write can be rejected with at the M1 boundary, grounded in
[validation-rules](../../../03-design/metamodel/validation-rules.md). The seed surfaces them as one typed
`ValidationFailed` error carried in the RFC 9457 envelope
([ADR-0016](../../../06-adrs/ADR-0016-error-envelope-rfc9457.md)) with a human-readable message that names the offending
node/edge `id`, the rule broken, and the expected shape ([data/README, importer error reporting](../../README.md)). The
codes below are the **enumerated reasons** `ValidationFailed` can carry — the sub-reason an implementation should attach
so a surface can act on each case. The `kind`/`category` is `validation` for all of them (surface the problem; do not
retry unchanged).

| Reason code                  | Applies to | Trigger                                                                                                                     | Source                                               |
| ---------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `UNKNOWN_TYPE`               | node       | `type` does not match a known type descriptor.                                                                              | validation-rules §node 1                             |
| `UNKNOWN_RELATIONSHIP_TYPE`  | edge       | relationship `type` does not match a known relationship descriptor.                                                         | validation-rules §edge 1                             |
| `MISSING_REQUIRED_ATTRIBUTE` | node, edge | a required attribute (e.g. `name`, `accesses.mode`, `plan_effect.op`/`target_ref`) is absent or null.                       | validation-rules §node 3, §edge 5                    |
| `WRONG_ATTRIBUTE_KIND`       | node, edge | a value does not match its declared kind (e.g. a string where `number` is required).                                        | validation-rules §node 2, §edge 5                    |
| `STRING_TOO_LONG`            | node, edge | a `string` value exceeds 256, or a `text` value exceeds 4096.                                                               | validation-rules §global, §node 4                    |
| `ENUM_VALUE_NOT_ALLOWED`     | node, edge | an `enum` value is not a declared variant (case-insensitive match), e.g. `tier = "Tactical"`.                               | validation-rules §node 5, §edge 5                    |
| `ENDPOINT_TYPE_NOT_ALLOWED`  | edge       | the source type ∉ relationship `from`, or the target type ∉ relationship `to` (e.g. `Application serves ValueStreamStage`). | validation-rules §edge 2–3                           |
| `SELF_LINK_NOT_ALLOWED`      | edge       | a `serves` edge from an entity to itself, where `serves.allowSelf = false`.                                                 | validation-rules §edge 4                             |
| `DUPLICATE_RELATIONSHIP`     | edge       | a second `accesses` edge between the same source/target, where `accesses.allowDuplicate = false`.                           | validation-rules §edge 4                             |
| `INHERITANCE_CYCLE`          | compile    | an `extends` chain forms a cycle; rejected at load time, before any write.                                                  | slots-and-effective-schema (cycles are a hard error) |
| `SCHEMA_VERSION_MISMATCH`    | compile    | an overlay package's `version` differs from the base; the merge is a hard error.                                            | packages-and-registry (merge rule 1)                 |

Notes on honest naming:

- The reason codes are **design-intent labels** for the sub-reasons `ValidationFailed` carries. `core-v1.json` does not
  enumerate these strings; the contract that they exist as distinct, machine-readable reasons comes from
  [validation-rules](../../../03-design/metamodel/validation-rules.md) and [data/README](../../README.md). An
  implementation may name them differently as long as each distinct rule is separately identifiable; the **set of
  distinguishable failures** is what this table pins.
- `INHERITANCE_CYCLE` and `SCHEMA_VERSION_MISMATCH` are **compile-time** rejections (the document fails to compile), not
  write-time rejections; they are listed here because they belong to the same metamodel-validation surface.
- A rejected write **does not enter the op log** — that non-entry is itself an M1 oracle assertion
  ([golden-journey](../../../build-contracts/golden-journey.md), step 3).

---

## Where `core-v1.json` under-specifies (honest notes)

These are recorded so a fixture consumer does not mistake an absence for an assertion:

- **The `Stage` supertype gap — decided ([#343](https://github.com/aideon-ai/aideon-desktop/issues/343)): drop the
  `extends`.** `ValueStreamStage` declares `extends: Stage`, but no `Stage` type exists. Resolution is to **remove the
  dangling `extends`** (not add `Stage` — a one-subtype, no-lifted-slots placeholder); the M1 compiler rejects any
  unresolved `extends` target. Until #343 lands the fixture still sets `extends_resolved: false` with its `gap` block;
  it is rebaselined (gap removed) then.
- **UUID minting — decided ([#343](https://github.com/aideon-ai/aideon-desktop/issues/343)): re-mint under a recorded
  namespace.** The committed UUIDs are not reproducible from the seed (the namespace was unrecorded and is
  unrecoverable). #343 records `package.symbol_uuid { namespace, name_path_version }` in `core-v1.json`, re-mints every
  symbol, and adds a compiler verify test (recompute = committed, else package error). Until then the fixtures **read**
  every UUID from the seed and cannot recompute one.
- **Slot cardinality is unstated.** No seed attribute declares single- vs multi-valued cardinality. The fixtures treat
  every slot as single-valued by default. The op/fact model carries `cardinality` on `FieldDef`
  ([op-fact-schema-model](../../../05-modules/mneme/op-fact-schema-model.md)) but the seed does not populate it;
  multi-valued behaviour is exercised only as design-intent in the temporal vectors.
- **Default structural rules.** `allowSelf` is declared only for `serves` and `allowDuplicate` only for `accesses`. The
  behaviour of the unstated cases for `realises`, `hosts`, and `plan_effect` is the compiler default, which
  `core-v1.json` does not state; the fixtures do not assert it.
- **`source.priority` dotted name.** `PlanEvent.source.priority` carries a dot. The fixture treats it as a single flat
  slot key (matching how `core-v1.json` lists it as one `attribute.name`); whether the dot denotes a nested object is
  design-intent.

---

## Related documents

| Document                                                                                 | What it covers                                           |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [M1-meaning.md](../../../build-contracts/M1-meaning.md)                                  | The M1 build contract these fixtures are the oracle for. |
| [slots-and-effective-schema](../../../03-design/metamodel/slots-and-effective-schema.md) | How inheritance flattens to the effective schema.        |
| [validation-rules](../../../03-design/metamodel/validation-rules.md)                     | The rules behind the error-code set.                     |
| [packages-and-registry](../../../03-design/metamodel/packages-and-registry.md)           | Compilation to `MetamodelBatch` and UUID minting.        |
| [`core-v1.json`](../../meta/core-v1.json)                                                | The seed metamodel these are compiled from.              |
| [data/README.md](../../README.md)                                                        | The seed-data operational note and the `Stage` gap.      |
