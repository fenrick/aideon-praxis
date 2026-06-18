# Temporal resolution vector suite

The M2 oracle: a set of self-contained resolution vectors, each pairing **input operations** with a **viewpoint** and the **exact resolved output** a conformant resolver must produce. They pin temporal and scenario resolution so two implementations cannot diverge on which fact wins, what its effective interval is, how it is classified, or how a diff is derived. They are tier-4 tested fixtures under the [contract precedence](../../../build-contracts/README.md#contract-precedence); the authority on _meaning_ is the [temporal and scenario contract](../../../04-contracts/temporal-and-scenario/README.md), and the language-neutral algorithm these vectors exercise lives in [resolution-rules.md](../../../04-contracts/temporal-and-scenario/resolution-rules.md).

---

## The resolution precedence chain

Every `state-at` vector is resolved by applying this chain **within a single layer** and stopping at the first rule that selects a unique winner ([resolution-rules](../../../04-contracts/temporal-and-scenario/resolution-rules.md), [bitemporal-and-hlc](../../../05-modules/mneme/bitemporal-and-hlc.md)). Cross-layer combination and scenario overlay wrap this within-layer chain.

1. **Valid-time containment** — only facts whose half-open interval `[valid_from, valid_to)` contains the requested `as_of_valid_time` are candidates. A point at the exclusive `valid_to` is **not** contained.
2. **Interval specificity** — a narrower interval (Allen `during`) beats a wider one; a null `valid_to` is the widest.
3. **Latest asserted time** — among ties, the largest HLC wins, bounded by the viewpoint's `as_of_asserted_at` (the bound filters the candidate set **before** this rule, not after).
4. **Op-id tie-break** — if HLCs are identical, the lexicographically larger `op_id` wins. A slot decided here is a genuine **conflict**: flagged conflict-resolved, result-state **Awaiting review**.

Absence is not an error: if no candidate survives containment, the slot resolves to an honest absence.

The chain then composes outward:

- **Layer policy** ([layer-and-policy](../../../04-contracts/temporal-and-scenario/layer-and-policy.md)) — a single layer resolves alone; `actual_over_plan` resolves each layer by the chain, then overlays actual over plan where it exists; `side_by_side` resolves each and returns both.
- **Scenario overlay** ([scenario-overlays](../../../04-contracts/temporal-and-scenario/scenario-overlays.md)) — materialise the baseline snapshot, then merge scenario-scoped facts (including scenario tombstones) on top by the same chain; un-overlaid slots pass through. Result = `canonical baseline ∪ scenario overlay`.
- **Diff** ([diff](../../../04-contracts/temporal-and-scenario/diff.md), [ADR-0008](../../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)) — resolve both viewpoints, then derive the delta kind from which coordinates differ, marking each changed slot **data-driven** (a winning fact differs) or **policy-driven** (identical per-layer winners, combined differently).

---

## The vector schema

Each `*.json` vector is one object. `state-at` vectors carry:

| Field           | Meaning                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `case`          | The vector id (matches the filename stem).                                                                                           |
| `description`   | What the vector demonstrates.                                                                                                        |
| `corner_case`   | The decision-tree or conflict corner it covers.                                                                                      |
| `design_intent` | `true` when the vector exercises behaviour `core-v1.json`/`baseline.yaml` does not pin (e.g. a multi-valued slot). Absent otherwise. |
| `input`         | The entity (or edge), the slot and its `kind`/`cardinality`, and an `operations` array.                                              |
| `viewpoint`     | The full read viewpoint (`as_of_valid_time`, `as_of_asserted_at`, `layer`, `scenario`; optional `explain`).                          |
| `expected`      | The resolved output (below).                                                                                                         |

Each operation carries `op_id`, `op_type` (a value from the Mneme op surface — `SetProperty`, `ClearProperty`, `CreateEdge`, `SetEdgeExistenceInterval`, `CreateNode`, `TombstoneEntity`, `OrSetUpdate`), `value` (where applicable), `layer`, `scenario` (`null` for baseline), `valid_from`, `valid_to` (`null` = open-ended), and `asserted_hlc` (the packed-`i64` HLC).

`expected` carries `present`, the resolved `value` (or `values` for multi-valued; or `by_layer` for `side_by_side`), `effective_interval`, `content_classification` (Asserted / Inferred / …), `result_state` (Fresh / Awaiting review / …), `deciding_rule`, `winning_op_id`, and `superseded` — the losing candidates with `eliminated_at_rule` and a `reason`, since a superseded fact is never dropped ([conflicts-during-resolution](../../../04-contracts/temporal-and-scenario/conflicts-during-resolution.md)).

`diff` vectors carry `diff: true`, a shared `input`, a `left` and `right` viewpoint, and an `expected` with `delta_kind`, `coordinates_that_differ`, and `changed_slots` (each marked `data-driven` or `policy-driven`).

### HLC values

`asserted_hlc` values are real packed HLCs: physical microseconds since the Unix epoch in the upper 51 bits, a 12-bit counter in the low bits (`hlc = micros << 12 | counter`) ([hlc-encoding](../../../04-contracts/temporal-and-scenario/hlc-encoding.md)). The recurring values map to distinct 2026 assertion instants; a same-microsecond pair (used for the tie-break and multi-valued vectors) differs only in the low counter bits. They are byte-comparable, so the resolver's latest-asserted rule is a single integer comparison.

### Identifiers

Entity and edge ids are real seed identifiers from [`baseline.yaml`](../../base/baseline.yaml) (e.g. `n:application:automation-orchestrator`, `e:insight-realises-insight`); slots are real metamodel slots from [`core-v1.json`](../../meta/core-v1.json) (e.g. `disposition`, `lifecycle`, `tier`). The exception is `multi-valued-slot.json`, which declares a `tags` slot that the seed does not define — marked `design_intent: true` because the seed declares no multi-valued cardinality.

---

## The vectors

23 vectors, grouped by the corner they pin.

### Within-layer chain (rules 1–4)

| Vector                                                               | Corner case                     | Resolves to                                    |
| -------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------- |
| [`containment-point.json`](./containment-point.json)                 | interval containment            | one fact contains the instant (rule 1)         |
| [`absence-no-candidate.json`](./absence-no-candidate.json)           | open/half-open (no containment) | honest absence                                 |
| [`specificity-narrower-wins.json`](./specificity-narrower-wins.json) | interval specificity            | narrower interval wins (rule 2)                |
| [`half-open-boundary.json`](./half-open-boundary.json)               | open/half-open boundary         | abutting interval wins at exclusive `valid_to` |
| [`latest-hlc-wins.json`](./latest-hlc-wins.json)                     | latest-HLC                      | larger HLC wins (rule 3)                       |
| [`pinned-belief-replay.json`](./pinned-belief-replay.json)           | latest-HLC (pinned belief)      | earlier belief replayed                        |
| [`op-id-tiebreak-conflict.json`](./op-id-tiebreak-conflict.json)     | op-id tie-break (conflict)      | larger `op_id` wins; Awaiting review (rule 4)  |
| [`tombstone-suppresses.json`](./tombstone-suppresses.json)           | tombstone (slot)                | later tombstone suppresses value               |

### Layer policy

| Vector                                                         | Corner case             | Resolves to             |
| -------------------------------------------------------------- | ----------------------- | ----------------------- |
| [`layer-actual-over-plan.json`](./layer-actual-over-plan.json) | actual-over-plan policy | actual overlays plan    |
| [`layer-side-by-side.json`](./layer-side-by-side.json)         | side-by-side policy     | both layers returned    |
| [`layer-plan-only.json`](./layer-plan-only.json)               | plan-only               | plan fact resolved      |
| [`layer-actual-only.json`](./layer-actual-only.json)           | actual-only (absence)   | absent (no actual fact) |

### Scenario overlay

| Vector                                                               | Corner case                   | Resolves to                             |
| -------------------------------------------------------------------- | ----------------------------- | --------------------------------------- |
| [`scenario-overlay-replaces.json`](./scenario-overlay-replaces.json) | base-case vs scenario overlay | overlay replaces baseline               |
| [`scenario-passthrough.json`](./scenario-passthrough.json)           | overlay pass-through          | baseline unchanged                      |
| [`scenario-tombstone.json`](./scenario-tombstone.json)               | scenario tombstone            | hidden in scenario, visible in baseline |

### Cardinality, links, lifecycle

| Vector                                                             | Corner case                                  | Resolves to                             |
| ------------------------------------------------------------------ | -------------------------------------------- | --------------------------------------- |
| [`multi-valued-slot.json`](./multi-valued-slot.json)               | single- vs multi-valued slot (design-intent) | full member set                         |
| [`link-visible.json`](./link-visible.json)                         | link                                         | edge visible at viewpoint               |
| [`unlink-hidden.json`](./unlink-hidden.json)                       | unlink                                       | edge absent after closed interval       |
| [`entity-delete.json`](./entity-delete.json)                       | entity delete                                | entity and slots absent after tombstone |
| [`superseded-still-visible.json`](./superseded-still-visible.json) | superseded fact still visible                | winner + losing candidate via explain   |

### Diff (two viewpoints)

| Vector                                                 | Corner case                           | Derived delta               |
| ------------------------------------------------------ | ------------------------------------- | --------------------------- |
| [`diff-policy-driven.json`](./diff-policy-driven.json) | policy-driven delta (no fact changed) | layer delta, policy-driven  |
| [`diff-data-driven.json`](./diff-data-driven.json)     | data-driven delta (scenario)          | scenario delta, data-driven |
| [`diff-belief.json`](./diff-belief.json)               | belief delta (asserted axis)          | asserted delta              |

That is 23 distinct vector files: 8 within-layer, 4 layer-policy, 3 scenario, 5 cardinality/links/lifecycle, and 3 diff.

---

## How to use these

1. Load a vector's `input.operations` into a fresh store (or replay them into the resolver directly).
2. Resolve the `viewpoint` (or both `left`/`right` for a diff vector).
3. Assert the result equals `expected`, including `effective_interval`, `content_classification`, `result_state`, `deciding_rule`, and the `superseded` set where present.
4. For `explain: true` vectors, assert the explanation matches `expected.explanation` ([explainability](../../../04-contracts/temporal-and-scenario/explainability.md)).

A resolver is M2-conformant when every vector passes and re-running any vector yields an identical result (resolution is a pure function of the viewpoint, so it is deterministic and cacheable).

---

## Design-intent and honest notes

- `multi-valued-slot.json` is **design-intent**: the seed declares no multi-valued slot. It shows the resolution shape (union of contained, non-superseded members) against a `tags` slot that is not in `core-v1.json`.
- All other vectors use real seed identifiers and slots, with explicit operations (the seed dataset does not itself carry competing facts, layers, scenarios, or tombstones — those are authored per vector to exercise resolution).
- The vectors are **point reads** on the valid-time axis. Range reads (`as_of_valid_time.interval`) and their full-Allen specificity are a follow-up vector set, flagged design-intent in [M2-time.md](../../../build-contracts/M2-time.md).
- HLC skew and counter-overflow paths are not exercised: the vectors use explicit, well-ordered HLCs and never depend on the skew tolerance bound (design-intent, [ADR-0022](../../../06-adrs/ADR-0022-hlc-clock-model.md)).

---

## Related documents

| Document                                                                                                  | What it covers                                                                  |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [M2-time.md](../../../build-contracts/M2-time.md)                                                         | The M2 build contract these vectors are the oracle for.                         |
| [resolution-rules](../../../04-contracts/temporal-and-scenario/resolution-rules.md)                       | The precedence chain and the language-neutral algorithm these vectors exercise. |
| [conflicts-during-resolution](../../../04-contracts/temporal-and-scenario/conflicts-during-resolution.md) | The conflict case and superseded-fact visibility.                               |
| [layer-and-policy](../../../04-contracts/temporal-and-scenario/layer-and-policy.md)                       | The cross-layer policy.                                                         |
| [scenario-overlays](../../../04-contracts/temporal-and-scenario/scenario-overlays.md)                     | The additive overlay composition.                                               |
| [diff](../../../04-contracts/temporal-and-scenario/diff.md)                                               | Derived delta kinds; policy- vs data-driven.                                    |
| [hlc-encoding](../../../04-contracts/temporal-and-scenario/hlc-encoding.md)                               | The `asserted_hlc` packing.                                                     |
| [`baseline.yaml`](../../base/baseline.yaml)                                                               | The seed dataset the identifiers are drawn from.                                |
