# Layer policy

How a viewpoint selects the way [layers](../../../CONTEXT.md) combine on a read — a single layer, a blend, or
side-by-side — and why layer is a _policy_ chosen per question rather than a fixed precedence. The authoritative
contract is [TEMPORAL-AND-SCENARIO-CONTEXT](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md); the storage mechanics
are in [Mneme scenarios-and-layers](../mneme/scenarios-and-layers.md).

---

## Layer is a coordinate, not a default precedence

A layer answers "what kind of claim is this?" — `plan`, `actual`, and extensibly `forecast`, `budget`, `target`. A
fact's layer is part of its identity, so a plan value and an actual value coexist for the same slot, valid time, and
scenario; neither silently overwrites the other. This is the load-bearing decision: variance analysis requires plan and
actual to stay visible side by side, so there is **no universal "actual wins"** rule
([ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)).

How layers combine is therefore a policy the viewpoint chooses on each read:

| `layer` value                         | Behaviour                                                             | When to use it                                                                                                                                 |
| ------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| A single layer name (e.g. `"actual"`) | Resolve only that layer.                                              | An operational view of the world as it is; or a plan-only view of intent.                                                                      |
| `{ "policy": "actual_over_plan" }`    | Blend: a higher-priority layer overrides a lower one where it exists. | A blended operational view — "show me the actual where we have it, the plan where we don't."                                                   |
| `{ "policy": "side_by_side" }`        | Keep layers separate.                                                 | Variance — plan against actual at the same valid time ([diff](./diff.md), [ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)). |

The per-layer resolution chain runs _within_ each layer first ([viewpoint-resolution](./viewpoint-resolution.md)); the
policy then combines the per-layer winners.

---

## Layer composition: how a blend is built

A blend like `actual_over_plan` is composed, not hard-wired:

1. Resolve each layer in the policy independently to its winning fact at the viewpoint (containment → specificity →
   asserted time → op-id).
2. Combine the per-layer winners by the policy's priority — `actual` outranks `plan` under `actual_over_plan`; a slot
   with only a plan fact falls through to the plan value; a slot with neither resolves to absent.
3. The combined result carries the policy in its metadata, so a downstream surface knows it is reading a blend, not a
   single layer ([ux-obligations](./ux-obligations.md)).

The composition is associative over the layers in the policy and deterministic — the same viewpoint yields the same
blend — which is what lets a blended read be cached on the policy as part of the viewpoint key
([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)). The policy token set itself is provisional:
`actual_over_plan` and `side_by_side` are the defined tokens; new blends (e.g. `forecast_over_actual_over_plan`) are
added to the contract, not invented per call
([ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md), open question).

---

## The trade-off named

Treating layer as a policy closes the door on a convenient "just give me the current value" path: a read must always
name how layers combine, because there is no privileged layer. The cost is ceremony — every temporal read carries a
layer or policy. The product accepts it because the alternative (a fixed "actual wins") makes plan-versus-actual
variance — the question an architect most needs — impossible to ask. Naming the policy per question is the price of
keeping variance representable.

---

## Worked example — three layer policies over one slot

`Automation Orchestrator`'s `disposition` slot has `Migrate` in `actual [2026-01-01, null)` and `Invest` in
`plan [2026-07-01, null)`, base case. At the viewpoint _{as-of valid time 2026-09-01, latest belief}_:

- **`actual`**: `Migrate` — the operational truth.
- **`plan`**: `Invest` — the intent.
- **`actual_over_plan`**: `Migrate` — actual exists, so it wins the blend.
- **`side_by_side`**: both kept distinct — the input to a variance diff that derives a **layer delta**
  `Migrate → Invest` ([diff](./diff.md)).

Add a forecast fact `disposition = "Tolerate" forecast [2026-09-01, null)` and a policy `forecast_over_actual_over_plan`
would resolve to `Tolerate` — the highest-priority layer present. The same facts, four answers, because the policy is
part of the question.

---

## References & standards

_Normative:_

- Snodgrass — _Developing Time-Oriented Database Applications in SQL_, 1999. The sequenced semantics per layer the blend
  composes.

## Related documents

| Document                                                                                   | What it covers                               |
| ------------------------------------------------------------------------------------------ | -------------------------------------------- |
| [Temporal and scenario context](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)       | The authoritative layer-policy token set.    |
| [Viewpoint resolution](./viewpoint-resolution.md)                                          | The per-layer chain a policy combines.       |
| [Diff](./diff.md)                                                                          | How `side_by_side` feeds a variance delta.   |
| [Mneme scenarios and layers](../mneme/scenarios-and-layers.md)                             | The storage mechanics of layer and scenario. |
| [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md) | Layer-as-policy.                             |
