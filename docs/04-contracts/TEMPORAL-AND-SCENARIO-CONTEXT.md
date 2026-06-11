# Temporal and Scenario Context

The canonical contract for every time-aware read and write in Aideon Desktop: the shape of `TemporalContext`, how effective facts are resolved deterministically, and how scenario overlays compose.

---

## `TemporalContext` shape

Every operation that reads or writes time-aware state carries a `TemporalContext`. The struct is defined in Rust and mirrored in TypeScript; both sides must stay in sync.

```json
{
  "effective": {
    "as_of": "2026-06-10T09:00:00Z",
    "interval": null
  },
  "asserted": 2767412345671680,
  "resolution": {
    "layer": "actual"
  },
  "scenario": {
    "scenario_id": "scn_plan_q3",
    "mode": "overlay"
  },
  "workspace_id": "ws_local",
  "tenant_id": null
}
```

### Fields

| Field                  | Type                          | Required                       | Notes                                                   |
| ---------------------- | ----------------------------- | ------------------------------ | ------------------------------------------------------- |
| `effective.as_of`      | UTC ISO-8601 string           | one of `as_of` / `interval`    | point-in-time read                                      |
| `effective.interval`   | `{ start, end }` UTC ISO-8601 | one of `as_of` / `interval`    | range read; both ends inclusive                         |
| `asserted`             | `i64` (packed HLC)            | write paths; optional on reads | see §HLC encoding below                                 |
| `resolution.layer`     | `"plan" \| "actual"`          | yes                            | resolution layer; `actual` takes precedence over `plan` |
| `scenario.scenario_id` | string                        | no                             | omit for baseline view                                  |
| `scenario.mode`        | `"overlay"`                   | if `scenario_id` present       | only `overlay` is supported                             |
| `workspace_id`         | string                        | yes                            | identifies the portable workspace folder                |
| `tenant_id`            | string \| null                | no                             | optional; `null` on single-user desktop                 |

**Mutual exclusion:** exactly one of `effective.as_of` or `effective.interval` must be provided. Providing both or neither is a `TEMPORAL_CONTEXT_INVALID` error.

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

## Temporal resolution rules

When multiple candidate facts compete for the same resolved slot at a given effective time, the resolver applies this precedence chain in order and stops at the first rule that selects a unique winner:

| Priority | Rule                       | Detail                                                                                                                                                               |
| -------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | **Valid-time containment** | Only facts whose valid-time interval contains (or aligns with) the requested `effective.as_of` or `effective.interval` are candidates.                               |
| 2        | **Layer precedence**       | `actual` wins over `plan` for the same slot.                                                                                                                         |
| 3        | **Interval specificity**   | A narrower valid-time interval wins over a wider one. A fact valid for one day is preferred over one valid for a year.                                               |
| 4        | **Latest asserted time**   | Among remaining ties, the fact with the largest HLC value wins (most-recently asserted).                                                                             |
| 5        | **Op-id tie-break**        | If asserted HLCs are identical, the fact with the lexicographically larger operation identifier wins. This case is degenerate in practice but must be deterministic. |

**Tombstones and overrides** enter the same pipeline — a tombstone at layer `actual` with a later asserted time suppresses an earlier `plan` fact by the same rules.

**No fact wins by default:** if no candidate survives the containment filter for the requested effective time, the resolver returns an empty/absent result for that slot. Absence is not an error.

---

## Default effective-time policy

APIs that permit an omitted `effective` field must document one of:

| Policy token        | Meaning                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `now_utc`           | `as_of` defaults to the wall-clock UTC instant at request time.         |
| `workspace_default` | The workspace's configured default effective instant is used.           |
| `explicit_required` | The field is mandatory; omission is a `TEMPORAL_CONTEXT_INVALID` error. |

When a policy is not documented for an API, treat it as `explicit_required`.

---

## Scenario overlays

A scenario is an additive overlay on canonical temporal facts. Canonical truth is the op log; scenario views are derived.

### Composition

1. The resolver first materialises the baseline effective graph for the requested `effective` context and `resolution.layer`.
2. If a `scenario_id` is present, scenario-scoped facts for that `scenario_id` are merged on top: any slot where a scenario fact exists replaces the corresponding baseline fact using the same resolution rules (layer → specificity → asserted time → op-id).
3. Slots with no scenario fact pass through unchanged from the baseline.
4. The result is a deterministic effective graph: `canonical baseline ∪ scenario overlay`.

### Scenario operations

| Operation   | Description                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------- |
| **create**  | Initialise an overlay context from a base timeline and effective instant.                       |
| **rebase**  | Re-align the overlay against updated canonical facts; conflict slots are reported explicitly.   |
| **compare** | Compute a deterministic delta between the scenario view and baseline, or between two scenarios. |
| **promote** | Materialise approved scenario deltas as canonical fact writes through a controlled workflow.    |
| **discard** | Retire the overlay; canonical facts are not mutated.                                            |

### Scenario identity

Effective identity for a read is `workspace_id + effective time/interval + scenario_id (or baseline)`. Cache keys and projection identifiers must incorporate all three dimensions.

---

## Comparison context

Range and diff reads carry an explicit comparison pair instead of a single `effective`:

```json
{
  "kind": "scenario_delta",
  "left": { "as_of": "2026-06-10T00:00:00Z", "scenario_id": null },
  "right": { "as_of": "2026-06-10T00:00:00Z", "scenario_id": "scn_plan_q3" }
}
```

Allowed `kind` values:

| Kind                   | Description                                                                |
| ---------------------- | -------------------------------------------------------------------------- |
| `time_delta`           | Same view (baseline or same scenario) at two different effective instants. |
| `scenario_delta`       | Same effective instant, baseline vs scenario.                              |
| `scenario_vs_scenario` | Same effective instant, two different scenarios.                           |

---

## Resolution explainability

Reads may request explainability metadata. The response then includes a per-slot reason array with the rule that selected each winner and the candidates that were considered. This is used by audit surfaces and the Chrona debug panel; it is not returned by default.

---

## Error codes

| Code                         | Trigger                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `TEMPORAL_CONTEXT_INVALID`   | Both `as_of` and `interval` provided, or neither provided, or a field has an invalid type or value. |
| `TEMPORAL_INTERVAL_INVALID`  | `interval.start` is after `interval.end`, or either end is not valid UTC ISO-8601.                  |
| `SCENARIO_CONTEXT_INVALID`   | `scenario_id` is present but `mode` has an unsupported value, or the scenario does not exist.       |
| `COMPARISON_CONTEXT_INVALID` | `kind` is not a recognised value, or `left`/`right` carry incompatible context.                     |

---

## References

- [Contracts and Schemas](./CONTRACTS-AND-SCHEMAS.md)
- [Projection and Invalidation](./PROJECTION-AND-INVALIDATION.md)
- [Chrona module](../05-modules/chrona/README.md)
- [Mneme module](../05-modules/mneme/README.md)
- [Design overview](../03-design/DESIGN.md)
- [ADR-0002 Portable workspace format](../06-adrs/ADR-0002-portable-workspace-format.md)
- [ADR-0005 Sync and conflict model](../06-adrs/ADR-0005-sync-and-conflict-model.md)
