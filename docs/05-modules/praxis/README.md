# Praxis — meaning and artefacts

Praxis is the semantic engine of the Aideon twin. It owns the modelling language and what the model means: the metamodel and its types, the canonical relationship vocabulary, the task APIs through which the twin is changed, artefact execution, integrity scoring, and explainability. Mneme owns storage; Praxis owns meaning. This folder is the design record for that boundary.

This README is the index and the cross-cutting narrative; each focused topic lives in its own file below, per the [Documentation Standard §4](../../02-standards/DOCUMENTATION-STANDARD.md) granularity rule.

---

## Contents

1. [Metamodel ownership](./metamodel-ownership.md) — Praxis owns meaning; what it owns and what Mneme owns; links to the metamodel design.
2. [Tasks and Change Events](./tasks-and-change-events.md) — task APIs compile to operations via Change Events; atomicity of multi-operation tasks.
3. [Artefact execution](./artefact-execution.md) — `Artefact + Viewpoint → Artefact result`; bounded execution limits; determinism and caching.
4. [Integrity scoring](./integrity-scoring.md) — the five-dimension integrity model, weights, the gate threshold, and a worked score.
5. [Explainability](./explainability.md) — spine-trace explanations and the evidence they carry.
6. [Merge and conflict](./merge-and-conflict.md) — `MergeConflict` records and how scenario merges are surfaced.
7. [Crate structure](./crate-structure.md) — the `praxis` crate layout.
8. [Boundaries](./boundaries.md) — what Praxis depends on, what depends on it, and the acyclic rule.
9. [Failure modes](./failure-modes.md) — how Praxis fails honestly and what each failure returns.

The canonical relationship vocabulary is documented in its own folder, [edge-catalogue/](./edge-catalogue/README.md). The metamodel design lives at [03-design/metamodel/](../../03-design/metamodel/README.md) and the lineage it forms at [03-design/semantic-spine/](../../03-design/semantic-spine/README.md); Praxis references these rather than duplicating them.

---

## One-line responsibility

Praxis turns a stored, time-versioned graph into a meaningful, queryable, explainable model of an organisation — and is the single place the rules of that model are enforced.

---

## The meaning / storage split

The product's central architectural division is that **meaning and storage are separate engines**. Praxis decides what an entity, relationship, type, or artefact _means_ and which rules it must obey; [Mneme](../mneme/README.md) decides how the underlying facts are stored, indexed, and resolved over time. The split is a design axiom ([DESIGN.md](../../03-design/DESIGN.md), axiom 4) and is fixed by the boundary documents ([canonical vs derived](../../01-architecture/boundary/canonical-vs-derived.md)).

Two consequences follow and are invariants:

- **Praxis never persists.** It generates no SQL, owns no database driver, and holds no canonical truth. It calls Mneme's published traits to read facts and append operations; the workspace op log is the only canonical store ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)).
- **Mneme never interprets.** It stores and resolves facts but does not know what a `Capability` is, which relationships the spine expects, or whether an artefact result is complete. That meaning is Praxis's alone.

The split closes a door deliberately: a question that needs both the stored facts and their meaning cannot be answered inside one engine, so Praxis and Mneme exchange typed requests across a trait seam rather than sharing internals. The architecture accepts that indirection in exchange for a storage engine that can be replaced ([ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)) without touching meaning, and a meaning engine that can be reasoned about without a database.

---

## Key invariants

Praxis upholds these rules; they hold across every surface and are not negotiable per call.

- **The metamodel is schema-as-data, authored to a Mneme `UpsertMetamodelBatch` operation** (an `AuthoredMetamodelBatch` payload carrying unflattened definitions; the flattened effective schema is compiled at M1). Types and relationships carry stable identifiers committed in source; their UUIDs are **UUIDv5** values minted by the compiler and are never hand-written ([metamodel ownership](./metamodel-ownership.md); [packages and registry](../../03-design/metamodel/packages-and-registry.md)).
- **The canonical relationship vocabulary is the seed's ArchiMate-aligned set** — `serves`, `realises`, `accesses`, `hosts`, `plan_effect` — defined in the [edge catalogue](./edge-catalogue/README.md) and fixed by [ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md). Bespoke relationships are introduced only as documented extensions.
- **The twin is changed through tasks, not free-form mutation.** A task compiles into one or more operations via a Change Event; a multi-operation task is atomic ([tasks and Change Events](./tasks-and-change-events.md)).
- **Artefact execution is bounded.** Every execution carries depth, size, fanout, and time limits and is deterministic for a fixed snapshot; a result that hits a limit is marked **Partial / Bounded** ([artefact execution](./artefact-execution.md)).
- **Integrity is authoritative in the Rust core and Inferred, never Asserted.** It is scored across the five dimensions of [ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md) and is always drillable ([integrity scoring](./integrity-scoring.md)). Client-side validation is supplementary UX only.
- **Praxis depends on Mneme and on contracts; it does not depend on Metis, Chrona, or Continuum implementations** ([boundaries](./boundaries.md)).

---

## How the responsibilities fit together

A single user action runs through every responsibility in turn, which is why they live in one module:

1. The user authors a change as a **Change Event**, which Praxis validates against the **metamodel** and compiles into **operations** Mneme appends ([tasks and Change Events](./tasks-and-change-events.md)).
2. The user opens an **artefact** at a **viewpoint**; Praxis resolves the snapshot through Mneme, traverses it with the canonical relationships under explicit bounds, and returns an **Artefact result** ([artefact execution](./artefact-execution.md)).
3. The result carries an **integrity score** over its content ([integrity scoring](./integrity-scoring.md)) and an **explanation** that traces along the semantic spine ([explainability](./explainability.md)).
4. When the user works in a **scenario** and merges it, Praxis returns any **merge conflicts** in domain language ([merge and conflict](./merge-and-conflict.md)).

Heavy graph computation behind step 3 — centrality, impact, paths, cost — is delegated to [Metis](../metis/README.md); Praxis frames the domain question and explains the answer, but does not reimplement the algorithms.

---

## References & standards

_Normative:_

- The Open Group — **ArchiMate 3.2 Specification**. The relationship and type vocabulary Praxis enforces.
- The integrity-scoring model — **[ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)** and [Documentation Standard §8.1](../../02-standards/DOCUMENTATION-STANDARD.md).

Full bibliography: [STANDARDS-REGISTER.md](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                     | What it covers                                               |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [Edge catalogue](./edge-catalogue/README.md)                                                 | The canonical relationship vocabulary Praxis owns.           |
| [The metamodel](../../03-design/metamodel/README.md)                                         | The metamodel design — types, slots, validation, packages.   |
| [The semantic spine](../../03-design/semantic-spine/README.md)                               | The lineage integrity and explainability reason along.       |
| [Mneme module](../mneme/README.md)                                                           | Storage: op log, facts, projections, the storage trait.      |
| [Metis module](../metis/README.md)                                                           | Analytics: the engine Praxis delegates graph computation to. |
| [Module dependency map](../../01-architecture/module-dependency-map.md)                      | The crate dependency graph and the acyclic invariant.        |
| [Artefact execution boundary](../../01-architecture/boundary/artefact-execution-boundary.md) | Why artefacts execute in Praxis, not the renderer.           |
