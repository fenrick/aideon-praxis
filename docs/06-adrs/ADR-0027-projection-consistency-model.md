# ADR-0027: Projection Consistency Model

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0001, ADR-0004
- Relates-To: ADR-0020, ADR-0026

## Context

[PROJECTION-AND-INVALIDATION.md](../04-contracts/PROJECTION-AND-INVALIDATION.md) defines the projection _contract_ —
descriptors, freshness classes, invalidation events, freshness states, and the rebuild-from-workspace guarantee. What it
does not state is the _consistency guarantee_ a reader gets: when a write lands, what does a subsequent read of a
derived projection see, and when? Without that guarantee recorded, "the projection is eventually right" is too weak for
a writer's own follow-up read and too strong a claim for an unrelated cross-projection read. The product also needs the
correctness conditions for _incremental_ refresh, because incremental view maintenance that is subtly wrong silently
serves bad data.

The canonical authority is the op log ([ADR-0001](./ADR-0001-workspace-is-canonical-authority.md)); writes are
serialised through the single-writer queue ([ADR-0004](./ADR-0004-storage-engine-abstraction.md)); Gupta & Mumick supply
the correctness conditions for incremental view maintenance.

## Governance Framing

- **Decision type:** Stable seam (the consistency guarantee projections offer their readers) + invariant
  (read-your-writes for the writer's session; eventual convergence with explicit staleness for others; incremental
  refresh is provably equivalent to rebuild).
- **Known future pressure:** more projection families; larger graphs raising incremental-vs-rebuild cost; concurrent
  readers; sync introducing remote writes.
- **What stays stable:** causal read-your-writes for the writer; eventual convergence with surfaced staleness; cascade
  invalidation; incremental maintenance equivalent to full rebuild.
- **What is provisional:** per-family staleness budgets and the choice of incremental vs batch per family.
- **What is deferred:** cross-peer projection consistency under sync.
- **Why hard to reverse:** the guarantee is relied on by every reader and by the integrity recompute path; weakening it
  would surface as stale or wrong derived data across the app.

## Decision

- **The single writer gives causal read-your-writes within a session.** Because writes serialise through the
  single-writer queue ([ADR-0004](./ADR-0004-storage-engine-abstraction.md)) and an `incremental` projection's
  delta-apply runs immediately after commit on that same queue
  ([PROJECTION-AND-INVALIDATION.md](../04-contracts/PROJECTION-AND-INVALIDATION.md)), a writer's own subsequent read
  observes its own effect. The guarantee is **causal consistency** for the writer's session: effects are observed in the
  order they were caused.

- **Other readers get eventual consistency with explicit staleness.** A reader who did not perform the write converges
  after the projection refreshes; until then the read carries a `ProjectionFreshnessStatus` of `stale` or `rebuilding`
  ([PROJECTION-AND-INVALIDATION.md](../04-contracts/PROJECTION-AND-INVALIDATION.md)) and the corresponding result-state
  badge ([DOCUMENTATION-STANDARD.md §9](../02-standards/DOCUMENTATION-STANDARD.md)). Eventual convergence is honest only
  because staleness is surfaced, never hidden — a stale read is labelled, not silently served as fresh.

- **Invalidation cascades.** A write that invalidates a projection invalidates every projection derived from it,
  transitively, before the write transaction closes. Integrity scores
  ([ADR-0020](./ADR-0020-integrity-scoring-model.md)) are themselves derived and are recomputed when their inputs are
  invalidated; a cascade that stopped short would leave a downstream projection confidently wrong. Cascade follows the
  invalidation tags ([PROJECTION-AND-INVALIDATION.md](../04-contracts/PROJECTION-AND-INVALIDATION.md)).

- **Incremental view maintenance must be equivalent to a full rebuild.** An `incremental` projection's delta-apply must
  produce the same state a full rebuild from the op log would (Gupta & Mumick, Maintenance of Materialized Views, 1995).
  This is the correctness condition: incremental refresh is an optimisation of rebuild, never a different answer. When
  the delta log is missing or inconsistent, the projection falls back to a full rebuild
  ([PROJECTION-AND-INVALIDATION.md](../04-contracts/PROJECTION-AND-INVALIDATION.md)) — rebuild is the ground truth
  incremental maintenance is checked against.

- **A projection is correct only for its context dimensions.** A projection built at one viewpoint or scenario is not
  served for another ([PROJECTION-AND-INVALIDATION.md](../04-contracts/PROJECTION-AND-INVALIDATION.md),
  `PROJECTION_CONTEXT_MISMATCH`); the renderer keys its cache by the same viewpoint coordinates
  ([ADR-0026](./ADR-0026-frontend-state-architecture.md)). Consistency is per-context, not global.

- **Rebuild equivalence is semantic, not byte-identical.** Deleting the derived runtime and rebuilding it from the
  canonical op log must produce a runtime that answers every query identically — but it need not reproduce the previous
  runtime byte for byte. Row insertion order, physical page layout, B-tree shape, transient cache contents, and any
  other implementation detail of the derived store are allowed to differ. What must be identical is the _resolved
  meaning_: the same facts resolve at every viewpoint, and every artefact/query returns the same result. This _semantic_
  relation is gated at **M2/M3**, when its probes exist; **M0** is gated by the distinct structural
  `foundation_rebuild_hash` (below). Together they are the golden-journey final assertion
  ([golden-journey](../build-contracts/golden-journey.md), steps 9–10).

## Rebuild equivalence — the equivalence relation and its hash

