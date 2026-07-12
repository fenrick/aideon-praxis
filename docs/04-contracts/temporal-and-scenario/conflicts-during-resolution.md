# Conflicts during resolution

What the effective state is when facts genuinely conflict at a viewpoint — two equally-specific, equally-believed facts
overlapping the requested instant — how the deterministic tie-break still produces a single effective value, how the
conflict is surfaced honestly, and why a superseded fact is never silently dropped. This is the read-time conflict case,
distinct from the write-time rebase conflict the [scenario overlay](./scenario-overlays.md) reports.

---

## A conflict is not an error

When two facts compete for the same slot at the same as-of valid time, the same layer, and the same scenario, the
[resolution chain](./resolution-rules.md) always produces exactly one effective value — the chain is total, because its
last rule (`op_id` lexical order) is defined on a totally ordered key. There is no state in which a read returns two
values or fails to resolve because facts disagree. Resolution is deterministic by construction
([ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)).

"Conflict" therefore names a property of the **candidate set**, not a failure of the read. A conflict exists when two or
more candidates survive every separating rule of the chain and are split only by the final tie-break — that is, the
model gives no semantic reason to prefer one over the other, and only the deterministic ordering of `op_id` decides. The
effective value is well-defined; what is at issue is whether a human should be told the choice was arbitrary on the
merits.

This read-time conflict is distinct from the write-time conflict a scenario **rebase** records (`CONFLICT_RECORDED`,
[error-codes.md](./error-codes.md)). A rebase halts and asks a human to reconcile because canonical facts moved under an
overlay; a read never halts — it resolves, then flags. The two share the honesty obligation but not the mechanism.

## Where the tie-break is the deciding rule

The chain separates candidates at four points; only the last two can be the point where a genuine conflict is resolved:

| Resolved at                   | Is it a conflict?                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Rule 1 — containment          | No — one fact simply covers the instant and others do not.                                                  |
| Rule 2 — interval specificity | No — a narrower claim is a more specific claim; the model prefers it on the merits.                         |
| Rule 3 — latest asserted time | Borderline — a later assertion is normally a correction (supersession), which is a legitimate preference.   |
| Rule 4 — op-id tie-break      | **Yes** — two facts are equally specific _and_ identically asserted; only the arbitrary key separates them. |

A slot decided at rule 4 is the honest definition of a conflict: equal valid-time specificity, identical HLC,
distinguished only by `op_id`. Rule 3 is the grey case — two facts at the same specificity but different beliefs is
ordinarily a correction superseding an earlier value, not a conflict — so the conflict flag is raised only when the
separating rule is the `op_id` tie-break, which the asserted-time clock makes degenerate in practice
([hlc-encoding.md](./hlc-encoding.md), counter-overflow and tie-break).

## How the conflict is surfaced — honest state

A conflict-resolved slot returns the single deterministic effective value **and** a flag that the value was selected by
the arbitrary tie-break, so a surface can mark it for review rather than present it as settled. The flag is carried in
the same per-slot reason array the [explainability](./explainability.md) contract defines: the winning fact, the rule
that selected it (`op_id` tie-break), and the equally-ranked competitor(s) it was chosen over.

The result-state vocabulary frames the slot honestly. A conflict-resolved value is **Awaiting review** — content queued
for human confirmation — on the result-state axis ([honest-state, §9](../../02-standards/DOCUMENTATION-STANDARD.md)),
while its content classification is unchanged: an Asserted fact stays Asserted even when it won by tie-break. The two
axes do not collapse; the value is a real Asserted claim that also carries a review obligation.

The model never invents a synthesised "merged" value to paper over the disagreement. It surfaces one real fact as
effective and names the competitor — the honesty obligation the
[honest-state vocabulary](../../02-standards/DOCUMENTATION-STANDARD.md) exists to enforce.

## Superseded-fact visibility

A fact that loses resolution — outranked by a later assertion, a narrower interval, or the tie-break, or suppressed by a
tombstone — is **not deleted**. It remains in canonical history and is inspectable through provenance and
explainability. Supersession is the model's word for this: an out-ranked fact is superseded, not erased
([resolution-rules.md](./resolution-rules.md), tombstones).

This follows directly from the append-only op log: canonical truth is the operations, and operations are never rewritten
([Mneme: bitemporal and HLC](../../05-modules/mneme/bitemporal-and-hlc.md)). The resolver chooses an effective value _at
a viewpoint_; it does not prune the facts it did not choose. Two consequences:

