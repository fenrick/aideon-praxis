# Time-First Rule

Why every read and write in Aideon Desktop carries an explicit time context, and what that context contains. This file
operationalises proposition 5 of the [boundary thesis](./boundary-thesis.md): no layer may assume "current state only".

---

## The rule

> **Every read and write carries a complete time context.** A module that resolves or mutates the twin without one is
> reading a state that does not exist — there is no privileged "now" in a bitemporal twin.

The twin is the whole resolvable organisation across all valid time, asserted time, layers, and scenarios; a snapshot is
the twin seen through one **Viewpoint** _([`CONTEXT.md`](../../../CONTEXT.md))_. Because the twin is bitemporal — valid
time and asserted time are independent axes _(Snodgrass, Developing Time-Oriented Database Applications in SQL, 1999)_ —
a query is undefined until both axes, the layer policy, and the scenario are pinned. This is fixed by
**[ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)** (Temporal model:
valid-interval, layer-as-policy, viewpoint).

---

## What the context carries

The context that rides on every operation:

| Field           | Meaning                                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `partition_id`  | The workspace partition scope the operation applies within.                                                                |
| `valid_time`    | The business/world time the fact claims to apply — a half-open interval `[valid_from, valid_to)`, `valid_to` optional.     |
| `asserted_time` | When the fact was recorded — the audit axis, on a Hybrid Logical Clock _(Kulkarni et al., Logical Physical Clocks, 2014)_. |
| `layer`         | The "what kind of claim" coordinate — `plan`, `actual`, and extensibly `forecast`, `target`, `budget`.                     |
| `scenario_id`   | Optional scenario overlay; omitted resolves the base case.                                                                 |

On a **read**, these coordinates form a [Viewpoint](../../../CONTEXT.md): an as-of valid time, an as-of asserted time
(which belief), a layer or layer **policy** (never a fixed precedence — variance analysis needs plan and actual visible
side by side), a scenario, and a scope. On a **write**, the coordinates fix where the resulting facts land: their
valid-from, their layer, their scenario, and their asserted instant.

Asserted time is part of the question, not just metadata: pinning it to a past instant replays a past belief; leaving it
at latest shows current belief. The full contract is in
[`../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md`](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md).

---

## Who provides it, who consumes it

- **The renderer** passes the current time context — from the user's Viewpoint selection, or the default — with every
  command.
- **The host** carries the context unmodified across the IPC boundary; it does not invent or default coordinates
  silently.
- **Chrona** interprets the context: it resolves the Viewpoint, applies the layer policy, composes scenarios, and
  computes diffs between two Viewpoints _(ADR-0008, Diffs compare two viewpoints; delta kind derived)_.
- **Mneme** stores and retrieves facts against the context; the op log records the asserted instant.
- **Praxis and Metis** consume the resolved context on every call; they never assume a current state.

---

## Worked example

Consider the seed entity `Application` "Billing System" with a `disposition` slot. Two facts exist for that slot in the
same scenario:

- `disposition = "invest" [2025-01-01, null)` in the **plan** layer.
- `disposition = "tolerate" [2026-01-01, null)` in the **actual** layer.

A read with no time context is undefined — there is no single disposition. A read at the Viewpoint _{as-of valid time
2026-06-11, as-of asserted time latest, layer policy actual-over-plan, base case scenario}_ resolves to `tolerate`,
because the actual-layer fact wins under that policy from its valid-from. A read at the same instant under a _plan-only_
policy resolves to `invest`. A diff between the two Viewpoints derives a **layer (variance)** delta —
`invest → tolerate` — without the caller choosing a delta kind up front. This is the discipline the time-first rule
enforces: the answer depends on the Viewpoint, so the Viewpoint must always be present.

---

## The trade-off named

Requiring a complete time context on every call closes a door: there is no convenient "just give me the current value"
path that skips the Viewpoint. The cost is that every command, adapter, and engine signature carries time coordinates,
and the UI must always have a Viewpoint selected or defaulted. The architecture accepts that ceremony in exchange for a
twin that can answer "what did we believe last quarter?" and "what does the plan say versus the actual?" — questions a
current-state store cannot answer at all.

---

## Related documents

| Document                                                                                                                                                           | What it covers                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| [`boundary-thesis.md`](./boundary-thesis.md)                                                                                                                       | The proposition this rule operationalises.                |
| [`../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md`](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)                                                       | The full time-context contract and resolution rules.      |
| [`../../05-modules/chrona/README.md`](../../05-modules/chrona/README.md)                                                                                           | Viewpoint resolution, layer policy, scenario composition. |
| [`../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md`](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md) | The temporal model decision.                              |
| [`../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md`](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)                                                 | Diffs compare two Viewpoints; delta kind derived.         |
