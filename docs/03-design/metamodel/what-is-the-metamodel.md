# What the metamodel is

The metamodel is the authored, portable definition of the twin's modelling language. This file states what it is, the two layers it has, and why it sits in Praxis rather than in storage. It is for a reader who needs to understand the concept before reading the type tables.

---

## The principle

A [twin](../../../CONTEXT.md) can only hold what its modelling language allows. The **metamodel** is that language, expressed as data: it declares the [entity types](./entity-types.md) and [relationship types](./relationship-types.md) that may exist, the [slots](./slots-and-effective-schema.md) each may carry, the inheritance between types, and the [validation rules](./validation-rules.md) that constrain instances. It is _schema-as-data_ — committed JSON that travels with the workspace, not a set of hidden code enums.

This matters because the twin is portable and long-lived. If the modelling language lived in compiled code, opening a five-year-old workspace would require the exact build that wrote it. Because the language is data, a workspace carries its own definition and any open version of the product can resolve it.

The seed metamodel is [`docs/data/meta/core-v1.json`](../../data/meta/core-v1.json). It declares eight entity types and five relationship types, aligned to **ArchiMate 3.2** concepts (The Open Group, ArchiMate 3.2 Specification). It is the implemented truth this folder documents.

---

## Two layers: authored metamodel and compiled effective schema

The glossary draws a deliberate line between two forms ([`CONTEXT.md`](../../../CONTEXT.md)):

- The **metamodel** is the _authored_ source — the JSON document, with inheritance still expressed by reference (`extends`) and types still partial.
- The **effective schema** is the _compiled_ form — the flattened slot-and-rule set for a single type, after inheritance and metamodel rules have been applied. It is derived, never authored directly.

Validation and resolution use the effective schema, not the raw document. A type's effective schema is its own declared slots layered over the recursively flattened slots of its parents. [Slots and the effective schema](./slots-and-effective-schema.md) walks a compilation step by step.

The distinction is load-bearing for honesty: the authored metamodel is **Asserted** content (a human committed it), whereas any score computed over a type's completeness against its effective schema is **Inferred** (it is derived and recomputed when the schema changes) — see the [Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md) honest-state vocabulary.

---

## Why the metamodel lives in Praxis

Praxis owns meaning; Mneme owns storage ([DESIGN.md](../DESIGN.md), axiom 4). The metamodel is the most concentrated expression of meaning in the product, so it lives in Praxis. Praxis loads the document, compiles it, validates writes against it, and _publishes_ a `MetamodelBatch` to Mneme for persistence. Mneme stores the batch and answers effective-schema queries, but never invents or interprets a type.

The trade-off this closes: storage identifiers must not leak upward. Mneme addresses types and slots by opaque storage IDs; the rest of the product addresses them by stable string keys. The [registry](./packages-and-registry.md) is the single crossing point that translates between the two, so a change to Mneme's identifier scheme never ripples into task APIs or screens. The cost is one mandatory indirection on every type or slot reference — accepted, because it keeps the storage layer replaceable ([DESIGN.md](../DESIGN.md), axiom 9).

---

## What the metamodel does not decide

The metamodel decides what _kinds_ of thing can exist and what rules they obey. It does not decide:

- **When** a claim holds — that is the temporal model (valid time, asserted time), set by [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md).
- **Which world** a claim belongs to — that is [layer](../../../CONTEXT.md) and [scenario](../../../CONTEXT.md).
- **Whether** a modelled subgraph is well-founded — that is the [integrity score](../../02-standards/DOCUMENTATION-STANDARD.md), which reads the metamodel and the [semantic spine](../semantic-spine/README.md) as its expectation but is itself Inferred content.

The metamodel is the grammar. The temporal model is the tense. The integrity score grades the sentence against the grammar.

---

## References & standards

_Normative:_

- The Open Group — **ArchiMate 3.2 Specification**. The concept vocabulary the seed types align to.
- Fowler; Young — **Event Sourcing & CQRS**. Schema-as-data and derived read models — the authored document is canonical, the compiled effective schema is derived.

## Related documents

| Document                                                          | What it covers                                                       |
| ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Entity types](./entity-types.md)                                 | The eight seed entity types.                                         |
| [Slots and the effective schema](./slots-and-effective-schema.md) | How the authored document compiles.                                  |
| [Packages and the registry](./packages-and-registry.md)           | Compilation to `MetamodelBatch` and the registry.                    |
| [`CONTEXT.md`](../../../CONTEXT.md)                               | The glossary definitions of metamodel, effective schema, type, slot. |
