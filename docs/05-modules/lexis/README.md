# Lexis — search and discovery

Lexis is the planned search-and-discovery engine of the Aideon twin: full-text and semantic retrieval over entities,
relationships, and artefact results, bounded and scoped to a viewpoint. A Lexis hit is a pointer into the twin, never a
claim about it.

> **Implementation status: PLANNED.** No `aideon_lexis` crate exists. Everything in this folder is **design intent** —
> the specification the engine is built to — framed in the present tense as the standard requires, but describing
> behaviour not yet in code. The boundary, the derived-and-rebuildable invariant, and the viewpoint-awareness obligation
> are normative now and constrain the implementation when it lands. The governing decision is
> [ADR-0012](../../06-adrs/ADR-0012-search-and-discovery-lexis.md).

This README is the index and the cross-cutting narrative; each focused topic lives in its own file, per the
[Documentation Standard §4](../../02-standards/DOCUMENTATION-STANDARD.md) granularity rule.

---

## Contents

1. [Full-text and semantic retrieval](./full-text-and-semantic.md) — the SQLite FTS5 index and the vector/embedding
   index, both derived and rebuildable.
2. [Viewpoint-aware search](./viewpoint-aware-search.md) — results scoped to a viewpoint, and how stale indexes are
   surfaced.
3. [Bounds and ranking](./bounds-and-ranking.md) — fanout/depth/size caps, result state, and why ranking is not a trust
   scale.

---

## One-line role

Lexis answers "where in the twin is this?" by retrieving the entities, relationships, and artefact results that match a
query at an explicit viewpoint, returning bounded, honestly-stated pointers and nothing canonical.

## The boundary it occupies

Lexis occupies the **retrieval** boundary between the renderer (which issues queries) and the canonical material Mneme
holds. It sits alongside the other engines as a derived-projection consumer — it reads canonical operations to build its
indexes and serves queries against them, but it owns no truth. It is the retrieval substrate that grounds
[Sophia](../sophia/README.md) generation (Lewis et al., Retrieval-Augmented Generation, 2020).

## Invariants

- **Derived, never canonical.** Every Lexis index is a projection rebuilt from the canonical op log and schema
  ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)). A missing or corrupt index is a performance
  cost, never data loss. Lexis writes no operations and asserts no facts
  ([ADR-0012](../../06-adrs/ADR-0012-search-and-discovery-lexis.md)).
- **Viewpoint-aware.** Every query carries a `Viewpoint` and returns only content resolvable at it. An entity tombstoned
  before the as-of valid time, or living only in an unselected scenario, must not appear. Lexis resolves candidacy
  through the same temporal rules the resolver uses
  ([ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)); it must not maintain a
  parallel notion of existence.
- **Bounded and honest.** A fanout, depth, or size limit caps every query; a capped result is marked `Partial / Bounded`
  and a recomputing index serves its prior version marked `Rebuilding`, per the honest-state vocabulary
  ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)). Lexis must not return an incomplete
  answer as if it were complete.
- **Ranking is not trust.** A ranking score orders results and nothing more. It is not an integrity score
  ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)) and not a confidence band
  ([ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)).

## What it owns / what it does not own

**Owns:** the derived full-text index (SQLite FTS5) and the semantic/vector index; the query contract (viewpoint in,
bounded results out); candidacy resolution through the temporal rules; ranking and result ordering; index rebuild and
freshness state.

**Does not own:** canonical truth (Mneme); viewpoint definition and resolution semantics (Chrona); meaning and the
metamodel (Praxis); the integrity and confidence scales (Praxis / ADR-0020, ADR-0021); generation grounded on its
retrieval (Sophia). A search hit points into the twin; it never claims about it.

## Public trait seam (design intent)

Lexis is reached only through the host. The planned seam is a query trait that accepts a structured query plus a
`Viewpoint` and returns a bounded, ordered result set with explicit result state:

```rust
// design intent — not yet a crate
pub trait Lexis {
    fn search(&self, query: &SearchQuery, viewpoint: &Viewpoint, bounds: &SearchBounds)
        -> Result<SearchResults, ProblemDetails>;
    fn rebuild(&self, scope: &RebuildScope) -> Result<RebuildHandle, ProblemDetails>;
}
```

`SearchResults` carries the ordered hits, each a typed pointer (entity ref, relationship ref, or artefact-result ref)
with a ranking score, plus the result state (`Fresh`, `Stale`, `Rebuilding`, `Partial / Bounded`). Errors follow RFC
9457 ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)). The shapes are provisional until a crate exists.

## Integration with other modules (via the host)

Lexis is an engine and **depends on no other engine**
([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). The host composes it:

- **Mneme** — Lexis reads canonical material to build and rebuild its indexes; it never writes back.
- **Chrona** — viewpoint resolution; Lexis defers candidacy to the same temporal rules rather than reimplementing them.
- **[Sophia](../sophia/README.md)** — grounds generation on Lexis retrieval (RAG). The host wires retrieval into the
  generation request; the two engines do not call each other directly.
- **Renderer** — issues queries and presents bounded, badged results offline by default
  ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).

The planned crate name is `aideon_lexis`.

## References & standards

_Normative:_

- **SQLite** official documentation (FTS5). Full-text engine.

_Informative:_

- Lewis et al. — **Retrieval-Augmented Generation**, 2020. The retrieval Lexis supplies to Sophia.

Full bibliography: [STANDARDS-REGISTER.md](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                | What it covers                                                |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [ADR-0012](../../06-adrs/ADR-0012-search-and-discovery-lexis.md)                        | The decision that introduces Lexis and fixes its invariants.  |
| [PROJECTION-AND-INVALIDATION.md](../../04-contracts/PROJECTION-AND-INVALIDATION.md)     | The derived-projection contract Lexis indexes obey.           |
| [TEMPORAL-AND-SCENARIO-CONTEXT.md](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The viewpoint frame every query carries.                      |
| [Sophia module](../sophia/README.md)                                                    | The AI assistance that grounds generation on Lexis retrieval. |
| [Module dependency map](../../01-architecture/module-dependency-map.md)                 | The crate dependency graph and the acyclic invariant.         |
