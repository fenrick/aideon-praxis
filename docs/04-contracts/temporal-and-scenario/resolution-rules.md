# Temporal resolution rules

How the resolver picks a single winning value among competing facts for one slot at a given as-of valid time, **within a single layer**. Cross-layer combination is governed by the viewpoint's [layer policy](./layer-and-policy.md), not by this chain.

---

## The precedence chain

When multiple candidate facts compete for the same resolved slot at a given as-of valid time within a layer, the resolver applies this chain in order and stops at the first rule that selects a unique winner.

| Priority | Rule                       | Detail                                                                                                                                                                             |
| -------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | **Valid-time containment** | Only facts whose valid-time interval `[valid_from, valid_to)` contains (or aligns with) the requested `as_of_valid_time` are candidates.                                           |
| 2        | **Interval specificity**   | A narrower valid-time interval wins over a wider one. A fact valid for one day is preferred over one valid for a year (a null `valid_to` is the widest).                           |
| 3        | **Latest asserted time**   | Among remaining ties, the fact with the largest HLC value wins (most-recently asserted), bounded by the viewpoint's `as_of_asserted_at`. See [hlc-encoding.md](./hlc-encoding.md). |
| 4        | **Op-id tie-break**        | If asserted HLCs are identical, the fact with the lexicographically larger operation identifier wins. Degenerate in practice but must be deterministic.                            |

**Tombstones and overrides** enter the same pipeline — a tombstone within a layer with a later asserted time suppresses an earlier fact in that layer by the same rules.

**No fact wins by default.** If no candidate survives the containment filter for the requested as-of valid time, the resolver returns an empty/absent result for that slot. Absence is not an error.

## Allen interval algebra

Containment and specificity (priorities 1–2) are decided with the thirteen interval relations of Allen's interval algebra (Allen, _Maintaining Knowledge about Temporal Intervals_, 1983). For a point read (`as_of_valid_time.instant`), a fact is a candidate when the instant falls inside its half-open interval — Allen's `during`, `starts`, or `finishes` relative to the fact, treating the instant as a degenerate interval. For a range read (`as_of_valid_time.interval`), candidacy and specificity use the full relation set: `equals`, `during`, `contains`, `overlaps`, `starts`, `finishes`, and their inverses. Specificity prefers the fact whose interval is `during` (contained by) the others — the narrowest claim that still covers the request.

## Worked example

Using the seed metamodel ([`core-v1.json`](../../data/meta/core-v1.json)): a `Capability` entity `cap_payments` carries a `tier` slot.

Starting facts (all in the `actual` layer, baseline scenario):

| Fact | Value      | Valid interval             | Asserted (HLC) |
| ---- | ---------- | -------------------------- | -------------- |
| f1   | `tier = 2` | `[2026-01-01, null)`       | `…+0`          |
| f2   | `tier = 1` | `[2026-06-01, 2026-09-01)` | `…+5`          |

Viewpoint: `as_of_valid_time.instant = 2026-06-10T09:00:00Z`, `layer = "actual"`, no scenario.

Resolution, step by step:

1. **Containment** — both f1 (open-ended from January) and f2 (June–September) contain 10 June. Two candidates remain.
2. **Interval specificity** — f2's interval (`during` f1's, by Allen) is narrower than f1's open-ended one. f2 wins.

Result: `tier = 1`, **Asserted** content (no analytics derived it), with an **effective interval** of `[2026-06-01, 2026-09-01)` — narrower than f2's stored interval only if a still-narrower competing fact existed; here it equals it. The result-state is **Fresh** when read against current canonical material ([honest-state, §9](../../02-standards/DOCUMENTATION-STANDARD.md)).

Had the viewpoint instead pinned `as_of_asserted_at` to a value below f2's HLC, f2 would not yet be a candidate and the resolver would return `tier = 2` — the belief before f2 was asserted.

## References & standards

- Allen — **Maintaining Knowledge about Temporal Intervals**, 1983 _(normative: interval relations)_.
- Snodgrass — _Developing Time-Oriented Database Applications in SQL_, 1999 _(normative: sequenced resolution semantics)_.

## Related documents

| Document                                                                        | What it covers                                                     |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [layer-and-policy.md](./layer-and-policy.md)                                    | The cross-layer policy that composes over this within-layer chain. |
| [explainability.md](./explainability.md)                                        | How a read returns the rule that selected each winner.             |
| [Chrona: viewpoint resolution](../../05-modules/chrona/viewpoint-resolution.md) | The engine that runs this chain.                                   |
| [`CONTEXT.md`](../../../CONTEXT.md)                                             | The _effective interval_ definition this example follows.          |
