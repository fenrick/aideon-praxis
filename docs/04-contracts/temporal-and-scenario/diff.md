# Comparison context (diff)

A **diff** compares two snapshots, one per viewpoint. The kind of delta is **derived** from which viewpoint coordinates differ between the two sides — not chosen from a closed list. This is the decision of [ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md), which supersedes the earlier closed `kind` enum.

---

## The shape

Each side carries a full viewpoint; there is no privileged coordinate.

```json
{
  "left": {
    "as_of_valid_time": { "instant": "2026-06-10T00:00:00Z" },
    "as_of_asserted_at": null,
    "layer": "actual",
    "scenario": null
  },
  "right": {
    "as_of_valid_time": { "instant": "2026-06-10T00:00:00Z" },
    "as_of_asserted_at": null,
    "layer": "actual",
    "scenario": { "scenario_id": "scn_plan_q3" }
  }
}
```

## Derived delta kinds

The kind is read off the inputs by inspecting which coordinate(s) differ:

| Coordinate that differs | Derived delta                                                  |
| ----------------------- | -------------------------------------------------------------- |
| `as_of_valid_time`      | valid-time delta — same view at two instants                   |
| `as_of_asserted_at`     | asserted / belief delta — what we believed then vs now         |
| `layer`                 | layer delta — variance (e.g. plan vs actual)                   |
| `scenario`              | scenario delta — baseline vs scenario, or scenario vs scenario |
| more than one           | mixed delta                                                    |

The earlier closed enum (`time_delta`, `scenario_delta`, `scenario_vs_scenario`) is superseded by this derived classification. The asserted and layer axes are first-class comparison dimensions, equal to valid time and scenario: comparing two beliefs at the same valid time, or plan against actual at the same valid time (variance), are ordinary diffs, not special cases.

The trade-off ([ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)): callers must supply a full viewpoint per side and the classification is implicit rather than declared. That cost is accepted because the viewpoint is already the canonical query context everywhere else, and a closed enum could not express belief-diffs or mixed deltas without growing a new kind per combination.

## Determinism

Because a snapshot is a pure function of its viewpoint, a diff of two viewpoints is itself deterministic and cacheable, keyed on the two viewpoints.

## References & standards

- (System contract) [ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md) — diff compares two viewpoints; delta kind is derived.

## Related documents

| Document                                        | What it covers                                                |
| ----------------------------------------------- | ------------------------------------------------------------- |
| [scenario-overlays.md](./scenario-overlays.md)  | The scenario comparison this expresses.                       |
| [Chrona: diff](../../05-modules/chrona/diff.md) | The engine that computes the diff.                            |
| [`CONTEXT.md`](../../../CONTEXT.md)             | The _diff_ glossary entry: delta kind is derived, not chosen. |
