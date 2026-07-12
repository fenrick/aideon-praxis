# Metamodel packages — see the canonical design

The metamodel — how it is delivered as portable **packages** rather than hard-coded enums, how packages compile into
Mneme, and how the domain↔storage registry keeps storage identifiers out of the rest of the product — is documented in
full under **[`03-design/metamodel/`](../03-design/metamodel/README.md)**. This page is a redirect, not a second source:
it existed before the metamodel design folder and its content has moved there to avoid duplication.

Read these for what this page used to cover:

| You want                                                                                      | Read                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What the metamodel is and the meaning/storage split                                           | [what is the metamodel](../03-design/metamodel/what-is-the-metamodel.md)                                                                                                                          |
| How packages compile to a `MetamodelBatch`; the domain↔storage registry; how UUIDs are minted | [packages and the registry](../03-design/metamodel/packages-and-registry.md)                                                                                                                      |
| How a package extends the model per partition; SemVer evolution                               | [extension and versioning](../03-design/metamodel/extension-and-versioning.md)                                                                                                                    |
| The implemented seed metamodel                                                                | [`data/meta/core-v1.json`](../data/meta/core-v1.json), tabulated in [entity types](../03-design/metamodel/entity-types.md) and [relationship types](../03-design/metamodel/relationship-types.md) |
| How to add or deprecate a type, and UUID minting discipline                                   | [data/schema-governance.md](../data/schema-governance.md)                                                                                                                                         |

Praxis owns the **meaning** of the twin; Mneme owns the **persistence** of schema data. That split — and the registry
that mediates it — is set out in the metamodel design and governed by
[ADR-0011](../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md).

> **Terminology note.** Earlier drafts of this page used "master types" and named persistence tables (`aideon_types`,
> `aideon_fields`, `aideon_edge_type_rules`). The canonical design uses the [`CONTEXT.md`](../../CONTEXT.md) vocabulary
> — entity types, relationship types, slots, effective schema — and treats the persisted batch as a derived projection
> of the canonical JSON. Where the two differ, the [metamodel design](../03-design/metamodel/README.md) is
> authoritative.

## Related documents

| Document                                                  | What it covers                              |
| --------------------------------------------------------- | ------------------------------------------- |
| [03-design/metamodel](../03-design/metamodel/README.md)   | The canonical metamodel design record.      |
| [data/schema-governance.md](../data/schema-governance.md) | Adding and deprecating types; UUID minting. |
| [`CONTEXT.md`](../../CONTEXT.md)                          | The canonical glossary.                     |
