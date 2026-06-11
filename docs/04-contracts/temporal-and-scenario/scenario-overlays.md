# Scenario overlays

A scenario is an additive overlay on canonical temporal facts — an alternate world, orthogonal to layer. Canonical truth is the op log; scenario views are derived. This file is the composition contract and the scenario operations.

---

## Composition

The resolver composes a scenario snapshot deterministically:

1. It first materialises the baseline snapshot for the requested viewpoint (as-of valid time, as-of asserted time, and [layer policy](./layer-and-policy.md)).
2. If a `scenario_id` is present, scenario-scoped facts for that `scenario_id` are merged on top: any slot where a scenario fact exists replaces the corresponding baseline fact using the same [resolution rules](./resolution-rules.md) (interval specificity → asserted time → op-id, under the layer policy).
3. Slots with no scenario fact pass through unchanged from the baseline.
4. The result is a deterministic snapshot: `canonical baseline ∪ scenario overlay`.

Because a snapshot is a pure function of its viewpoint, the composed scenario snapshot is itself deterministic and cacheable, keyed on the full [viewpoint identity](./viewpoint-shape.md).

## Scenario operations

| Operation   | Description                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| **create**  | Initialise an overlay from a base timeline and as-of valid time.                                                |
| **rebase**  | Re-align the overlay against updated canonical facts; conflict slots are reported explicitly.                   |
| **compare** | Compute a deterministic [diff](./diff.md) between the scenario snapshot and baseline, or between two scenarios. |
| **promote** | Materialise approved scenario deltas as canonical fact writes through a controlled workflow.                    |
| **discard** | Retire the overlay; canonical facts are not mutated.                                                            |

**rebase** is the operation that can surface conflict: when canonical facts moved under the overlay, a slot the scenario also changed is a conflict, reported rather than silently merged. A recorded conflict halts the operation and returns `CONFLICT_RECORDED` ([error-codes.md](./error-codes.md), and the IPC error taxonomy's `conflict` category in [error-envelope.md](../ipc/error-envelope.md)). **promote** is the only operation that writes canonical facts, and only through a controlled workflow — the additive nature of a scenario is preserved everywhere else.

## Worked example

Baseline (seed metamodel): `Application` `app_ledger` has `disposition = "tolerate"` asserted in the `actual` layer. A planning scenario `scn_plan_q3` overlays `disposition = "migrate"` as a `plan`-layer fact.

- A read at viewpoint `{ scenario: { scenario_id: "scn_plan_q3" }, layer: "plan" }` resolves the overlay: `disposition = "migrate"`.
- A read at the same viewpoint with `scenario` omitted resolves the baseline: `disposition = "tolerate"`.
- A **compare** of the two viewpoints derives a **scenario delta** ([diff.md](./diff.md)) on the `disposition` slot.

## References & standards

- The Open Group — **TOGAF Standard, 10th Edition** _(informative: the plateau/transition framing scenarios support)_.

## Related documents

| Document                                                                        | What it covers                                    |
| ------------------------------------------------------------------------------- | ------------------------------------------------- |
| [diff.md](./diff.md)                                                            | How a scenario comparison derives its delta kind. |
| [Chrona: scenario composition](../../05-modules/chrona/scenario-composition.md) | The engine that composes overlays.                |
| [Mneme: scenarios and layers](../../05-modules/mneme/scenarios-and-layers.md)   | How scenario-scoped facts are stored.             |
| [ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)                   | The conflict model rebase reports against.        |
