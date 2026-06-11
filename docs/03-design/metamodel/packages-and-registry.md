# Packages and the registry

How a metamodel package is loaded, merged, and compiled to a `MetamodelBatch`; the domain↔storage registry that keeps storage identifiers out of the rest of the product; and how the stable identifiers — including the UUIDs in `core-v1.json` — are minted and guaranteed. For a reader who needs to extend or publish a package.

---

## A package is a versioned metamodel document

A metamodel **package** is a versioned JSON document (`MetaModelDocument`) that Praxis loads, validates, and compiles. The seed package is [`docs/data/meta/core-v1.json`](../../data/meta/core-v1.json), embedded in the `praxis` binary at compile time and shipped as the built-in starter. A workspace may carry additional packages as overlay documents in `model/schema/` and list them in its manifest; Praxis loads them in manifest order.

Each document declares [entity types](./entity-types.md), [relationship types](./relationship-types.md), and a [validation](./validation-rules.md) block. Merge rules, applied in order:

1. all overlay documents must carry the same `version` string as the base; a mismatch is a hard error;
2. a type or relationship whose `id` matches an existing entry replaces it wholesale;
3. a type or relationship with a new `id` is appended;
4. an overlay's `validation` block, if present, replaces the base block entirely.

Schema is portable data, not hidden code enums — the document travels with the workspace ([what the metamodel is](./what-is-the-metamodel.md)).

---

## Compilation to a `MetamodelBatch`

After merging, Praxis compiles the document twice: into in-memory descriptors it uses at runtime, and into a `MetamodelBatch` it publishes to Mneme for persistence.

| Compiled output             | Purpose                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Type descriptor map         | Flattened attribute set per type, inheritance resolved ([effective schema](./slots-and-effective-schema.md)) |
| Relationship descriptor map | Allowed `from`/`to` sets and attribute set per relationship                                                  |
| UUID lookup maps            | String-key → stable UUID for types, relationships, and attributes                                            |
| `MetamodelBatch`            | The persistence form: type defs, field defs, type-field bindings, edge-type rules, version, source           |

Praxis publishes the batch; Mneme stores it and answers effective-schema queries. Neither side inverts this flow ([DESIGN.md](../DESIGN.md), axiom 4). The persisted batch is a _derived_ projection of the canonical JSON: delete Mneme's store and Praxis recompiles and republishes from source.

---

## The domain ↔ storage registry

The registry is the single layer that translates domain-facing keys into Mneme storage identifiers. No task API, no screen, and no host command passes a raw Mneme ID; all crossings go through the registry. This is the one indirection that keeps the storage engine replaceable.

| Domain key                                                    | Resolves to                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------ |
| **DomainTypeKey** (the type's string `id`, e.g. `Capability`) | Mneme `type_id`                                                    |
| **DomainFieldKey** (a slot's key, e.g. `Capability.tier`)     | Mneme `field_id`                                                   |
| **Verb** (a relationship `id`, e.g. `realises`)               | canonical relationship family, Mneme `edge_type_id`, and direction |

The registry exposes string-keyed lookups (type → UUID, relationship → UUID, type+attribute → UUID) so callers resolve either the string `id` or the UUID without touching storage internals.

---

## Stable identifiers — and how the UUIDs are minted

Two identifier namespaces coexist, both part of the long-term compatibility surface:

| Namespace   | Key                                                         | Stability guarantee                                                        |
| ----------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| String `id` | `MetaType.id`, `MetaRelationship.id` (and `attribute.name`) | Never changes after first publication                                      |
| UUID        | `MetaType.uuid`, `MetaRelationship.uuid`, attribute `uuid`  | Stable across document versions; used for cross-document identity matching |

**How the UUIDs are generated.** The UUIDs in `core-v1.json` are **UUIDv5** values — deterministic, name-based UUIDs (RFC 9562, formerly RFC 4122) computed by the metamodel compiler from a fixed project namespace UUID and the entity's stable name path (for example, the type `id`, or `type-id + attribute-name`). Because UUIDv5 is a hash of namespace + name, the _same_ name always yields the _same_ UUID: the values are reproducible from the source document and are committed in JSON so they travel with the workspace.

Two rules follow, and both are absolute:

- **Do not invent UUID values.** A UUID is never typed by hand or guessed. It is minted by the compiler from the namespace and name, or it is read from the committed source. Any document that needs a new type's UUID lets the compiler generate it; it does not assign one.
- **Do not change a published UUID.** Renaming a type's string `id` changes the name input and therefore the UUID, which is a breaking change to identity. A rename is a remove-plus-add, governed by [extension and versioning](./extension-and-versioning.md).

Removing a published `id`, changing its UUID, or altering its meaning is a breaking change; additions are non-breaking. The JSON document is the source of record; the registry is a compiled read path over it.

---

## Packages and partitions

Packages are installed per [partition](../DESIGN.md) — the runtime boundary for all facts and schema within a workspace. A workspace's base partition loads the embedded core package; a workspace may layer additional packages whose types and relationships group by area (for example: strategy and motivation; capabilities and value delivery; information and data; application and technology; change and delivery). Each overlay must align on `version` and obey the [extension rules](./extension-and-versioning.md).

The candidate package in [proposed-spine-extension](./proposed-spine-extension.md) is exactly such an overlay — **PROPOSED**, not wired into `core-v1.json` — that would add the ArchiMate Motivation-layer types the [semantic spine](../semantic-spine/README.md) expects.

---

## References & standards

_Normative:_

- **RFC 9562** (obsoletes RFC 4122) — UUID, including version-5 name-based UUIDs. The minting scheme for type/field/relationship identifiers.
- **Semantic Versioning 2.0.0** — package and document versioning, [ADR-0017](../../06-adrs/ADRS.md).
- Fowler; Young — **Event Sourcing & CQRS**. Canonical source vs derived projection (`MetamodelBatch`).

## Related documents

| Document                                                          | What it covers                            |
| ----------------------------------------------------------------- | ----------------------------------------- |
| [Extension and versioning](./extension-and-versioning.md)         | SemVer rules and forward-only evolution.  |
| [Slots and the effective schema](./slots-and-effective-schema.md) | What the compiled descriptors contain.    |
| [Validation rules](./validation-rules.md)                         | The rules the registry enforces on write. |
| [Proposed spine extension](./proposed-spine-extension.md)         | A candidate overlay package (PROPOSED).   |
| [`core-v1.json`](../../data/meta/core-v1.json)                    | The committed seed package and its UUIDs. |
