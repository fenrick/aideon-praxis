# Spine to seed types

The honest account of which spine roles the seed metamodel realises today and which are **PLANNED**. Each row is checked
against [`core-v1.json`](../../data/meta/core-v1.json). This file exists so that no reader mistakes the normative spine
for the implemented model — the [Documentation Standard §12](../../02-standards/DOCUMENTATION-STANDARD.md)
reconciliation mandate.

---

## Implemented vs planned

| Spine role     | Status          | Seed entity type(s) that realise it                     | What is missing                                                                               |
| -------------- | --------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Intent**     | **PLANNED**     | _(none)_                                                | No `Driver` / `Goal` type in the seed. The Motivation layer is unrepresented.                 |
| **Value**      | **PARTIAL**     | `ValueStreamStage` (a stage of a value stream)          | No `Outcome`, `Value`, or whole `ValueStream` type; value is expressed only as stream stages. |
| **Capability** | **IMPLEMENTED** | `Capability` (tier, lifecycle)                          | —                                                                                             |
| **Execution**  | **PARTIAL**     | `BusinessProcess` (criticality)                         | No `CourseOfAction` (strategy-layer execution); business function not typed.                  |
| **Technology** | **IMPLEMENTED** | `Application`, `TechnologyComponent`, `DataEntity`      | —                                                                                             |
| **Change**     | **IMPLEMENTED** | `PlanEvent` (effective_at, confidence, source.priority) | —                                                                                             |

Read plainly: the seed is strong from **Capability** down to **Change**, partial at **Value** and **Execution**, and
absent at **Intent**. The product can reason fully about how capabilities are realised and changed; it cannot yet reason
about the goals and outcomes those capabilities exist to serve, because there are no types for them.

---

## The relationship links, by status

The spine's links are the seed [relationships](../metamodel/relationship-types.md):

| Spine link                                  | Seed relationship                                                         | Status      |
| ------------------------------------------- | ------------------------------------------------------------------------- | ----------- |
| Value → Capability                          | `serves` (Capability → ValueStreamStage)                                  | IMPLEMENTED |
| Capability/Execution realised by Technology | `realises` (Application/TechnologyComponent → Capability/BusinessProcess) | IMPLEMENTED |
| Execution/Technology → Information          | `accesses` (BusinessProcess/Application → DataEntity)                     | IMPLEMENTED |
| Technology → Application                    | `hosts` (TechnologyComponent → Application)                               | IMPLEMENTED |
| any → Change                                | `plan_effect` (PlanEvent → target)                                        | IMPLEMENTED |
| Intent → Value                              | _(influences / realises_goal)_                                            | **PLANNED** |

The single PLANNED link, Intent → Value, is the one the
[proposed spine-extension package](../metamodel/proposed-spine-extension.md) would supply.

---

## What this means for scoring today

Because the Intent role and its link are absent, the [integrity score](../../02-standards/DOCUMENTATION-STANDARD.md)'s
**Completeness** and **Connectivity** dimensions ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)) treat
the upper spine as _expected but unmodellable_: a capability cannot be penalised for failing to link to a `Goal` that
has no type to instantiate. The scoring policy must therefore scope the spine expectation to roles that _can_ be
modelled, and record the missing roles as a known bound rather than a per-entity gap — otherwise every capability would
score identically low for a structural reason no user can fix. This is set out in
[how the spine drives integrity and explainability](./how-the-spine-drives-integrity-and-explainability.md).

When the [proposed package](../metamodel/proposed-spine-extension.md) is adopted, the PLANNED rows move to IMPLEMENTED
and the scope of the spine expectation widens to include Intent and full Value.

---

## References & standards

_Normative:_

- The Open Group — **ArchiMate 3.2 Specification**. The Motivation- and Strategy-layer elements the PLANNED rows
  reference.

## Related documents

| Document                                                                                                    | What it covers                                |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| [The spine](./the-spine.md)                                                                                 | The lineage these roles belong to.            |
| [Spine to ArchiMate mapping](./spine-to-archimate-mapping.md)                                               | The standards anchor for each role.           |
| [Entity types](../metamodel/entity-types.md)                                                                | The seed types named in the implemented rows. |
| [Proposed spine extension](../metamodel/proposed-spine-extension.md)                                        | The PROPOSED types for the PLANNED rows.      |
| [How the spine drives integrity and explainability](./how-the-spine-drives-integrity-and-explainability.md) | How absent roles are scored honestly.         |
