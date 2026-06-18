# ADR-0022: Asserted-Time Clock — Hybrid Logical Clock

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0001, ADR-0009
- Relates-To: ADR-0005

## Context

Asserted time is the audit axis of the bitemporal model: _when the system was told_ a fact, decoupled from when the fact is true in the world ([ADR-0009](./ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)). It must be totally ordered (the resolver breaks ties by latest asserted time), monotonic (a later assertion never sorts before an earlier one), and robust to clock skew (wall-clock time can jump backwards). A plain wall clock fails on skew; a pure Lamport clock loses the connection to wall-clock time that audit needs. The implemented answer, recorded in [TEMPORAL-AND-SCENARIO-CONTEXT.md](../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md), is a Hybrid Logical Clock packed into a portable `i64`; this ADR records the decision behind it.

## Governance Framing

- **Decision type:** Invariant (asserted time is an HLC with total, monotonic order) + stable seam (the packed `i64` encoding, stored in every op and used in resolution).
- **Known future pressure:** multi-device sync ([ADR-0005](./ADR-0005-sync-and-conflict-model.md)) merging assertion histories; counter exhaustion under bursts; clock skew across machines.
- **What stays stable:** asserted time is an HLC; the 51-bit-micros + 12-bit-counter packing; total byte-comparable order; monotonicity.
- **What is provisional:** the skew-tolerance bound and the counter-overflow handling policy.
- **What is deferred:** cross-device HLC merge semantics (governed by sync).
- **Why hard to reverse:** the packed `i64` is stored in every operation and is the resolver's tie-break key; changing the encoding is a workspace-wide data migration.

## Decision

- **Asserted time is a Hybrid Logical Clock** (Kulkarni, Demirbas, et al., Logical Physical Clocks, 2014). An HLC combines a physical-time component with a logical counter, giving an order that tracks wall-clock time while remaining monotonic under skew. It is the asserted-time clock for the whole twin.

- **The HLC is packed into a portable signed `i64`:** the upper bits hold microseconds since the Unix epoch (51 bits, the `SystemTime` physical component), the lower 12 bits hold a monotonic counter. The counter increments when two events share the same physical microsecond and resets to 0 when physical time advances. The packed value is a plain signed `i64` whose natural order is byte-comparable, so total ordering needs no special comparator — exactly as encoded in [TEMPORAL-AND-SCENARIO-CONTEXT.md](../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) and produced by `Hlc::now()` in `mneme_core::time`.

- **Monotonicity is guaranteed by advancing a stored last-HLC, scoped to the open workspace partition.** The watermark is keyed `(workspace_id, partition_id) → last_hlc` — **never a process-global `LAST_HLC`** — so opening one workspace carrying a far-future asserted time cannot advance another open workspace's clock. `Hlc::now()` mints the **strict successor of history or current physical time, whichever is greater**:

  ```text
  next_hlc = max( pack(physical_now_micros, counter = 0), successor(last_hlc) )   // successor(x) = checked(x + 1)
  ```

  With no previous watermark the value is `pack(physical_now_micros, 0)`. Because the counter is the low 12 bits, `+1` naturally increments it and rolls into the physical component on overflow (below); at the maximum representable `i64`, authoring **fails with an explicit clock-exhaustion error** rather than wrapping. This is stronger and simpler than "take the maximum and increment on a tie": it guarantees `next_hlc` is strictly greater than every `asserted_at` already in history even when the wall clock has moved backwards, replay contains a future-dated HLC, or the previous counter is already non-zero or `4095`.

- **The stored watermark is derived runtime state, restored from canonical history on rebuild.** `aideon_hlc_state.last_hlc` lives in the disposable `.aideon/runtime/`; its canonical source is the maximum `asserted_at` in that partition's valid operation set. On workspace rebuild the writer restores the partition-scoped watermark to `max(asserted_at)` across **all** unique valid canonical operations in the partition (actor, schema, and fact operations alike — `asserted_at` is canonical history, not present resolution) **before enabling writes**, and seeds the in-memory clock from the same value. If history cannot be completely and safely replayed (an uninterpretable op, an identity collision, an unsupported feature), the workspace does **not** become writable — the clock is never seeded from incomplete history. The watermark may be discarded without data loss and is **never** treated as authority over the op log; a runtime wipe correctly discards any advancement minted for an operation that failed before canonical append. A future-dated imported `asserted_at` is preserved, restored as the watermark, and continued from by logical successors with a clock-skew diagnostic — never rewritten and never lowered to resemble wall time. An empty workspace has an **unset** watermark (preferably SQL `NULL`, not `0`); its first assertion is `pack(physical_now_micros, 0)`.

