# Relationship types

The five relationship types the seed metamodel declares, with their endpoints, direction, multiplicity, attributes, and ArchiMate 3.2 mapping. Read directly from [`docs/data/meta/core-v1.json`](../../data/meta/core-v1.json). A [relationship](../../../CONTEXT.md) is a typed, directed connection between entities that is itself addressable — it carries its own slots.

This file is the metamodel-layer view. The full module-level treatment, including the temporal model and superseded names, is the [edge catalogue](../../05-modules/praxis/edge-catalogue/README.md). The two must agree; where they could drift, the [catalogue](../../05-modules/praxis/edge-catalogue/catalogue.md) is the module source of truth and this table is its metamodel projection.

---

## The five seed relationship types

| Type `id`     | Label             | From                                 | To                                                                    | Directed | Multiplicity           | Attributes                                                                                      | ArchiMate 3.2 relationship                                                        |
| ------------- | ----------------- | ------------------------------------ | --------------------------------------------------------------------- | -------- | ---------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `serves`      | Serves            | `Capability`                         | `ValueStreamStage`                                                    | yes      | many-to-many           | —                                                                                               | **Serving**                                                                       |
| `realises`    | Realises          | `Application`, `TechnologyComponent` | `Capability`, `BusinessProcess`                                       | yes      | many-to-many           | —                                                                                               | **Realization**                                                                   |
| `accesses`    | Accesses          | `BusinessProcess`, `Application`     | `DataEntity`                                                          | yes      | (implied many-to-many) | `mode` enum [read, write, readwrite] **required**                                               | **Access** (with access-type read/write/read-write)                               |
| `hosts`       | Hosts             | `TechnologyComponent`                | `Application`                                                         | yes      | many-to-many           | —                                                                                               | **Assignment** (technology layer; active→behaviour/serving)                       |
| `plan_effect` | Plan Event Effect | `PlanEvent`                          | `Capability`, `BusinessProcess`, `Application`, `TechnologyComponent` | yes      | (implied many-to-many) | `op` enum [create, update, delete, link, unlink] **required**; `target_ref` string **required** | Implementation & Migration **planned change** (a Work Package acting on a target) |

`serves` declares `allowSelf: false` and `accesses` declares `allowDuplicate: false` in the seed's [validation](./validation-rules.md) block. `accesses` and `plan_effect` are the two relationship types that carry their own attributes — a relationship is addressable, so `mode`, `op`, and `target_ref` are slots on the relationship itself, with their own facts over time ([`CONTEXT.md`](../../../CONTEXT.md), _Relationship_).

---

## Direction is meaning, not decoration

Each direction is chosen to match its ArchiMate relationship's semantics (The Open Group, ArchiMate 3.2 Specification):

- `serves`: **Capability → ValueStreamStage**. ArchiMate Serving points from the element that provides to the element that is served — a capability provides the ability a value-stream stage consumes.
- `realises`: **Application/TechnologyComponent → Capability/BusinessProcess**. ArchiMate Realization points from the more concrete element to the more abstract one it realises — an application realises a capability, not the reverse.
- `accesses`: **BusinessProcess/Application → DataEntity**, with `mode` carrying the access type. ArchiMate Access points from the behaviour/active element to the data object, and the read/write/read-write distinction is the access type the standard defines.
- `hosts`: **TechnologyComponent → Application**. The technology component is assigned to host the application. This is the deliberate reverse of the superseded `deployed_on` (which pointed Application → TechnologyComponent); see [superseded names](../../05-modules/praxis/edge-catalogue/superseded-names.md).
- `plan_effect`: **PlanEvent → target**. A planned change emanates from the Plan Event, carrying the operation (`op`) and the affected entity reference (`target_ref`).

Reversing any of these produces incorrect lineage and impact results, which is why direction is a metamodel obligation and not a presentation choice.

---

## Worked example — three relationships from the baseline

Using the seed dataset [`docs/data/base/baseline.yaml`](../../data/base/baseline.yaml):

- `n:capability:customer-insight` (`Capability`, tier Strategic) **serves** `n:valuestream-stage:discover` (`ValueStreamStage`). Valid endpoint pair: `Capability → ValueStreamStage`. ✔
- `n:application:insight-hub` (`Application`) **realises** `n:capability:customer-insight` (`Capability`). Valid: source `Application` is in `realises.from`; target `Capability` is in `realises.to`. ✔
- `n:application:insight-hub` **accesses** `n:data-entity:customer-profile` (`DataEntity`) with `mode = readwrite`. Valid: source `Application` is in `accesses.from`, target `DataEntity` is in `accesses.to`, and the required `mode` slot is present. ✔

A fourth, `n:application:insight-hub` **serves** `n:valuestream-stage:discover`, would be **rejected**: `Application` is not in `serves.from` (only `Capability` is). The end-to-end resolution of these facts at a viewpoint is walked in the [edge catalogue worked example](../../05-modules/praxis/edge-catalogue/catalogue.md#worked-example).

---

## References & standards

_Normative:_

- The Open Group — **ArchiMate 3.2 Specification**. Serving, Realization, Access (with access-type), Assignment relationships and the Implementation & Migration layer.

## Related documents

| Document                                                                       | What it covers                                                     |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| [Edge catalogue](../../05-modules/praxis/edge-catalogue/README.md)             | The full module-level treatment of these relationships.            |
| [Superseded names](../../05-modules/praxis/edge-catalogue/superseded-names.md) | The old→new mapping, including the `hosts`/`deployed_on` reversal. |
| [Entity types](./entity-types.md)                                              | The entity types these relationships connect.                      |
| [Validation rules](./validation-rules.md)                                      | `allowSelf` / `allowDuplicate` and attribute checks.               |
