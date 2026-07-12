# The baseline dataset

What the seed graph in [`base/baseline.yaml`](./base/baseline.yaml) actually contains — the real value streams,
capabilities, applications, data entities, technology components, and plan events a fresh workspace starts with — and
how each maps to the [seed metamodel](./meta/core-v1.json). For a reader who needs to know the seeded content by name,
or to extend it. Every identifier below is read directly from the dataset; none is invented.

The dataset is a small but complete strategy-to-execution graph: a value stream realised by capabilities, capabilities
realised by applications, applications hosted on technology and reading and writing data, and FY26 plan events that act
on that graph. It exists so a new twin immediately reflects a realistic shape rather than an empty canvas.

---

## Contents

1. [Structure of the file](#structure-of-the-file)
2. [The seeded entities](#the-seeded-entities)
3. [The seeded relationships](#the-seeded-relationships)
4. [The plan layer](#the-plan-layer)
5. [How the dataset maps to the metamodel](#how-the-dataset-maps-to-the-metamodel)

---

## Structure of the file

`baseline.yaml` carries a `version`, a `released` date, a `description`, a `defaults` block (branch `main`, author
`baseline`, tags `[baseline, v1]`), and an ordered list of `commits`. Each commit groups `nodes` (the graph projection
of [entities](../../CONTEXT.md)) and `edges` (the graph projection of [relationships](../../CONTEXT.md)) under a `key`,
a `message`, and `tags`. The seed uses graph terms (`nodes`, `edges`) because it is the import format for the graph
projection; the domain reading is entities and relationships.

Two commits make up v1.0.0:

| Commit `key`     | Message                                      | Seeds                                                                                   |
| ---------------- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| `baseline-graph` | `baseline: seed strategy-to-execution graph` | the value stream, capabilities, applications, data, technology, and their relationships |
| `baseline-plan`  | `baseline: add FY26 plan events`             | the two plan events and their `plan_effect` relationships                               |

---

## The seeded entities

### Value-stream stages (`ValueStreamStage`)

| Node `id`                      | `name`   | `purpose`          | `owner`          |
| ------------------------------ | -------- | ------------------ | ---------------- |
| `n:valuestream-stage:discover` | Discover | Surface new demand | Strategy Office  |
| `n:valuestream-stage:design`   | Design   | Shape experiences  | Journey Studio   |
| `n:valuestream-stage:deliver`  | Deliver  | Ship capabilities  | Operations Guild |

### Capabilities (`Capability`)

| Node `id`                            | `name`                | `tier`     |
| ------------------------------------ | --------------------- | ---------- |
| `n:capability:customer-insight`      | Customer Insight      | Strategic  |
| `n:capability:journey-orchestration` | Journey Orchestration | Core       |
| `n:capability:automation-fabric`     | Automation Fabric     | Supporting |

The three `tier` values exercise all three declared enum variants (`Strategic`, `Core`, `Supporting`).

### Applications (`Application`)

| Node `id`                               | `name`                  | `vendor`     | `disposition` | `lifecycle` |
| --------------------------------------- | ----------------------- | ------------ | ------------- | ----------- |
| `n:application:insight-hub`             | Insight Hub             | Praxis Cloud | Invest        | Run         |
| `n:application:journey-studio`          | Journey Studio          | Aideon       | Invest        | Build       |
| `n:application:automation-orchestrator` | Automation Orchestrator | Praxis Cloud | Migrate       | Plan        |

### Data entities (`DataEntity`)

| Node `id`                        | `name`           | `sensitivity` |
| -------------------------------- | ---------------- | ------------- |
| `n:data-entity:customer-profile` | Customer Profile | Internal      |
| `n:data-entity:engagement-event` | Engagement Event | Confidential  |

### Technology components (`TechnologyComponent`)

| Node `id`                       | `name`           | `provider`   | `deployment` |
| ------------------------------- | ---------------- | ------------ | ------------ |
| `n:technology:stream-processor` | Stream Processor | Praxis Cloud | PaaS         |
| `n:technology:event-bus`        | Event Bus        | Aideon Core  | SaaS         |

---

## The seeded relationships

From the `baseline-graph` commit. Each is a typed, directed edge whose endpoints satisfy the metamodel's `from`/`to`
sets ([relationship types](../03-design/metamodel/relationship-types.md)).

| Edge `id`                          | Type       | From → To                                   | Attributes            |
| ---------------------------------- | ---------- | ------------------------------------------- | --------------------- |
| `e:capability-serves-discover`     | `serves`   | Customer Insight → Discover                 | `confidence: 0.95`    |
| `e:capability-serves-design`       | `serves`   | Journey Orchestration → Design              | `confidence: 0.9`     |
| `e:capability-serves-deliver`      | `serves`   | Automation Fabric → Deliver                 | `confidence: 0.88`    |
| `e:insight-realises-insight`       | `realises` | Insight Hub → Customer Insight              | `criticality: High`   |
| `e:journey-realises-journey`       | `realises` | Journey Studio → Journey Orchestration      | `criticality: High`   |
| `e:automation-realises-automation` | `realises` | Automation Orchestrator → Automation Fabric | `criticality: Medium` |
| `e:insight-accesses-profile`       | `accesses` | Insight Hub → Customer Profile              | `mode: readwrite`     |
| `e:journey-accesses-event`         | `accesses` | Journey Studio → Engagement Event           | `mode: read`          |
| `e:stream-hosts-insight`           | `hosts`    | Stream Processor → Insight Hub              | —                     |
| `e:eventbus-hosts-journey`         | `hosts`    | Event Bus → Journey Studio                  | —                     |

The `serves` edges carry a `confidence` value and the `realises` edges a `criticality`; these are slots on the
relationships themselves, which is why a relationship is addressable in the domain ([`CONTEXT.md`](../../CONTEXT.md),
_Relationship_). Note that the seed metamodel does not declare `confidence` or `criticality` as attributes on
`serves`/`realises` — they are dataset-supplied slot values that a future metamodel revision should declare; until then
they are extra data the importer carries but the effective schema does not constrain.

The graph reads as one lineage: technology **hosts** applications, applications **realise** capabilities and **access**
data, and capabilities **serve** the value-stream stages — the strategy-to-execution chain end to end.

---

## The plan layer

From the `baseline-plan` commit. Two `PlanEvent` entities and four `plan_effect` relationships that act on the base
graph. A [Plan Event](../../CONTEXT.md) is an authoring object whose `effective_at` is the valid-from of the facts it
produces; the dataset seeds the events and their declared effects, not the resolved future facts.

| Node `id`                           | `name`                     | `effective_at`         | `confidence` | `source.priority` |
| ----------------------------------- | -------------------------- | ---------------------- | ------------ | ----------------- |
| `n:plan-event:fy26-modernization`   | FY26 Insight Modernization | `2026-01-15T00:00:00Z` | 0.7          | P1                |
| `n:plan-event:fy26-channel-cutover` | FY26 Q2 Channel Cutover    | `2026-05-01T00:00:00Z` | 0.8          | P2                |

| Edge `id`                          | From → To                                       | `op`   | `target_ref`                         |
| ---------------------------------- | ----------------------------------------------- | ------ | ------------------------------------ |
| `e:plan-modernization-capability`  | FY26 Insight Modernization → Customer Insight   | update | `n:capability:customer-insight`      |
| `e:plan-modernization-application` | FY26 Insight Modernization → Insight Hub        | update | `n:application:insight-hub`          |
| `e:plan-cutover-capability`        | FY26 Q2 Channel Cutover → Journey Orchestration | link   | `n:capability:journey-orchestration` |
| `e:plan-cutover-application`       | FY26 Q2 Channel Cutover → Journey Studio        | update | `n:application:journey-studio`       |

Each `plan_effect` carries the required `op` and `target_ref` slots
([relationship types](../03-design/metamodel/relationship-types.md)). The FY26 Insight Modernization initiative is the
one the [changelog](./base/CHANGELOG.md) names: it targets the Customer Insight capability and its realising Insight Hub
application.

---

## How the dataset maps to the metamodel

Every seeded node names one of the eight declared entity types and every seeded edge names one of the five declared
relationship types — there is a one-to-one correspondence between the dataset's `type` tokens and the metamodel's `id`s.

| Dataset type          | Metamodel entity type                                        | ArchiMate 3.2 layer                                 |
| --------------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| `ValueStreamStage`    | [`ValueStreamStage`](../03-design/metamodel/entity-types.md) | Strategy — value-stream stage                       |
| `Capability`          | `Capability`                                                 | Strategy — Capability                               |
| `Application`         | `Application`                                                | Application — Application Component                 |
| `DataEntity`          | `DataEntity`                                                 | Application — Data Object                           |
| `TechnologyComponent` | `TechnologyComponent`                                        | Technology — Node                                   |
| `PlanEvent`           | `PlanEvent`                                                  | Implementation & Migration — Work Package / Plateau |

The dataset does **not** seed a `BusinessProcess` or a `MetaModelEntry`; both types exist in the metamodel but have no
v1.0.0 instance. That is a coverage gap a future dataset revision may close, recorded here so the absence is visible
rather than assumed.

The mapping is what makes the worked examples elsewhere in the corpus runnable: a document that resolves
`n:application:insight-hub` **realises** `n:capability:customer-insight` is naming real seed identifiers against a real
metamodel type ([DOCUMENTATION-STANDARD.md §6](../02-standards/DOCUMENTATION-STANDARD.md)).

---

## References & standards

_Normative:_

- The Open Group — **ArchiMate 3.2 Specification**. The layer mapping each seeded type follows.
- The Open Group — **TOGAF Standard, 10th Edition**. The strategy-to-execution lineage the seed graph forms.

## Related documents

| Document                                                              | What it covers                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [README.md](./README.md)                                              | The baseline-data operational note — layout, workflow, validation, guardrails. |
| [schema-governance.md](./schema-governance.md)                        | How the types these instances use are governed.                                |
| [entity-types.md](../03-design/metamodel/entity-types.md)             | The eight entity types and their attributes.                                   |
| [relationship-types.md](../03-design/metamodel/relationship-types.md) | The five relationship types and their endpoints.                               |
| [base/CHANGELOG.md](./base/CHANGELOG.md)                              | The SemVer history of this dataset.                                            |
| [`CONTEXT.md`](../../CONTEXT.md)                                      | The canonical glossary — entity, relationship, Plan Event.                     |
