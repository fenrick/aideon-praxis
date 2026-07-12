# Full-text and semantic retrieval

How Lexis indexes the twin for retrieval, and why both indexes are derived and rebuildable rather than canonical. For
practitioners reasoning about search recall, index recovery, and the offline posture.

> **PLANNED.** No `aideon_lexis` crate exists; this is design intent per
> [ADR-0012](../../06-adrs/ADR-0012-search-and-discovery-lexis.md).

## Two indexes, one source

Lexis maintains two retrieval indexes over the twin:

- A **full-text index** built on **SQLite FTS5** (SQLite documentation, FTS5), for lexical matching over names,
  descriptions, and slot values.
- A **semantic/vector index** over local embeddings, for similarity matching that survives wording differences
  ("Payments" finding "Billing Service").

Both are **projections** in the sense of
[PROJECTION-AND-INVALIDATION.md](../../04-contracts/PROJECTION-AND-INVALIDATION.md): they live under the workspace
runtime directory (`.aideon/runtime/`), are built from the canonical op log and schema, and are never the source of
truth ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)). The canonical material is the
operations; the indexes are a fast path into it.

## Derived and rebuildable — never canonical

The load-bearing property is that **a Lexis index is disposable**. Because both indexes derive from the op log, recovery
from a corrupt or missing index is a rebuild — delete the index and re-derive it from the workspace. This is why Lexis
indexes are never backed up or synced as truth: [Koinon](../koinon/README.md) sync exchanges operations and missing blob
hashes, never derived runtime files ([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)), so each peer
rebuilds its own Lexis indexes locally.

The trade-off named: an index that is cheap to lose is also one that can lag canonical truth. Lexis closes that gap with
honest result state (see [viewpoint-aware search](./viewpoint-aware-search.md)), not by promoting the index to
authority.

## Rebuild discipline

The full-text index belongs to the `batch_rebuild` projection class
([ADR-0012](../../06-adrs/ADR-0012-search-and-discovery-lexis.md)): it is recomputed in full on a schedule or explicit
trigger rather than maintained incrementally per operation in the first version. The semantic index is likewise rebuilt
on a schedule or trigger, because embedding generation is the expensive step. Whether the FTS class moves to incremental
view maintenance later is an open question governed by the projection contract
([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md), Gupta & Mumick, Maintenance of Materialized Views,
1995).

While either index is recomputing, reads serve the prior version marked `Rebuilding`
([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)).

## Offline by default

Both indexes stay **offline by default**, consistent with the no-renderer-network posture
([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). The semantic index uses **local**
embeddings; a cloud embedding service is rejected for the default because it violates the offline-first posture, though
a hosted embedding adapter may be a later deployment variant
([ADR-0012](../../06-adrs/ADR-0012-search-and-discovery-lexis.md)). The cost is stated plainly: ranking and semantic
recall are bounded by local model quality. The embedding model carries a model card, the same disclosure obligation
Sophia and Metis bear (Mitchell et al., Model Cards for Model Reporting, 2019; see
[Sophia model cards](../sophia/model-cards.md)).

## Worked example

Indexing the seed `Application` `n:application:insight-hub` (name "Insight Hub") writes a full-text entry over its name
and slot values and a vector entry from its embedding. A lexical query for "insight" matches the former; a semantic
query for "customer analytics platform" may match the latter through similarity even with no shared term. Both return
the same pointer — the entity ref `n:application:insight-hub` — not a copy of the entity. Deleting the indexes and
rebuilding from the workspace reproduces both entries exactly, which is the rebuild guarantee made observable.

## References & standards

_Normative:_

- **SQLite** official documentation (FTS5). The full-text engine.

_Informative:_

- Gupta & Mumick — **Maintenance of Materialized Views**, 1995. Correctness conditions if the FTS class moves to
  incremental refresh.
- Mitchell et al. — **Model Cards for Model Reporting**, 2019. The disclosure the embedding model carries.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                            | What it covers                                                 |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [Lexis README](./README.md)                                                         | The module index and invariants.                               |
| [Viewpoint-aware search](./viewpoint-aware-search.md)                               | How retrieved candidates are scoped to a viewpoint.            |
| [PROJECTION-AND-INVALIDATION.md](../../04-contracts/PROJECTION-AND-INVALIDATION.md) | The projection contract the indexes obey.                      |
| [ADR-0012](../../06-adrs/ADR-0012-search-and-discovery-lexis.md)                    | The decision that fixes the derived-and-rebuildable invariant. |
