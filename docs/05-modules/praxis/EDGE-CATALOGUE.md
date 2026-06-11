# Praxis edge catalogue

This document has been decomposed into a folder of focused files. Its content now lives in [`edge-catalogue/`](./edge-catalogue/README.md), per the [Documentation Standard §4](../../02-standards/DOCUMENTATION-STANDARD.md) granularity rule.

The catalogue now adopts the seed metamodel's ArchiMate-aligned relationship names and directions — `serves`, `realises`, `accesses`, `hosts`, `plan_effect` — replacing the earlier `contributes_to` / `delivers` / `uses_data` / `deployed_on` / `change_affects` set ([Documentation Standard §12](../../02-standards/DOCUMENTATION-STANDARD.md)).

Start at the [edge catalogue index](./edge-catalogue/README.md). Likely targets for an incoming link:

| You were looking for                                            | Now at                                                                |
| --------------------------------------------------------------- | --------------------------------------------------------------------- |
| The relationships, directions, attributes, ArchiMate mapping    | [catalogue.md](./edge-catalogue/catalogue.md)                         |
| The old→new name mapping (incl. `deployed_on`→`hosts` reversal) | [superseded-names.md](./edge-catalogue/superseded-names.md)           |
| Relationships as first-class temporal facts                     | [temporal-model.md](./edge-catalogue/temporal-model.md)               |
| The rules enforced on every write                               | [constraints-and-rules.md](./edge-catalogue/constraints-and-rules.md) |
| How extensions are marked                                       | [extensions.md](./edge-catalogue/extensions.md)                       |

## Related documents

| Document                                                              | What it covers                      |
| --------------------------------------------------------------------- | ----------------------------------- |
| [edge-catalogue/README.md](./edge-catalogue/README.md)                | The edge-catalogue index.           |
| [Relationship types](../../03-design/metamodel/relationship-types.md) | The metamodel-layer projection.     |
| [Praxis module](./README.md)                                          | The module that owns the catalogue. |
