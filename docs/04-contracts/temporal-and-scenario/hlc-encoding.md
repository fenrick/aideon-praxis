# HLC encoding

Asserted time — _when the system was told_ a fact — is a **Hybrid Logical Clock** packed into a portable signed `i64`.
This file is the encoding reference; the decision behind it is [ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md).
The clock must be totally ordered (the resolver breaks ties by latest asserted time, see
[resolution-rules.md](./resolution-rules.md)), monotonic (a later assertion never sorts before an earlier one), and
robust to clock skew.

---

## The packing

```text
 63                    12 11          0
 ┌──────────────────────┬─────────────┐
 │  physical_micros     │   counter   │
 │  (51 bits)           │  (12 bits)  │
 └──────────────────────┴─────────────┘
```

- **Upper bits** — microseconds since the Unix epoch (the `SystemTime` physical component, 51 bits).
- **Lower 12 bits** — a monotonic counter; increments when two events share the same physical microsecond, resets to 0
  on physical advance.
- The packed value is a plain signed `i64`; total ordering is byte-comparable, so resolution needs no special
  comparator.
- `Hlc::now()` in `mneme_core::time` produces the next HLC, advancing the global `LAST_HLC` atomically.
- `Hlc::physical_micros()` strips the counter to recover wall-clock microseconds.

## In-memory `i64` vs the canonical-file encoding

The runtime representation is unchanged: the HLC (and other full-range 64-bit coordinates) is an `i64`, and all
ordering, monotonicity, and tie-break reasoning below operates on that integer. What changes at the storage boundary is
only the _serialisation_: in **canonical files** the HLC is encoded as a **decimal string** (`"7267843693811712000"`),
never a JSON number, per the [canonical-JSON profile](../canonical-json.md)
([ADR-0038](../../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)). The packed value
exceeds JavaScript's exact-integer range, so a JSON number would be unsafe under common tooling; a decimal string
round-trips losslessly. This corrects the earlier `i64`-number convention and does not affect byte-comparability: the
decimal strings are produced from the same monotonic `i64`, and comparison for resolution is still the single `i64`
comparison after parse.

## Ordering and monotonicity

`Hlc::now()` returns the maximum of (the previous HLC) and (the current physical microsecond), with the counter
incremented on a tie. A later call therefore never returns a value that sorts before an earlier one, even if the wall
clock has moved backwards. This is the property the resolver's "latest asserted time" tie-break depends on — it is a
single `i64` comparison.

## Tie-break

Two facts asserted in the same microsecond receive HLCs differing only in the counter (`…+0`, `…+1`); the resolver
prefers the larger. If two facts somehow carry an identical HLC, resolution falls through to the deterministic op-id
tie-break ([resolution-rules.md](./resolution-rules.md), priority 4). That case is degenerate in practice but must be
deterministic.

## Skew

When the physical clock jumps backwards **within tolerance**, the HLC holds its physical component and advances the
counter, preserving monotonicity. A backwards jump **beyond tolerance** is a clock fault: the system emits
`clock_invalid` ([LOGGING_FRAMEWORK.md §12.5](../../LOGGING_FRAMEWORK.md)) and continues on the logical counter rather
than minting a value that violates order. The exact tolerance bound is provisional
([ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md), open questions) and is treated as design intent until
configured.

## Counter overflow

With 12 bits the counter admits 4096 distinct assertions within a single microsecond. If that is exhausted, the physical
component is advanced by one microsecond and the counter resets, so order and monotonicity are preserved at the cost of
a sub-microsecond drift ahead of wall time. This is degenerate in practice but deterministic.

## What asserted time is not

`ValidTime` is a simpler `i64` wrapper — microseconds since epoch, no counter — used for explicit valid-time stamps on
individual facts. It records _when an event is true in the world_, not _when it was asserted_, and is **not** an HLC.
The HLC also relates to but is not a Lamport clock (Lamport, 1978): a Lamport clock gives causal order but no usable
wall-clock reading, while the HLC keeps causal monotonicity _and_ a physical reading that audit and belief diffs
require.

## References & standards

- Kulkarni, Demirbas, et al. — **Logical Physical Clocks (HLC)**, 2014 _(normative: asserted-time clock)_.
- Lamport — **Time, Clocks, and the Ordering of Events**, 1978 _(informative: causal-order foundation)_.

## Related documents

| Document                                                                  | What it covers                                                |
| ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md)                     | The decision behind the packing, skew, and overflow rules.    |
| [resolution-rules.md](./resolution-rules.md)                              | Where the HLC value is used as the latest-asserted tie-break. |
| [Mneme: bitemporal and HLC](../../05-modules/mneme/bitemporal-and-hlc.md) | The implementation of `Hlc::now()` and the stored stamp.      |
