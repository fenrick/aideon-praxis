# Temporal and Scenario Context

The canonical contract for every time-aware read and write in Aideon Desktop: the shape of the `Viewpoint`, how facts resolve deterministically into effective intervals, and how scenario overlays compose. This is the time half of the contracts layer; the IPC envelope that carries it is [ipc/](../ipc/README.md). Terms follow the glossary in [`CONTEXT.md`](../../../CONTEXT.md) — viewpoint, fact, layer, scenario, scope, effective interval, snapshot, diff.

The governing decisions are [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md) (the bitemporal model, layer-as-policy, and the viewpoint frame) and [ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md) (diff compares two viewpoints; the delta kind is derived). The asserted-time clock is [ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md).

---

## Contents

| #   | File                                                               | Question it answers                                                                                     |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| 1   | [viewpoint-shape.md](./viewpoint-shape.md)                         | What is the `Viewpoint` struct, field by field?                                                         |
| 2   | [hlc-encoding.md](./hlc-encoding.md)                               | How is asserted time packed, ordered, and made robust to skew?                                          |
| 3   | [layer-and-policy.md](./layer-and-policy.md)                       | What is a layer, and how do layers combine on read?                                                     |
| 4   | [resolution-rules.md](./resolution-rules.md)                       | How does the resolver pick a winner among competing facts?                                              |
| 5   | [scenario-overlays.md](./scenario-overlays.md)                     | How does a scenario compose on the baseline, and what operations act on it?                             |
| 6   | [diff.md](./diff.md)                                               | How is a comparison expressed, and how is its delta kind derived?                                       |
| 7   | [explainability.md](./explainability.md)                           | How does a read explain which rule selected each value?                                                 |
| 8   | [error-codes.md](./error-codes.md)                                 | What temporal/scenario error codes exist and what triggers them?                                        |
| 9   | [defaults.md](./defaults.md)                                       | What does an omitted as-of valid time resolve to?                                                       |
| 10  | [conflicts-during-resolution.md](./conflicts-during-resolution.md) | What is the effective state when facts genuinely conflict, and how does a superseded fact stay visible? |

---

## The frame in one paragraph

Every operation that reads or writes time-aware state carries a [`Viewpoint`](./viewpoint-shape.md) — the complete frame for resolving or analysing the twin: an as-of valid time, an as-of asserted time, a [layer or layer policy](./layer-and-policy.md), a [scenario](./scenario-overlays.md), and a scope. The first four answer _which version_ of the twin you are looking at; scope answers _which part_. A resolved snapshot or diff is not fully specified without all of them — which is why scope rides inside the viewpoint, not beside it. The resolver applies a [deterministic precedence chain](./resolution-rules.md) within a layer and an explicit policy across layers, then merges any [scenario overlay](./scenario-overlays.md). A [diff](./diff.md) is two viewpoints in, one derived delta out.

---

## References & standards

_Normative:_

- Snodgrass — _Developing Time-Oriented Database Applications in SQL_, 1999 (the bitemporal model: valid time vs asserted/transaction time).
- Allen — _Maintaining Knowledge about Temporal Intervals_, 1983 (the interval relations used in [resolution](./resolution-rules.md)).
- Kulkarni, Demirbas, et al. — _Logical Physical Clocks (HLC)_, 2014 (the [asserted-time clock](./hlc-encoding.md)).

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                   | What it covers                                                                                     |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| [Chrona module](../../05-modules/chrona/README.md)                                         | The engine that resolves viewpoints, applies layer policy, composes scenarios, and computes diffs. |
| [Mneme module](../../05-modules/mneme/README.md)                                           | The op log and bitemporal facts the resolver reads.                                                |
| [ipc/](../ipc/README.md)                                                                   | The envelope, error codes, and correlation context that carry temporal reads.                      |
| [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md) | The temporal model this contract realises.                                                         |