Two runtimes built from the same canonical state — for instance, the runtime before a `.aideon/runtime/` wipe and the
one rebuilt after — are **equivalent** iff, for every viewpoint in a fixed probe set, they resolve identical effective
facts and return identical results from a fixed set of queries/artefacts. Equivalence is decided by a **deterministic
equivalence hash**, not by comparing database files:

- **Inputs to the hash.** A _probe set_ of viewpoints (each a fully-qualified
  `{as_of valid time, asserted-time belief, layer policy, scenario}` tuple) and a fixed ordered list of
  queries/artefacts to run at each. The probes **arrive incrementally** — they do not exist at M0:

  | Milestone | Added probe                                                       |
  | --------- | ----------------------------------------------------------------- |
  | M0        | None — the structural `foundation_rebuild_hash` gates M0 (below). |
  | M1        | Optional metamodel compilation and validation-result fixtures.    |
  | M2        | Resolved facts and diffs at fixed viewpoints.                     |
  | M3        | Catalogue and other artefact-result fixtures.                     |

- **Canonical serialisation.** For each probe, the resolved result is reduced to a canonical form using the **shared
  [canonical-JSON profile](../04-contracts/canonical-json.md)**
  ([ADR-0038](./ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)): sorted keys, identifiers as
  canonical UUID strings, full-range coordinates (HLC, valid-time) as decimal strings, contract-defined array order, and
  _no_ derived-only fields that carry implementation detail (row ids, cache freshness timestamps, physical ordering
  hints). The equivalence hash and the operation record share the canonicaliser but are **different shapes** — the
  operation record is canonical history; the probe result is resolved meaning. Result-state/coverage badges are included
  because they are part of the resolved meaning; transient `ProjectionFreshnessStatus` of an in-flight rebuild is
  excluded.
- **The hash.**
  `equivalence_hash = BLAKE3( concat over probes in fixed order of ( canonical_serialisation(probe_result) ) )`. BLAKE3
  matches the family already used for sealed-segment and export-package checksums
  ([ADR-0002](./ADR-0002-portable-workspace-format.md),
  [export-import-replay](../05-modules/mneme/export-import-replay.md)).
- **The assertion.** `equivalence_hash(twin_before_wipe) == equivalence_hash(twin_after_rebuild)`. Equality proves
  semantic equivalence; inequality is a rebuild-correctness defect, surfaced with the first differing probe. The same
  hash also checks snapshot-plus-tail against full replay
  ([export-import-replay](../05-modules/mneme/export-import-replay.md)) and incremental refresh against full rebuild —
  one relation, three uses.

- **M0 has a distinct structural gate — `foundation_rebuild_hash`.** Because the semantic probe set is empty at M0, M0
  is gated by a separate hash over a stable logical `FoundationProjectionSnapshot` (the applied-operation set by
  `(partition_id, op_id, canonical_digest)`, the canonical schema-document digests — _not_ a compiled effective schema,
  which is M1 — the actor registry, the object index, and replay checkpoints), canonicalised with the same profile. It
  proves deterministic reconstruction of the foundation's logical derived state; it does **not** prove temporal/artefact
  meaning. It is **not** a dump of SQLite tables — the derived store's physical shape may change freely. M0 must not
  pull a temporary resolver forward to fabricate a semantic probe.

The test oracles — the M0 `foundation_rebuild_hash` and the later semantic `equivalence_hash` — are specified at
[`docs/data/fixtures/rebuild/README.md`](../data/fixtures/rebuild/README.md).

## Considered Options

- **Strong (synchronous) consistency for all readers (rejected):** would block reads on every refresh and serialise the
  whole app behind projection maintenance; causal-for-writer plus eventual-with-staleness gives correctness where it is
  needed without the global stall.
- **Best-effort eventual consistency with no staleness signal (rejected):** cheap, but serves stale data as if fresh —
  the dishonesty the honest-state vocabulary exists to prevent.
- **Incremental maintenance without a rebuild-equivalence requirement (rejected):** faster to ship, but a subtly wrong
  delta silently corrupts derived data; pinning incremental to rebuild-equivalence is the safety condition.

## Consequences

- A user who edits an entity sees the edit reflected in the same surface immediately (read-your-writes); a second window
  converges and shows a staleness badge until it refreshes.
- Integrity scores never lag their inputs silently, because the cascade recomputes them.
- Incremental refresh can always be validated against a full rebuild, which is also the recovery path.
- A worked example: asserting a new `accesses` relationship from an `Application` to a `DataEntity` invalidates the
  effective-graph projection, cascades to any lineage and integrity projections over that subgraph, and the writer's
  next graph read shows the new edge; a concurrent reader sees a `stale` badge until delta-apply completes, after which
  both converge to the state a full rebuild would produce.

## Follow-ups / Open Questions

- Per-family staleness budgets and the incremental-vs-batch choice per projection family.
- A test harness asserting incremental-apply equals full-rebuild for each `incremental` family.
- Projection consistency across sync peers ([ADR-0005](./ADR-0005-sync-and-conflict-model.md)).

## References & standards

- Gupta & Mumick — **Maintenance of Materialized Views**, 1995 _(normative: incremental view maintenance correctness)_.
- Kleppmann — _Designing Data-Intensive Applications_, 2017 _(informative: causal vs eventual consistency)_.

## Related documents

| Document                                                                         | What it covers                                                      |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [PROJECTION-AND-INVALIDATION.md](../04-contracts/PROJECTION-AND-INVALIDATION.md) | The projection contract this ADR gives a consistency guarantee for. |
| [ADR-0004](./ADR-0004-storage-engine-abstraction.md)                             | The single-writer queue that enables read-your-writes.              |
| [ADR-0020](./ADR-0020-integrity-scoring-model.md)                                | Integrity scores recomputed by cascade invalidation.                |
