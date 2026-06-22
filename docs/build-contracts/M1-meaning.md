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
- **UUID minting** — the UUIDv5 values are committed in `core-v1.json`; M1 reads them and **verifies** them against the recorded namespace + name-path (it does not mint at runtime). The namespace and name-path are pinned and the symbols re-minted in [#343] (the original namespace was unrecoverable); a recompute mismatch is a package error ([packages-and-registry](../03-design/metamodel/packages-and-registry.md)).
- **Inventing missing supertypes** — M1 never fabricates an undeclared type. The seed's one dangling `extends: Stage` is removed in [#343] (not by adding `Stage`); thereafter the compiler treats any unresolved `extends` target as a hard package error, never a compile-around.

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

| Path                                                                                                                                           | What it pins                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/data/fixtures/metamodel/README.md`](../data/fixtures/metamodel/README.md)                                                               | The compiled-effective-schema oracle, the complete validation error-code set, and the honest notes on where `core-v1.json` under-specifies.       |
| [`docs/data/fixtures/metamodel/capability.effective-schema.json`](../data/fixtures/metamodel/capability.effective-schema.json)                 | The compiled effective schema for `Capability` (no `extends`; own slots only).                                                                    |
| [`docs/data/fixtures/metamodel/application.effective-schema.json`](../data/fixtures/metamodel/application.effective-schema.json)               | The compiled effective schema for `Application` (the four-slot, two-enum case).                                                                   |
| [`docs/data/fixtures/metamodel/value-stream-stage.effective-schema.json`](../data/fixtures/metamodel/value-stream-stage.effective-schema.json) | The compiled effective schema for `ValueStreamStage`; currently records the unresolved `extends: Stage` gap, rebaselined (gap removed) in [#343]. |
| [`docs/data/fixtures/metamodel/plan-event.effective-schema.json`](../data/fixtures/metamodel/plan-event.effective-schema.json)                 | The compiled effective schema for `PlanEvent` (two required slots, a `datetime`, a dotted-name enum slot).                                        |

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

## Seed-shape decisions (M1/M2 grill pack)

Resolved into the **M1 seed-shape finalisation** ([#343]) — one tight pre-implementation change to `core-v1.json` + fixtures, executed **before** the compiler is built. M0 impact throughout is **re-digest only** (authored-schema digest + affected fixtures); no operation-schema, storage, or semantic change.

- **`Stage` supertype gap — resolved: remove the dangling `extends`.** Drop `ValueStreamStage extends Stage`; do **not** add `Stage` (one subtype, no lifted slots = placeholder). Rule: no abstract type in the seed unless it contributes inherited slots/rules or has ≥2 concrete subtypes. The compiler **rejects** any unresolved `extends` target (hard error, not silent tolerance). The effective-schema fixture is rebaselined to drop the recorded gap.
- **UUIDv5 minting — resolved: re-mint under a recorded namespace.** The original namespace is **unrecoverable** (no minting tool in-repo; no match across standard namespaces; the only `new_v5` is an unrelated `package_id`), so the committed UUIDs are read-not-reproducible — a contradiction with ADR-0038's "a symbol UUID is reproducible from source, never invented". Fix: record `package.symbol_uuid { algorithm, namespace, name_path_version }` in `core-v1.json`, re-mint every type/relationship/attribute UUID, and add a compiler test that recomputes each committed UUID from the namespace + name path (mismatch = package error). **Dotted names** (`source.priority`) are hashed as one **opaque** string, never a path.
- **Slot identity / dotted names — resolved (no M0 change).** Operations key slots by `field_id` (a UUID), never by string name; `source.priority` is a metamodel field **name** that mints to a `field_id`. Cardinality and dotted-name interpretation are therefore **M1 metamodel concerns** — the M0 operation schema and fixtures need **no** change.
- **Default structural rules + multiplicity — resolved.** Make `allowSelf`/`allowDuplicate`/`multiplicity` explicit on every relationship; compiler fallback is defensive (`false`/`many`) but the seed never relies on absence. **Multiplicity is enforced at M1**, at the validation boundary — it is metamodel validation, not temporal resolution (resolves D19). The current seed values are all `many-many` (trivially satisfied); a generic count-against-bounds check makes the axis real with no special-casing, and the first non-trivial bound works with no new code.
- **Attribute-slot cardinality — resolved.** Cardinality lives on the `FieldDef`/effective schema (not the resolver alone); default single-valued; multi-valued is explicit with a named composition rule. A multi-valued slot is **N scalar facts on one `field_id`**, each with its own value/interval/layer/scenario/asserted-time; **no collection value type** (ADR-0038). M1 compiles cardinality + rule; M2 composes the effective value/set.

**M1 ÷ M2 split (the line this cluster draws).** **M1** decides whether a write is structurally and semantically valid against the metamodel — type known, required present, kind/length/enum, endpoint membership, `allowSelf`/`allowDuplicate`, **multiplicity**, cardinality — and rejects invalid writes at the host boundary before they enter the op log. **M2** decides what is _effective_ at a viewpoint — temporal competition between facts, single-valued winner selection across valid/asserted time + layer + scenario, multi-valued set composition from the N scalar facts, and conflict reporting where the effective schema admits no deterministic resolution. M1 never answers "did this hold under a different asserted-time replay?" — that is M2.

[#343]: https://github.com/aideon-ai/aideon-desktop/issues/343

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
