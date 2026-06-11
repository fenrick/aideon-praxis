# Metamodel ownership

Praxis owns the twin's modelling language: the metamodel, its types, the canonical relationship vocabulary, and the rules every instance must obey. This file states what that ownership means at the module boundary and points to the design record. For a reader who needs to know where meaning is decided and where storage takes over.

The full metamodel design — entity types, relationship types, slots, inheritance, validation, packages, and the registry — lives at [03-design/metamodel/](../../03-design/metamodel/README.md). This file does not duplicate it; it records the ownership boundary.

---

## Praxis owns meaning; Mneme owns storage

The [metamodel](../../../CONTEXT.md) is the authored, portable definition of what can exist in the twin. Praxis authors and compiles it; [Mneme](../mneme/README.md) stores the compiled form and answers effective-schema queries. The flow is one-directional ([DESIGN.md](../../03-design/DESIGN.md), axiom 4): Praxis publishes a `MetamodelBatch`, Mneme persists it, and neither side inverts the relationship. The persisted batch is a _derived_ projection — delete Mneme's store and Praxis recompiles and republishes from the source document ([packages and registry](../../03-design/metamodel/packages-and-registry.md)).

| Praxis owns                                         | Mneme owns                                                  |
| --------------------------------------------------- | ----------------------------------------------------------- |
| The authored metamodel document and its packages    | The persisted `MetamodelBatch` and the effective schema     |
| Which types and relationships exist and their rules | How facts about instances are stored, indexed, and resolved |
| Validation of every write against the metamodel     | Append of the resulting operations to the op log            |
| The domain↔storage registry's _meaning_             | The storage identifiers the registry maps to                |

The metamodel must compile deterministically: inheritance resolution walks each type's `extends` chain, detects cycles as hard integrity violations, and flattens parent slots into each child's [effective schema](../../../CONTEXT.md) ([slots and effective schema](../../03-design/metamodel/slots-and-effective-schema.md)).

---

## Stable identifiers and the UUIDv5 rule

Two identifier namespaces coexist and both are part of the long-term compatibility surface: the human-readable string `id` (for example, `Capability`, `serves`) and a stable `uuid`. The UUIDs are **UUIDv5** values — deterministic, name-based UUIDs (RFC 9562, formerly RFC 4122) computed by the metamodel compiler from a fixed project namespace UUID and the entity's stable name path ([packages and registry](../../03-design/metamodel/packages-and-registry.md)).

Two rules follow and both are absolute:

- **UUIDs must not be invented.** A UUID is never typed by hand or guessed; the compiler mints it from namespace plus name, or it is read from the committed source. Documentation that needs to refer to a type's UUID names the type, not a value.
- **A published UUID must not be changed.** Renaming a type's string `id` changes the name input and therefore the UUID — a breaking change to identity, governed as a remove-plus-add ([extension and versioning](../../03-design/metamodel/extension-and-versioning.md)).

Because the registry maps domain string keys to stored UUIDs, internal storage identifiers do not cross the Praxis boundary: consumers address types and relationships by their stable `id`, never by a storage row reference.

---

## The relationship vocabulary

Praxis owns the canonical relationship set and is the module-level source of truth for what each relationship means. The set is the seed's ArchiMate-aligned `serves`, `realises`, `accesses`, `hosts`, `plan_effect`, fixed by [ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md) and documented in full — directions, endpoints, attributes, ArchiMate mapping, and a worked example — in the [edge catalogue](./edge-catalogue/README.md). The metamodel-layer projection of the same set is [relationship types](../../03-design/metamodel/relationship-types.md); where the two could drift, the edge catalogue governs.

---

## Worked example — the Capability type

From the seed metamodel ([`core-v1.json`](../../data/meta/core-v1.json)), the `Capability` entity type carries an enum attribute `tier` (`Strategic`, `Core`, `Supporting`). In the [baseline](../../data/base/baseline.yaml), the `Capability` **Automation Fabric** (`n:capability:automation-fabric`) is an instance with `tier = Supporting`.

Praxis owns the rules this instance must obey: that `tier` is a known enum value (enum matching is case-insensitive, per [validation rules](../../03-design/metamodel/validation-rules.md)); that a `serves` relationship from it must point at a `ValueStreamStage` ([edge catalogue](./edge-catalogue/catalogue.md)); and that the `serves` to `Deliver` is valid because its endpoints match. Mneme owns none of that meaning — it stores the fact that `Automation Fabric.tier = Supporting` over a valid-time interval and resolves it at a viewpoint, but the fact that `Supporting` is a legal value and `serves` is a legal relationship is Praxis's judgement, made against the compiled effective schema.

---

## Related documents

| Document                                                                                  | What it covers                                                       |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [The metamodel](../../03-design/metamodel/README.md)                                      | The full metamodel design — the canonical record.                    |
| [Packages and the registry](../../03-design/metamodel/packages-and-registry.md)           | How packages compile to a `MetamodelBatch` and how UUIDs are minted. |
| [Edge catalogue](./edge-catalogue/README.md)                                              | The relationship vocabulary Praxis owns.                             |
| [Slots and the effective schema](../../03-design/metamodel/slots-and-effective-schema.md) | How inheritance flattens into the compiled schema.                   |
| [Mneme module](../mneme/README.md)                                                        | The storage engine that persists the compiled metamodel.             |
| [`core-v1.json`](../../data/meta/core-v1.json)                                            | The implemented seed metamodel.                                      |
