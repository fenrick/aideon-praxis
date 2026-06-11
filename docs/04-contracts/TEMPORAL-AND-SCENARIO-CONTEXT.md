# Temporal and Scenario Context

The canonical contract for every time-aware read and write in Aideon Desktop: the shape of the `Viewpoint`, how facts are resolved deterministically into effective intervals, and how scenario overlays compose. Terms used here follow the project glossary in [`CONTEXT.md`](../../CONTEXT.md) — viewpoint, fact, layer, scenario, scope, effective interval, snapshot, diff.

---

## `Viewpoint` shape

Every operation that reads or writes time-aware state carries a `Viewpoint` — the complete frame for resolving or analysing the twin. The struct is defined in Rust and mirrored in TypeScript; both sides must stay in sync.

```json
{
  "as_of_valid_time": {
    "instant": "2026-06-10T09:00:00Z",
    "interval": null
  },
  "as_of_asserted_at": 2767412345671680,
  "layer": "actual",
  "scenario": {
    "scenario_id": "scn_plan_q3",
    "mode": "overlay"
  },
  "scope": null,
  "workspace_id": "ws_local",
  "tenant_id": null
}
```

### Fields

| Field                       | Type                          | Required                       | Notes                                                                                       |
| --------------------------- | ----------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------- |
| `as_of_valid_time.instant`  | UTC ISO-8601 string           | one of `instant` / `interval`  | point read on the valid-time axis (which instant of the world)                              |
| `as_of_valid_time.interval` | `{ start, end }` UTC ISO-8601 | one of `instant` / `interval`  | range read; both ends inclusive                                                             |
| `as_of_asserted_at`         | `i64` (packed HLC)            | write paths; optional on reads | which belief; on reads, omission resolves against the latest assertions — see §HLC encoding |
| `layer`                     | string \| `{ "policy": … }`   | yes                            | a single selected layer (e.g. `"actual"`) or a layer policy (e.g. `{ "policy": "actual_over_plan" }`); see §Layer and layer policy |
| `scenario.scenario_id`      | string                        | no                             | omit for baseline view                                                                      |
| `scenario.mode`             | `"overlay"`                   | if `scenario_id` present       | only `overlay` is supported                                                                 |
| `scope`                     | object \| null                | no                             | selection narrowing (by type, entity set, traversal from seed refs, or filter); `null` = whole twin |
| `workspace_id`              | string                        | yes                            | identifies the portable workspace folder                                                    |
| `tenant_id`                 | string \| null                | no                             | optional; `null` on single-user desktop                                                     |

**Mutual exclusion:** exactly one of `as_of_valid_time.instant` or `as_of_valid_time.interval` must be provided. Providing both or neither is a `TEMPORAL_CONTEXT_INVALID` error.

**Asserted-time default:** on reads, omitting `as_of_asserted_at` resolves against the latest belief (current assertions). Pinning it replays the twin as the system believed it at that asserted instant — the basis for belief diffs.

**Scenario default:** when `scenario_id` is present and `mode` is omitted it defaults to `"overlay"`. Omitting `scenario_id` entirely returns the baseline (canonical fact) view.

**tenant_id:** this field is optional on desktop. Single-user installs leave it `null`. It exists so the same contract can address multi-user workspaces without a schema break.

---

## HLC encoding

Asserted time is a **Hybrid Logical Clock** packed into a portable `i64`.

```
 63                    12 11          0
 ┌──────────────────────┬─────────────┐
 │  physical_micros     │   counter   │
 │  (51 bits)           │  (12 bits)  │
 └──────────────────────┴─────────────┘
```

- **Upper 52 bits** — microseconds since Unix epoch (`SystemTime` physical component).
- **Lower 12 bits** — monotonic counter; increments when two events share the same physical microsecond, resets to 0 on physical advance.
- The packed value is a plain signed `i64`; total ordering is byte-comparable.
- `Hlc::now()` in `mneme_core::time` produces the next HLC, advancing the global `LAST_HLC` atomically.
- `Hlc::physical_micros()` strips the counter to recover wall-clock microseconds.

`ValidTime` is a simpler `i64` wrapper (microseconds since epoch, no counter) used for explicit valid-time stamps on individual facts. It is not an HLC; it records _when an event is true in the world_, not _when it was asserted_.

---

## Layer and layer policy

A **layer** answers "what kind of claim is this?" Layers are an open set — `plan`, `actual`, and extensibly `forecast`, `budget`, `target`, or other baselines — and a fact's layer is part of its identity: a plan value and an actual value coexist for the same slot, valid time, and scenario.

How layers combine on a read is a **policy** chosen by the viewpoint's `layer` field, never a fixed precedence:

| `layer` value                         | Behaviour                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `"actual"` (a single layer name)      | Resolve only that layer.                                                                         |
| `{ "policy": "actual_over_plan" }`    | Blend: a higher-priority layer overrides a lower one where it exists (a blended operational view). |
| `{ "policy": "side_by_side" }`        | Keep layers separate — required for variance comparison (plan vs actual); see [ADR-0008](../06-adrs/ADR-0008-diff-compares-two-viewpoints.md). |

"Actual over plan" is therefore one selectable policy, not a universal rule.

---

## Temporal resolution rules

