# Scenarios and layers

How Mneme stores the two orthogonal "which world / what kind of claim" coordinates — [scenario](../../../CONTEXT.md) and [layer](../../../CONTEXT.md) — and how it composes a scenario overlay on read. This is the storage-layer view; the product-level interpretation (how a scenario is presented, compared, and promoted) belongs to [Chrona](../chrona/README.md). Where this file and the [temporal and scenario contract](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) could drift, the contract governs.

---

## Layer is a coordinate, not a precedence

A **layer** answers "what kind of claim is this?" — `plan`, `actual`, and extensibly `forecast`, `budget`, `target`. A fact's layer is part of its identity: a `plan` value and an `actual` value coexist for the same slot, valid time, and scenario. They do not overwrite each other, because variance analysis needs both visible side by side.

How layers combine on a read is a **policy** the viewpoint chooses, never a fixed rule:

| `layer` value                         | Behaviour                                                                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| A single layer name (e.g. `"actual"`) | Resolve only that layer.                                                                                                      |
| `{ "policy": "actual_over_plan" }`    | Blend: a higher-priority layer overrides a lower one where it exists — a blended operational view.                            |
| `{ "policy": "side_by_side" }`        | Keep layers separate — required for variance comparison ([ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)). |

The per-layer resolution chain (containment → specificity → asserted time → op-id) runs _within_ each layer first; the layer policy then combines the per-layer winners. "Actual over plan" is one selectable policy, not a universal rule — treating it as universal would make plan-versus-actual variance impossible to compute ([ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)). The numeric layer ordering (`plan = 10`, `actual = 20`, …) exists only to give blend policies a priority; it is not a default precedence.

---

## Scenario is an additive overlay

A **scenario** is an alternate world — an additive overlay on the base case, orthogonal to layer. A scenario carries its own layers, so a workspace can compare plan against actual _within_ one scenario, or one scenario's plan against another's. Omitting a scenario resolves the base case.

In storage, every write input carries `scenario_id: Option<ScenarioId>`. `None` writes the baseline; `Some(id)` writes the overlay. Every table that participates in scenario reads carries a nullable `scenario_id` column — baseline rows are `NULL`, overlay rows carry the scenario UUID ([sqlite](./SQLITE.md)). Scenario lifecycle (create, delete) is a first-class operation; the broader scenario operations (rebase, compare, promote, discard) are owned by [Chrona](../chrona/scenario-composition.md), built on this storage primitive.

### Composition on read

The resolver composes a scenario view deterministically ([temporal and scenario contract](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)):

1. Materialise the baseline snapshot for the requested viewpoint (as-of valid time, as-of asserted time, layer policy).
2. If a `scenario_id` is present, merge scenario-scoped facts on top: any slot with a scenario fact replaces the baseline fact, using the same per-layer resolution rules under the same layer policy.
3. Slots with no scenario fact pass through unchanged from the baseline.
4. The result is `canonical baseline ∪ scenario overlay` — deterministic, and a pure function of the viewpoint.

Because the result is a pure function of the viewpoint, a scenario read is cacheable and a diff between two scenarios is itself deterministic ([ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)).

---

## Branching tree versus DAG

A scenario is modelled as an **additive overlay on a single base case** — a one-level branch, not a deep version tree. The design chooses this over a Git-style branching _tree_ or a general merge _DAG_ deliberately, and the trade-off is worth naming.

- **What the overlay model buys.** Composition is a single merge of overlay-over-baseline, which is `O(facts touched by the overlay)`, not a walk of an arbitrary ancestry graph. Cache keys are simple — `baseline` or `baseline + one scenario_id`. There is no merge-base computation and no three-way merge.
- **What it closes off.** There is no native "branch of a branch" and no automatic merge of two divergent scenarios into a third. Comparing two scenarios is a diff, not a merge; reconciling them is a human-mediated **promote** of selected deltas (below), not an automatic resolver.
- **Why this is the right cost for the product.** A scenario is an alternate-world overlay an architect reasons about and then promotes or discards, not a long-lived parallel history that must converge. The merge-DAG generality (and its conflict surface) is deferred until a use case demands it; the sync-and-conflict model that _would_ introduce convergent merge across devices is a separate concern ([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)), and the CRDT operations (`OrSetUpdate`, `CounterUpdate`) are the convergence primitive it would build on _(Shapiro et al., Conflict-free Replicated Data Types, 2011)_.

