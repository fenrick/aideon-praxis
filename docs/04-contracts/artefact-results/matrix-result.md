# Matrix Result

The output shape for the **matrix** form — a relationship or comparison grid of rows × columns between two populations, with cells carrying the relationship or a metric ([forms](../../03-design/artefacts/forms.md)). The body is stored **sparsely**: only populated cells are present. The common envelope is defined once in the [area README](./README.md); this file specifies the `body`.

---

## The shape

```json
{
  "body": {
    "rowAxis": {
      "type": "Application",
      "members": [{ "id": "n:application:insight-hub", "label": "Insight Hub" }]
    },
    "columnAxis": {
      "type": "Capability",
      "members": [{ "id": "n:capability:customer-insight", "label": "Customer Insight" }]
    },
    "cells": [
      {
        "row": "n:application:insight-hub",
        "column": "n:capability:customer-insight",
        "relationship": "realises",
        "value": { "criticality": "High" },
        "classification": "asserted"
      }
    ],
    "page": { "rowOffset": 0, "rowPageSize": 200, "rowTotal": 1, "hasMore": false }
  }
}
```

## Fields

| Field                    | Type     | Description                                                                                                                                                                   |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rowAxis`                | object   | The row population — its entity `type` and ordered members.                                                                                                                   |
| `columnAxis`             | object   | The column population — its entity `type` and ordered members.                                                                                                                |
| `cells`                  | object[] | **Sparse**: one entry per populated `(row, column)` pair. An absent pair means no relationship, not an empty cell.                                                            |
| `cells[].relationship`   | string   | The canonical relationship type the cell represents ([edge catalogue](../../05-modules/praxis/edge-catalogue/README.md)), or null for a pure-metric cell.                     |
| `cells[].value`          | object   | The cell metric or relationship slots (e.g. `criticality`).                                                                                                                   |
| `cells[].classification` | enum     | Per-cell classification ([content classification](../../03-design/artefacts/content-classification.md)) — a relationship slot is `asserted`; a computed metric is `inferred`. |
| `page`                   | object   | Pagination over the **row** axis; `rowPageSize` is capped at the matrix bound. The column axis is returned whole.                                                             |

## Bounds and partial results

A matrix is capped at **1,000 × 1,000 cells with sparse storage** ([artefact execution](../../05-modules/praxis/artefact-execution.md)). Exceeding the row or column population, or a populated-cell count past the bound, returns `resultState` including `partialBounded` and a `coverage` block stating which axis was capped; the returned axes and cells are the reached slice. Sparse storage means the absence of a cell is a positive statement — no relationship — not a Bounded gap.

## Worked example

Render the `Application` × `Capability` `realises` relationship from the [baseline](../../data/base/baseline.yaml) at `{valid: 2026-06-11, layer: actual, scenario: base}`. Rows are `Insight Hub`, `Journey Studio`, `Automation Orchestrator`; columns are `Customer Insight`, `Journey Orchestration`, `Automation Fabric`. Three populated cells appear — `(Insight Hub, Customer Insight)` and `(Journey Studio, Journey Orchestration)` with `criticality: High`, `(Automation Orchestrator, Automation Fabric)` with `criticality: Medium` — each `asserted`. The six unpopulated pairs are simply absent. `resultState` is `["fresh"]`, well inside the 1,000 × 1,000 bound.

## Related documents

| Document                                                                     | What it covers                                  |
| ---------------------------------------------------------------------------- | ----------------------------------------------- |
| [Artefact results README](./README.md)                                       | The common envelope and pagination shapes.      |
| [Forms](../../03-design/artefacts/forms.md)                                  | What the matrix form shapes a result into.      |
| [Edge catalogue](../../05-modules/praxis/edge-catalogue/README.md)           | The relationship types a cell represents.       |
| [Praxis — artefact execution](../../05-modules/praxis/artefact-execution.md) | The bounded traversal that populates the cells. |
