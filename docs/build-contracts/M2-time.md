# M2 build contract — time

The build contract for the **Time** milestone: every read of the twin is qualified by a viewpoint, and `state-at` and
`diff` resolve correctly across valid time, asserted time, layers, and scenarios for the seed dataset. M2 is the third
milestone of the [golden journey](./golden-journey.md) (steps 4–6) and the point at which the twin stops being a flat
graph and becomes a time-first, scenario-aware one. It builds on M1's authored, validated facts; it is the precondition
for M3's artefacts, which execute at a named viewpoint. This contract takes the
[temporal and scenario contract](../04-contracts/temporal-and-scenario/README.md) and the HLC model as fixed inputs and
pins the resolved outputs an implementation is checked against, as a suite of input-operations-plus-viewpoint vectors
with their exact resolved values.

---

## Outcome

When M2 is complete, on facts authored against the seed metamodel:

- **Every read carries a viewpoint.** The `Viewpoint` — as-of valid time (instant or interval), as-of asserted time,
  layer (or layer policy), optional scenario, optional scope — is the single query frame; there is no separate
  `effective` wrapper ([viewpoint-shape](../04-contracts/temporal-and-scenario/viewpoint-shape.md),
  [ADR-0009](../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)).
- **`state-at` resolves a single winner per slot, deterministically.** Competing facts within a layer are ranked by the
  precedence chain — valid-time containment, interval specificity, latest asserted time (HLC), op-id tie-break — and the
  chain is total, so every candidate set reaches one leaf or an honest absence
  ([resolution-rules](../04-contracts/temporal-and-scenario/resolution-rules.md)).
- **Layers combine by policy, not fixed precedence.** A single layer resolves alone; `actual_over_plan` blends;
  `side_by_side` keeps layers distinct for variance
  ([layer-and-policy](../04-contracts/temporal-and-scenario/layer-and-policy.md)).
- **Scenarios overlay the base case additively.** A scenario snapshot is `canonical baseline ∪ scenario overlay`,
  composed deterministically and keyed on the full viewpoint
  ([scenario-overlays](../04-contracts/temporal-and-scenario/scenario-overlays.md)).
- **`diff` compares two viewpoints and derives the delta kind.** The kind (valid-time, belief, layer/variance, scenario,
  mixed) is read off which coordinates differ; a delta that exists only because the layer policy differs is reported as
  policy-driven, not data-driven ([diff](../04-contracts/temporal-and-scenario/diff.md),
  [ADR-0008](../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)).
- **A superseded fact is never erased.** An outranked or tombstoned fact stays inspectable via
  `mneme_store_explain_resolution` and becomes effective again under a belief-pinned or differently-scoped viewpoint
  ([conflicts-during-resolution](../04-contracts/temporal-and-scenario/conflicts-during-resolution.md)).

---

## In scope

- The within-layer resolution precedence chain and its decision tree, including open / half-open interval handling,
  Allen containment and specificity, the latest-asserted bound, and the op-id tie-break
  ([resolution-rules](../04-contracts/temporal-and-scenario/resolution-rules.md)).
- The asserted-time axis as an HLC packed into a portable `i64`, total-ordered and byte-comparable; the latest-belief
  default and the pinned-belief replay mode ([hlc-encoding](../04-contracts/temporal-and-scenario/hlc-encoding.md),
  [bitemporal-and-hlc](../05-modules/mneme/bitemporal-and-hlc.md)).
- Cross-layer combination by layer policy: single-layer, `actual_over_plan`, `side_by_side`
  ([layer-and-policy](../04-contracts/temporal-and-scenario/layer-and-policy.md)).
- Scenario overlay composition and the base-case-vs-overlay read
  ([scenario-overlays](../04-contracts/temporal-and-scenario/scenario-overlays.md)); scenario tombstones.
- Single- vs multi-valued slots; link / unlink of relationships; entity delete (tombstone) and superseded-but-visible
  facts.
- `diff` over two viewpoints, the derived delta kind, and the data-driven vs policy-driven distinction
  ([diff](../04-contracts/temporal-and-scenario/diff.md)).
- Viewpoint field validation and its error codes ([error-codes](../04-contracts/temporal-and-scenario/error-codes.md)).
- A **language-neutral resolution algorithm** added to
  [resolution-rules](../04-contracts/temporal-and-scenario/resolution-rules.md) that the vectors exercise.

## Out of scope

