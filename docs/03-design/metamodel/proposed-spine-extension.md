# Proposed spine-extension package

**PROPOSED — not implemented.** This document describes a candidate metamodel package that would realise the
[semantic-spine](../semantic-spine/README.md) roles the seed does not yet implement. It is design-level only: it is
**not** wired into [`core-v1.json`](../../data/meta/core-v1.json), no instance of these types exists, and nothing in the
product depends on it. It is recorded here so the path from the current seed to a fully spine-aligned metamodel is
explicit and reviewable.

Every type and relationship below is **PROPOSED**. UUID assignment is **deferred to the metamodel compiler** in all
cases (UUIDv5 from the project namespace and the type/attribute name path —
[packages and the registry](./packages-and-registry.md)); this document assigns no UUID values.

---

## Why this package would exist

The [semantic spine](../semantic-spine/the-spine.md) is the lineage **Intent → Value → Capability → Execution →
Technology → Change**. The seed realises the middle and lower reaches (Capability, Execution, Technology, Change) but
has no entity types for **Intent** (the ArchiMate Motivation layer) and only a partial expression of **Value** (via
`ValueStreamStage`). The [spine-to-seed-types mapping](../semantic-spine/spine-to-seed-types.md) lists these gaps as
PLANNED.

This package would close those gaps with ArchiMate 3.2 Motivation- and Strategy-layer elements (The Open Group,
ArchiMate 3.2 Specification), so that integrity scoring and explainability can reason over a complete spine
([how the spine drives integrity and explainability](../semantic-spine/how-the-spine-drives-integrity-and-explainability.md)).

It would be installed as an overlay package on a [partition](../DESIGN.md), additively, as a **minor** version bump
under the [extension rules](./extension-and-versioning.md) — no existing type or instance changes.

---

## Proposed entity types

All in the **Motivation** or **Strategy** layer. Categories follow the seed convention (`Motivation`, `Strategy`).

| PROPOSED type `id` | Proposed category | Spine role            | Proposed attributes                                                                   | ArchiMate 3.2 element                                                       |
| ------------------ | ----------------- | --------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `Driver`           | Motivation        | Intent                | `name` (string, required); `description` (text); `kind` enum [Internal, External]     | **Driver**                                                                  |
| `Goal`             | Motivation        | Intent                | `name` (string, required); `description` (text); `horizon` enum [Short, Medium, Long] | **Goal**                                                                    |
| `Outcome`          | Motivation        | Value / Intent        | `name` (string, required); `measure` (string); `target_value` (string)                | **Outcome**                                                                 |
| `Value`            | Motivation        | Value                 | `name` (string, required); `stakeholder` (string)                                     | **Value**                                                                   |
| `CourseOfAction`   | Strategy          | Execution (strategic) | `name` (string, required); `description` (text); `horizon` enum [Short, Medium, Long] | **Course of Action**                                                        |
| `ValueStream`      | Strategy          | Value                 | `name` (string, required); `purpose` (string); `owner` (string)                       | **Value Stream** (the whole stream that a `ValueStreamStage` is a stage of) |

`ValueStream` is proposed to give `ValueStreamStage` a parent it currently lacks — and would be a candidate to satisfy
the unresolved `ValueStreamStage extends Stage` reference noted in
[slots and the effective schema](./slots-and-effective-schema.md), if `Stage` were defined as an abstract base.

---

## Proposed relationship types

All map to ArchiMate 3.2 Motivation/Strategy relationships. Endpoints reference both proposed and existing seed types.

| PROPOSED relationship `id` | From                                      | To                                                | Proposed attributes                                        | ArchiMate 3.2 relationship |
| -------------------------- | ----------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------- | -------------------------- |
| `influences`               | `Driver`, `Goal`, `Outcome`               | `Goal`, `Outcome`, `Capability`, `CourseOfAction` | `sign` enum [+, -, 0]; `strength` enum [High, Medium, Low] | **Influence**              |
| `realises_goal`            | `Capability`, `CourseOfAction`, `Outcome` | `Goal`                                            | —                                                          | **Realization**            |
| `associated_with`          | `Outcome`                                 | `Value`, `ValueStreamStage`                       | —                                                          | **Association**            |
| `aggregates_stage`         | `ValueStream`                             | `ValueStreamStage`                                | —                                                          | **Aggregation**            |
| `serves_outcome`           | `Capability`                              | `Outcome`                                         | —                                                          | **Serving**                |

`influences` deliberately carries a `sign` and `strength`, matching ArchiMate Influence's signed, weighted semantics —
the relationship is addressable, so these are slots on it.

---

## How this would integrate, if adopted

If this package were authored into a real overlay:

1. its `version` would have to match the partition's metamodel version, or extension would be rejected
   ([packages and the registry](./packages-and-registry.md));
2. the compiler would mint UUIDv5 identifiers for every type, attribute, and relationship from the project namespace —
   this document assigns none;
3. the [spine-to-seed-types mapping](../semantic-spine/spine-to-seed-types.md) would move the **Intent** and **Value**
   rows from PLANNED to implemented;
4. the integrity score's **Connectivity** and **Completeness** dimensions would begin to reward a capability that links
   up to a `Goal` and `Outcome`, not only down to its realising applications.

Until then, the spine treats Intent and Value as expected-but-absent, and scores their absence honestly rather than
pretending the link exists
([how the spine drives integrity and explainability](../semantic-spine/how-the-spine-drives-integrity-and-explainability.md)).

---

## References & standards

_Normative:_

- The Open Group — **ArchiMate 3.2 Specification**. Motivation layer (Driver, Goal, Outcome, Value), Strategy layer
  (Course of Action, Value Stream), and the Influence, Realization, Association, Aggregation, Serving relationships.
- The Open Group — **TOGAF Standard, 10th Edition**. Phase A (Architecture Vision) and Phase B motivation/strategy
  inputs.

## Related documents

| Document                                                        | What it covers                               |
| --------------------------------------------------------------- | -------------------------------------------- |
| [The spine](../semantic-spine/the-spine.md)                     | The lineage this package would complete.     |
| [Spine-to-seed types](../semantic-spine/spine-to-seed-types.md) | Implemented vs planned roles.                |
| [Extension and versioning](./extension-and-versioning.md)       | The additive rules this package obeys.       |
| [Packages and the registry](./packages-and-registry.md)         | UUID minting, deferred here to the compiler. |
