# Entity types

The eight entity types the seed metamodel declares, with their category, attributes, enum values, required flags, and ArchiMate 3.2 mapping. This is the implemented truth, read directly from [`docs/data/meta/core-v1.json`](../../data/meta/core-v1.json) — not an aspiration. An [entity](../../../CONTEXT.md) is an identified thing in the twin that carries [slots](./slots-and-effective-schema.md); its **type** governs which slots it may carry.

---

## The eight seed entity types

| Type `id`             | Label                | Category    | Required attrs                             | Optional attrs (enum values)                                                                                              | ArchiMate 3.2 element                                                             |
| --------------------- | -------------------- | ----------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `ValueStreamStage`    | Value Stream Stage   | Business    | `name` (string)                            | `purpose` (string), `owner` (string)                                                                                      | Value Stream / Course of Action stage (Strategy layer); a stage of a Value Stream |
| `Capability`          | Capability           | Business    | `name` (string)                            | `tier` enum [Strategic, Core, Supporting]; `lifecycle` enum [Target, Current, Retire]                                     | **Capability** (Strategy layer)                                                   |
| `BusinessProcess`     | Process              | Business    | `name` (string)                            | `description` (text); `criticality` enum [High, Medium, Low]                                                              | **Business Process** (Business layer)                                             |
| `Application`         | Application          | Application | `name` (string)                            | `vendor` (string); `disposition` enum [Invest, Tolerate, Migrate, Eliminate]; `lifecycle` enum [Plan, Build, Run, Retire] | **Application Component** (Application layer)                                     |
| `DataEntity`          | Data Entity          | Information | `name` (string)                            | `sensitivity` enum [Public, Internal, Confidential]                                                                       | **Data Object** (Application layer) / Business Object where conceptual            |
| `TechnologyComponent` | Technology Component | Technology  | `name` (string)                            | `provider` (string); `deployment` enum [On-Prem, IaaS, PaaS, SaaS]                                                        | **Node** / System Software (Technology layer)                                     |
| `PlanEvent`           | Plan Event           | Planning    | `name` (string), `effective_at` (datetime) | `confidence` (number); `source.priority` enum [P0, P1, P2]                                                                | **Work Package / Plateau** (Implementation & Migration layer)                     |
| `MetaModelEntry`      | Meta-model Entry     | Design      | `name` (string), `payload` (text)          | `description` (text)                                                                                                      | No ArchiMate element — a metamodel self-description record (Design category)      |

Enum matching is case-insensitive across the seed ([validation rules](./validation-rules.md)). `string` attributes are capped at 256 characters and `text` at 4096. `disposition` follows the TIME portfolio framing (Tolerate / Invest / Migrate / Eliminate) used in application portfolio management (Gartner, _TIME model for application portfolio management_).

---

## Attribute kinds

Every attribute carries a `type` token. The seed uses six of the supported kinds:

| Kind           | Token              | Used by (examples)                                                                |
| -------------- | ------------------ | --------------------------------------------------------------------------------- |
| String         | `string`           | every `name`; `Application.vendor`; `TechnologyComponent.provider`                |
| Text           | `text`             | `BusinessProcess.description`; `MetaModelEntry.payload`                           |
| Number         | `number`           | `PlanEvent.confidence`                                                            |
| Enum           | `enum`             | `Capability.tier`; `Application.disposition`; `accesses.mode` (on a relationship) |
| Datetime       | `datetime`         | `PlanEvent.effective_at` (RFC 3339)                                               |
| Boolean / Blob | `boolean` / `blob` | supported by the compiler; not used by any seed entity type                       |

Each attribute also carries a stable `uuid` in the seed (e.g. `Capability.tier` is `c27ee320-dea9-5263-b362-d94c4a22bb77`). These are **not invented** here — they are minted by the metamodel compiler and committed in source; see [packages and the registry](./packages-and-registry.md) for how they are generated and why they must never change.

---

## How the categories map to ArchiMate layers

The `category` field places each type in a layer, and those layers line up with ArchiMate 3.2 and the TOGAF ADM (The Open Group, ArchiMate 3.2 Specification; The Open Group, TOGAF Standard, 10th Edition):

| Seed `category`                                         | ArchiMate 3.2 layer              | TOGAF ADM phase                              |
| ------------------------------------------------------- | -------------------------------- | -------------------------------------------- |
| Business (`Capability`, `ValueStreamStage`)             | Strategy layer                   | Phase B — Business / Phase A strategy inputs |
| Business (`BusinessProcess`)                            | Business layer                   | Phase B — Business Architecture              |
| Application (`Application`), Information (`DataEntity`) | Application layer                | Phase C — Information Systems Architectures  |
| Technology (`TechnologyComponent`)                      | Technology layer                 | Phase D — Technology Architecture            |
| Planning (`PlanEvent`)                                  | Implementation & Migration layer | Phase F — Migration Planning                 |
| Design (`MetaModelEntry`)                               | — (metamodel self-description)   | —                                            |

`MetaModelEntry` is the one type with no ArchiMate counterpart: it records metamodel content about the model itself, not an element of the modelled organisation. It is honest to say so rather than force a mapping.

---

## What the seed does _not_ yet declare

The seed has no entity type for the **Motivation** layer (Driver, Goal, Outcome) or for **Value** as a distinct element, and no `CourseOfAction`. These are roles the [semantic spine](../semantic-spine/README.md) expects but the seed does not implement. They are documented as **PLANNED** in [spine-to-seed-types](../semantic-spine/spine-to-seed-types.md) and a candidate package that would add them is set out, marked **PROPOSED**, in [proposed-spine-extension](./proposed-spine-extension.md). No document describes these as if they exist today.

---

## References & standards

_Normative:_

- The Open Group — **ArchiMate 3.2 Specification**. Element definitions: Capability, Business Process, Application Component, Data Object, Node, Work Package, Plateau, Value Stream.
- The Open Group — **TOGAF Standard, 10th Edition**. ADM phases B/C/D/F.

_Informative:_

- Gartner — **TIME model** for application portfolio management. The `Application.disposition` enum.

## Related documents

| Document                                                          | What it covers                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------- |
| [Relationship types](./relationship-types.md)                     | The five seed relationship types that connect these entities. |
| [Slots and the effective schema](./slots-and-effective-schema.md) | How attributes flatten through inheritance.                   |
| [Validation rules](./validation-rules.md)                         | The length and enum rules these attributes obey.              |
| [Spine-to-seed types](../semantic-spine/spine-to-seed-types.md)   | Which spine roles each type realises, and which are planned.  |
| [`core-v1.json`](../../data/meta/core-v1.json)                    | The source these tables are read from.                        |
