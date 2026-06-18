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

## Policy-driven deltas — when no fact changed

A delta can appear because the two sides resolve the **same** facts under a **different** [layer policy](./layer-and-policy.md), not because any fact differs. This is a `layer`-coordinate diff where the layer value is a policy rather than a single layer name: the underlying plan and actual facts are identical on both sides, but one side blends them one way and the other blends them another, so the effective value differs. The delta is real — the effective state genuinely differs between the two viewpoints — but its **cause** is the policy, not the data.

A diff must distinguish the two causes, because they call for different action. A data-driven delta means a fact moved and may need review; a policy-driven delta means the same facts were composed differently and nothing changed in the twin. Conflating them would tell an architect a value changed when only the lens changed.

The diff carries this distinction in each changed slot's explanation, drawn from the per-slot resolution reasons on both sides ([explainability.md](./explainability.md)):

- **Data-driven** — the winning fact differs between the two sides (a different `op_id`, or a different value at the same `op_id`'s slot). The delta names the two winning facts.
- **Policy-driven** — the winning fact is the **same** on both sides for every layer that contributed, but the policy combined the per-layer winners differently, so the effective value differs. The delta names the two policies and the per-layer winners they each selected, and marks the slot policy-driven.

Both explanations are **Inferred** content ([honest-state, §9](../../02-standards/DOCUMENTATION-STANDARD.md)): derived from the resolution reasons, traceable, recomputed when inputs change.

### Worked example — a policy-only delta on Automation Orchestrator

Using the seed dataset ([`baseline.yaml`](../../data/base/baseline.yaml)): `Application` `automation-orchestrator` carries `disposition = "Migrate"` in the `actual` layer. Suppose a `plan`-layer fact `disposition = "Invest" [2026-07-01, null)` exists in the base case (an FY26 modernisation intent). No fact differs between the two sides of the diff below — both read the same two facts.

```json
{
  "left": {
    "as_of_valid_time": { "instant": "2026-09-01T00:00:00Z" },
    "layer": { "policy": "actual_over_plan" },
    "scenario": null
  },
  "right": {
    "as_of_valid_time": { "instant": "2026-09-01T00:00:00Z" },
    "layer": { "policy": "side_by_side" },
    "scenario": null
  }
}
```

Resolution on each side:

- **Left (`actual_over_plan`)** — `actual` outranks `plan` where it exists, so the effective `disposition` is `Migrate`.
- **Right (`side_by_side`)** — both layers are kept distinct: `Migrate` (actual) and `Invest` (plan).

Only the `layer` coordinate differs, so the derived delta kind is a **layer delta**. The changed `disposition` slot is marked **policy-driven**: the per-layer winners are identical on both sides (actual `Migrate`, plan `Invest`); the difference is entirely that `actual_over_plan` collapsed them to `Migrate` while `side_by_side` kept both. The diff states that no fact changed — the delta is a consequence of the policy, and a re-author of the underlying facts is not warranted.

## References & standards

- (System contract) [ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md) — diff compares two viewpoints; delta kind is derived.

## Related documents

| Document                                        | What it covers                                                |
| ----------------------------------------------- | ------------------------------------------------------------- |
| [scenario-overlays.md](./scenario-overlays.md)  | The scenario comparison this expresses.                       |
| [layer-and-policy.md](./layer-and-policy.md)    | The layer policy a policy-driven delta differs by.            |
| [explainability.md](./explainability.md)        | The per-slot resolution reasons a policy-driven delta reads.  |
| [Chrona: diff](../../05-modules/chrona/diff.md) | The engine that computes the diff.                            |
| [`CONTEXT.md`](../../../CONTEXT.md)             | The _diff_ glossary entry: delta kind is derived, not chosen. |
