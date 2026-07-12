# Report Result

The output shape for the **report** form — a composed analytical output of sections of narrative, tables, and signals
([forms](../../03-design/artefacts/forms.md)). A report assembles heterogeneous content into an ordered document; each
section carries its own classification and state, because a single report can mix Asserted tables with a Generated
narrative. The common envelope is defined once in the [area README](./README.md); this file specifies the `body`.

---

## The shape

```json
{
  "body": {
    "sections": [
      {
        "id": "summary",
        "kind": "narrative",
        "title": "Portfolio summary",
        "content": "Three applications support the strategy-to-execution spine…",
        "classification": "generated",
        "confidence": "medium"
      },
      {
        "id": "applications",
        "kind": "table",
        "title": "Applications",
        "table": {
          "columns": [{ "key": "name", "label": "Name" }],
          "rows": [
            {
              "id": "n:application:insight-hub",
              "cells": { "name": { "value": "Insight Hub", "classification": "asserted" } }
            }
          ],
          "page": { "offset": 0, "pageSize": 200, "total": 3, "hasMore": false }
        }
      },
      {
        "id": "signals",
        "kind": "signals",
        "title": "Review prompts",
        "signals": [
          {
            "id": "stale-automation",
            "label": "Automation Orchestrator plan-stage data ageing",
            "classification": "inferred",
            "confidence": "low"
          }
        ]
      }
    ]
  }
}
```

## Fields

| Field               | Type     | Description                                                                                                                                                                                                 |
| ------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sections`          | object[] | Ordered sections. Order is the document order; the renderer composes top to bottom.                                                                                                                         |
| `sections[].kind`   | enum     | `narrative`, `table`, or `signals` — selects which of `content` / `table` / `signals` is populated.                                                                                                         |
| `narrative.content` | string   | Prose. A narrative is typically `generated` ([Sophia](../../05-modules/sophia/README.md), planned) and carries `confidence`.                                                                                |
| `table`             | object   | A `columns` + `rows` + `page` block, identical in shape to a [catalogue body](./catalogue-result.md) — cells carry their own `classification`.                                                              |
| `signals`           | object[] | Review prompts — Inferred or Generated items, never silent edits ([intelligence and automation](../../03-design/artefacts/intelligence-and-automation.md)); each carries `classification` and `confidence`. |
| `classification`    | enum     | Per-section for narrative/signals; per-cell inside a table.                                                                                                                                                 |
| `confidence`        | enum     | The [confidence label](../../02-standards/DOCUMENTATION-STANDARD.md) (§8.2) where the section is a derived or generated claim.                                                                              |

## Result state and partial results

Each section inherits its freshness from its inputs: a table whose source facts changed reports `stale` at the envelope,
and a `generated` narrative awaiting acceptance carries an `awaitingReview` result state
([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)). A section that hit a traversal bound
reports `partialBounded` with `coverage`; the report does not pretend a truncated table is complete.

## Worked example

A portfolio report over the [baseline](../../data/base/baseline.yaml) at
`{valid: 2026-06-11, layer: actual, scenario: base}` returns three sections: a `narrative` summary drafted by
[Sophia](../../05-modules/sophia/README.md) (planned) — `generated`, `confidence: medium`, `awaitingReview`; an
`applications` table listing the three applications with `asserted` cells; and a `signals` section flagging
`Automation Orchestrator`'s `Plan`-lifecycle data as ageing — `inferred`, `confidence: low`. The mix of classifications
and states is the point: a tidy report that flattened these into one badge would mislead.

## Related documents

| Document                                                                                | What it covers                                       |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [Artefact results README](./README.md)                                                  | The common envelope and the shared table/page shape. |
| [Catalogue result](./catalogue-result.md)                                               | The table block a report section reuses.             |
| [Content classification](../../03-design/artefacts/content-classification.md)           | Why a Generated narrative stays labelled.            |
| [Intelligence and automation](../../03-design/artefacts/intelligence-and-automation.md) | Why signals are prompts, not edits.                  |
