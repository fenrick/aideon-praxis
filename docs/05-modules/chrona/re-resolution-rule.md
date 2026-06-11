# The re-resolution rule

Why a change to the active time or scenario is always a fresh resolution through Mneme, never a delta applied to a cached view in place. This is one of Chrona's core invariants, and it is unconditional.

---

## The rule

> When the renderer changes the active time or scenario, it requests a **fresh resolution**. It does not apply a delta to the previous payload or mutate visible state locally.

The sequence is fixed:

1. The renderer dispatches a host command carrying the new [viewpoint](../../../CONTEXT.md).
2. `TemporalEngine` resolves against Mneme with the updated viewpoint ([viewpoint-resolution](./viewpoint-resolution.md)).
3. The full result payload replaces the previous view.

There is **no "small change" optimisation** that bypasses re-resolution. A one-day step on the time slider re-resolves exactly as a year-long jump does.

---

## Why it is unconditional

The temptation is obvious: a small time step looks like it should be a cheap local patch of the visible payload. The rule forbids it because a local patch cannot be trusted to be correct.

- **Resolution is not monotonic in a single coordinate.** Stepping the as-of valid time forward by one day can change which fact wins by _any_ of the four precedence rules — a narrower interval may start, a tombstone may take effect, a more-recently-asserted fact may become the containing one. A naive "carry the old value forward" patch would silently show a stale or wrong answer ([viewpoint-resolution](./viewpoint-resolution.md)).
- **Honesty requires the badge.** A re-resolution returns the current freshness state — `Fresh`, or `Stale` / `Rebuilding` if a projection is mid-refresh ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md), [DOCUMENTATION-STANDARD §9](../../02-standards/DOCUMENTATION-STANDARD.md)). A locally-patched view has no way to know its own freshness, so it would be dishonest by construction.
- **The cost is bounded anyway.** A single-slot resolution is independent of op-log size ([Chrona viewpoint-resolution](./viewpoint-resolution.md), [Mneme performance-budget](../mneme/performance-budget.md)), and a scoped snapshot is bounded by its scope. Re-resolution is cheap enough that the local-patch optimisation buys little and risks a wrong answer — a bad trade for a product built on explainability.

---

## The trade-off named

Forbidding the local-patch optimisation closes a door: there is no incremental client-side time-scrub that avoids a round trip. The cost is a host command per context change. The product accepts it because the alternative — a client that derives its own time-travel answers — would be a second, untrusted resolver that could disagree with Mneme. One resolver, always re-run, is the price of one consistent story.

Cache invalidation and projection lifecycle that make re-resolution fast are governed by [PROJECTION-AND-INVALIDATION](../../04-contracts/PROJECTION-AND-INVALIDATION.md); the renderer keys its own cache by the full viewpoint, so a repeated viewpoint is served from cache while a _changed_ viewpoint always re-resolves ([ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)).

---

## Worked example — scrubbing the time slider

A user drags the time slider from 2026-06-11 to 2026-09-01 while viewing `Automation Orchestrator`:

1. The renderer dispatches a command with the new viewpoint _{as-of valid time 2026-09-01, …}_.
2. `TemporalEngine` re-resolves the visible scope against Mneme. Suppose a `plan`-layer fact `disposition = Invest [2026-07-01, null)` now contains the instant under the active layer policy — the re-resolution surfaces it; a local patch carrying the old `Migrate` forward would have missed it.
3. The full payload, carrying the new viewpoint and a `Fresh` state, replaces the previous view.

The user sees the correct disposition for the new instant, and the payload says which viewpoint produced it — the honesty the rule guarantees.

---

## References & standards

_Informative:_

- Nielsen — _10 Usability Heuristics_, 1994. Visibility of system status — the basis for always-honest, always-labelled temporal state.

## Related documents

| Document                                                                         | What it covers                                    |
| -------------------------------------------------------------------------------- | ------------------------------------------------- |
| [Viewpoint resolution](./viewpoint-resolution.md)                                | The resolution a context change re-runs.          |
| [PROJECTION-AND-INVALIDATION](../../04-contracts/PROJECTION-AND-INVALIDATION.md) | Cache invalidation that keeps re-resolution fast. |
| [ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)               | The freshness state a re-resolution returns.      |
| [UX obligations](./ux-obligations.md)                                            | What every re-resolved payload must carry.        |
| [Chrona README](./README.md)                                                     | The module index.                                 |
