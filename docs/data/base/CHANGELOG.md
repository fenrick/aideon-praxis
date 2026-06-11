# Baseline dataset changelog

The SemVer history of [`baseline.yaml`](./baseline.yaml). Every change to the seed dataset is recorded here with its date and the entities or relationships affected, so the seed's evolution is auditable from this file alone.

## How to version a change

The dataset `version` field follows **Semantic Versioning 2.0.0** ([ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md)). The dataset is versioned independently of the metamodel document; the metamodel's own bump rules are in [extension and versioning](../../03-design/metamodel/extension-and-versioning.md).

| Change to the dataset                                                                          | Bump                                                              |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Add an entity, relationship, or commit block; add an optional attribute value to a seeded item | **minor** — the graph grows; existing seeded content is unchanged |
| Remove or rename a seeded `id`; change a seeded value that tests or fixtures pin               | **major** — a consumer of the old seed sees different data        |
| Editorial change with no graph effect (a `description`, a comment, reformatting)               | **patch**                                                         |

Add a new entry at the top for each release, newest first, with the date in ISO-8601. Update the guardrail-count table in [../README.md](../README.md) in the same change when counts shift.

---

## 1.0.0 — 2025-11-11

Initial baseline. Seeds a complete strategy-to-execution graph (see [baseline-dataset.md](../baseline-dataset.md) for the full inventory).

- **Value stream:** three `ValueStreamStage` entities — Discover, Design, Deliver — each `serves`-connected to one capability.
- **Capabilities:** three `Capability` entities — Customer Insight (Strategic), Journey Orchestration (Core), Automation Fabric (Supporting).
- **Applications and realisation:** three `Application` entities that `realise` the capabilities; two `DataEntity` entities the applications `access`; two `TechnologyComponent` entities that `host` the applications.
- **Plan layer:** two FY26 `PlanEvent` entities with four `plan_effect` relationships, targeting the FY26 Insight Modernization initiative (Customer Insight + Insight Hub) and the FY26 Q2 Channel Cutover (Journey Orchestration + Journey Studio).