- **Scenario rebase / promote / discard write paths** — `rebase` records `CONFLICT_RECORDED`
  ([scenario-overlays](../04-contracts/temporal-and-scenario/scenario-overlays.md)) and `promote` writes canonical
  facts, but exercising those write workflows end to end is later work. M2 covers the **read-time** conflict
  (tie-break), not the **write-time** rebase conflict.
- **Artefact execution** — resolving a catalogue or view at a viewpoint is M3; M2 resolves individual slots and diffs.
- **Analytics** — centrality and impact are M3 (Metis).
- **CRDT convergence under multi-user sync** — `OrSetUpdate` / `CounterUpdate` merge is M6. M2 is single-writer.
- **The exact HLC skew-tolerance bound** — bounded and surfaced as `clock_invalid` beyond tolerance, but the numeric
  bound is design-intent ([ADR-0022](../06-adrs/ADR-0022-hlc-clock-model.md)). The vectors use explicit HLC values and
  never depend on a skew threshold.
- **The full Allen-relation algebra and interval-valued range reads** — M2 implements only the interval relations the
  vector suite requires (containment + `during`/specificity), not the 13-relation algebra, broad interval-query APIs, or
  range-diff. These are additive later, gated on a range-read vector (see the scope note below).

**M2 interval-semantics scope (prose ÷ vector reconciliation).** M2's executable scope is point `state-at` and diff over
point-resolved Viewpoints. The point resolver returns the winning value **and its `effective_interval`**. The vector
suite requires half-open containment and interval-specificity handling — including the case where one candidate interval
is `during` another — but **not** the full Allen relation algebra or interval-valued range reads. Range reads are
**additive later**: composed from point-resolution spans at winner-change boundaries, without changing the core
point-resolver contract. Building them now (because the prose says "point and range reads") would repeat the speculation
pattern — the right sequence is: write a range-read vector → define expected spans and boundary behaviour → implement to
it → then widen M2 scope. Until then M2 stays vector-driven.

---

## Authoritative sources

| Tier     | Source                                                                                              | What it fixes                                                             |
| -------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| ADR      | [ADR-0009](../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)             | Bitemporal valid-interval, layer-as-policy, viewpoint as the query frame. |
| ADR      | [ADR-0008](../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)                                     | A diff is two viewpoints in; the delta kind is derived.                   |
| ADR      | [ADR-0022](../06-adrs/ADR-0022-hlc-clock-model.md)                                                  | The HLC clock model: packing, monotonicity, skew, overflow.               |
| Contract | [resolution-rules](../04-contracts/temporal-and-scenario/resolution-rules.md)                       | The within-layer precedence chain and decision tree.                      |
| Contract | [conflicts-during-resolution](../04-contracts/temporal-and-scenario/conflicts-during-resolution.md) | The read-time conflict case and superseded-fact visibility.               |
| Contract | [layer-and-policy](../04-contracts/temporal-and-scenario/layer-and-policy.md)                       | The cross-layer policy that composes over the chain.                      |
| Contract | [scenario-overlays](../04-contracts/temporal-and-scenario/scenario-overlays.md)                     | The additive overlay composition.                                         |
| Contract | [hlc-encoding](../04-contracts/temporal-and-scenario/hlc-encoding.md)                               | The asserted-time `i64` packing.                                          |
| Contract | [viewpoint-shape](../04-contracts/temporal-and-scenario/viewpoint-shape.md)                         | The viewpoint fields and rules.                                           |
| Contract | [diff](../04-contracts/temporal-and-scenario/diff.md)                                               | Derived delta kinds; policy-driven vs data-driven.                        |
| Module   | [bitemporal-and-hlc](../05-modules/mneme/bitemporal-and-hlc.md)                                     | The storage-layer companion to the chain.                                 |
| Module   | [op-fact-schema-model](../05-modules/mneme/op-fact-schema-model.md)                                 | The op surface a fact derives from.                                       |
| Fixture  | [`baseline.yaml`](../data/base/baseline.yaml)                                                       | The seed dataset the worked values are drawn from.                        |

---

## Contracts and fixtures this milestone produces

| Path                                                                                                            | What it pins                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`docs/data/fixtures/temporal/README.md`](../data/fixtures/temporal/README.md)                                  | The vector index, the resolution precedence chain, and the input/viewpoint/output schema each vector uses.                                                   |
| [`docs/data/fixtures/temporal/*.json`](../data/fixtures/temporal/)                                              | The resolution vectors — input operations + a viewpoint → the exact resolved output — one per corner case of the decision tree and the conflict enumeration. |
| The language-neutral algorithm in [resolution-rules](../04-contracts/temporal-and-scenario/resolution-rules.md) | The numbered, no-language pseudocode the vectors exercise; deepens the existing decision-tree section.                                                       |

