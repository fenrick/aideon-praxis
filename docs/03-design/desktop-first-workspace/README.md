# Desktop-First Portable Workspace

The single design thesis Aideon Desktop rests on, decomposed into focused files. The product is a **file-first canonical workspace** plus a **derived local index engine**: the thing a user opens, copies, zips, shares, syncs, or backs up is a normal workspace folder, and Mneme builds disposable fast structures from it. This README orients the reader and links the parts; each part answers one question.

The decisions described here are fixed in the [ADR set](../../06-adrs/ADRS.md). These documents explain the shape and the reasoning; they do not make the decisions.

---

## Contents

1. [The thesis](./the-thesis.md) — what the user actually handles is a workspace folder, and how the product's constraints map onto that choice.
2. [The authority split](./authority-split.md) — canonical versus derived: the rule that resolves arguments about where a thing lives.
3. [Portability](./portability.md) — the portability properties the format targets, stated as validatable design-intent targets.
4. [Why a database file is not the project](./why-a-db-file-is-not-the-project.md) — why an embedded database file cannot be the canonical record.
5. [The load-bearing decisions](./load-bearing-decisions.md) — the ADRs that fix these invariants, each in one line.

---

## The workspace folder layout

A workspace is a directory. Everything under `model/` and `objects/` is **canonical**: it is the durable truth. Everything under `.aideon/runtime/` is **derived**: delete it and the workspace still opens; rebuild it and the same effective graph returns.

```text
my-project.aideon/
  manifest.json              CANONICAL  workspace identity and format version
  model/ops/                 CANONICAL  append-only operation segments
  model/schema/              CANONICAL  schema-as-data (the metamodel)
  objects/sha256/            CANONICAL  content-addressed blobs
  docs/                      CANONICAL  notes, imports
  .aideon/runtime/           DERIVED    tuple indexes, projections, search/vector, checkpoints
```

The canonical material is the **operation** log plus the **metamodel** (schema-as-data) plus the content-addressed blob bytes. A **fact** is derived from the operation log; an **effective graph**, the tuple indexes, the runtime database, and any previews are derived from facts and schema. The canonical-versus-derived rule is stated once in [the authority split](./authority-split.md) and must not be restated elsewhere.

---

## References & standards

_Informative — the foundational references this thesis leans on (full list in the [standards register](../../02-standards/STANDARDS-REGISTER.md)):_

- Fowler; Young — **Event Sourcing & CQRS**. The append-only operation log as truth, with derived read models rebuilt from it.
- Merkle, 1987; **Git internals**; **IPFS** content-addressable storage. Hash-addressed immutable blobs and deduplication by hash.

## Related documents

| Document                                                                                  | What it covers                                                                 |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [The thesis](./the-thesis.md)                                                             | The thesis in full and how each constraint maps to the design.                 |
| [The authority split](./authority-split.md)                                               | The canonical-versus-derived rule and its flow to the UI.                      |
| [Portability](./portability.md)                                                           | The portability properties stated as design-intent targets.                    |
| [Why a database file is not the project](./why-a-db-file-is-not-the-project.md)           | Why a portable folder beats an embedded database file.                         |
| [The load-bearing decisions](./load-bearing-decisions.md)                                 | The ADRs that fix these invariants.                                            |
| [`../design-axioms.md`](../design-axioms.md)                                              | The design axioms the whole product layer rests on.                            |
| [`../README.md`](../README.md)                                                            | The product-design layer entry point.                                          |
| [`ARCHITECTURE-BOUNDARY.md`](../../01-architecture/ARCHITECTURE-BOUNDARY.md)              | The boundary rules that place canonical and derived material.                  |
| [`mneme/README.md`](../../05-modules/mneme/README.md)                                     | The storage module that reads the workspace and builds the derived structures. |
| [`TEMPORAL-AND-SCENARIO-CONTEXT.md`](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The temporal model carried on every read and write.                            |
| [`CONTEXT.md`](../../../CONTEXT.md)                                                       | The canonical domain glossary.                                                 |
