# Diff

How Chrona compares two [snapshots](../../../CONTEXT.md): two full viewpoints in, one delta out, with the delta _kind_ derived from which coordinates differ rather than chosen from a closed list. This is fixed by [ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md); the contract shape is in [TEMPORAL-AND-SCENARIO-CONTEXT](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md).

---

## Two viewpoints in, a derived delta out

A diff compares two snapshots, one per viewpoint. Each side carries the **complete** viewpoint — as-of valid time, as-of asserted time, layer (or policy), optional scenario, optional scope — not a reduced subset. There is no privileged coordinate ([ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)).

```json
{
  "left": {
    "as_of_valid_time": { "instant": "2026-09-01T00:00:00Z" },
    "layer": "actual",
    "scenario": null
  },
  "right": {
    "as_of_valid_time": { "instant": "2026-09-01T00:00:00Z" },
    "layer": "actual",
    "scenario": { "scenario_id": "scn_consolidation" }
  }
}
```

The system **derives** the delta kind by inspecting which coordinates differ; the caller does not pre-select one:

| Coordinate that differs | Derived delta                                                  |
| ----------------------- | -------------------------------------------------------------- |
| `as_of_valid_time`      | valid-time delta — same view at two instants                   |
| `as_of_asserted_at`     | asserted / belief delta — what we believed then vs now         |
| `layer`                 | layer delta — variance (e.g. plan vs actual)                   |
| `scenario`              | scenario delta — baseline vs scenario, or scenario vs scenario |
| more than one           | mixed delta                                                    |

The earlier closed `kind` enum (`time_delta`, `scenario_delta`, `scenario_vs_scenario`) is superseded by this derived classification ([ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)). The asserted and layer axes are first-class comparison dimensions, equal to valid time and scenario — a belief diff (two asserted times, one valid time) and a variance diff (plan vs actual, one valid time) are ordinary diffs, not special cases.

---

## Derived delta kinds for topology

A **topology delta** compares the effective graph at two viewpoints — added, removed, and changed nodes and edges. It is a diff like any other: two viewpoints in, the node and edge deltas out, carrying the derived delta kind and the scenario if set. Chrona's `topology_delta(TopologyDeltaArgs)` produces it ([Chrona README](./README.md)).

### Topology-delta ordering (an explorer gap, addressed)

A topology delta must be **deterministically ordered** so two runs of the same diff produce the same result and a stored diff is reproducible. The ordering rule: deltas are emitted ordered by entity (or relationship) identifier, then by change kind (removed, then added, then changed) within an identifier. Because a snapshot is a pure function of its viewpoint and identifiers are stable, the ordered topology delta is itself deterministic and cacheable, keyed on the two viewpoints ([ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)). Without a fixed order, an incremental re-render could not reconcile a new delta against a shown one; the order is what makes the delta replayable into a canvas.

---

## Diff is deterministic and cacheable

Because a snapshot is a pure function of its viewpoint, a diff of two viewpoints is itself deterministic and cacheable, keyed on the pair ([ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)). The cache key must carry _both_ full viewpoints — a diff cached on one side would serve a wrong comparison if the other side changed ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)).

---

## Worked example — a variance diff on Automation Orchestrator

An architect asks: does the actual disposition match the plan? They diff two viewpoints that differ only in the layer coordinate, holding valid time and scenario constant:

- **Left:** _{as-of valid time 2026-09-01, layer actual, base case}_ → resolves `disposition = Migrate`.
- **Right:** _{as-of valid time 2026-09-01, layer plan, base case}_ → resolves `disposition = Invest`.

Only the `layer` coordinate differs, so the derived delta kind is a **layer delta** (variance). The diff reports the changed slot `(automation-orchestrator, disposition): Migrate → Invest`, classified as a plan-versus-actual variance, with no caller-chosen kind. Sweep the valid-time coordinate instead — left and right at two instants, same layer — and the same machinery derives a **valid-time delta**. Pin two beliefs — same valid time, two `as_of_asserted_at` — and it derives an **asserted/belief delta** (the consulting "what did we believe at Engagement 1 versus now?" question, [ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)).

---

## Bounds

- A diff is two snapshot resolutions plus a slot-wise comparison: `O(left + right)` in the resolved slots, bounded by the scope of each side.
- Diff size is bounded by scope; an unbounded whole-twin diff is capped and returned as a **Bounded** result, never an unbounded comparison ([bounds-and-failure-modes](./bounds-and-failure-modes.md)).

---

## References & standards

_Normative:_

- (Decision) [ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md) — diffs compare two viewpoints; delta kind derived.

_Informative:_

- Snodgrass — _Developing Time-Oriented Database Applications in SQL_, 1999. The bitemporal basis for belief and valid-time deltas.

## Related documents

| Document                                                                             | What it covers                                     |
| ------------------------------------------------------------------------------------ | -------------------------------------------------- |
| [ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)                   | The two-viewpoint, derived-delta decision.         |
| [Temporal and scenario context](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The comparison contract shape.                     |
| [Layer policy](./layer-policy.md)                                                    | How `side_by_side` feeds a variance diff.          |
| [Scenario composition](./scenario-composition.md)                                    | Scenario compare as a derived delta.               |
| [Bounds and failure modes](./bounds-and-failure-modes.md)                            | Diff size bounds and topology ordering under skew. |