Each vector is self-contained: its input operations, the viewpoint read against them, and the resolved output (the
winning value, its effective interval, its content classification, its result-state, and — where relevant — the deciding
rule and the superseded competitors). Two implementations cannot diverge on resolution without one of them failing a
vector.

---

## Module ownership

| Concern                                                                                                                                          | Owner                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Storing operations; deriving facts; the resolution chain at the storage layer                                                                    | **Mneme** ([bitemporal-and-hlc](../05-modules/mneme/bitemporal-and-hlc.md))                                   |
| Minting and advancing the HLC (`Hlc::now()` in `mneme_core::time`)                                                                               | **Mneme**                                                                                                     |
| Viewpoint resolution, layer policy, scenario composition, and diff at the product level                                                          | **Chrona** ([resolution-rules](../04-contracts/temporal-and-scenario/resolution-rules.md), Chrona references) |
| The viewpoint and diff request/response shapes (Rust owns the wire shape)                                                                        | **Mneme/Chrona** via generated schema                                                                         |
| Carrying `chrona_temporal_state_at`, `chrona_temporal_diff`, `mneme_store_read_entity_at_time`, `mneme_store_explain_resolution` to the renderer | **Host** (typed IPC only)                                                                                     |

---

## Implementation sequence

1. **Encode the HLC** as the packed `i64` and confirm byte-comparable total order and monotonic `now()`
   ([hlc-encoding](../04-contracts/temporal-and-scenario/hlc-encoding.md)).
2. **Implement the within-layer chain** as the language-neutral algorithm in
   [resolution-rules](../04-contracts/temporal-and-scenario/resolution-rules.md): containment filter (half-open
   intervals, point and range reads), specificity (Allen `during`), latest-asserted bound, op-id tie-break, honest
   absence.
3. **Implement layer policy** over the chain: single-layer, `actual_over_plan`, `side_by_side`.
4. **Implement scenario overlay** composition: materialise baseline, merge scenario-scoped facts by the same chain,
   pass-through unchanged slots, scenario tombstone.
5. **Implement `state-at`** at a viewpoint and confirm each `*.json` vector's resolved output.
6. **Implement `diff`** over two viewpoints; derive the delta kind; mark policy-driven vs data-driven slots.
7. **Implement `explain_resolution`** so every vector's deciding rule and superseded competitors are inspectable.

---

## Golden-journey segment

M2 is steps 4–6 of the [golden journey](./golden-journey.md):

- **Step 4 — Record plan and actual claims at different valid times.** `mneme_store_set_property_interval` (or a Change
  Event): a slot value on the `plan` layer over one valid-time interval and on the `actual` layer over another.
  **Oracle:** the appended operations match the valid/invalid op fixtures (M0/Increment 2) and feed the M2 vectors.
- **Step 5 — Resolve two viewpoints.** `chrona_temporal_state_at` (or `mneme_store_read_entity_at_time`) at two
  viewpoints differing by as-of valid time, layer policy, or scenario. **Oracle:** each resolved value equals the
  corresponding temporal resolution vector; a superseded fact is absent from the effective value but inspectable via
  `mneme_store_explain_resolution`.
- **Step 6 — Produce a diff.** `chrona_temporal_diff` over the two viewpoints. **Oracle:** the delta set equals the
  expected diff; a delta that exists only because layer policy differs is reported policy-driven.

What the journey proves at M2: every read is time-and-scenario qualified, and resolution and diff are correct
([golden-journey](./golden-journey.md), "What the journey proves").

---

## Exit tests

