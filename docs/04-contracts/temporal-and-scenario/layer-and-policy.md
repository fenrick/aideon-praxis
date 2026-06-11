# Layer and layer policy

A **layer** answers "what kind of claim is this?" This file is the contract for the viewpoint's `layer` field; the decision that layer is a policy rather than a fixed precedence is [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md).

---

## Layer is part of a fact's identity

Layers are an open set — `plan`, `actual`, and extensibly `forecast`, `budget`, `target`, or other baselines. A fact's layer is part of its identity: a plan value and an actual value coexist for the same slot, valid time, and scenario. The resolver never silently collapses them, because variance analysis requires plan and actual to stay visible side by side.

## How layers combine on read

How layers combine on a read is a **policy** chosen by the viewpoint's `layer` field, never a fixed precedence:

| `layer` value                      | Behaviour                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| `"actual"` (a single layer name)   | Resolve only that layer.                                                                            |
| `{ "policy": "actual_over_plan" }` | Blend: a higher-priority layer overrides a lower one where it exists (a blended operational view).  |
| `{ "policy": "side_by_side" }`     | Keep layers separate — required for variance comparison (plan vs actual); see [diff.md](./diff.md). |

"Actual over plan" is therefore one selectable policy, not a universal rule. This is the door the design deliberately keeps open: a fixed "actual wins" rule would be simpler to resolve but would make variance analysis impossible, because it would discard the plan value the moment an actual exists.

The enumerated policy tokens are provisional ([ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)); new tokens are additive ([versioning and compatibility](../ipc/versioning-and-compatibility.md)).

## How policy relates to the resolution chain

The [resolution precedence chain](./resolution-rules.md) operates **within a single layer**. Cross-layer combination is governed by the policy above, not by that chain. A `side_by_side` policy resolves each layer independently and returns both; an `actual_over_plan` policy resolves each, then overlays the higher-priority result where it exists.

## References & standards

- The Open Group — **ArchiMate 3.2** _(informative: the layered modelling vocabulary the `actual`/`plan` distinction sits within)_.

## Related documents

| Document                                                                                   | What it covers                                              |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| [resolution-rules.md](./resolution-rules.md)                                               | The within-layer precedence chain the policy composes over. |
| [Chrona: layer policy](../../05-modules/chrona/layer-policy.md)                            | The engine that applies the policy.                         |
| [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md) | Layer-as-policy as a model decision.                        |
