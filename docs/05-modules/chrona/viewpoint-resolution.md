# Viewpoint resolution

How Chrona resolves a [viewpoint](../../../CONTEXT.md) into a [snapshot](../../../CONTEXT.md): the precedence chain it drives through Mneme, the interval reasoning behind it, and how the result is shaped for a surface. The authoritative resolution contract is [TEMPORAL-AND-SCENARIO-CONTEXT](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md); where this file and the contract could drift, the contract governs. Mneme implements the mechanics ([Mneme bitemporal-and-hlc](../mneme/bitemporal-and-hlc.md)); Chrona owns the product-level interpretation.

---

## A viewpoint, fully specified

A read is undefined until every coordinate of the viewpoint is pinned: an as-of valid time, an as-of asserted time, a layer (or layer policy), a scenario, and a scope ([time-first-rule](../../01-architecture/boundary/time-first-rule.md)). The first four answer _which version_ of the twin; scope answers _which part_. Chrona never invents a coordinate — the renderer supplies the active viewpoint, the host carries it unmodified, and Chrona resolves exactly it.

---

## The precedence chain

When several candidate facts compete for one resolved slot at the requested as-of valid time **within one layer**, the resolver applies this chain in order and stops at the first rule that yields a unique winner ([TEMPORAL-AND-SCENARIO-CONTEXT](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)). Cross-layer combination is the layer policy ([layer-policy](./layer-policy.md)), not this chain.

| Priority | Rule                       | Detail                                                                                                                                                                                                                                                   |
| -------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | **Valid-time containment** | Only facts whose `[valid_from, valid_to)` contains the requested instant are candidates. This is the _during_ / _contains_ / _starts_ / _finishes_ family of Allen's interval relations _(Allen, Maintaining Knowledge about Temporal Intervals, 1983)_. |
| 2        | **Interval specificity**   | A narrower interval beats a wider one; a null `valid_to` is the widest and therefore weakest. A one-day fact beats a one-year fact at an instant both contain.                                                                                           |
| 3        | **Latest asserted time**   | Among ties, the largest HLC wins, bounded by the viewpoint's `as_of_asserted_at` ([Mneme bitemporal-and-hlc](../mneme/bitemporal-and-hlc.md)).                                                                                                           |
| 4        | **Op-id tie-break**        | If HLCs are identical, the lexicographically larger `op_id` wins. Degenerate but deterministic.                                                                                                                                                          |

Tombstones enter the same pipeline; **absence is not an error** — a slot with no containing candidate resolves to empty.

### Why interval algebra matters here

Allen's thirteen interval relations _(Allen, 1983)_ are the vocabulary for _why_ one fact is a candidate and another is not. Containment (rule 1) admits the `during`, `starts`, `finishes`, and `equals` relations; it excludes `before`, `after`, and the `meets` boundary (because the interval is half-open, a fact ending exactly at the requested instant does not contain it). Specificity (rule 2) is how Chrona breaks ties among facts that all _contain_ the instant but differ in width. Naming the algebra is not decoration: it is what makes the resolution rules a closed, reasoned set rather than ad-hoc comparisons.

---

## Shaping the result

Chrona returns more than a value. A resolved snapshot, or a `state_at` result, carries the active viewpoint, the scenario identity, the layer (or policy), and a fact count, so the result is interpretable without re-inspecting the request ([ux-obligations](./ux-obligations.md)). When a read requests explainability, the response includes a per-slot reason array — the rule that selected each winner and the candidates considered ([TEMPORAL-AND-SCENARIO-CONTEXT](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md), resolution explainability). This is what makes a time-travel answer trustable: the user can see _why_ a fact won, drawn straight from Mneme's `explain_resolution` ([Mneme storage-trait-and-engine](../mneme/storage-trait-and-engine.md)).

---

## Worked example — resolving Automation Orchestrator's disposition at a viewpoint

The seed `Application` `Automation Orchestrator` (`n:application:automation-orchestrator`) carries `disposition = Migrate` in the baseline `actual` layer ([baseline.yaml](../../data/base/baseline.yaml)). Suppose the workspace also holds a `plan`-layer fact authored by the FY26 modernisation work, proposing investment from mid-year:

- Fact P: `disposition = "Invest" [2026-07-01, null)`, **plan** layer, base case.
- Fact A: `disposition = "Migrate" [2026-01-01, null)`, **actual** layer, base case.

Resolving the slot at the viewpoint _{as-of valid time 2026-09-01, latest belief, scope = this application}_:

| Layer policy       | Resolution                                                | Walk                                                                                                                     |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `actual` only      | **Migrate**                                               | Only fact A is in the actual layer; it contains 2026-09-01 (rule 1); no competitor (rules 2–4 not needed).               |
| `plan` only        | **Invest**                                                | Only fact P is in the plan layer; it contains the instant.                                                               |
| `actual_over_plan` | **Migrate**                                               | Each layer resolves independently (Migrate, Invest); the blend prefers the higher-priority actual layer where it exists. |
| `side_by_side`     | **Migrate** (actual) and **Invest** (plan), kept distinct | The variance a planning conversation needs ([layer-policy](./layer-policy.md)).                                          |

Every answer carries `Fresh` content and the active viewpoint. The difference between the four is entirely the layer coordinate — which is why the layer policy is part of the question, not a global default ([ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)).

---

## Bounds

- Resolving one slot is `O(f log f)` in the facts on that slot — an indexed range scan then the chain ([Mneme performance-budget](../mneme/performance-budget.md)). Independent of total op-log size.
- A scoped snapshot is the sum over its slots; an unbounded scope is capped and returned as a **Bounded** result, never an unbounded scan ([bounds-and-failure-modes](./bounds-and-failure-modes.md)).

---

## References & standards

_Normative:_

- Allen — _Maintaining Knowledge about Temporal Intervals_, 1983. The interval relations behind containment and specificity.
- Snodgrass — _Developing Time-Oriented Database Applications in SQL_, 1999. The bitemporal resolution model.

## Related documents

| Document                                                                             | What it covers                                        |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| [Temporal and scenario context](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The authoritative resolution contract.                |
| [Layer policy](./layer-policy.md)                                                    | How per-layer winners combine.                        |
| [Mneme bitemporal model and the HLC](../mneme/bitemporal-and-hlc.md)                 | The mechanical resolution Chrona drives.              |
| [The re-resolution rule](./re-resolution-rule.md)                                    | Why a context change re-resolves rather than patches. |
| [Chrona README](./README.md)                                                         | The module index.                                     |
