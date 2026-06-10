# Praxis Edge Catalogue

Canonical relationship vocabulary for Aideon Desktop's Praxis module — the fixed semantic surface that all modules use to express edges between entities in the knowledge graph.

## Design principle: standards-aligned vocabulary

Praxis uses a plain-language, standards-aligned relationship set. No proprietary doctrine taxonomy governs edge naming. The canonical verbs are chosen for clarity, interoperability, and alignment with widely understood enterprise-architecture semantics (ArchiMate-style concepts). Aideon-specific extensions are permitted but must be marked as extensions, kept out of seed assets and default contract examples, and accompanied by in-module rationale.

## Edge catalogue

| Edge ID          | Direction        | Source entity kinds                                  | Target entity kinds                                                | Meaning                                                                                                                 | Cardinality       | Self-link |
|------------------|------------------|------------------------------------------------------|--------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|-------------------|-----------|
| `contributes_to` | source → target  | `Capability`                                         | `ValueStreamStage`                                                 | A capability contributes to the outcome of a value stream stage. Used to trace how capabilities realise business value.  | many-to-many      | disallowed |
| `delivers`       | source → target  | `Application`, `TechnologyComponent`                 | `Capability`, `BusinessProcess`                                    | A technical or application element delivers a business capability or process outcome. Expresses the application layer's support for business intent. | many-to-many | disallowed |
| `uses_data`      | source → target  | `Application`, `BusinessProcess`                     | `DataEntity`                                                       | The source reads or writes the target data entity. Direction is mandatory; it drives lineage tracing and impact analysis. The `mode` attribute (`read` \| `write` \| `readwrite`) is required on each edge instance. | many-to-many | disallowed |
| `deployed_on`    | source → target  | `Application`                                        | `TechnologyComponent`                                              | An application is hosted or deployed on a technology component. Used in infrastructure impact and topology views.        | many-to-many      | disallowed |
| `change_affects` | source → target  | `PlanEvent`                                          | `Capability`, `BusinessProcess`, `Application`, `TechnologyComponent` | A planned change event affects a target element. The `op` attribute (`create` \| `update` \| `delete` \| `link` \| `unlink`) and `target_ref` are required. Only `PlanEvent` entities may be the source of this edge. | many-to-many | disallowed |
| `depends_on`     | source → target  | any                                                  | any                                                                | Generic fallback dependency. Use only when no more specific edge applies. Prefer a named edge wherever one exists.       | many-to-many      | disallowed |
| `belongs_to`     | source → target  | any                                                  | container types (e.g. `ValueStreamStage`, grouping entities)       | Membership or containment. Use for hierarchy and roll-up only — never for runtime or functional dependency.              | many-to-one (typical) | disallowed |

## Edge attributes

### `uses_data`

| Attribute | Type   | Values                            | Required |
|-----------|--------|-----------------------------------|----------|
| `mode`    | enum   | `read`, `write`, `readwrite`      | yes      |

### `change_affects`

| Attribute    | Type   | Values                                              | Required |
|--------------|--------|-----------------------------------------------------|----------|
| `op`         | enum   | `create`, `update`, `delete`, `link`, `unlink`      | yes      |
| `target_ref` | string | identifier of the affected entity                   | yes      |

## Temporal model

Every edge is a first-class fact with valid time. An edge asserts a relationship over a specific time interval `[valid_from, valid_to)`. This aligns with the broader operational and factual model described in [Temporal and Scenario Context](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md): edges are resolved like other facts — temporal queries return only the edges whose validity interval intersects the query instant, and scenario branches carry their own edge state independently of the trunk.

Edge existence is not a Boolean. An edge that existed in the past and no longer holds is not deleted; its validity interval is closed. An edge that is expected to come into existence as a result of a planned change is represented via a `change_affects` edge originating from the relevant `PlanEvent`, with the future edge materialised in the appropriate scenario branch.

## Constraints and rules

1. Prefer a specific edge over `depends_on`. `depends_on` is a fallback of last resort.
2. Use `belongs_to` only for containment and membership. Never use it to express a runtime or functional dependency.
3. `uses_data` direction is required and must reflect actual data flow. Reversing the direction produces incorrect lineage and impact results.
4. Only `PlanEvent` entities may be the source of `change_affects`.
5. Self-links are disallowed for all edges.
6. All edge writes must carry an explicit time and scenario context; see [Temporal and Scenario Context](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md).

## Relationship to the metamodel

The seed metamodel payload (`docs/data/meta/core-v1.json`) declares the entity types that edges connect: `ValueStreamStage`, `Capability`, `BusinessProcess`, `Application`, `DataEntity`, `TechnologyComponent`, and `PlanEvent`. The catalogue above is the authoritative documentation of what those edge identifiers mean, which entity kinds they connect, and which attributes they carry. The metamodel payload is the machine-readable implementation; this catalogue is the semantic source of truth.

Entity type definitions and the metamodel package structure are described in [Metamodel Packages](../../03-design/METAMODEL-PACKAGES.md).

## Contract expectations

Any write or update operation that involves a relationship must supply:

- the edge ID (one of the catalogue entries above)
- the source entity identifier
- the target entity identifier
- explicit valid-time bounds or an open upper bound for ongoing relationships
- an explicit scenario context
- all required edge attributes (e.g. `mode` for `uses_data`, `op` and `target_ref` for `change_affects`)

## References

- [Praxis module overview](./README.md)
- [Metamodel Packages](../../03-design/METAMODEL-PACKAGES.md)
- [Temporal and Scenario Context](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)
- Seed metamodel payload: `docs/data/meta/core-v1.json`
