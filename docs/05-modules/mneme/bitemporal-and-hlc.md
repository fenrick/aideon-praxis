# Bitemporal model and the HLC

Why Mneme carries two independent time axes on every fact, how the asserted-time axis is encoded as a Hybrid Logical Clock packed into a portable `i64`, and the resolution precedence chain that picks one fact among competitors. This file is the storage-layer companion to the authoritative [temporal and scenario contract](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) and [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md); where this file and the contract could drift, the contract governs.

---

## Two axes, fully decoupled

A bitemporal store separates _when a fact is true in the world_ from _when the system was told_ — these are independent because a fact can be recorded long before or long after it becomes true _(Snodgrass, Developing Time-Oriented Database Applications in SQL, 1999; SQL:2011 application-time and system-versioned tables)_.

| Axis              | What it answers                                            | Encoding                                                                                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Valid time**    | Over what world-time interval does the fact claim to hold? | A half-open interval `[valid_from, valid_to)`; `valid_from` required and inclusive, `valid_to` optional and exclusive. A null `valid_to` is open-ended. `ValidTime(i64)` — microseconds since the Unix epoch, no counter. |
| **Asserted time** | At what instant did this claim enter canonical history?    | A single Hybrid Logical Clock instant, `Hlc(i64)`. The audit axis and the resolver's tie-break.                                                                                                                           |

The decoupling is what lets the twin answer two distinct questions: _what is true now?_ (sweep valid time, latest belief) and _what did we believe last quarter?_ (pin asserted time, hold valid time). A current-state store can answer neither honestly.

### Valid-time bounds

`valid_from` is mandatory: a fact with no world-time start point is meaningless. `valid_to` is optional; a null upper bound is the _widest_ possible interval and the _weakest_ under resolution — a more specific (narrower) interval beats it (see the precedence chain below). An author who means "true from January, no known end" sets `valid_from` and leaves `valid_to` null; an author who means "true for FY26 only" sets both. The half-open convention `[from, to)` makes adjacent intervals abut without overlap or gap: `[2026-01-01, 2027-01-01)` and `[2027-01-01, …)` meet cleanly at the year boundary.

---

## Asserted time is a Hybrid Logical Clock

Asserted time must be **totally ordered** (the resolver breaks ties by latest assertion), **monotonic** (a later assertion never sorts before an earlier one), and **robust to clock skew** (the wall clock can jump backwards under NTP correction). A plain wall clock fails on skew; a pure logical clock loses the wall-clock reading that audit needs. The answer is a Hybrid Logical Clock _(Kulkarni, Demirbas, et al., Logical Physical Clocks, 2014)_, fixed by [ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md). It relates to — but is not — a Lamport clock _(Lamport, Time, Clocks, and the Ordering of Events, 1978)_, which gives causal order without a usable physical reading.

### The packed encoding

The HLC is packed into a portable signed `i64`:

```text
 63                    12 11          0
 ┌──────────────────────┬─────────────┐
 │  physical_micros     │   counter   │
 │  (51 bits)           │  (12 bits)  │
 └──────────────────────┴─────────────┘
```

- **Upper 51 bits** — microseconds since the Unix epoch (the `SystemTime` physical component).
- **Lower 12 bits** — a monotonic counter that increments when two events share the same physical microsecond and resets to 0 when physical time advances.
- The packed value is a plain signed `i64` whose natural order is **byte-comparable**, so total ordering needs no special comparator — the resolver's "latest asserted time" rule is a single integer comparison.

`Hlc::now()` in `mneme_core::time` produces the next HLC by advancing a stored last-HLC atomically, as the **strict successor of history or physical time, whichever is greater** — `next_hlc = max(pack(physical_now, 0), successor(last_hlc))`, `successor(x) = checked(x + 1)`; `Hlc::physical_micros()` strips the counter to recover the wall-clock reading for display. The watermark is scoped to the open **`(workspace_id, partition_id)`** — never a process-global value — so one open workspace's far-future asserted time cannot advance another's clock ([ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md)).

**The watermark is derived; rebuild restores it from canonical history.** `aideon_hlc_state.last_hlc` lives in the disposable `.aideon/runtime/`; its canonical source is `max(asserted_at)` across **all** unique valid canonical operations in the partition (actor, schema, and fact ops alike). On rebuild the writer restores it **before enabling writes** and seeds the in-memory clock from it; an empty workspace leaves it unset (the first assertion is `pack(physical_now, 0)`). A future-dated imported `asserted_at` is preserved and continued from by logical successors — never lowered to resemble wall time. The watermark is never authority over the op log: a runtime wipe correctly discards any advancement minted for an op that failed before canonical append.

### Monotonicity, skew, and counter overflow

Three edge behaviours, each fixed by [ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md) and each deterministic:

