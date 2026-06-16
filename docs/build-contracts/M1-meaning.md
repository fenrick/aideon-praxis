# M1 build contract — meaning

The build contract for the **Meaning** milestone: a user authors entities and relationships that validate against the seed metamodel, the metamodel compiles deterministically into an effective schema stored as data, and a write that is structurally well-formed but invalid against the metamodel is rejected at the boundary and never enters the op log. M1 is the second milestone of the [golden journey](./golden-journey.md) (steps 2–3) and the point at which the twin acquires a modelling language. It builds on M0's portable workspace and op log; it is the precondition for M2's time-and-scenario resolution. This contract takes the [metamodel design](../03-design/metamodel/README.md) and the seed package [`core-v1.json`](../data/meta/core-v1.json) as fixed inputs and pins the expected compiled outputs an implementation is checked against.

---

## Outcome

When M1 is complete, on the seed metamodel and seed dataset:

- **The metamodel compiles deterministically.** Praxis loads [`core-v1.json`](../data/meta/core-v1.json), resolves `extends` depth-first, flattens parent slots into each child, attaches the global validation rules, and publishes a `MetamodelBatch` to Mneme. Re-running the compile from the same source produces a byte-identical effective schema per type ([slots-and-effective-schema](../03-design/metamodel/slots-and-effective-schema.md), [packages-and-registry](../03-design/metamodel/packages-and-registry.md)).
- **Authoring validates against the effective schema.** Creating an entity (e.g. an `Application`) or a relationship (e.g. `realises` to a `Capability`) is checked by `validate_node` / `validate_edge` against the compiled effective schema before any operation is appended ([validation-rules](../03-design/metamodel/validation-rules.md)).
- **Invalid writes are rejected at the boundary.** A write that names an unknown type, omits a required attribute, carries an out-of-range enum or over-length string, or violates an endpoint or structural rule (`serves.allowSelf`, `accesses.allowDuplicate`) is rejected with a typed `ValidationFailed` error and **does not enter the op log**. This non-entry is itself an oracle assertion ([golden-journey](./golden-journey.md), step 3).
- **The metamodel is stored as portable data, not code.** The compiled `MetamodelBatch` is a derived projection persisted by Mneme; deleting Mneme's store and recompiling from the source document reproduces the same effective schema ([metamodel-ownership](../05-modules/praxis/metamodel-ownership.md)).

---

## In scope

- Loading and merging the seed metamodel package and any manifest-listed overlays in order ([packages-and-registry](../03-design/metamodel/packages-and-registry.md), merge rules).
- Deterministic compilation to the effective schema per type: `extends` resolution, attribute flattening, child-wins override, validation-rule attachment, stable `uuid` recording.
- The domain↔storage registry that maps `DomainTypeKey` / `DomainFieldKey` / `Verb` to Mneme storage identifiers, so no raw storage ID crosses the Praxis boundary.
- `validate_node` and `validate_edge` over the full effective schema: type-known, required-present, kind-checked, length-checked, enum case-insensitive match, endpoint membership, `allowSelf` / `allowDuplicate`.
- Entity and relationship authoring via `mneme_store_create_node` / `mneme_store_create_edge` (or a Change Event via `praxis_task_apply_operations`), each validated before append ([tasks-and-change-events](../05-modules/praxis/tasks-and-change-events.md)).
- The typed `ValidationFailed` error surfaced in the RFC 9457 envelope ([ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md)).
- Slot **cardinality and the single-writer merge-policy declarations** the MVP needs — expected to be `single_value` / `multi_value` rather than a misleading global "last-writer-wins" label (the resolver is bitemporal and viewpoint-based, M2). CRDT policies (`or-set`/`counter`/`text`) and their convergence are **not** declared here — they are M6 ([ADR-0034](../06-adrs/ADR-0034-merge-correctness-and-convergence.md)).

## Out of scope

