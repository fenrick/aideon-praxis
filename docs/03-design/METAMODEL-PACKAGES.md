# Metamodel packages and registry

This document has been decomposed into a folder of focused files. Its content now lives in
[`metamodel/`](./metamodel/README.md), per the [Documentation Standard §4](../02-standards/DOCUMENTATION-STANDARD.md)
granularity rule (small, single-topic files indexed by a README).

Start at the [metamodel index](./metamodel/README.md). The most likely targets for an incoming link:

| You were looking for                                       | Now at                                                                     |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| What the metamodel is, authored vs compiled                | [what-is-the-metamodel.md](./metamodel/what-is-the-metamodel.md)           |
| The seed entity types and their attributes                 | [entity-types.md](./metamodel/entity-types.md)                             |
| The seed relationship types                                | [relationship-types.md](./metamodel/relationship-types.md)                 |
| Slots, inheritance, the effective schema                   | [slots-and-effective-schema.md](./metamodel/slots-and-effective-schema.md) |
| Packages, the `MetamodelBatch`, the registry, stable UUIDs | [packages-and-registry.md](./metamodel/packages-and-registry.md)           |
| Validation rules                                           | [validation-rules.md](./metamodel/validation-rules.md)                     |
| SemVer, forward-only evolution, extension                  | [extension-and-versioning.md](./metamodel/extension-and-versioning.md)     |

## Related documents

| Document                                                        | What it covers                               |
| --------------------------------------------------------------- | -------------------------------------------- |
| [metamodel/README.md](./metamodel/README.md)                    | The metamodel index.                         |
| [semantic-spine/README.md](./semantic-spine/README.md)          | The lineage the types form.                  |
| [Edge catalogue](../05-modules/praxis/edge-catalogue/README.md) | The relationship vocabulary at module level. |
