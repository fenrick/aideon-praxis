# Edge catalogue

The canonical relationship vocabulary for Aideon Desktop — the fixed semantic surface every module uses to express
relationships between entities. The catalogue adopts the seed metamodel's ArchiMate-aligned relationship names and
directions: `serves`, `realises`, `accesses`, `hosts`, `plan_effect`.

This folder is the module-level source of truth for what those relationships mean. The metamodel-layer projection of the
same set is [relationship types](../../../03-design/metamodel/relationship-types.md); where the two could drift, this
catalogue governs and the metamodel doc is its projection. The implemented truth is
[`docs/data/meta/core-v1.json`](../../../data/meta/core-v1.json).

The catalogue is aligned to **ArchiMate 3.2** relationship semantics (The Open Group, ArchiMate 3.2 Specification).

---

## Contents

1. [Catalogue](./catalogue.md) — the five canonical relationships with real directions, attributes, cardinality,
   validation, and ArchiMate mapping, plus a worked example.
2. [Superseded names](./superseded-names.md) — the old→new mapping table and why the old set was retired.
3. [Temporal model](./temporal-model.md) — relationships as first-class facts with valid-time intervals; closing
   intervals not deletion; planned relationships via `plan_effect`.
4. [Constraints and rules](./constraints-and-rules.md) — the rules the core enforces on every relationship write.
5. [Extensions](./extensions.md) — how Aideon-specific relationship extensions are marked and governed.

---

## The five at a glance

| Relationship  | Direction                                                    | ArchiMate 3.2                             |
| ------------- | ------------------------------------------------------------ | ----------------------------------------- |
| `serves`      | Capability → ValueStreamStage                                | Serving                                   |
| `realises`    | Application/TechnologyComponent → Capability/BusinessProcess | Realization                               |
| `accesses`    | BusinessProcess/Application → DataEntity (with `mode`)       | Access                                    |
| `hosts`       | TechnologyComponent → Application                            | Assignment                                |
| `plan_effect` | PlanEvent → target (with `op`, `target_ref`)                 | Implementation & Migration planned change |

A [relationship](../../../../CONTEXT.md) is itself addressable: `accesses` and `plan_effect` carry their own attribute
slots, which are facts over time. Use the domain terms **entity** and **relationship** in prose; **node** and **edge**
are reserved for the graph projection ([`CONTEXT.md`](../../../../CONTEXT.md)).

---

## References & standards

_Normative:_

- The Open Group — **ArchiMate 3.2 Specification**. Serving, Realization, Access, Assignment relationships and the
  Implementation & Migration layer.

## Related documents

| Document                                                                 | What it covers                              |
| ------------------------------------------------------------------------ | ------------------------------------------- |
| [Relationship types](../../../03-design/metamodel/relationship-types.md) | The metamodel-layer projection of this set. |
| [Praxis module](../README.md)                                            | The module that owns the catalogue.         |
| [The metamodel](../../../03-design/metamodel/README.md)                  | Types, slots, validation, packages.         |
| [Semantic spine](../../../03-design/semantic-spine/README.md)            | The lineage these relationships form.       |
| [`core-v1.json`](../../../data/meta/core-v1.json)                        | The implemented relationship set.           |
