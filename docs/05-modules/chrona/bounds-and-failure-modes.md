# Bounds and failure modes

The limits Chrona's temporal results operate within and how it behaves at the edges: diff size bounds, tie-breaking when
intervals are equally specific, tie-breaking under clock skew, and topology-delta ordering. These address the explorer
gaps around tie-breaking and ordering directly. Result states follow the honest-state vocabulary
([DOCUMENTATION-STANDARD §9](../../02-standards/DOCUMENTATION-STANDARD.md)).

---

## Diff and result size bounds

A diff or snapshot is bounded by its **scope** — there is no unbounded whole-twin operation that silently runs to
completion:

- A scoped snapshot costs the sum over its slots ([viewpoint-resolution](./viewpoint-resolution.md)); a diff costs
  `O(left + right)` in resolved slots ([diff](./diff.md)).
- An operation whose scope would exceed a fanout, depth, or size cap returns a **Partial / Bounded** result with a
  `warnings` entry naming the limit, rather than blocking on an unbounded scan ([ux-obligations](./ux-obligations.md)).
  Coverage is incomplete _by design_, and the payload says so.
- A diff whose result set would exceed a size cap is truncated to the cap with the bound named — the renderer shows "N
  of M changes" honestly, never a silently partial delta presented as complete.

The bound is a feature, not a failure: it is what keeps a temporal surface interactive on a large twin and what makes
"this is incomplete" an explicit, trustable signal.

---

## Tie-breaking when intervals are equally specific

The resolution chain breaks ties by interval specificity (rule 2), then latest asserted time (rule 3), then op-id
(rule 4) ([viewpoint-resolution](./viewpoint-resolution.md)). The explorer gap is the case where **two candidate facts
have valid-time intervals of equal width** — rule 2 cannot separate them.

This is resolved, deterministically, by falling through to the next rules:

1. **Equal width does not mean equal specificity is a tie that stops resolution.** Two facts both valid for, say,
   exactly one quarter and both containing the requested instant are equally specific under rule 2, so rule 2 yields no
   unique winner and the chain continues.
2. **Rule 3 (latest asserted time) breaks it.** The fact with the larger HLC wins — the more recently asserted claim.
   This is the common resolution for equal-width competitors: the later assertion is taken as the more current belief.
3. **Rule 4 (op-id) is the floor.** If the two equal-width facts were also asserted at the identical HLC (degenerate —
   they would have to share a microsecond and counter, [Mneme bitemporal-and-hlc](../mneme/bitemporal-and-hlc.md)), the
   lexicographically larger `op_id` wins. This case is vanishingly rare but **must** be deterministic, so the resolver
   never returns a non-deterministic answer.

The guarantee: the chain always terminates in a unique winner (or a determinate absence), for _any_ set of competing
facts, including equal-width intervals — there is no input for which resolution is undefined.

---

## Tie-breaking under clock skew

Rule 3 compares HLCs. The HLC is monotonic and skew-tolerant by construction
([Mneme bitemporal-and-hlc](../mneme/bitemporal-and-hlc.md), [ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md)), so
tie-breaking under skew is well-defined:

- A backwards wall-clock step within tolerance holds the HLC's physical component and advances the counter, so a fact
  asserted just after the step still sorts _after_ one asserted just before it — rule 3 stays correct despite the skew.
- A step beyond tolerance is a surfaced clock fault (`clock_invalid`), and the HLC continues on the logical counter
  rather than minting an out-of-order value ([Mneme failure-modes](../mneme/failure-modes.md)). Resolution never
  compares two HLCs whose order has been corrupted by skew, because the clock refuses to produce one.

Consequently Chrona's "latest asserted time wins" is robust: it relies on the HLC's total, monotonic order, which the
clock model guarantees independent of wall-clock behaviour. A diff or resolution computed during a skew event is still
deterministic.

---

## Topology-delta ordering and layer composition

- **Topology-delta ordering.** A topology delta is emitted in a fixed order — by entity (then relationship) identifier,
  then by change kind within an identifier ([diff](./diff.md)). The order is what makes a delta reproducible and
  replayable into a canvas; without it, two runs could not be reconciled. Because identifiers are stable and a snapshot
  is a pure function of its viewpoint, the ordered delta is deterministic and cacheable.
- **Layer composition under failure.** A layer blend composes per-layer winners ([layer-policy](./layer-policy.md)). If
  one layer in a policy resolves to absent, the blend falls through to the next layer rather than failing —
  `actual_over_plan` on a slot with no actual fact returns the plan value, not an error. Absence is data, not a fault.

---

## Failure modes

| Failure                                                               | Chrona's response                                                                                       | Result state                                                                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope exceeds a cap                                                   | Return the capped result; name the bound in `warnings`.                                                 | **Partial / Bounded**                                                                                                                          |
| A required projection is mid-rebuild                                  | Return the prior result, labelled.                                                                      | **Rebuilding**                                                                                                                                 |
| A canonical input changed since computation                           | Re-resolve on the next context change ([re-resolution-rule](./re-resolution-rule.md)); meanwhile label. | **Stale**                                                                                                                                      |
| An invalid viewpoint (both/neither of instant/interval; bad scenario) | Return the contract error, not a guessed default.                                                       | `TEMPORAL_CONTEXT_INVALID` / `SCENARIO_CONTEXT_INVALID` ([TEMPORAL-AND-SCENARIO-CONTEXT](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)) |
| A diff with incompatible sides                                        | Return the comparison error.                                                                            | `COMPARISON_CONTEXT_INVALID`                                                                                                                   |

Chrona never invents a coordinate to recover from an invalid viewpoint — an ambiguous request is an error, because
guessing would produce an answer to a question the user did not ask ([re-resolution-rule](./re-resolution-rule.md)).

---

## Worked example — a bounded scenario diff

A user diffs the whole twin (no scope) between the base case and `scn_consolidation`. The result set would exceed the
configured size cap:

1. Chrona resolves both sides, comparing slot-wise, until the cap is reached.
2. It returns the first N changes — including `Automation Orchestrator`'s `disposition: Migrate → Invest` — with a
   `warnings` entry: "result bounded at N of M changes; narrow the scope to see all".
3. The result state is **Bounded**, the derived delta kind is **scenario delta**, and the active viewpoints are named.

The user sees a truthful partial answer, knows it is partial, and knows how to get the complete one — never a silently
truncated delta that looks complete.

---

## References & standards

_Normative:_

- (Decision) [ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md) — the monotonic, skew-tolerant HLC tie-breaking rests
  on.

_Informative:_

- Allen — _Maintaining Knowledge about Temporal Intervals_, 1983. The interval relations underneath equal-width
  specificity.

## Related documents

| Document                                                             | What it covers                                   |
| -------------------------------------------------------------------- | ------------------------------------------------ |
| [Viewpoint resolution](./viewpoint-resolution.md)                    | The precedence chain these tie-breaks complete.  |
| [Diff](./diff.md)                                                    | Diff bounds and topology-delta ordering.         |
| [Mneme bitemporal model and the HLC](../mneme/bitemporal-and-hlc.md) | The clock guarantees skew tie-breaking rests on. |
| [Mneme failure modes](../mneme/failure-modes.md)                     | The storage-layer failure responses.             |
| [Chrona README](./README.md)                                         | The module index.                                |