### Merge by promotion

The only path from a scenario into canonical truth is **promotion**: approved scenario deltas are materialised as canonical fact writes through a controlled workflow ([temporal and scenario contract](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md), [Chrona scenario composition](../chrona/scenario-composition.md)). Promotion is append-only like every other write — it appends new operations that assert the promoted facts in the base case; it does not rewrite the scenario's history. A `rebase` re-aligns an overlay against updated canonical facts and reports conflict slots explicitly rather than resolving them silently.

---

## Worked example — Automation Orchestrator's disposition, plan vs actual

The seed `Application` `Automation Orchestrator` (`n:application:automation-orchestrator`) has `disposition = Migrate` in the baseline `actual` layer. A planning exercise authors an alternative in a scenario `scn_consolidation`, and a `plan`-layer intent to invest instead.

Facts for the `(automation-orchestrator, disposition)` slot:

- `disposition = "Migrate" [2026-01-01, null)`, **actual** layer, **base case**.
- `disposition = "Invest"  [2026-07-01, null)`, **plan** layer, scenario `scn_consolidation` (a `PlanEvent` effect).

Resolving the slot at _{as-of valid time 2026-09-01}_ under four viewpoints:

| Viewpoint                                               | Resolves to                                               | Why                                                                 |
| ------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------- |
| layer `actual`, base case                               | `Migrate`                                                 | Only the actual fact exists in the base case.                       |
| layer `plan`, scenario `scn_consolidation`              | `Invest`                                                  | The scenario overlay supplies a plan fact; it contains the instant. |
| policy `actual_over_plan`, scenario `scn_consolidation` | `Migrate`                                                 | Actual outranks plan under this blend, even inside the scenario.    |
| policy `side_by_side`, scenario `scn_consolidation`     | `Migrate` (actual) **and** `Invest` (plan), kept distinct | The variance the planning conversation needs.                       |

A diff between the `side_by_side` scenario viewpoint and the base-case actual viewpoint derives a **mixed delta** — both the layer and the scenario coordinates differ — surfacing `Migrate → Invest` as the variance the scenario proposes ([ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)). Promoting `scn_consolidation` would append an `actual`-layer (or `plan`-layer, per the workflow) operation asserting `Invest` in the base case; until then the base case is untouched.

---

## Bounds and complexity

- **Scenario composition** is `O(b + s)` where `b` is the baseline facts in scope and `s` is the overlay facts — a single pass, no ancestry walk.
- **Layer blend** adds a constant factor per layer in the policy (typically two: plan and actual).
- **Cache identity** must incorporate every viewpoint coordinate that can change the result — workspace, as-of valid time, as-of asserted time, layer (or policy), scenario, scope ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)). A cache keyed on fewer coordinates would serve one scenario's answer for another.

---

## References & standards

_Informative:_

- Shapiro et al. — _Conflict-free Replicated Data Types_, 2011. The convergence primitive a future merge-DAG would build on.
- Snodgrass — _Developing Time-Oriented Database Applications in SQL_, 1999. The sequenced-semantics basis for per-layer resolution.

## Related documents

| Document                                                                                   | What it covers                                                               |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| [Temporal and scenario context](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)       | The authoritative scenario-composition and layer-policy contract.            |
| [Bitemporal model and the HLC](./bitemporal-and-hlc.md)                                    | The per-layer resolution chain layer policy combines.                        |
| [Chrona scenario composition](../chrona/scenario-composition.md)                           | The product-level overlay / rebase / compare / promote / discard operations. |
| [Chrona layer policy](../chrona/layer-policy.md)                                           | How a viewpoint selects a layer policy.                                      |
| [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md) | Layer-as-policy and the viewpoint frame.                                     |
