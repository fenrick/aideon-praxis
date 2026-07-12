# Boundaries

What Mneme owns, what it explicitly does not own, and the seams it shares with the modules around it. The forbidden list
is the load-bearing half: a clear statement of what Mneme does _not_ do is what keeps the module graph acyclic and the
responsibilities un-blurred ([dependency-rules](../../01-architecture/boundary/dependency-rules.md),
[ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)).

---

## What Mneme owns

Mneme is the **only module that touches canonical storage**
([layers-and-responsibilities](../../01-architecture/boundary/layers-and-responsibilities.md)). It owns:

- The append-only operation log — the canonical primitive ([op-fact-schema-model](./op-fact-schema-model.md)).
- Bitemporal fact resolution: the mechanical precedence chain over valid time and asserted time
  ([bitemporal-and-hlc](./bitemporal-and-hlc.md)).
- The HLC asserted-time clock ([ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md)).
- Schema-as-data persistence and the compiled effective-schema cache
  ([op-fact-schema-model](./op-fact-schema-model.md)).
- The content-addressed blob store ([content-addressed-blobs](./content-addressed-blobs.md)).
- The derived runtime database, its projections, and the three consistency tiers
  ([derived-runtime-and-projections](./derived-runtime-and-projections.md)).
- The storage trait that fixes the seam, and the single-writer queue
  ([storage-trait-and-engine](./storage-trait-and-engine.md)).
- Export, import, and replay of the canonical package ([export-import-replay](./export-import-replay.md)).

---

## What Mneme does not own

| Not Mneme's                                                         | Owned by                            | The seam                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The default EA metamodel and business vocabulary                    | [Praxis](../praxis/README.md)       | Praxis authors an `AuthoredMetamodelBatch` (the canonical `UpsertMetamodelBatch` op); Mneme persists it as schema-as-data and derives the effective schema at M1 ([METAMODEL-PACKAGES](../../03-design/METAMODEL-PACKAGES.md), [op-fact-schema-model](./op-fact-schema-model.md)). |
| What an analytics score _means_                                     | [Metis](../metis/README.md)         | Mneme stores PageRank runs and degree stats; Metis defines and computes them over the adjacency projection.                                                                                                                                                                        |
| Time and scenario _interpretation_ as a product concern             | [Chrona](../chrona/README.md)       | Mneme answers "which fact wins?"; Chrona answers "what does the user see, how is the diff classified, how is a scenario shaped for a surface?"                                                                                                                                     |
| Orchestration, scheduling, and the run ledger                       | [Continuum](../continuum/README.md) | Mneme's job queue maintains _its own_ derived artefacts; Continuum owns cross-engine durable workflows.                                                                                                                                                                            |
| The application shell, workspace lifecycle UX, and the IPC boundary | [Host](../host/README.md)           | The host opens/closes/watches workspaces and routes commands; Mneme performs storage behind the trait.                                                                                                                                                                             |
| Arbitrary SQL or direct database access for any consumer            | —                                   | Forbidden: every consumer goes through the trait ([dependency-rules](../../01-architecture/boundary/dependency-rules.md)).                                                                                                                                                         |

---

## The Mneme / Chrona seam, made precise

This is the seam most likely to blur, so it is stated explicitly. The temporal model is split:

- **Mneme implements the mechanical resolution** — containment, specificity, latest asserted time, op-id tie-break, and
  the per-layer-then-policy combination — exactly as the
  [temporal and scenario contract](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) fixes it. This is storage-layer
  logic: given a viewpoint and a slot, which fact wins.
- **Chrona owns the product-level interpretation** built on that resolution: how a viewpoint is presented and
  re-resolved, how a diff's delta kind is classified, how a scenario composition is shaped into a UX payload, plateau
  and transition semantics ([Chrona README](../chrona/README.md)).

Chrona reads through Mneme's trait; it never reaches into the runtime database. The contract both implement against is
the same document, which is why they cannot drift: where this boundary and the contract could disagree, the contract
governs.

---

## Folded concern: Logos

A note for completeness. **Logos** — narrative and decision rationale — is a folded concern, not yet its own module
([DOCUMENTATION-STANDARD §10](../../02-standards/DOCUMENTATION-STANDARD.md)). Its storage aspect (the durable record of
_why_ a change was made — rationale carried on a Change Event, lineage on a fact) lives within Mneme's op log and
Kerux's reporting; the split-out trigger is recorded in
[ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md). Mneme stores the rationale as canonical material;
it does not _compose_ the narrative — that is Kerux's concern when it earns a module.

---

## The acyclic invariant

Mneme sits at the base of the engine graph: every other engine depends on Mneme's trait, and Mneme depends on no other
engine ([dependency-rules](../../01-architecture/boundary/dependency-rules.md)). Its own internal split — `mneme_core`
(types and traits) below `mneme_store` (implementation) below the `mneme` façade — is the structural enforcement that
even Mneme's internals cannot form a cycle. A shared type that two consumers need drops into `mneme_core`, never into a
lateral import.

---

## Related documents

| Document                                                                                     | What it covers                                                           |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [Layers and responsibilities](../../01-architecture/boundary/layers-and-responsibilities.md) | What each band owns and may not do.                                      |
| [Dependency rules](../../01-architecture/boundary/dependency-rules.md)                       | The directions and the acyclic invariant.                                |
| [ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)                         | The module taxonomy and the "earns its own module" test.                 |
| [Chrona module](../chrona/README.md)                                                         | The product-level temporal interpretation on the other side of the seam. |
| [Praxis module](../praxis/README.md)                                                         | The metamodel Mneme persists.                                            |
| [Mneme README](./README.md)                                                                  | The module index.                                                        |
