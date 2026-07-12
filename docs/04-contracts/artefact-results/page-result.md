# Page Result

The output shape for the **page** form — a packaged briefing surface, a composed surface for a specific audience and
decision ([forms](../../03-design/artefacts/forms.md)). A page is the most composite form: it assembles other result
bodies — views, catalogues, matrices, maps, and report sections — into one decision surface for a named audience. The
common envelope is defined once in the [area README](./README.md); this file specifies the `body`.

---

## The shape

```json
{
  "body": {
    "audience": "executive",
    "blocks": [
      {
        "id": "estate-map",
        "form": "map",
        "title": "Capability estate",
        "result": { "/* an embedded map body */": "see map-result.md" }
      },
      {
        "id": "app-inventory",
        "form": "catalogue",
        "title": "Applications",
        "result": { "/* an embedded catalogue body */": "see catalogue-result.md" }
      }
    ]
  }
}
```

## Fields

| Field             | Type     | Description                                                                                                                |
| ----------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `audience`        | string   | The role or [participation mode](../../03-design/participation-and-trust/participation-modes.md) the page is composed for. |
| `blocks`          | object[] | Ordered composed blocks. Each block embeds one other form's body.                                                          |
| `blocks[].form`   | enum     | The embedded form (`view`, `catalogue`, `matrix`, `map`, or a report `section`) — selects the body shape under `result`.   |
| `blocks[].result` | object   | The embedded form body, exactly as defined in that form's per-form file. A page does not redefine a body; it nests one.    |

## One viewpoint, many bounds

A page executes at one [viewpoint](../temporal-and-scenario/viewpoint-shape.md) (the envelope's `viewpoint`); every
embedded block resolves at that same frame, so the surface is internally consistent. Each block, however, obeys its own
form bound — a map block at the view bound, a catalogue block at page-size 200 — and each can independently report a
result state. The page-level `resultState` is the union of its blocks' states: if any block is `stale` or
`partialBounded`, the page surfaces it rather than hiding a weak block behind a tidy frame
([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)).

## Worked example

An executive page over the [baseline](../../data/base/baseline.yaml) at
`{valid: 2026-06-11, layer: actual, scenario: base}` composes two blocks: an `estate-map` block embedding the capability
[map body](./map-result.md) (three tier regions) and an `app-inventory` block embedding the
[catalogue body](./catalogue-result.md) (three applications, one page). Both resolve at the one viewpoint; both are
`fresh`, so the page `resultState` is `["fresh"]`. Re-executing under the `FY26 Insight Modernization` scenario
re-resolves both blocks at the new frame and the page shows the changed estate against the base case.

## Related documents

| Document                                    | What it covers                                 |
| ------------------------------------------- | ---------------------------------------------- |
| [Artefact results README](./README.md)      | The common envelope a page nests blocks under. |
| [Forms](../../03-design/artefacts/forms.md) | What the page form shapes a result into.       |
| [Catalogue result](./catalogue-result.md)   | A body a page block can embed.                 |
| [Map result](./map-result.md)               | A body a page block can embed.                 |
