# Map Result

The output shape for the **map** form — a spatial or topological rendering, a positioned layout (capability map, technology map) over structure ([forms](../../03-design/artefacts/forms.md)). A map differs from a [view](./view-result.md) in that position carries meaning: members are placed into a structured layout, not laid out free-form. The common envelope is defined once in the [area README](./README.md); this file specifies the `body`.

---

## The shape

```json
{
  "body": {
    "regions": [
      {
        "id": "tier:Strategic",
        "label": "Strategic",
        "members": [
          {
            "id": "n:capability:customer-insight",
            "type": "Capability",
            "label": "Customer Insight",
            "slots": { "tier": "Strategic" },
            "classification": "asserted"
          }
        ]
      }
    ],
    "connectors": [
      {
        "id": "e:capability-serves-discover",
        "type": "serves",
        "from": "n:capability:customer-insight",
        "to": "n:valuestream-stage:discover",
        "classification": "asserted"
      }
    ],
    "layoutSpec": { "strategy": "grouped-grid", "groupBy": "tier" }
  }
}
```

## Fields

| Field               | Type     | Description                                                                                                                                                                   |
| ------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `regions`           | object[] | The structural groupings the map positions into — e.g. capability tiers, technology zones. A region holds its member entities.                                                |
| `regions[].members` | object[] | The placed entities, each with `type`, display `slots`, and per-element `classification`.                                                                                     |
| `connectors`        | object[] | The relationships drawn across the map, each with its canonical `type` ([edge catalogue](../../05-modules/praxis/edge-catalogue/README.md)) and per-element `classification`. |
| `layoutSpec`        | object   | A data description of the positioning strategy — not executable layout code. Positioning (ELK/Topos) runs from this spec.                                                     |

## Bounds and partial results

A map's element count is bounded like a view (**5,000 nodes / 10,000 edges** — [artefact execution](../../05-modules/praxis/artefact-execution.md)). A map that exceeds the bound returns the reached regions and connectors with `resultState` including `partialBounded` and a `coverage` block naming the bound and the regions that were truncated, never a silently incomplete map.

## Worked example

A capability map over the [baseline](../../data/base/baseline.yaml) at `{valid: 2026-06-11, layer: actual, scenario: base, scope: type=Capability}`, grouped by `tier`, returns three regions — `Strategic` (`Customer Insight`), `Core` (`Journey Orchestration`), `Supporting` (`Automation Fabric`) — with `serves` connectors to the value-stream stages. Each member's `tier` and each connector is `asserted`; `resultState` is `["fresh"]`. The `layoutSpec` names `groupBy: tier`; the renderer positions from it without resolving any structure itself.

## Related documents

| Document                                                                     | What it covers                                    |
| ---------------------------------------------------------------------------- | ------------------------------------------------- |
| [Artefact results README](./README.md)                                       | The common envelope and result-state shapes.      |
| [Forms](../../03-design/artefacts/forms.md)                                  | What the map form shapes a result into.           |
| [View result](./view-result.md)                                              | The free-form graph form a map contrasts with.    |
| [Praxis — artefact execution](../../05-modules/praxis/artefact-execution.md) | The traversal that resolves the placed structure. |
