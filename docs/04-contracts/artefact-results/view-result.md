# View Result

The output shape for the **view** form — a focused graph or diagram over a bounded slice, laid out for direct inspection
([forms](../../03-design/artefacts/forms.md)). The renderer draws the nodes and edges this body describes; it does not
traverse or resolve anything
([artefact execution boundary](../../01-architecture/boundary/artefact-execution-boundary.md)). The common envelope is
defined once in the [area README](./README.md); this file specifies the `body`.

---

## The shape

```json
{
  "body": {
    "nodes": [
      {
        "id": "n:application:insight-hub",
        "type": "Application",
        "label": "Insight Hub",
        "slots": { "disposition": "Invest", "lifecycle": "Run" },
        "classification": "asserted"
      }
    ],
    "edges": [
      {
        "id": "e:insight-realises-insight",
        "type": "realises",
        "from": "n:application:insight-hub",
        "to": "n:capability:customer-insight",
        "slots": { "criticality": "High" },
        "classification": "asserted"
      }
    ],
    "diagramSpec": { "layoutHint": "spine-vertical", "groups": [] }
  }
}
```

## Fields

| Field                    | Type     | Description                                                                                                                                                                           |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nodes`                  | object[] | The resolved entities in the bounded slice. **Node** and **edge** are the graph-projection terms; the domain terms are entity and relationship ([`CONTEXT.md`](../../../CONTEXT.md)). |
| `nodes[].type`           | string   | The metamodel entity type (`Application`, `Capability`, …).                                                                                                                           |
| `nodes[].slots`          | object   | The slots the form read for display.                                                                                                                                                  |
| `nodes[].classification` | enum     | `asserted` \| `inferred` \| `generated`, per element ([content classification](../../03-design/artefacts/content-classification.md)).                                                 |
| `edges`                  | object[] | The resolved relationships, each with `from`/`to` node ids and its canonical `type` ([edge catalogue](../../05-modules/praxis/edge-catalogue/README.md)).                             |
| `edges[].classification` | enum     | Per-relationship classification.                                                                                                                                                      |
| `diagramSpec`            | object   | A data description of grouping and layout hints — not executable layout code. The renderer (and ELK/Topos) positions from it.                                                         |

## Bounds and partial results

A view is capped at **5,000 nodes and 10,000 edges**
([artefact execution](../../05-modules/praxis/artefact-execution.md)). A traversal that hits that size cap, or the
declared depth or fanout, returns the envelope with `resultState` including `partialBounded` and a `coverage` block
naming the bound; the `nodes`/`edges` present are the reached slice, never a silent truncation.

## Worked example

A view artefact seeded at `n:capability:customer-insight` over the [baseline](../../data/base/baseline.yaml) at
`{valid: 2026-06-11, layer: actual, scenario: base, scope: reachable within 3 hops}` returns five nodes
(`Customer Insight`, `Discover`, `Insight Hub`, `Customer Profile`, `Stream Processor`) and four edges (`serves`,
`realises`, `accesses`, `hosts`). All are `asserted` (seeded by the baseline commit), `resultState` is `["fresh"]`, and
`coverage` is `null` — the slice is well inside the 5,000-node bound. Had `Customer Insight` been realised by thousands
of applications, the body would carry the reached subset and the envelope would report `partialBounded`.

## Related documents

| Document                                                                     | What it covers                                |
| ---------------------------------------------------------------------------- | --------------------------------------------- |
| [Artefact results README](./README.md)                                       | The common envelope and pagination shapes.    |
| [Forms](../../03-design/artefacts/forms.md)                                  | What the view form shapes a result into.      |
| [Edge catalogue](../../05-modules/praxis/edge-catalogue/README.md)           | The canonical relationship types edges carry. |
| [Praxis — artefact execution](../../05-modules/praxis/artefact-execution.md) | The traversal that produces the body.         |
