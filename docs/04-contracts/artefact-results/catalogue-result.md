# Catalogue Result

The output shape for the **catalogue** form — a structured inventory of entities of one or more types, with their slots, filtered by scope ([forms](../../03-design/artefacts/forms.md)). A catalogue is the canonical list-shaped result: it is paginated, filtered, and sorted by Praxis, never re-sliced in the renderer ([artefact execution boundary](../../01-architecture/boundary/artefact-execution-boundary.md)). The common envelope is defined once in the [area README](./README.md); this file specifies the `body`.

---

## The shape

```json
{
  "body": {
    "columns": [
      { "key": "name", "label": "Name", "slot": "name" },
      { "key": "disposition", "label": "Disposition", "slot": "disposition" },
      { "key": "health", "label": "Health", "derived": true }
    ],
    "rows": [
      {
        "id": "n:application:automation-orchestrator",
        "type": "Application",
        "cells": {
          "name": { "value": "Automation Orchestrator", "classification": "asserted" },
          "disposition": { "value": "Migrate", "classification": "asserted" },
          "health": { "value": "At risk", "classification": "inferred" }
        }
      }
    ],
    "sort": [{ "key": "name", "direction": "asc" }],
    "page": { "offset": 0, "pageSize": 2, "total": 3, "hasMore": true }
  }
}
```

## Fields

| Field                  | Type     | Description                                                                                                                          |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `columns`              | object[] | The displayed columns. A `slot`-backed column reads a metamodel slot; a `derived: true` column is computed by Praxis.                |
| `rows`                 | object[] | One page of resolved entities. Each row is keyed by entity `id` and `type`.                                                          |
| `rows[].cells`         | object   | One cell per column key. Each cell carries its `value` **and** its own `classification` — a row can mix Asserted and Inferred cells. |
| `cells.classification` | enum     | `asserted` \| `inferred` \| `generated` ([content classification](../../03-design/artefacts/content-classification.md)).             |
| `sort`                 | object[] | The applied sort keys and directions, echoed back so the renderer reflects the executed order.                                       |
| `page`                 | object   | The pagination block — `offset`, `pageSize`, `total` (`null` if bounded-expensive), `hasMore` ([area README](./README.md)).          |

## Filter, sort, and pagination semantics

- **Filter** narrows which resolved entities appear; it is evaluated by Praxis over read slots and does not change a cell's classification. The applied filter is part of the cache key with the viewpoint.
- **Sort** orders rows by a named slot with a deterministic tie-break by stable identifier, so equal-keyed rows keep a reproducible order across pages ([artefact execution](../../05-modules/praxis/artefact-execution.md)).
- **Pagination** returns one page; `pageSize` is capped at the catalogue ceiling of **200** ([artefact execution](../../05-modules/praxis/artefact-execution.md)). A paged result is complete-in-pages; it carries no `partialBounded` state for being paged. `partialBounded` appears only when a depth, fanout, size, or time bound capped coverage.

## Worked example

The "Application Portfolio Health" catalogue over the [baseline](../../data/base/baseline.yaml) at `{valid: 2026-06-11, layer: actual, scenario: base, scope: type=Application}`, sorted by `name` ascending with `pageSize: 2`, returns page one: `Automation Orchestrator` and `Insight Hub`. Each row's `disposition` and `lifecycle` cells are `asserted`; a `health` cell rolling up `realises` `criticality` is `inferred`. The `page` block reads `{ offset: 0, pageSize: 2, total: 3, hasMore: true }`; `Journey Studio` is on page two — absent here but not missing, so `resultState` is `["fresh"]` and `coverage` is `null`.

## Related documents

| Document                                                                      | What it covers                                        |
| ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| [Artefact results README](./README.md)                                        | The common envelope and the shared `page` block.      |
| [Forms](../../03-design/artefacts/forms.md)                                   | What the catalogue form shapes a result into.         |
| [Content classification](../../03-design/artefacts/content-classification.md) | The per-cell classification display rules.            |
| [Praxis — artefact execution](../../05-modules/praxis/artefact-execution.md)  | The filter/sort/page semantics that produce the body. |
