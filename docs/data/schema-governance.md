# Schema governance

How to add or deprecate an entity or relationship **type** in the seed metamodel without breaking an existing workspace:
the rules, the UUID minting discipline, and the `extends` inheritance semantics. For a reader editing
[`meta/core-v1.json`](./meta/core-v1.json). The canonical design record for the metamodel is
[`03-design/metamodel/`](../03-design/metamodel/README.md); this file is the operational governance note that sits
beside the data.

A [type](../../CONTEXT.md) is a metamodel-defined kind for an entity or a relationship; it governs which
[slots](../../CONTEXT.md) an instance may carry. Governing a type means governing identity, validity, and inheritance —
the three things a downstream workspace depends on staying stable.

---

## Contents

1. [The golden rule — never hand-author a UUID](#the-golden-rule--never-hand-author-a-uuid)
2. [Adding an entity or relationship type](#adding-an-entity-or-relationship-type)
3. [Deprecating a type](#deprecating-a-type)
4. [The `extends` semantics](#the-extends-semantics)
5. [The `Stage` reconciliation](#the-stage-reconciliation)

---

## The golden rule — never hand-author a UUID

Every type, relationship, and attribute in `core-v1.json` carries a stable `uuid`. These are **UUIDv5** values —
deterministic, name-based UUIDs (**RFC 9562**, formerly RFC 4122) computed by the metamodel compiler from a fixed
project namespace UUID and the entity's stable name path (the type `id`, or `type-id + attribute-name`). The same name
always produces the same UUID ([packages and the registry](../03-design/metamodel/packages-and-registry.md)).

Two absolute rules follow:

- **A UUID must never be typed by hand or guessed.** It is either minted by the compiler from the namespace and name, or
  read from the committed source. When you add a new type, you do not assign its UUID — the compiler does, and you
  commit the result.
- **A published UUID must never be changed.** Renaming a type's string `id` changes the name input and therefore the
  UUID; that is a breaking change to identity, handled as remove-plus-add (below), never as an in-place edit.

This is why the seed commits UUIDs in source: they travel with the workspace and let two documents match the same type
across versions by UUID, not by fragile string comparison.

---

## Adding an entity or relationship type

Additions are non-breaking and bump the metamodel **minor** version
([extension and versioning](../03-design/metamodel/extension-and-versioning.md)). The rules that keep them non-breaking:

| Adding                                           | Allowed in a minor version? | Condition                                                                                |
| ------------------------------------------------ | --------------------------- | ---------------------------------------------------------------------------------------- |
| A new entity type with an unused `id`            | yes                         | UUID minted by the compiler, not by hand                                                 |
| A new relationship type between existing types   | yes                         | declares its own `from`/`to` endpoint sets and any attributes                            |
| A new **optional** attribute on an existing type | yes                         | existing instances stay valid without it                                                 |
| A new **required** attribute on an existing type | **no**                      | existing instances lack it and fail validation — this is a major change with a migration |

Steps to add a type:

1. Add the type or relationship object to `core-v1.json` with its `id`, `label`, `category` (entity) or `from`/`to`
   (relationship), and attributes — **without** a `uuid`, or with a placeholder the compiler overwrites.
2. Run the metamodel compiler so it mints the UUIDv5 values from the names; commit the generated UUIDs back into the
   JSON.
3. Bump the document `version` (minor) and dry-run the importer to confirm existing seed data still validates
   ([../data/README.md](./README.md), editing workflow).

A new type's endpoints, multiplicity, and attribute kinds must follow the same shape the seed uses — see
[entity types](../03-design/metamodel/entity-types.md) and
[relationship types](../03-design/metamodel/relationship-types.md) for the implemented vocabulary, and align names to
ArchiMate 3.2 where an ArchiMate element exists (The Open Group, ArchiMate 3.2 Specification).

---

## Deprecating a type

There is no in-place rename and no silent removal. Removing or renaming a published `id`, changing its UUID, or
tightening a rule so existing data fails is a **major** change
([extension and versioning](../03-design/metamodel/extension-and-versioning.md)).

- **A rename is modelled as remove-plus-add.** Retire the old `id` (major), introduce a new `id` (whose UUID the
  compiler mints fresh), and supply a migration mapping instances from old to new. The UUID is derived from the name and
  cannot be carried across, so there is no shortcut.
- **A removal needs a migration.** Because schema evolution is forward-only and the operation log is canonical, a
  deprecation is itself recorded as operations: existing facts are not edited in place, and the migration writes new
  facts or supersedes old ones by closing their valid-time intervals
  ([extension and versioning](../03-design/metamodel/extension-and-versioning.md);
  [ADR-0009](../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)).

The trade-off this closes: it forecloses the convenience of editing the old schema in place. In exchange, any past
[viewpoint](../../CONTEXT.md) stays resolvable — the schema's own history is preserved like any other fact.

---

## The `extends` semantics

A type may declare `"extends": "<other-type-id>"` to inherit that type's attributes. `ValueStreamStage` in the seed
declares `"extends": "Stage"`. Inheritance is **single** — a type extends at most one supertype — and the compiler
resolves it into a flattened, per-type [effective schema](../03-design/metamodel/slots-and-effective-schema.md): the
subtype's attributes are the union of its own and the supertype's, with the subtype winning on a name clash.
**Inheritance cycles are rejected at load time**
([extension and versioning](../03-design/metamodel/extension-and-versioning.md)).

`extends` therefore creates a real dependency: the named supertype must exist as a declared type for the inheritance to
contribute anything. Declaring `extends` against an undeclared `id` leaves the subtype validating only on its own
attributes, with the inheritance inert — which is exactly the seed's current `Stage` situation.

---

## The `Stage` reconciliation

`ValueStreamStage` declares `"extends": "Stage"`, but **`core-v1.json` defines no `Stage` type**. This is a known,
code-backed gap, surfaced here per the documentation standard's honest-state obligation
([DOCUMENTATION-STANDARD.md §9](../02-standards/DOCUMENTATION-STANDARD.md)).

- **Current truth:** the inheritance is inert. `ValueStreamStage` validates and resolves on its own declared attributes
  (`name`, `purpose`, `owner`); there is no `Stage` effective schema to flatten in.
- **Intended direction (design intent):** either declare a `Stage` base type — an abstract supertype carrying the
  attributes value-stream and other stage kinds share — and let `ValueStreamStage` inherit it (an additive, minor
  change); or drop the `extends` (an editorial change). The decision is owned by the metamodel design; this note records
  the gap and points to it.
- **Where the fix lands:** the inheritance mechanics are in
  [slots and the effective schema](../03-design/metamodel/slots-and-effective-schema.md); the version-bump treatment is
  in [extension and versioning](../03-design/metamodel/extension-and-versioning.md).

Until reconciled, no document treats `Stage` as an existing type, and `ValueStreamStage` is described by its own
attributes only.

---

## References & standards

_Normative:_

- **RFC 9562** (obsoletes RFC 4122) — UUID, including version-5 name-based UUIDs. The minting scheme.
- **Semantic Versioning 2.0.0** — the type-addition and deprecation bump rules
  ([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)).
- The Open Group — **ArchiMate 3.2 Specification**. The element vocabulary new types align to.

## Related documents

| Document                                                                              | What it covers                                                    |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [03-design/metamodel](../03-design/metamodel/README.md)                               | The canonical metamodel design record.                            |
| [packages-and-registry.md](../03-design/metamodel/packages-and-registry.md)           | UUID minting and the domain↔storage registry.                     |
| [extension-and-versioning.md](../03-design/metamodel/extension-and-versioning.md)     | SemVer rules and forward-only evolution.                          |
| [slots-and-effective-schema.md](../03-design/metamodel/slots-and-effective-schema.md) | How `extends` flattens into an effective schema.                  |
| [README.md](./README.md)                                                              | The baseline-data operational note.                               |
| [`CONTEXT.md`](../../CONTEXT.md)                                                      | The canonical glossary — type, slot, metamodel, effective schema. |
