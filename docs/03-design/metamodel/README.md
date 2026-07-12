# The Metamodel

The metamodel is the authored, portable definition of the twin's modelling language — entity types, relationship types,
slots, inheritance, validation, and the registry that keeps storage identifiers out of the rest of the product. This
folder is the design record for it; the implemented seed is
[`docs/data/meta/core-v1.json`](../../data/meta/core-v1.json).

Praxis owns meaning; Mneme owns storage ([DESIGN.md](../DESIGN.md), axiom 4). The metamodel is where that meaning is
declared as data and compiled into the per-type [effective schema](../../../CONTEXT.md) that validation and resolution
use.

The metamodel is aligned to **ArchiMate 3.2** (element layers and relationship semantics) and **TOGAF Standard, 10th
Edition** (the business/application/technology layering and the strategy-to-execution lineage) — the two primary
enterprise-architecture references for the product (The Open Group, ArchiMate 3.2 Specification; The Open Group, TOGAF
Standard, 10th Edition). See the [standards register](../../02-standards/STANDARDS-REGISTER.md).

---

## Contents

1. [What the metamodel is](./what-is-the-metamodel.md) — the principle, the two layers (authored metamodel vs compiled
   effective schema), and the meaning/storage split.
2. [Entity types](./entity-types.md) — the eight seed entity types, their attributes and enums, and their ArchiMate
   mapping, from `core-v1.json`.
3. [Relationship types](./relationship-types.md) — the five seed relationship types, their endpoints, attributes, and
   ArchiMate mapping.
4. [Slots and the effective schema](./slots-and-effective-schema.md) — what a slot is, how inheritance flattens into a
   compiled effective schema, and a worked compilation.
5. [Packages and the registry](./packages-and-registry.md) — packages compiled to a `MetamodelBatch`; the domain↔storage
   registry; stable identifiers and how UUIDs are minted.
6. [Validation rules](./validation-rules.md) — the global attribute rules and per-relationship structural rules the seed
   declares, and how they are enforced.
7. [Extension and versioning](./extension-and-versioning.md) — SemVer per [ADR-0017](../../06-adrs/ADRS.md),
   forward-only evolution, and how a package extends per partition.
8. [Proposed spine-extension package](./proposed-spine-extension.md) — **PROPOSED, not implemented**: an
   ArchiMate-aligned package that would realise the missing [semantic-spine](../semantic-spine/README.md) roles.

---

## How to read this folder

A reader who wants the implemented truth reads [entity types](./entity-types.md) and
[relationship types](./relationship-types.md): these tabulate `core-v1.json` exactly. A reader who wants the design
rationale reads [what the metamodel is](./what-is-the-metamodel.md) and
[slots and the effective schema](./slots-and-effective-schema.md). A reader who wants to extend the model reads
[packages and the registry](./packages-and-registry.md) and [extension and versioning](./extension-and-versioning.md).

The metamodel is one half of a pair. The relationship types here are documented in full at the module level as the
[edge catalogue](../../05-modules/praxis/edge-catalogue/README.md); the lineage the types are expected to form is the
[semantic spine](../semantic-spine/README.md). Anything labelled **PLANNED** or **PROPOSED** is design intent and is not
present in the seed.

---

## References & standards

_Normative:_

- The Open Group — **ArchiMate 3.2 Specification**. Element layers and relationship semantics.
- The Open Group — **TOGAF Standard, 10th Edition**. ADM phases and the Architecture Content Framework.
- **JSON Schema 2020-12**. The validation vocabulary for the seed metamodel.
- **Semantic Versioning 2.0.0**. Versioning of the metamodel document and packages — [ADR-0017](../../06-adrs/ADRS.md).

_Informative:_

- ISO/IEC/IEEE 42010:2022 — architecture description (architecture viewpoints, disambiguated from the product's
  _Viewpoint_).

## Related documents

| Document                                                           | What it covers                                                    |
| ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| [`CONTEXT.md`](../../../CONTEXT.md)                                | The canonical glossary — metamodel, type, slot, effective schema. |
| [DESIGN.md](../DESIGN.md)                                          | The design axioms and the meaning/storage split.                  |
| [Semantic spine](../semantic-spine/README.md)                      | The lineage the types are expected to form.                       |
| [Edge catalogue](../../05-modules/praxis/edge-catalogue/README.md) | The relationship types documented at module level.                |
| [Praxis module](../../05-modules/praxis/README.md)                 | The module that owns the metamodel.                               |
| [`core-v1.json`](../../data/meta/core-v1.json)                     | The implemented seed metamodel.                                   |