When multiple candidate facts compete for the same resolved slot at a given as-of valid time **within a single layer**, the resolver applies this precedence chain in order and stops at the first rule that selects a unique winner. (Cross-layer combination is governed by the viewpoint's layer policy above, not by this chain.)

| Priority | Rule                       | Detail                                                                                                                                                               |
| -------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | **Valid-time containment** | Only facts whose valid-time interval `[valid_from, valid_to)` contains (or aligns with) the requested `as_of_valid_time` are candidates.                             |
| 2        | **Interval specificity**   | A narrower valid-time interval wins over a wider one. A fact valid for one day is preferred over one valid for a year (a null `valid_to` is the widest).             |
| 3        | **Latest asserted time**   | Among remaining ties, the fact with the largest HLC value wins (most-recently asserted), bounded by the viewpoint's `as_of_asserted_at`.                             |
| 4        | **Op-id tie-break**        | If asserted HLCs are identical, the fact with the lexicographically larger operation identifier wins. This case is degenerate in practice but must be deterministic. |

**Tombstones and overrides** enter the same pipeline — a tombstone within a layer with a later asserted time suppresses an earlier fact in that layer by the same rules.

**No fact wins by default:** if no candidate survives the containment filter for the requested as-of valid time, the resolver returns an empty/absent result for that slot. Absence is not an error.

---

## Default as-of-valid-time policy

APIs that permit an omitted `as_of_valid_time` must document one of:

| Policy token        | Meaning                                                                       |
| ------------------- | ----------------------------------------------------------------------------- |
| `now_utc`           | `as_of_valid_time` defaults to the wall-clock UTC instant at request time.    |
| `workspace_default` | The workspace's configured default as-of valid time is used.                  |
| `explicit_required` | The field is mandatory; omission is a `TEMPORAL_CONTEXT_INVALID` error.       |

When a policy is not documented for an API, treat it as `explicit_required`.

---

## Scenario overlays

A scenario is an additive overlay on canonical temporal facts. Canonical truth is the op log; scenario views are derived.

### Composition

1. The resolver first materialises the baseline snapshot for the requested viewpoint (as-of valid time, as-of asserted time, and layer policy).
2. If a `scenario_id` is present, scenario-scoped facts for that `scenario_id` are merged on top: any slot where a scenario fact exists replaces the corresponding baseline fact using the same resolution rules (interval specificity → asserted time → op-id, under the viewpoint's layer policy).
3. Slots with no scenario fact pass through unchanged from the baseline.
4. The result is a deterministic snapshot: `canonical baseline ∪ scenario overlay`.

### Scenario operations

| Operation   | Description                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------- |
| **create**  | Initialise an overlay from a base timeline and as-of valid time.                                |
| **rebase**  | Re-align the overlay against updated canonical facts; conflict slots are reported explicitly.   |
| **compare** | Compute a deterministic diff between the scenario snapshot and baseline, or between two scenarios. |
| **promote** | Materialise approved scenario deltas as canonical fact writes through a controlled workflow.    |
| **discard** | Retire the overlay; canonical facts are not mutated.                                            |

### Viewpoint identity

Identity for a read is `workspace_id + as_of_valid_time + as_of_asserted_at + layer + scenario_id (or baseline) + scope`. Cache keys and projection identifiers must incorporate every viewpoint coordinate that can change the result.

---

## Comparison context (diff)

A **diff** compares two snapshots, one per viewpoint — see [ADR-0008](../06-adrs/ADR-0008-diff-compares-two-viewpoints.md). Each side carries a full viewpoint; the **kind of delta is derived** from which viewpoint coordinates differ, not chosen from a closed list.

```json
{
  "left":  { "as_of_valid_time": { "instant": "2026-06-10T00:00:00Z" }, "as_of_asserted_at": null, "layer": "actual", "scenario": null },
  "right": { "as_of_valid_time": { "instant": "2026-06-10T00:00:00Z" }, "as_of_asserted_at": null, "layer": "actual", "scenario": { "scenario_id": "scn_plan_q3" } }
}
```

Derived delta kinds (by which coordinate(s) differ between the two sides):

| Coordinate that differs | Derived delta                                                        |
| ----------------------- | -------------------------------------------------------------------- |
| `as_of_valid_time`      | valid-time delta — same view at two instants                         |
| `as_of_asserted_at`     | asserted / belief delta — what we believed then vs now               |
| `layer`                 | layer delta — variance (e.g. plan vs actual)                         |
| `scenario`              | scenario delta — baseline vs scenario, or scenario vs scenario       |
| more than one           | mixed delta                                                          |

The earlier closed `kind` enum (`time_delta`, `scenario_delta`, `scenario_vs_scenario`) is superseded by this derived classification.

---

## Resolution explainability

Reads may request explainability metadata. The response then includes a per-slot reason array with the rule that selected each winner and the candidates that were considered. This is used by audit surfaces and the Chrona debug panel; it is not returned by default.

---

## Error codes

| Code                         | Trigger                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `TEMPORAL_CONTEXT_INVALID`   | Both `as_of_valid_time.instant` and `as_of_valid_time.interval` provided, or neither provided, or a field has an invalid type or value. |
| `TEMPORAL_INTERVAL_INVALID`  | `as_of_valid_time.interval.start` is after `.end`, or either end is not valid UTC ISO-8601.         |
| `SCENARIO_CONTEXT_INVALID`   | `scenario_id` is present but `mode` has an unsupported value, or the scenario does not exist.       |
| `COMPARISON_CONTEXT_INVALID` | A diff side carries an invalid viewpoint, or `left`/`right` viewpoints are incompatible.            |

---

## References

- [Contracts and Schemas](./CONTRACTS-AND-SCHEMAS.md)
- [Projection and Invalidation](./PROJECTION-AND-INVALIDATION.md)
- [Chrona module](../05-modules/chrona/README.md)
- [Mneme module](../05-modules/mneme/README.md)
- [Design overview](../03-design/DESIGN.md)
- [ADR-0002 Portable workspace format](../06-adrs/ADR-0002-portable-workspace-format.md)
- [ADR-0005 Sync and conflict model](../06-adrs/ADR-0005-sync-and-conflict-model.md)
