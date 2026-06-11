# Performance budget

The design-intent performance targets for Mneme and the complexity bounds that justify them. These are **design intent**, not measured benchmarks: they state the budget the design is built to meet and the asymptotic shape that makes the budget plausible. Where a figure is a target rather than a measurement, it is marked as such.

---

## What a budget is for

A performance budget is a contract with the rest of the system: a downstream module may assume a read is interactive-latency and a write is bounded, and may design its own surfaces around those assumptions. The budget is honest only if the complexity bounds behind it are stated, so a reader can see _why_ a target is reachable and _when_ it would not be (a pathological op-log size, an unbounded scope).

The quality attributes these budgets serve are in [quality-attributes](../../01-architecture/quality-attributes.md); the honest-state badges a bounded result carries are in [DOCUMENTATION-STANDARD §9](../../02-standards/DOCUMENTATION-STANDARD.md).

---

## Targets (design intent)

| Operation                                                          | Target (design intent)                                                           | Bound that makes it reachable                                                                                                                                                                                |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Single-slot resolution** at a viewpoint                          | Interactive — sub-millisecond on a warm runtime for a slot with a small fact set | `O(f log f)` in the facts on that slot: an indexed range scan over the containing facts, then the precedence chain ([bitemporal-and-hlc](./bitemporal-and-hlc.md)). Independent of total op-log size.        |
| **Bounded N-hop graph slice**                                      | Interactive for small N and bounded fanout                                       | `O(edges visited)` against the adjacency projection, not the op log ([RUNTIME-AND-ENGINE](./RUNTIME-AND-ENGINE.md)). A fanout or depth cap turns into a **Partial / Bounded** result, not an unbounded scan. |
| **Single write (append + sync-in-tx projections)**                 | Bounded, committed before the call returns                                       | `O(Δ)` in the facts the operation touches plus the transitive sync-in-tx projections it invalidates ([derived-runtime-and-projections](./derived-runtime-and-projections.md)).                               |
| **Scenario composition**                                           | Interactive                                                                      | `O(b + s)` — baseline facts in scope plus overlay facts, a single pass ([scenarios-and-layers](./scenarios-and-layers.md)).                                                                                  |
| **Incremental projection refresh**                                 | Near-real-time, off the write path                                               | `O(Δ)` in the changed facts; equivalent to a rebuild restricted to the delta ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)).                                                           |
| **Cold open with present runtime**                                 | Fast — no replay                                                                 | Index load only; the runtime is already materialised.                                                                                                                                                        |
| **Cold open after runtime deletion / large import (full rebuild)** | Bounded, surfaced as a progress-reporting job                                    | `O(N)` in operations plus projection cost ([derived-runtime-and-projections](./derived-runtime-and-projections.md)). Mitigated by snapshot-plus-tail ([export-import-replay](./export-import-replay.md)).    |
| **Blob lookup / dedup**                                            | Constant-time by hash                                                            | `O(1)` — the address is the index ([content-addressed-blobs](./content-addressed-blobs.md)).                                                                                                                 |

The headline property: **interactive reads are independent of op-log size.** A slot resolution costs in the facts on that slot, not the history of the workspace, because the access paths are indexed range scans ([RUNTIME-AND-ENGINE](./RUNTIME-AND-ENGINE.md)). The cost that _does_ grow with op-log size — full rebuild — is paid only on a cold rebuild and is surfaced as a job with progress, never inline in an interactive read.

---

## The bounds that protect the budget

A target is only meetable if pathological inputs are bounded by design rather than by hope:

- **Scope is the bound on a read.** An unbounded query (whole-twin traversal with no cap) is not a budget violation — it is a **Bounded** result by construction, capped by a fanout, depth, or size limit and labelled as such ([DOCUMENTATION-STANDARD §9](../../02-standards/DOCUMENTATION-STANDARD.md)). The renderer never silently waits on an unbounded scan.
- **The write queue is bounded.** Saturation is `BACKPRESSURE`, not an unbounded latency ([storage-trait-and-engine](./storage-trait-and-engine.md)).
- **Jobs are deduplicated and coalesced.** A bulk import does not enqueue redundant work; `bulk_mode` defers non-essential derivation off the write path ([derived-runtime-and-projections](./derived-runtime-and-projections.md)).
- **Configuration caps the extremes.** `max_op_payload_bytes`, `max_blob_bytes`, `max_pending_jobs`, `max_ingest_batch` ([SQLITE](./SQLITE.md)) bound the size of any single unit of work, so no one operation can blow the budget for everything else.

---

## The trade-off named

The budget buys interactive reads and bounded writes at the cost of a **rebuild tax**: the full-rebuild path is `O(N)` and grows with history, paid on a cold rebuild or large import. The design accepts this because the rebuild is the price of treating the runtime as purely derived — and that property is what makes the workspace portable and tamper-proof ([canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)). Snapshot-plus-tail and incremental refresh reduce the tax; they do not remove it, and the design does not pretend they do.

---

## References & standards

_Informative:_

- Kleppmann — _Designing Data-Intensive Applications_, 2017. The read/write/rebuild cost trade-offs of log-structured derived data.
- O'Neil et al. — _The Log-Structured Merge-Tree_, 1996. Write-amplification bounds in the candidate engines ([RUNTIME-AND-ENGINE](./RUNTIME-AND-ENGINE.md)).

## Related documents

| Document                                                                | What it covers                                       |
| ----------------------------------------------------------------------- | ---------------------------------------------------- |
| [Quality attributes](../../01-architecture/quality-attributes.md)       | The system-wide quality targets these budgets serve. |
| [Runtime and engine layout](./RUNTIME-AND-ENGINE.md)                    | The access paths behind the read bounds.             |
| [Derived runtime and projections](./derived-runtime-and-projections.md) | The rebuild and incremental-refresh costs.           |
| [The storage trait and engine](./storage-trait-and-engine.md)           | The bounded write queue and backpressure.            |
