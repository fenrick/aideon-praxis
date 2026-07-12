# Scenario composition

The five scenario operations Chrona shapes on top of Mneme's overlay primitive — overlay, rebase, compare, promote,
discard — and how a scenario merge is represented. A [scenario](../../../CONTEXT.md) is an additive overlay on the base
case, orthogonal to layer. The storage mechanics are in [Mneme scenarios-and-layers](../mneme/scenarios-and-layers.md);
the authoritative contract is [TEMPORAL-AND-SCENARIO-CONTEXT](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md).

---

## Composition on read

The resolver composes a scenario view deterministically
([TEMPORAL-AND-SCENARIO-CONTEXT](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)):

1. Materialise the baseline snapshot for the requested viewpoint (as-of valid time, as-of asserted time, layer policy).
2. If a `scenario_id` is present, merge scenario facts on top: any slot with a scenario fact replaces the baseline fact,
   under the same resolution rules and layer policy.
3. Slots with no scenario fact pass through from the baseline.
4. The result is `canonical baseline ∪ scenario overlay` — a pure function of the viewpoint, therefore cacheable and
   diffable.

A scenario is a one-level additive overlay, not a deep version tree — the trade-off, and why merge is by promotion
rather than automatic three-way reconciliation, is argued in
[Mneme scenarios-and-layers](../mneme/scenarios-and-layers.md).

---

## The five operations

| Operation            | What it does                                                              | Representation                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overlay** (create) | Initialise an overlay from a base timeline and as-of valid time.          | A `CreateScenario` operation in Mneme; subsequent writes carry the `scenario_id`.                                                                             |
| **Rebase**           | Re-align the overlay against updated canonical facts.                     | Conflict slots — where the baseline moved under the overlay — are reported explicitly, never resolved silently.                                               |
| **Compare**          | Diff the scenario snapshot against baseline, or against another scenario. | Two viewpoints in, a derived **scenario delta** (or mixed delta) out ([diff](./diff.md), [ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)). |
| **Promote**          | Materialise approved scenario deltas as canonical fact writes.            | A controlled workflow that appends new operations asserting the promoted facts in the base case.                                                              |
| **Discard**          | Retire the overlay.                                                       | Canonical facts are not mutated; the overlay's operations remain in history but are no longer composed.                                                       |

### Scenario merge representation (an explorer gap, addressed)

There is **no automatic merge of two scenarios into a third**. Merge into canonical truth is always **promotion** — a
human-mediated selection of deltas, materialised as append-only operations in the base case
([Mneme scenarios-and-layers](../mneme/scenarios-and-layers.md)). This is deliberate: a scenario overlay is reasoned
about and then promoted or discarded, not converged with a sibling overlay. Comparing two scenarios is a `compare` (a
diff), and reconciling them is a sequence of promotions, each appending operations — never a silent three-way merge that
could lose a claim. The convergent-merge case across devices is a separate concern owned by the sync model
([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)), built on the CRDT operations Mneme provides.

**Rebase reports conflicts; it does not resolve them.** When canonical facts move after an overlay was created, a rebase
surfaces every slot where the overlay and the new baseline disagree, so a human decides. Silent resolution would be the
dishonesty the honest-state vocabulary exists to prevent
([DOCUMENTATION-STANDARD §9](../../02-standards/DOCUMENTATION-STANDARD.md)).

---

## Worked example — a consolidation scenario, composed and promoted

An architect explores consolidating `Automation Orchestrator` rather than migrating it. They create scenario
`scn_consolidation` and author a `plan`-layer intent:

1. **Overlay.** `CreateScenario(scn_consolidation)`. A `PlanEvent` effect writes
   `disposition = "Invest" [2026-07-01, null)` in the `plan` layer, scenario `scn_consolidation`.
2. **Compose.** A read at _{as-of valid time 2026-09-01, layer plan, scenario scn_consolidation}_ resolves `Invest`; the
   same read in the base case resolves nothing in the plan layer and `Migrate` in actual
   ([viewpoint-resolution](./viewpoint-resolution.md)).
3. **Compare.** A diff between _{base case, side_by_side}_ and _{scenario scn_consolidation, side_by_side}_ derives a
   **scenario delta** showing the scenario proposes `Invest` against the base case's `Migrate` actual
   ([diff](./diff.md)).
4. **Rebase.** Meanwhile the actual layer is corrected to `Eliminate`. A rebase of `scn_consolidation` reports the
   `disposition` slot as a conflict — the baseline moved under the overlay — and leaves the resolution to the architect.
5. **Promote or discard.** If approved, promotion appends an operation asserting `Invest` (in the agreed layer) in the
   base case; the base case was untouched until this point. If rejected, discard retires the overlay and canonical facts
   are unchanged.

---

## Bounds

- Composition is `O(b + s)` — baseline facts in scope plus overlay facts, one pass
  ([Mneme scenarios-and-layers](../mneme/scenarios-and-layers.md)).
- A scenario read's cache key must carry the `scenario_id` alongside every other viewpoint coordinate; a key missing it
  would serve one scenario's answer for another ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)).
- Rebase conflict reporting is `O(slots the overlay touches)` — it compares only overlaid slots against the moved
  baseline.

---

## References & standards

_Informative:_

- Shapiro et al. — _Conflict-free Replicated Data Types_, 2011. The convergence primitive cross-device merge would build
  on ([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)).

## Related documents

| Document                                                                             | What it covers                                                    |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| [Temporal and scenario context](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The authoritative scenario-operation contract.                    |
| [Mneme scenarios and layers](../mneme/scenarios-and-layers.md)                       | The overlay storage primitive and the branching-vs-DAG trade-off. |
| [Diff](./diff.md)                                                                    | Scenario compare as a derived delta.                              |
| [ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)                        | The sync/conflict model that owns convergent merge.               |
| [Chrona README](./README.md)                                                         | The module index.                                                 |