- **Every superseded fact is reachable.** A read that requests explainability returns the losing candidates and why each
  lost ([explainability.md](./explainability.md)); `mneme_store_explain_resolution` exposes the same set. The history of
  a slot — which value was effective under which belief — is reconstructable by sweeping the asserted-time axis.
- **A superseded fact can become effective again under a different viewpoint.** Pinning `as_of_asserted_at` below the
  superseding fact's HLC, or reading at a valid-time instant the superseding fact's narrower interval does not cover,
  makes the earlier fact the winner once more. Because it was never dropped, the earlier belief is fully replayable —
  the basis for belief diffs ([diff.md](./diff.md)).

The trade-off this closes a door on: the store never reclaims space by discarding outranked facts, because doing so
would make a past belief unrecoverable and a conflict's losing side invisible. History is kept whole; the cost is that
storage grows with every assertion, never with the count of distinct effective values. The product accepts the cost
because an explainable, auditable twin cannot forget what it once believed.

## Worked example — a tie-break conflict, surfaced and inspectable

Using the seed dataset ([`baseline.yaml`](../../data/base/baseline.yaml)): `Application` `automation-orchestrator`
carries `disposition = "Migrate"` in the `actual` layer. Suppose two corrections are imported in the same batch — two
connectors disagree about the same slot — and land in the same microsecond, so their HLCs differ only in the counter and
an upstream merge then aligned even the counter, leaving them identical:

| Fact | Value                       | Valid interval       | Asserted (HLC) | `op_id`    |
| ---- | --------------------------- | -------------------- | -------------- | ---------- |
| g1   | `disposition = "Eliminate"` | `[2026-01-01, null)` | `H`            | `op_a1f3…` |
| g2   | `disposition = "Tolerate"`  | `[2026-01-01, null)` | `H`            | `op_b207…` |

Viewpoint: `as_of_valid_time.instant = 2026-09-01T00:00:00Z`, `layer = "actual"`, latest belief, no scenario. Descending
the [chain](./resolution-rules.md):

1. **Rule 1 — containment.** Both intervals are open-ended from January and contain 1 September. Two candidates.
2. **Rule 2 — interval specificity.** Identical intervals; specificity cannot separate them. Two candidates.
3. **Rule 3 — latest asserted time.** Identical HLC (`H`). Cannot separate them. Two candidates.
4. **Rule 4 — op-id tie-break.** `op_b207…` is lexicographically larger than `op_a1f3…`. **g2 wins.**

Effective state: `disposition = "Tolerate"`, content classification **Asserted**, effective interval
`[2026-01-01, null)`. Because the deciding rule was the `op_id` tie-break, the slot is flagged **conflict-resolved** and
carries result-state **Awaiting review**. An explained read returns g2 as the winner selected by tie-break and g1
(`Eliminate`) as the equally-ranked competitor it was chosen over.

g1 is not gone. A read that requests explainability lists it; a future correction that asserts a single agreed value at
a later HLC supersedes both g1 and g2 by rule 3, at which point the conflict flag clears — and even then g1 and g2
remain inspectable in history. The arbitrary choice produced a deterministic, reproducible answer, surfaced it as
needing review, and lost no information in the process.

## References & standards

_Normative:_

- (System contract) [resolution-rules.md](./resolution-rules.md) — the precedence chain whose final rule resolves a
  conflict.
- (Decision) [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md) — facts are
  bitemporal claims; effective state is derived, deterministic, and never erases the facts it did not select.

_Informative:_

- Snodgrass — _Developing Time-Oriented Database Applications in SQL_, 1999. Supersession over erasure in a bitemporal
  store.

## Related documents

| Document                                                                  | What it covers                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [resolution-rules.md](./resolution-rules.md)                              | The chain and decision tree a conflict is resolved by.                    |
| [explainability.md](./explainability.md)                                  | The per-slot reasons that surface the conflict and the losing facts.      |
| [scenario-overlays.md](./scenario-overlays.md)                            | The write-time rebase conflict (`CONFLICT_RECORDED`) this contrasts with. |
| [hlc-encoding.md](./hlc-encoding.md)                                      | Why identical HLCs — and so a tie-break conflict — are degenerate.        |
| [Mneme: bitemporal and HLC](../../05-modules/mneme/bitemporal-and-hlc.md) | The append-only store that keeps superseded facts inspectable.            |