| Assertion                                                                                                                                                        | Oracle                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| A point read selects the only fact whose half-open interval contains the instant; a read where no interval contains it returns an honest absence (not an error). | `containment-point.json`, `absence-no-candidate.json`         |
| Where two intervals contain the instant, the narrower (Allen `during`) wins over the open-ended one.                                                             | `specificity-narrower-wins.json`                              |
| A point at a half-open interval's exclusive `valid_to` is **not** contained by it; the abutting next interval wins.                                              | `half-open-boundary.json`                                     |
| With equal intervals, the larger HLC (latest asserted) wins; pinning `as_of_asserted_at` below it replays the earlier belief.                                    | `latest-hlc-wins.json`, `pinned-belief-replay.json`           |
| With equal intervals and identical HLCs, the lexicographically larger `op_id` wins and the slot is flagged conflict-resolved / Awaiting review.                  | `op-id-tiebreak-conflict.json`                                |
| A tombstone with a later HLC suppresses the earlier fact within its layer; the suppressed fact is still inspectable.                                             | `tombstone-suppresses.json`                                   |
| `actual_over_plan` blends actual over plan where actual exists; `side_by_side` keeps both.                                                                       | `layer-actual-over-plan.json`, `layer-side-by-side.json`      |
| A plan-only slot resolves to the plan fact under a single-layer plan read; an actual-only slot resolves to absent under a plan read.                             | `layer-plan-only.json`, `layer-actual-only.json`              |
| A scenario overlay replaces the baseline fact for the overlaid slot; an un-overlaid slot passes through unchanged.                                               | `scenario-overlay-replaces.json`, `scenario-passthrough.json` |
| A scenario tombstone hides a baseline fact only within the scenario; the baseline read still sees it.                                                            | `scenario-tombstone.json`                                     |
| A multi-valued slot returns the full resolved set; a single-valued slot returns one winner.                                                                      | `multi-valued-slot.json`, plus the single-valued vectors      |
| Link makes an edge visible at the viewpoint; unlink (a later closed interval / tombstone) makes it absent after the unlink instant.                              | `link-visible.json`, `unlink-hidden.json`                     |
| An entity delete (tombstone) makes the entity and its slots absent after the delete; a belief-pinned read before the delete still resolves it.                   | `entity-delete.json`                                          |
| A superseded fact is absent from the effective value yet returned by an explained read.                                                                          | `superseded-still-visible.json`                               |
| A diff whose two sides differ only in layer policy, over identical facts, is reported policy-driven, not data-driven.                                            | `diff-policy-driven.json`                                     |
| A diff whose two sides differ in the winning fact is reported data-driven, naming both winners.                                                                  | `diff-data-driven.json`                                       |
| A diff across two beliefs (same valid time, two asserted times) derives a belief delta.                                                                          | `diff-belief.json`                                            |

---

## Open questions

- **HLC skew-tolerance bound.** Bounded and surfaced beyond tolerance as `clock_invalid`, but the numeric value is
  design-intent ([ADR-0022](../06-adrs/ADR-0022-hlc-clock-model.md)). The vectors use explicit HLCs and do not exercise
  the skew path.
- **Multi-valued slot cardinality source.** The seed metamodel declares no per-attribute cardinality, and
  `op-fact-schema-model` carries `cardinality` on `FieldDef`
  ([op-fact-schema-model](../05-modules/mneme/op-fact-schema-model.md)) without the seed populating it. The multi-valued
  vector is therefore marked **design-intent**: it shows how a multi-valued slot resolves, but no seed slot is declared
  multi-valued, so the input declares the slot multi-valued explicitly.
- **Layer-policy token set.** `actual_over_plan` and `side_by_side` are the enumerated tokens, declared provisional
  ([ADR-0009](../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)). New tokens are additive;
  the vectors cover only the enumerated set.
- **Range reads (`as_of_valid_time.interval`).** The contract defines candidacy and specificity over the full Allen
  relation set for a range read ([resolution-rules](../04-contracts/temporal-and-scenario/resolution-rules.md)). The
  vector suite focuses on point reads (the common case); range-read specificity over `overlaps`/`equals` is marked a
  follow-up vector set, design-intent.
- **`source.priority` dotted slot name.** `PlanEvent.source.priority` carries a dot in its slot name; whether the dot is
  structural (a nested object) or a flat key with a dotted name is not settled by `core-v1.json`. The vectors treat it
  as a flat slot key, consistent with the metamodel fixture, and flag it.

---

## Related documents

| Document                                                                  | What it covers                                                        |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [README.md](./README.md)                                                  | Contract precedence and how an agent uses this folder.                |
| [golden-journey.md](./golden-journey.md)                                  | The end-to-end path; M2 is steps 4–6.                                 |
| [M1-meaning.md](./M1-meaning.md)                                          | The previous milestone — the facts M2 resolves over.                  |
| [temporal-and-scenario/](../04-contracts/temporal-and-scenario/README.md) | The full temporal and scenario contract this contract takes as fixed. |
| [data/fixtures/temporal/README.md](../data/fixtures/temporal/README.md)   | The vector index and the resolution precedence chain.                 |
| [ROADMAP.md](../00-index/ROADMAP.md)                                      | The M2 exit criteria this contract operationalises.                   |