- **Temporal resolution and diff** — choosing a winning fact across valid time, asserted time, layers, and scenarios is M2 ([M2-time](./M2-time.md)). M1 authors facts; it does not resolve competing ones.
- **Artefact execution and analytics** — the catalogue, centrality, and impact are M3.
- **Schema evolution at runtime** — overlay packages and version bumps are specified ([extension-and-versioning](../03-design/metamodel/extension-and-versioning.md)) but exercising a migration end to end is later work; M1 compiles the single seed version.
- **UUID minting** — the UUIDv5 values are committed in `core-v1.json`; M1 reads them, it does not re-mint them. The minting algorithm is design-intent until the compiler implements it ([packages-and-registry](../03-design/metamodel/packages-and-registry.md)).
- **Resolving the `Stage` supertype gap** — the seed names a supertype it does not declare; M1 compiles around it honestly (see the effective-schema fixture README) rather than inventing a `Stage` type.

---

## Authoritative sources

| Tier     | Source                                                                                                                      | What it fixes                                                        |
| -------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| ADR      | [ADR-0011](../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)                                                           | Praxis owns the metamodel and the canonical relationship vocabulary. |
| ADR      | [ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)                                                              | SemVer for the metamodel document.                                   |
| ADR      | [ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md)                                                                   | The error envelope `ValidationFailed` is carried in.                 |
| Fixture  | [`core-v1.json`](../data/meta/core-v1.json) (`version` 1.0.0)                                                               | The authored seed metamodel — **this is metamodel v1**.              |
| Fixture  | [`baseline.yaml`](../data/base/baseline.yaml)                                                                               | The seed dataset the worked authoring values are drawn from.         |
| Contract | [slots-and-effective-schema](../03-design/metamodel/slots-and-effective-schema.md)                                          | How inheritance flattens to the effective schema.                    |
| Contract | [entity-types](../03-design/metamodel/entity-types.md) / [relationship-types](../03-design/metamodel/relationship-types.md) | The eight entity types and five relationship types and their slots.  |
| Contract | [validation-rules](../03-design/metamodel/validation-rules.md)                                                              | The global and per-relationship rules a write is checked against.    |
| Contract | [packages-and-registry](../03-design/metamodel/packages-and-registry.md)                                                    | Package merge, `MetamodelBatch` compilation, registry, UUID minting. |
| Contract | [extension-and-versioning](../03-design/metamodel/extension-and-versioning.md)                                              | Forward-only, additive evolution rules.                              |
| Module   | [metamodel-ownership](../05-modules/praxis/metamodel-ownership.md)                                                          | The Praxis↔Mneme ownership boundary.                                 |
| Module   | [op-fact-schema-model](../05-modules/mneme/op-fact-schema-model.md)                                                         | `MetamodelBatch` shape and the op surface a valid write compiles to. |

---

## Contracts and fixtures this milestone produces

