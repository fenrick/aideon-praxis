# ADR-0012: Search and Discovery — Lexis

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0001, ADR-0011
- Relates-To: ADR-0009, ADR-0027

## Context

Finding entities, relationships, and artefact results across a large twin needs full-text and semantic retrieval, but retrieval must not become a second source of truth. The canonical authority is the workspace's op log plus schema ([ADR-0001](./ADR-0001-workspace-is-canonical-authority.md)); every index is derived and rebuildable. The product is also bitemporal and scenario-aware ([ADR-0009](./ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)): a search that ignores the viewpoint will return entities that do not exist at the reader's as-of valid time, in their layer, or in their scenario, which is a correctness defect, not a ranking quirk.

This ADR introduces **Lexis**, the planned search-and-discovery module ([ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md)). It is design intent until a crate exists.

## Governance Framing

- **Decision type:** Invariant (search is derived and never canonical) + stable seam (the search query carries a viewpoint and a bounded result contract).
- **Known future pressure:** larger twins; richer semantic models; offline embedding generation; per-type freshness policies; ranking quality demands.
- **What stays stable:** the index is rebuildable from the workspace; results are viewpoint-aware; results are bounded and carry result state; nothing in Lexis is canonical truth.
- **What is provisional:** the embedding model, the vector index implementation, ranking weights, and the FTS tokeniser configuration.
- **What is deferred:** cross-workspace search; learned ranking; query-time relevance feedback.
- **Why hard to reverse:** the query contract (viewpoint in, bounded results out) is consumed by the renderer; the rebuild guarantee is relied on by recovery. The index format itself is disposable and easy to change.

## Decision

- **Lexis maintains a derived, rebuildable full-text index (SQLite FTS5) and a semantic/vector index over the twin.** Both are projections in the sense of [PROJECTION-AND-INVALIDATION.md](../04-contracts/PROJECTION-AND-INVALIDATION.md): they live in `.aideon/runtime/`, are rebuilt from the canonical op log, and a missing or corrupt index is a performance cost, never data loss.

- **Search is viewpoint-aware.** Every Lexis query carries a `Viewpoint` (as-of valid time, as-of asserted time, layer or layer policy, scenario, scope) and returns only content resolvable at that viewpoint. An entity tombstoned before the as-of valid time, or living only in a scenario the query does not select, must not appear. Lexis resolves candidacy through the same temporal rules the resolver uses; it does not maintain a parallel notion of existence.

- **Results are bounded and carry result state.** A fanout, depth, or size limit caps every query; a capped result is marked `Partial / Bounded` per [DOCUMENTATION-STANDARD.md §9](../02-standards/DOCUMENTATION-STANDARD.md). While an index is recomputing, reads serve the prior version marked `Rebuilding`. Lexis never silently returns an incomplete answer as if it were complete.

- **Lexis is never canonical.** A search hit is a pointer into the twin, not a claim about it. Lexis writes no operations and asserts no facts. Ranking scores are not integrity scores ([ADR-0020](./ADR-0020-integrity-scoring-model.md)) and are not confidence ([ADR-0021](./ADR-0021-confidence-and-trust-scale.md)); they order results and nothing more.

- **The full-text index uses SQLite FTS5; the semantic index uses local embeddings.** Both stay offline by default, consistent with the no-renderer-network posture ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). The FTS class is `batch_rebuild`; the semantic index is likewise rebuilt on a schedule or explicit trigger.

- **Lexis is an engine and depends on no other engine** ([ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md)). The host composes Lexis with Mneme (to read canonical material for indexing) and the renderer (to serve queries).

## Considered Options

- **Search as canonical (rejected):** treating the index as authoritative would mean a corrupt index is data loss and would require the index to be backed up and synced; deriving it from the workspace keeps recovery trivial.
- **Viewpoint-blind search (rejected):** cheaper to build, but returns entities that do not exist at the reader's viewpoint — a correctness defect in a time-first twin.
- **Cloud embedding service (rejected for the default):** higher quality, but violates the offline-first posture; a hosted embedding adapter may be a later deployment variant.

## Consequences

- A worked example: searching for "Payments" at a viewpoint pinned to 2024 returns the `Application` "Payments Service" only if a fact places it before that as-of valid time in the selected layer; if it is a `plan` only, it appears solely when the viewpoint selects the plan layer or a scenario carrying it.
- Recovery is simple: delete the Lexis indexes and rebuild from the workspace.
- Ranking quality is bounded by local models; this is the cost of the offline posture, stated plainly.
- Index staleness is governed by the projection contract; stale results are badged, not hidden.

## Follow-ups / Open Questions

- The embedding model and its model card ([ADR-0014](./ADR-0014-ai-assistance-and-generated-provenance-sophia.md) records the model-card obligation).
- Whether semantic results should expose a relevance band reusing the confidence vocabulary, or a distinct search-only scale.
- Incremental index maintenance versus full rebuild for the FTS class ([ADR-0027](./ADR-0027-projection-consistency-model.md)).

## References & standards

- **SQLite** official documentation (FTS5) _(normative: full-text engine)_.
- Lewis et al. — **Retrieval-Augmented Generation**, 2020 _(informative: the retrieval Lexis supplies to Sophia)_.

## Related documents

| Document                                                                         | What it covers                                       |
| -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [PROJECTION-AND-INVALIDATION.md](../04-contracts/PROJECTION-AND-INVALIDATION.md) | The derived-projection contract Lexis indexes obey.  |
| [ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md)                         | The module taxonomy that introduces Lexis.           |
| [ADR-0014](./ADR-0014-ai-assistance-and-generated-provenance-sophia.md)          | Sophia, which grounds generation in Lexis retrieval. |