| Condition                           | Behaviour                                                                                                                                                                                    | Consequence                                                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Normal advance**                  | `Hlc::now()` returns `max(pack(physical_now, 0), successor(last_hlc))`; when physical time has advanced this is `pack(physical_now, 0)`, otherwise it is `last_hlc + 1` (counter increment). | A later call sorts strictly after every earlier one.                                                                 |
| **Backwards skew within tolerance** | The HLC holds its physical component and advances the counter.                                                                                                                               | Monotonicity preserved despite a backwards wall-clock step.                                                          |
| **Backwards skew beyond tolerance** | A clock fault: the system emits `clock_invalid` and continues on the logical counter rather than minting an out-of-order value.                                                              | Order is never violated; the fault is surfaced, not hidden.                                                          |
| **Counter overflow**                | 12 bits admit 4096 assertions in one microsecond; `successor` carrying past the counter advances the physical component by one microsecond and resets the counter.                           | Order and monotonicity preserved, at the cost of a sub-microsecond drift ahead of wall time. Degenerate in practice. |
| **Clock exhaustion**                | `successor(last_hlc)` at the maximum representable `i64` cannot advance (checked arithmetic).                                                                                                | Authoring **fails with an explicit clock-exhaustion error** rather than wrapping to a smaller value.                 |

The skew-tolerance bound itself is provisional — its exact value and how it is configured are open questions in [ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md). That it is _bounded_, and that exceeding it is a surfaced fault rather than a silent corruption, is the invariant.

---

## The resolution precedence chain

When several candidate facts compete for the same resolved slot at a requested as-of valid time **within one layer**, the resolver applies this chain in order and stops at the first rule that selects a unique winner. Cross-layer combination is governed by the viewpoint's layer policy, not this chain ([scenarios-and-layers](./scenarios-and-layers.md)). This is the authoritative ordering from the [temporal and scenario contract](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md):

| Priority | Rule                       | Detail                                                                                                                                                                                                                                        |
| -------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | **Valid-time containment** | Only facts whose `[valid_from, valid_to)` contains the requested as-of valid time are candidates. Implements the _during_ / _contains_ relations of Allen's interval algebra _(Allen, Maintaining Knowledge about Temporal Intervals, 1983)_. |
| 2        | **Interval specificity**   | A narrower valid-time interval beats a wider one; a null `valid_to` is the widest. A fact valid for one day is preferred over one valid for a year.                                                                                           |
| 3        | **Latest asserted time**   | Among ties, the fact with the largest HLC wins (most recently asserted), bounded by the viewpoint's `as_of_asserted_at`. A single `i64` comparison.                                                                                           |
| 4        | **Op-id tie-break**        | If HLCs are identical, the lexicographically larger `op_id` wins. Degenerate in practice but must be deterministic.                                                                                                                           |

**Tombstones** enter the same pipeline: a tombstone within a layer, with a later asserted time, suppresses an earlier fact in that layer by the same rules — supersession, not erasure. **Absence is not an error**: if no candidate survives containment, the resolver returns an empty result for that slot.

### A bound worth naming

Rule 3 is bounded by the viewpoint's `as_of_asserted_at`. On a read that omits it, the resolver uses the latest belief; on a read that pins it, only facts asserted at or before that HLC are candidates — this is what replays a past belief and makes belief diffs possible ([ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)). The cost is that every cache key must incorporate the asserted coordinate, because the same valid-time read returns different answers at different beliefs ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)).

---

## Worked example — a late correction replayed two ways

The seed `Application` `Insight Hub` (`n:application:insight-hub`) has `disposition = Invest` in the baseline. Suppose two facts exist in the `actual` layer for its `disposition` slot:

- Fact A: `disposition = "Invest" [2025-01-01, null)`, asserted at HLC `H1`.
- Fact B: `disposition = "Tolerate" [2025-01-01, null)`, asserted at HLC `H2`, where `H2 > H1` — a correction recorded later but claiming the same world-time start.

Both have the same valid-time interval, so rules 1 and 2 do not separate them.

- A read at _{as-of valid time 2026-06-11, latest belief, layer actual}_ resolves to **Tolerate** (rule 3 — `H2` is the larger HLC). The earlier `Invest` fact is not deleted; it is outranked.
- A read at _{as-of valid time 2026-06-11, as-of asserted time `H1`, layer actual}_ resolves to **Invest** — pinning belief to `H1` excludes fact B from the candidate set, replaying what the system believed before the correction landed.

The same valid-time question yields two answers because the _belief_ coordinate differs. A diff between the two viewpoints derives an **asserted / belief delta** (`Invest → Tolerate`) without the caller naming a delta kind ([ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)).

---

## References & standards

_Normative:_

- Snodgrass — _Developing Time-Oriented Database Applications in SQL_, 1999. The bitemporal model: valid time vs transaction (asserted) time.
- Allen — _Maintaining Knowledge about Temporal Intervals_, 1983. The interval relations behind containment and specificity.
- Kulkarni, Demirbas, et al. — _Logical Physical Clocks (HLC)_, 2014. The asserted-time clock: skew tolerance and monotonicity.

_Informative:_

- Lamport — _Time, Clocks, and the Ordering of Events_, 1978. The causal-order foundation underneath the HLC.
- SQL:2011 application-time period and system-versioned tables. Standard vocabulary for period tables.

## Related documents

| Document                                                                                   | What it covers                                                       |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| [Temporal and scenario context](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)       | The authoritative resolution and HLC-encoding contract.              |
| [ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md)                                      | The HLC clock-model decision and its open bounds.                    |
| [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md) | The bitemporal model: valid-interval, layer-as-policy, viewpoint.    |
| [Scenarios and layers](./scenarios-and-layers.md)                                          | How layer policy combines the per-layer results this chain produces. |
| [Chrona viewpoint resolution](../chrona/viewpoint-resolution.md)                           | The product-level interpretation of this chain.                      |