| Path                                                                                                                                           | What it pins                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/data/fixtures/metamodel/README.md`](../data/fixtures/metamodel/README.md)                                                               | The compiled-effective-schema oracle, the complete validation error-code set, and the honest notes on where `core-v1.json` under-specifies. |
| [`docs/data/fixtures/metamodel/capability.effective-schema.json`](../data/fixtures/metamodel/capability.effective-schema.json)                 | The compiled effective schema for `Capability` (no `extends`; own slots only).                                                              |
| [`docs/data/fixtures/metamodel/application.effective-schema.json`](../data/fixtures/metamodel/application.effective-schema.json)               | The compiled effective schema for `Application` (the four-slot, two-enum case).                                                             |
| [`docs/data/fixtures/metamodel/value-stream-stage.effective-schema.json`](../data/fixtures/metamodel/value-stream-stage.effective-schema.json) | The compiled effective schema for `ValueStreamStage`, including the unresolved `extends: Stage` gap, recorded honestly.                     |
| [`docs/data/fixtures/metamodel/plan-event.effective-schema.json`](../data/fixtures/metamodel/plan-event.effective-schema.json)                 | The compiled effective schema for `PlanEvent` (two required slots, a `datetime`, a dotted-name enum slot).                                  |

Each effective-schema fixture is the flattened slot set **after inheritance resolution**, so two implementations cannot diverge on flattening. The `README.md` is the oracle's documentation: the field meanings, the error-code set, and the gaps.

---

## Module ownership

| Concern                                                                                                 | Owner                                                                           |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| The authored metamodel document, its packages, and merge order                                          | **Praxis** ([metamodel-ownership](../05-modules/praxis/metamodel-ownership.md)) |
| Compilation to descriptors and the `MetamodelBatch`; the registry's _meaning_                           | **Praxis**                                                                      |
| Validation of every write against the effective schema                                                  | **Praxis** (`validate_node` / `validate_edge`)                                  |
| Persisting the `MetamodelBatch`; answering effective-schema queries; appending the resulting operations | **Mneme** ([op-fact-schema-model](../05-modules/mneme/op-fact-schema-model.md)) |
| The storage identifiers the registry maps to                                                            | **Mneme**                                                                       |
| Carrying the typed command surface to the renderer                                                      | **Host** (typed IPC only; no renderer HTTP)                                     |

The flow is one-directional: Praxis publishes, Mneme persists, neither side inverts it ([metamodel-ownership](../05-modules/praxis/metamodel-ownership.md)).

---

## Implementation sequence

1. **Load and merge** the seed package (and any manifest overlays) into a single `MetaModelDocument`, enforcing the version-alignment and merge rules ([packages-and-registry](../03-design/metamodel/packages-and-registry.md)).
2. **Compile the effective schema** per type: resolve `extends` depth-first, detect cycles as a hard error, flatten parent slots, overlay child declarations, attach validation rules, record each slot's `uuid`. Produce a result that matches the effective-schema fixtures byte-for-byte under the canonical serialisation.
3. **Build the registry** mapping domain string keys to Mneme storage identifiers.
4. **Publish the `MetamodelBatch`** to Mneme and confirm `mneme_store_get_effective_schema` returns the compiled set; confirm a delete-and-recompile reproduces it.
5. **Wire `validate_node` / `validate_edge`** to run against the effective schema on every authoring path, before any operation is appended.
6. **Author one entity and one relationship** from the seed and confirm they validate and land; author each rejected case and confirm the typed error and the empty op log.

---

## Golden-journey segment

M1 is steps 2–3 of the [golden journey](./golden-journey.md):

- **Step 2 — Load the seed metamodel.** `mneme_store_upsert_metamodel_batch` then `mneme_store_compile_effective_schema`; read back with `praxis_metamodel_get` / `mneme_store_get_effective_schema`. **Oracle:** the compiled effective schema for representative seed types equals the effective-schema fixtures this contract produces.
- **Step 3 — Create one entity and one relationship.** `mneme_store_create_node` (an `Application`) then `mneme_store_create_edge` (`realises` to a `Capability`), or the same via `praxis_task_apply_operations`. **Oracle:** a structurally valid but metamodel-invalid write is rejected at the boundary and does **not** enter `model/ops/`.

What the journey proves at M1: meaning is authored against the metamodel, and invalid writes are rejected ([golden-journey](./golden-journey.md), "What the journey proves").

---

## Exit tests

| Assertion                                                                                                                                             | Oracle                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Compiling `Capability` yields exactly its three own slots (`name` required, `tier`/`lifecycle` optional enums) with the seed UUIDs.                   | [`capability.effective-schema.json`](../data/fixtures/metamodel/capability.effective-schema.json)                                   |
| Compiling `Application` yields four slots, two of them enums (`disposition`, `lifecycle`), with the seed UUIDs.                                       | [`application.effective-schema.json`](../data/fixtures/metamodel/application.effective-schema.json)                                 |
| Compiling `ValueStreamStage` yields only its three own slots; the `extends: Stage` reference is unresolved and contributes no inherited slot.         | [`value-stream-stage.effective-schema.json`](../data/fixtures/metamodel/value-stream-stage.effective-schema.json) + README gap note |
| Compiling `PlanEvent` yields two required slots (`name`, `effective_at` datetime), `confidence` (number), and the dotted-name `source.priority` enum. | [`plan-event.effective-schema.json`](../data/fixtures/metamodel/plan-event.effective-schema.json)                                   |
| A second compile from the same source reproduces every effective schema byte-identically.                                                             | All four fixtures (re-compare)                                                                                                      |
| Creating `n:capability:customer-insight` with `name`, `tier = "Strategic"` validates and lands.                                                       | [validation-rules](../03-design/metamodel/validation-rules.md) worked example                                                       |
| A `Capability` with `tier = "strategic"` (lower case) validates — enum match is case-insensitive.                                                     | `enum.caseSensitive = false` in `core-v1.json`                                                                                      |
| A `Capability` with `tier = "Tactical"` is rejected `ValidationFailed`; no op is appended.                                                            | error-code set in [metamodel README](../data/fixtures/metamodel/README.md)                                                          |
| An `accesses` edge with no `mode` is rejected (required relationship attribute).                                                                      | [validation-rules](../03-design/metamodel/validation-rules.md)                                                                      |
| A second `accesses` between the same `insight-hub`/`customer-profile` pair is rejected (`allowDuplicate = false`).                                    | [validation-rules](../03-design/metamodel/validation-rules.md)                                                                      |
| A `serves` from `n:capability:customer-insight` to itself is rejected (`allowSelf = false`).                                                          | [validation-rules](../03-design/metamodel/validation-rules.md)                                                                      |
| An `Application serves ValueStreamStage` edge is rejected — `Application ∉ serves.from`.                                                              | [relationship-types](../03-design/metamodel/relationship-types.md) worked example                                                   |
| Every rejected write above leaves `model/ops/` unchanged.                                                                                             | [golden-journey](./golden-journey.md) step 3                                                                                        |

---

## Open questions

- **The `Stage` supertype gap.** `core-v1.json` declares `ValueStreamStage extends Stage` but does not declare `Stage`. M1 compiles `ValueStreamStage` on its own attributes; whether the fix is to add `Stage` as an abstract base type (additive/minor) or to drop the `extends` (editorial) is owned by the metamodel design and is **not settled** here ([data/README, the `Stage` gap](../data/README.md), [slots-and-effective-schema, honest-state note](../03-design/metamodel/slots-and-effective-schema.md)). The fixture records the gap rather than resolving it.
- **UUIDv5 minting.** The committed UUIDs are stated to be UUIDv5 over a fixed namespace plus name path, but `core-v1.json` does not record the namespace UUID. Re-minting cannot be verified from the seed alone; the values are read, not recomputed. The namespace is design-intent until the compiler fixes it ([packages-and-registry](../03-design/metamodel/packages-and-registry.md)).
- **Default structural rules.** The seed declares `allowSelf` only for `serves` and `allowDuplicate` only for `accesses`. The compiler default for the unstated cases on `realises`, `hosts`, and `plan_effect` is design-intent ([validation-rules](../03-design/metamodel/validation-rules.md)); the fixtures do not assert it.
- **Cardinality of attribute slots.** The seed declares no per-attribute cardinality; whether an attribute slot is single- or multi-valued is the resolver's concern (M2). M1 treats every seed attribute slot as single-valued by default and flags multi-valued behaviour as design-intent.

---

## Related documents

| Document                                                                  | What it covers                                                                   |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [README.md](./README.md)                                                  | Contract precedence and how an agent uses this folder.                           |
| [golden-journey.md](./golden-journey.md)                                  | The end-to-end path; M1 is steps 2–3.                                            |
| [M2-time.md](./M2-time.md)                                                | The next milestone — temporal and scenario resolution over the facts M1 authors. |
| [metamodel/](../03-design/metamodel/README.md)                            | The full metamodel design this contract takes as fixed.                          |
| [data/fixtures/metamodel/README.md](../data/fixtures/metamodel/README.md) | The effective-schema oracle and validation error-code set.                       |
| [ROADMAP.md](../00-index/ROADMAP.md)                                      | The M1 exit criteria this contract operationalises.                              |
