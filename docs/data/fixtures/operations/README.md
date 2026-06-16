# Operation fixtures

Validating example **canonical operation records** for every Mneme operation kind — the **tier-4 oracle** ([contract precedence](../../../build-contracts/README.md#contract-precedence)) the operation schemas are checked with. Each fixture is a full record: the [envelope](../../../contracts/operations/README.md) (`op_id`, `actor_id`, `asserted_at`, `kind`, `format_version`, `origin`, `deps`) wrapping a typed `payload` object. For each op kind there is a `*.valid.json` whose envelope validates against `op-envelope.schema.json` and whose `payload` validates against the matching `<kind>.schema.json`, and a `*.invalid.json` that must fail, for the reason recorded below. The records follow the [canonical-JSON profile](../../../04-contracts/canonical-json.md) ([ADR-0038](../../../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)) — sorting is applied by the canonicaliser, so source files are written naturally (Prettier-formatted). Identifiers are taken from the seed metamodel [`core-v1.json`](../../meta/core-v1.json) (real symbol UUIDs) and the seed dataset [`baseline.yaml`](../../base/baseline.yaml) (the `Automation Orchestrator` `Application` and its `disposition = Migrate` claim).

## Seed identifiers used

The metamodel symbol UUIDs are the real values committed in `core-v1.json`:

| Symbol                    | UUID                                   |
| ------------------------- | -------------------------------------- |
| `Application` (type)      | `ab0aefe4-902f-5f99-8ce3-eae00286ebe0` |
| `Capability` (type)       | `ec929adf-eb79-51b8-a757-38d0452885ae` |
| `disposition` (field)     | `cba320a9-7e3c-5597-b42f-284aad9a6406` |
| `vendor` (field)          | `8b325050-8ae1-52b7-843a-1ac2efaf0e41` |
| `confidence` (field)      | `919c0d4e-2c2d-5269-974f-5db6e59a054b` |
| `realises` (relationship) | `ea3b966e-7c80-537a-9965-65943211827d` |

Instance, partition, actor, and op identifiers are illustrative fixed UUIDs (e.g. `11111111-…-000000000003` for the `Automation Orchestrator` instance). They are storage-layer `Id`s, not the domain key `n:application:automation-orchestrator` — the registry maps the domain key to the runtime `entity_id`, which never crosses the Praxis boundary as a raw value ([identifier-generation-and-provenance](../../../05-modules/mneme/identifier-generation-and-provenance.md)). In the canonical record `asserted_at` is the packed HLC as a **decimal string** (`"7338950400000000000"`), and `valid_from` / `valid_to` are epoch-microsecond values as decimal strings (`"1767225600000000"` = 2026-01-01T00:00:00Z) — never JSON numbers ([canonical-JSON profile](../../../04-contracts/canonical-json.md)).

## Why each invalid fixture fails

| Fixture                                    | Validated against                                   | Reason it fails                                                                                                 |
| ------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `op-envelope.invalid.json`                 | `op-envelope.schema.json`                           | `kind` is `"frobnicate-widget"`, not a registered kebab `kind` name.                                            |
| `create-node.invalid.json`                 | `create-node.schema.json` (payload)                 | `payload.node_id` is the domain key string, not a UUID; fails the `Id` pattern.                                 |
| `create-edge.invalid.json`                 | `create-edge.schema.json` (payload)                 | `payload.layer` is `"forecast"`, not a `Layer` value tag (`plan` \| `actual`).                                  |
| `tombstone-entity.invalid.json`            | `tombstone-entity.schema.json` (payload)            | `payload.entity_id` is omitted; it is required.                                                                 |
| `set-property-interval.invalid.json`       | `set-property-interval.schema.json` (payload)       | `payload.value` carries two variant keys (`str` and `i64`); the `Value` tag is exactly one.                     |
| `clear-property-interval.invalid.json`     | `clear-property-interval.schema.json` (payload)     | `payload.valid_from` is an ISO-8601 string, not a decimal-string `ValidTime`.                                   |
| `set-edge-existence-interval.invalid.json` | `set-edge-existence-interval.schema.json` (payload) | `payload.is_tombstone` is omitted; it is a required (non-`Option`) field.                                       |
| `or-set-update.invalid.json`               | `or-set-update.schema.json` (payload)               | `payload.op` is `"toggle"`, not a `SetOp` value tag (`add` \| `remove`).                                        |
| `counter-update.invalid.json`              | `counter-update.schema.json` (payload)              | `payload.delta` is the JSON number `1.5`, not the required decimal-string i64.                                  |
| `upsert-metamodel-batch.invalid.json`      | `upsert-metamodel-batch.schema.json` (payload)      | `payload.fields[0].value_type` is `"enum"`, not a `ValueType` value tag.                                        |
| `actor-declare.invalid.json`               | `actor-declare.schema.json` (payload)               | `payload.actor_kind` is `"robot"`, not an `actor_kind` value (`person`\|`import`\|`ai`\|`connector`\|`system`). |

## Related documents

| Document                                                       | What it covers                                  |
| -------------------------------------------------------------- | ----------------------------------------------- |
| [operations schemas](../../../contracts/operations/README.md)  | The tier-2 schemas these fixtures validate.     |
| [rebuild fixtures](../rebuild/README.md)                       | The rebuild-equivalence oracle (op set → twin). |
| [M0 build contract](../../../build-contracts/M0-foundation.md) | The milestone these fixtures serve.             |
