# Baseline dataset and seed metamodel

The versioned data that seeds a new workspace: the seed metamodel (`meta/core-v1.json`), which declares the modelling language, and the baseline dataset (`base/baseline.yaml`), which seeds a realistic strategy-to-execution graph against it. For a reader who needs to edit, validate, or version this data. These files are treated as **data-first** artefacts — reviewed, tested, and reproducible across CI and local builds — because they define what every fresh twin starts from.

The metamodel here is the _implementation_ of the design recorded in [`03-design/metamodel/`](../03-design/metamodel/README.md); that folder is the authority on meaning, this folder is where it lives as data.

---

## Contents

1. [Layout](#layout)
2. [The two payloads](#the-two-payloads)
3. [Editing workflow](#editing-workflow)
4. [Validation against the metamodel](#validation-against-the-metamodel)
5. [Quality gates and guardrail counts](#quality-gates-and-guardrail-counts)
6. [Importer error reporting](#importer-error-reporting)
7. [Version bump rules](#version-bump-rules)
8. [Known reconciliation — the `Stage` gap](#known-reconciliation--the-stage-gap)

---

## Layout

```
docs/data/
  README.md                 # this file — the operational note
  schema-governance.md       # how to add/deprecate a type or relationship
  baseline-dataset.md        # what the seed graph contains
  meta/
    core-v1.json            # the seed metamodel (modelling language)
  base/
    baseline.yaml           # the seed dataset (the graph)
    CHANGELOG.md            # SemVer history of the dataset
  fixtures/                 # test-oracle pack — expected outputs the build is checked against
    operations/             # valid/invalid operation fixtures (vs docs/contracts/operations schemas)
    metamodel/              # expected compiled effective schemas + validation error codes
    temporal/               # resolution vectors: input ops + viewpoint -> resolved output
    artefacts/              # expected catalogue request/result oracles
    rebuild/                # the canonical-vs-derived rebuild-equivalence oracle
```

The seed (`meta/`, `base/`) is what a fresh workspace **starts from**; the **fixtures** (`fixtures/`) are the expected **outputs** a build is checked against, indexed per subfolder and referenced by the [build contracts](../build-contracts/README.md).

This folder holds **seed data and fixtures only**. The IPC, event, and shell-command **manifests are not seed data** — they live in [`docs/contracts/`](../contracts/) (authoritative and drift-checked by `tests/contracts/*`), per the [contract precedence](../build-contracts/README.md#contract-precedence). Do not add manifest copies here.

Two concerns, two files. `meta/core-v1.json` declares _what can exist_ — the [entity](../../CONTEXT.md) and [relationship](../../CONTEXT.md) types, their slots, and validation. `base/baseline.yaml` declares _what does exist_ in a fresh workspace — concrete entities and relationships expressed as graph nodes and edges with time and scenario context. The metamodel is the language; the dataset is one sentence written in it.

---

## The two payloads

| File                 | What it is                                                                                                                                    | Authored or derived                                                        | Governed by                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `meta/core-v1.json`  | The seed [metamodel](../../CONTEXT.md) — eight entity types, five relationship types, a validation block, all carrying stable UUIDs           | Authored; compiled by Praxis into the [effective schema](../../CONTEXT.md) | [schema-governance.md](./schema-governance.md), [03-design/metamodel](../03-design/metamodel/README.md) |
| `base/baseline.yaml` | The seed dataset — value-stream stages, capabilities, applications, data entities, technology, and FY26 plan events, plus their relationships | Authored; imported into a fresh Praxis datastore                           | [baseline-dataset.md](./baseline-dataset.md), [base/CHANGELOG.md](./base/CHANGELOG.md)                  |

The metamodel's UUIDs are **minted by the compiler, never hand-authored** — see [schema-governance.md](./schema-governance.md) and the metamodel's [packages and registry](../03-design/metamodel/packages-and-registry.md). The dataset uses string keys (`n:capability:customer-insight`) and never UUIDs.

---

## Editing workflow

1. **Decide which payload changes.** A new _type_ or _relationship type_ is a metamodel change (`meta/core-v1.json`) and follows [schema-governance.md](./schema-governance.md). A new _instance_ — another application, another plan event — is a dataset change (`base/baseline.yaml`).
2. **Edit the file.** Keep dataset operations append-only where the change is additive: add a new commit block rather than rewriting an existing one, so the seed reads as a history. Bump the `version` field per the [version bump rules](#version-bump-rules) and record the change in [base/CHANGELOG.md](./base/CHANGELOG.md).
3. **Dry-run the importer** against a scratch datastore to validate without writing:
   ```sh
   cargo aideon_xtask import-dataset --dataset docs/data/base/baseline.yaml \
       --datastore /tmp/praxis --dry-run
   ```
   The dry-run applies the dataset to an in-memory store, so validation mirrors runtime behaviour exactly.
4. **Write it** once the dry-run is clean:
   ```sh
   cargo aideon_xtask import-dataset --dataset docs/data/base/baseline.yaml \
       --datastore /tmp/praxis
   ```
5. **Run the dataset tests** to confirm the guardrail counts still hold (below). A change that shifts a count without updating the expectation is a failing test, by design.

---

## Validation against the metamodel

Both payloads are validated by **serde** against strict schemas inside `praxis`: the YAML and JSON deserialise into typed Rust structures, and any unknown field, wrong kind, or missing required value fails the parse before any data is written. Deserialisation is the first gate; the metamodel is the second.

Every node and edge in `baseline.yaml` is then checked against the compiled [effective schema](../03-design/metamodel/slots-and-effective-schema.md) — the same `validate_node` / `validate_edge` path the running product uses ([validation rules](../03-design/metamodel/validation-rules.md)). A node must name a known type and satisfy its required attributes, kinds, lengths, and enum variants; an edge's source and target types must appear in the relationship's `from` and `to` sets, and any required relationship attribute (for example `accesses.mode`) must be present. There is no separate, looser validator for seed data — the seed earns its place by passing the same checks as user-authored content.

A worked instance: in `baseline.yaml`, `n:application:insight-hub` (`Application`) **accesses** `n:data-entity:customer-profile` (`DataEntity`) with `mode: readwrite`. Validation accepts it because `Application ∈ accesses.from`, `DataEntity ∈ accesses.to`, and the required `mode` slot carries a declared enum variant ([relationship types](../03-design/metamodel/relationship-types.md)). The same edge with no `mode`, or from a `ValueStreamStage` source, is rejected.

---

## Quality gates and guardrail counts

The baseline is deterministic so CI can assert exact shapes. The guardrail counts are the dataset's contract with its tests; changing the data must change the expected counts in the same commit.

| Guardrail                                          | Expected in `baseline.yaml` v1.0.0                             | Source                  |
| -------------------------------------------------- | -------------------------------------------------------------- | ----------------------- |
| Value-stream stages                                | 3 — `discover`, `design`, `deliver`                            | `baseline-graph` commit |
| Capabilities                                       | 3 — Customer Insight, Journey Orchestration, Automation Fabric | `baseline-graph` commit |
| Applications                                       | 3 — Insight Hub, Journey Studio, Automation Orchestrator       | `baseline-graph` commit |
| Data entities                                      | 2 — Customer Profile, Engagement Event                         | `baseline-graph` commit |
| Technology components                              | 2 — Stream Processor, Event Bus                                | `baseline-graph` commit |
| Plan events                                        | 2 — FY26 Insight Modernization, FY26 Q2 Channel Cutover        | `baseline-plan` commit  |
| `serves` / `realises` / `accesses` / `hosts` edges | 3 / 3 / 2 / 2                                                  | `baseline-graph` commit |
| `plan_effect` edges                                | 4                                                              | `baseline-plan` commit  |

The release gates a change must clear:

- **Serde deserialisation passes** for both payloads with strict (deny-unknown-field) schemas.
- **Importer dry-run applies cleanly** to an in-memory store — no validation failure against the effective schema.
- **Guardrail counts match** the table above (or the table is updated in the same change).
- **The dataset stays deterministic** — re-importing the same file yields the same graph, so regression coverage is stable.

---

## Importer error reporting

A validation failure during import is reported, not swallowed. The importer surfaces a typed `ValidationFailed` error ([validation rules](../03-design/metamodel/validation-rules.md)) with a human-readable message that names the offending node or edge `id`, the rule it broke, and the expected shape — for example, an `accesses` edge missing its required `mode`, or a `Capability` whose `tier` is not a declared enum variant. The message must be enough to locate and fix the line in `baseline.yaml` without reading the validator source.

Errors follow the corpus error contract: machine-readable problem details per **RFC 9457** ([ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md)), so a CI failure carries a stable error `kind` alongside the message. The importer fails the whole import on the first hard validation error in a dry-run rather than writing a partial graph, so a failing seed never lands half-applied.

---

## Version bump rules

The dataset's `version` field follows **Semantic Versioning 2.0.0** ([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)). The dataset version is independent of the metamodel document version: the metamodel's own bump rules live in [extension and versioning](../03-design/metamodel/extension-and-versioning.md).

| Change to `baseline.yaml`                                                                                             | Bump                                                                      |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Add an entity, relationship, or commit block; add an optional attribute value                                         | **minor** — the seed graph grows but existing seeded content is unchanged |
| Remove or rename a seeded entity/relationship `id`; change a seeded value that downstream tests or fixtures depend on | **major** — a consumer pinned to the old seed sees different data         |
| Editorial change with no graph effect (a `description`, a comment, reformatting)                                      | **patch**                                                                 |

Record every bump in [base/CHANGELOG.md](./base/CHANGELOG.md) with its date and the entities or relationships affected, so the seed's history is auditable from the changelog alone.

---

## Known reconciliation — the `Stage` gap

`core-v1.json` declares `ValueStreamStage` with `"extends": "Stage"`, but **no `Stage` type is defined** in the seed metamodel. This is a real, code-backed gap: the seed names a supertype it does not declare. It is recorded here honestly rather than papered over.

- **Current truth:** `ValueStreamStage` validates and resolves on its own declared attributes (`name`, `purpose`, `owner`); the dangling `extends: Stage` contributes nothing today because there is no `Stage` effective schema to inherit from.
- **Decided ([#343](https://github.com/aideon-ai/aideon-desktop/issues/343)): remove the dangling `extends`.** `Stage` is **not** added — an abstract supertype with one subtype and no lifted slots is a placeholder, not a model (no abstract type in the seed unless it contributes inherited slots/rules or has ≥2 concrete subtypes). `ValueStreamStage` keeps its own attributes; the M1 compiler rejects any unresolved `extends` target. This README, `core-v1.json`, and the effective-schema fixture are rebaselined when #343 lands.

Until #343 lands, the seed still carries the dangling `extends` and no document describes `Stage` as an existing type. See [schema-governance.md](./schema-governance.md) for the inheritance semantics that frame the fix.

---

## References & standards

_Normative:_

- **Semantic Versioning 2.0.0** — dataset and metamodel versioning ([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)).
- **RFC 9457** — Problem Details for HTTP APIs; the importer's error-envelope shape ([ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md)).
- **JSON Schema 2020-12** — the validation vocabulary the seed metamodel uses.

## Related documents

| Document                                                | What it covers                                                                     |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [schema-governance.md](./schema-governance.md)          | How to add or deprecate a type or relationship; UUID minting; `extends` semantics. |
| [baseline-dataset.md](./baseline-dataset.md)            | What the seed graph contains and how it maps to the metamodel.                     |
| [base/CHANGELOG.md](./base/CHANGELOG.md)                | The SemVer history of the dataset.                                                 |
| [03-design/metamodel](../03-design/metamodel/README.md) | The design record for the metamodel this data implements.                          |
| [`CONTEXT.md`](../../CONTEXT.md)                        | The canonical glossary — metamodel, entity, relationship, slot, effective schema.  |