- **Skew tolerance is bounded.** When the physical clock jumps backwards within tolerance, the HLC holds its physical component and advances the counter, preserving monotonicity. A backwards jump beyond tolerance is a clock fault: the system emits `clock_invalid` ([LOGGING_FRAMEWORK.md §12.5](../LOGGING_FRAMEWORK.md)) and continues on the logical counter rather than minting a value that violates order.

- **Counter overflow rolls into physical time.** With 12 bits the counter admits 4096 distinct assertions within a single microsecond; if that is exhausted, the physical component is advanced by one microsecond and the counter resets, so order and monotonicity are preserved at the cost of a sub-microsecond drift ahead of wall time. This is degenerate in practice but must be deterministic.

- **The HLC relates to Lamport but is not a Lamport clock.** A Lamport clock (Lamport, Time, Clocks, and the Ordering of Events, 1978) gives causal order but no wall-clock meaning; the HLC keeps causal monotonicity _and_ a usable physical reading, which audit and belief diffs require. Valid time, by contrast, is a simpler `i64` microseconds wrapper with no counter — it records _when a fact is true in the world_, not when it was asserted, and is not an HLC.

## Considered Options

- **Wall-clock timestamp only (rejected):** breaks under skew and NTP corrections, producing assertions that sort out of order; the HLC's counter absorbs backwards jumps.
- **Pure Lamport clock (rejected):** monotonic and causal, but loses the wall-clock reading audit and belief diffs depend on.
- **128-bit or string HLC (rejected):** more headroom, but the packed `i64` is portable, byte-comparable, and compact in storage; 51+12 bits is sufficient for the assertion rates a single workspace sees.

## Consequences

- The resolver's "latest asserted time" tie-break ([TEMPORAL-AND-SCENARIO-CONTEXT.md](../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md), priority 3) is a single `i64` comparison; the op-id tie-break (priority 4) handles identical HLCs.
- Belief diffs ([ADR-0008](./ADR-0008-diff-compares-two-viewpoints.md)) work because pinning `as_of_asserted_at` to an HLC replays the twin as believed at that assertion instant.
- The encoding is portable across machines, which is the precondition for the sync model to merge assertion histories ([ADR-0005](./ADR-0005-sync-and-conflict-model.md)).
- Rebuild restores the partition watermark from `max(asserted_at)` before write-enable; the mutable watermark is **not** an input to `foundation_rebuild_hash` (it is deterministic from the applied-op set the snapshot already covers, and the runtime wipe should discard any uncommitted advancement). Correctness is verified **behaviourally**: the foundation-rebuild oracle asserts that immediately after reopening, a freshly minted op satisfies `fresh_op.asserted_at > max(replayed_ops.asserted_at)` ([rebuild oracle](../data/fixtures/rebuild/README.md)).
- A worked example: two facts asserted in the same microsecond receive HLCs differing only in the counter (`…+0`, `…+1`); the resolver prefers the larger, and if the wall clock then steps back 2 ms, the next `Hlc::now()` holds the physical component and advances the counter rather than emitting a smaller value.

## Follow-ups / Open Questions

- The exact skew-tolerance bound and how it is configured.
- Cross-device HLC merge on sync ([ADR-0005](./ADR-0005-sync-and-conflict-model.md)).
- Whether counter exhaustion should ever surface a Warning beyond the silent physical-advance.

## References & standards

- Kulkarni, Demirbas, et al. — **Logical Physical Clocks (HLC)**, 2014 _(normative: asserted-time clock)_.
- Lamport — **Time, Clocks, and the Ordering of Events**, 1978 _(informative: causal-order foundation)_.

## Related documents

| Document                                                                             | What it covers                                         |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| [TEMPORAL-AND-SCENARIO-CONTEXT.md](../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The packed-`i64` HLC encoding and resolution rules.    |
| [ADR-0009](./ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)       | The bitemporal model asserted time is one axis of.     |
| [ADR-0005](./ADR-0005-sync-and-conflict-model.md)                                    | Sync, which merges assertion histories across devices. |
