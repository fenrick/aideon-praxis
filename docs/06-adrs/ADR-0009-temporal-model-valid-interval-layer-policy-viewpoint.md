# ADR-0009: Temporal Model — Bitemporal Valid-Interval, Layer-as-Policy, Viewpoint

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0001
- Relates-To: ADR-0008

## Context

Aideon is a time-first digital twin. The temporal model is the most load-bearing decision in the product, and across iterations its vocabulary drifted (an `effective` query wrapper, "actual wins over plan" as a fixed rule, an open question of whether a fact's validity is a point or an interval). This ADR records the resolved model, established during a glossary/grilling pass and captured in [`CONTEXT.md`](../../CONTEXT.md) and [`TEMPORAL-AND-SCENARIO-CONTEXT.md`](../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md). [ADR-0008](./ADR-0008-diff-compares-two-viewpoints.md) records the diff half of this model; this ADR records the read/resolution half it depends on.

## Governance Framing

- **Decision type:** Invariant (the shape of temporal truth) + stable seam (the viewpoint query contract).
- **Why hard to reverse:** every read, write, projection, diff, and cache key is keyed on these coordinates; changing them breaks the contract across Rust, TS, and stored requests.
- **What stays stable:** a fact is a bitemporal claim; a read is a viewpoint; effective state is derived.
- **What is provisional:** the enumerated layer-policy tokens and the exact scope grammar.

## Decision

- **A fact's valid time is a half-open interval `[valid_from, valid_to)`.** `valid_from` is required and inclusive; `valid_to` is optional and exclusive. A null `valid_to` is open-ended (holds until superseded or otherwise constrained by resolution); a set `valid_to` is an explicitly bounded claim. (The "valid-from point only" model was considered and rejected — it cannot express bounded claims and makes the interval-specificity resolution rule meaningless.)
- **Asserted time is a separate axis** (HLC) recording _when the system was told_, fully decoupled from valid time: a fact may be asserted now with a valid-from in the future (planning) or the past (correction). It is a first-class **query** coordinate, not just audit metadata — pinning it replays a past belief.
- **Layer is a resolution coordinate, not a fixed precedence.** A fact carries a layer (`plan`, `actual`, extensibly `forecast`/`budget`/`target`); plan and actual coexist for the same slot + valid time. How layers combine on read is a **policy** chosen by the viewpoint (a single selected layer, or a blend such as `actual_over_plan`, or side-by-side for variance). "Actual over plan" is one policy, never a universal rule.
- **A viewpoint is the unifying query frame:** as-of valid time + as-of asserted time + layer (or layer policy) + scenario + scope. A snapshot is the twin resolved at one viewpoint; an **effective interval** is the derived span a resolved value actually holds (≤ its stored valid interval). There is no separate `effective` query wrapper.

## Considered Options

- **Valid-from point + supersession only (rejected):** simpler, but cannot represent an explicitly bounded claim and removes interval specificity from resolution.
- **Layer as fixed precedence ("actual wins") (rejected):** correct for a blended operational view but wrong for variance analysis, which must keep plan and actual side by side.
- **`effective` query wrapper (rejected):** drifted from the code (`as_of_valid_time` / `as_of_asserted_at`) and overloaded the word "effective"; replaced by the viewpoint with the two explicit as-of coordinates.

## Consequences

- Storage keeps `[valid_from, valid_to)` (valid_to nullable) and the interval-specificity resolution rule remains meaningful (matching the existing SQLite schema).
- Reads/diffs take a viewpoint; the asserted coordinate enables belief diffs (ADR-0008); layer policy enables variance (plan-vs-actual) as an ordinary diff.
- Implemented by #243 (unified Viewpoint type), #237 (effective→viewpoint), #238 (belief diff), #239 (layer policy), #240 (layer in op/fact identity).
- Vocabulary is single-sourced in `CONTEXT.md`; the contract doc and code follow it.
