# Praxis — Meaning & Artefacts

Praxis is the semantic and interaction engine of the Aideon digital twin: it owns the metamodel, task APIs, artefact execution, integrity rules, and analytics orchestration. Mneme owns storage; Praxis owns meaning.

---

## Responsibilities

Praxis covers five tightly coupled responsibilities that together define what the twin *means* and how users work with it.

### 1. Metamodel

Praxis defines the stable backbone of the twin as schema-as-data. The metamodel has two layers.

**Master types** are few, immutable, and act as structural anchors. Every domain type must inherit from exactly one of them. The current canonical anchor vocabulary is:

| Master type | Structural role |
|---|---|
| `Capability` | Stable abilities the enterprise needs |
| `ValueStreamStage` | Stages in a value stream |
| `BusinessProcess` | Operational realisation mechanisms |
| `Application` | Logical and physical application concepts |
| `DataEntity` | Information and data constructs |
| `TechnologyComponent` | Technology platform and infrastructure |
| `PlanEvent` | Change and delivery constructs |

**Domain types** are the concepts users work with — customer, journey, service, capability, process, control, release train, and so on. Each domain type inherits from a master type and declares its own fields, constraints, and allowed relationship verbs.

The in-code representation is `MetaModelDocument`, a versioned document containing `Vec<MetaType>` and `Vec<MetaRelationship>`. `MetaType` carries stable `id`, optional `uuid`, single-inheritance via `extends`, and a flat list of `MetaAttribute` entries with types (`string`, `text`, `number`, `boolean`, `enum`, `datetime`, `blob`). `MetaRelationship` carries stable `id`, endpoint type constraints via `from`/`to` vectors, directionality, and multiplicity.

Inheritance resolution is compile-time deterministic: `model::build_type_descriptors` walks the inheritance chain, detects cycles as hard integrity violations, and flattens parent attributes into each child descriptor.

### 2. Metamodel compilation to storage

Praxis compiles its metamodel packages into a `MetamodelBatch` and applies them to Mneme. The batch includes:

- Types with stable UUIDs committed in source — regeneration is not allowed
- Field definitions with types and constraints
- Edge type rules encoding semantic direction and endpoint constraints
- A domain registry mapping domain concept keys to Mneme entity IDs

The core starter payload lives in `docs/05-modules/praxis/data/meta/core-v1.json` in the platform data assets. The `MetaModelRegistry` holds the compiled descriptors in memory and exposes validation methods (`validate_node`, `validate_edge`) that the graph snapshot engine calls on every write.

Metamodel packages are versioned and can be installed per partition. The packages group domain types by area: customer and experience, product and service, strategy and motivation, capabilities and value delivery, organisation and operating model, information and data, application and technology, risk and controls, change and delivery.

### 3. Task APIs

Users and consuming modules interact with the twin through named tasks, not through free-form graph mutation. Praxis owns the task layer that translates modelling intent into validated operations.

The canonical write contract is `CommitChangesRequest`, which carries a `ChangeSet` consisting of six operation families:

| Operation | Effect |
|---|---|
| `node_creates` | Create a typed node with initial props |
| `node_updates` | Replace a node's props by ID |
| `node_deletes` | Tombstone a node (rejects if dangling edges would result) |
| `edge_creates` | Create a typed, directed edge between two existing nodes |
| `edge_updates` | Replace an edge's props, resolved by ID or by endpoints |
| `edge_deletes` | Remove edges matching a from/to tombstone |

Every operation is validated against the registry before the snapshot is updated: node type must be declared, edge endpoints must exist, edge type must be declared and must respect its `from`/`to` endpoint constraints, and duplicate edges are rejected for relationship types that declare `allow_duplicate: false`.

Operations are grouped into commits. A commit carries an explicit `branch`, optional `parent`, `author`, `time`, `message`, tags, and the `ChangeSet`. The engine enforces compare-and-swap semantics on branch heads so concurrent writes surface as `ConcurrencyConflict` rather than silent overwrites.

Task-oriented convenience wrappers (create element, link elements, set attribute, apply planned change) compose these primitives and add domain-language validation on top.

### 4. Artefact execution at explicit time and scenario

Praxis artefacts are declarative work products executed at an explicit time and scenario context. The artefact kinds are:

| Kind | Shape |
|---|---|
| Graph view | Bounded traversal returning nodes, edges, groups, and layout hints |
| Catalogue | Filtered list of typed entities with grouping, sorting, and coverage metrics |
| Matrix | Sparse 2D relationship coverage grid with per-cell drill-down |
| Map | Structured visual model (capability map, journey map, application landscape) |
| Report | Composed sections referencing other artefacts and text templates |
| Page | Layout container referencing artefacts for dashboards and printable packs |

Every execution requires explicit context: `partition_id`, optional `scenario_id`, `at_valid_time`, optional `layer` (Plan or Actual). Praxis defaults `valid_from` to now, `layer` to Actual, and scenario to baseline. These are part of the operation contract, not UI conveniences.

Artefact definitions carry a common versioned envelope (`schema_version`, `artefact_kind`, stable `id`, `visibility`, `parameters`) and a kind-specific `definition` body. Definitions are stored as time-valid properties in Mneme so that "view as-of last quarter" is always resolvable.

Execution follows a bounded pipeline: resolve definition at time T → resolve seed set → traverse using allowed verbs up to declared depth → enrich node/edge fields → apply projection and aggregations → return `ViewResult` with integrity score and warnings attached. Limits are explicit: views return at most 5,000 nodes and 10,000 edges, matrices cap at 1,000 × 1,000 with sparse storage, catalogues require pagination with a page size ceiling of 200.

The engine also supports branch-aware snapshots. `state_at` resolves a `CommitRef` (by ID, branch head, or branch head at a given time) and optionally applies a scenario overlay, returning node and edge counts for the resolved slice. `diff_summary` and `topology_delta` compare two refs and return typed change counts.

### 5. Integrity rules and analytics orchestration

Integrity is authoritative in the Rust core. Client-side validation is UX feedback only; the core never defers to it.

The rule engine enforces:

- **Directionality compliance** — all edges must have unambiguous dependency direction consistent with master edge semantics
- **Endpoint constraints** — edge types respect their declared `from`/`to` type restrictions
- **Self-link rules** — relationship types that declare `allow_self: false` reject self-referencing edges
- **Duplicate rules** — relationship types that declare `allow_duplicate: false` reject redundant edges between the same endpoints
- **Referential integrity** — edges always reference existing node endpoints; deleting a node with live edges is rejected

Integrity is scored across five dimensions: directionality compliance, logical/physical separation, spine completeness, orphan rate, and conflict density. Each dimension yields a 0–1 score. The weighted average gates analytics: if the score falls below threshold, analytics run with a reduced-confidence warning or are blocked, depending on partition configuration.

Analytics orchestration sits in Praxis even though algorithm execution may be delegated to Metis. Praxis frames the domain question ("most critical capabilities", "blast radius for this application", "what changed between baseline and scenario"), requests adjacency from Mneme projection edges, receives results, and generates structured explainability output: top inbound contributors, top dependency paths, and delta explanations between scenarios or times.

---

## The meaning / storage split

Praxis depends on Mneme for all persistence. It never generates SQL, never exposes storage IDs to consumers, and never owns database drivers. The contract is:

- Praxis calls Mneme APIs for entity creation, property facts, scenario overlays, time-valid traversal, projection edges, and op-log export/import.
- Mneme stores and indexes; Praxis gives those records meaning.
- Praxis exposes stable domain IDs that map 1:1 to Mneme entity IDs; internal Mneme IDs do not cross the Praxis boundary.

The `Store` trait abstracts commit persistence behind `put_commit`/`get_commit`/`compare_and_swap_branch`. Two implementations ship: `MemoryStore` for tests and `SqliteDb` for the local-first desktop runtime. The schema auto-migrates on open.

See [Mneme module](../mneme/README.md) and [Architecture Boundary](../../01-architecture/ARCHITECTURE-BOUNDARY.md).

---

## Canonical edge catalogue

The canonical relationship vocabulary is defined in [EDGE-CATALOGUE.md](./EDGE-CATALOGUE.md). The catalogue is standards-aligned: seven relationships with stable IDs, explicit direction, endpoint constraints, and seeding status.

| Relationship ID | Direction | Core meaning |
|---|---|---|
| `contributes_to` | source → target | Capability contributes to a value stream stage outcome |
| `delivers` | source → target | Application or component delivers business capability/process outcomes |
| `uses_data` | source → target | Source reads or writes a data entity |
| `deployed_on` | source → target | Application is hosted on a technology component |
| `change_affects` | source → target | Planned change affects a target element |
| `depends_on` | source → target | Generic dependency fallback when no stronger verb applies |
| `belongs_to` | source → target | Membership/containment for hierarchy and roll-up |

Rules enforced by the rule engine:

1. Prefer specific verbs over `depends_on`.
2. Use `belongs_to` only for containment, never for runtime dependency.
3. `uses_data` direction is required; it drives lineage and impact analysis.
4. `change_affects` must originate from change-bearing objects (`PlanEvent`).
5. Self-links are disallowed for `contributes_to`, `delivers`, `deployed_on`, and `change_affects`.

The starter payload (`core-v1.json`) ships `contributes_to`, `delivers`, `uses_data`, `deployed_on`, and `change_affects`. The baseline dataset uses these same IDs throughout.

---

## Temporal and scenario model

Every Praxis operation resolves against an explicit commit-based temporal model. The key types:

| Type | Role |
|---|---|
| `CommitRef` | Points to a commit by ID, branch head, or branch head at a given time |
| `ChangeSet` | Batched node/edge creates, updates, and deletes |
| `GraphSnapshot` | Immutable materialised state at a given commit |
| `StateAtArgs` | Query inputs: `as_of` ref, optional `scenario`, optional `layer` |
| `DiffSummary` | Change count breakdown between two refs |
| `TopologyDeltaResult` | Node/edge add/delete counts (no property diffs) |
| `MergeRequest` / `MergeResponse` | Merge two branches; returns conflicts in domain language |

Scenarios are overlays on baseline snapshots. The `resolve_snapshot` call takes a `CommitRef` and optional scenario ID, materialises the base snapshot, and applies the overlay. `state_at` returns counts; `diff_summary` and `topology_delta` return structural deltas. Merge conflicts are returned as `MergeConflict` records with a `kind` and human-readable `message` — never as raw store errors.

See [Temporal and Scenario Context](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) for the cross-module contract.

---

## Dependency posture

Praxis depends on:

| Dependency | Why |
|---|---|
| `aideon_mneme` | Storage: entity persistence, traversal, projection edges, op-log |
| `aideon_continuum` | Contracts: shared temporal and scenario context types |
| `aideon_metis` | Analytics computation (algorithm execution; Praxis frames questions and explains results) |

Praxis does **not** depend on the Tauri host, the desktop shell, or the Continuum or Metis *implementations* beyond their capability traits. It exposes capability traits that consuming modules implement against.

Consuming modules — the host command layer, Continuum, and the UI — depend on Praxis. The dependency flows one direction: Praxis is a stable semantic seam, not a generic middleware layer.

See [Module Dependency Map](../../01-architecture/MODULE-DEPENDENCY-MAP.md).

---

## Crate structure

```
crates/praxis/src/
├── engine/          # PraxisEngine — commit, branch, diff, merge, snapshot resolution
│   ├── mod.rs       # Public surface: commit, create_branch, state_at, diff_summary, …
│   ├── config.rs    # PraxisEngineConfig
│   ├── init.rs      # Engine initialisation
│   ├── ops.rs       # Core operations (commit, merge, diff, topology_delta)
│   ├── seed.rs      # Baseline seed loading
│   ├── state.rs     # Inner mutable state (branches, registry, snapshot cache)
│   └── util.rs      # Snapshot resolution helpers
├── meta/            # Metamodel loading, compilation, and validation
│   ├── mod.rs       # Public re-exports
│   ├── config.rs    # MetaModelConfig — source (file/inline/default)
│   ├── loader.rs    # JSON/YAML document loading
│   ├── model.rs     # TypeDescriptor, RelationshipDescriptor, inheritance resolution
│   ├── registry.rs  # MetaModelRegistry — validate_node, validate_edge, allows_duplicate
│   ├── types.rs     # MetaModelDocument, MetaType, MetaRelationship, MetaAttribute, …
│   └── validation.rs
├── graph.rs         # GraphSnapshot — immutable apply/diff, endpoint integrity
├── store.rs         # Store trait, MemoryStore, SqliteDb
├── temporal.rs      # ChangeSet, CommitRef, StateAtArgs, DiffSummary, MergeRequest, …
├── canvas.rs        # Canvas layout persistence
├── dataset.rs       # Dataset helpers
├── graph_layout.rs  # Graph layout types
├── meta_seed.rs     # Core metamodel seed payload
├── error.rs         # PraxisError, PraxisResult
└── lib.rs
```

---

## Key invariants

- Artefacts are the primary product surface. The interaction model is task-first and artefact-first; blank-canvas and raw-graph-first entry points are not exposed.
- The metamodel is schema-as-data compiled to a Mneme `MetamodelBatch`. All master types and domain types carry stable UUIDs committed in source.
- Canonical edge meanings come from the fixed catalogue in [EDGE-CATALOGUE.md](./EDGE-CATALOGUE.md). Bespoke relationship vocabulary is not introduced without updating the catalogue.
- Integrity and validation are authoritative in the Rust core. Client-side validation is supplementary UX only.
- Ops and facts are canonical; projections and analytics results are derived.
- Praxis depends on Mneme and on contracts. It does not depend on Metis or Continuum implementations.

---

## Related documents

- [EDGE-CATALOGUE.md](./EDGE-CATALOGUE.md) — canonical relationship vocabulary, endpoint rules, seed alignment
- [Metamodel Packages](../../03-design/METAMODEL-PACKAGES.md) — package structure, compilation, and governance model
- [Artefacts and Viewpoints](../../03-design/ARTEFACTS-AND-VIEWPOINTS.md) — artefact kinds, execution pipeline, viewpoint families
- [Design overview](../../03-design/DESIGN.md) — cross-module design
- [Mneme module](../mneme/README.md) — storage layer
- [Architecture Boundary](../../01-architecture/ARCHITECTURE-BOUNDARY.md) — module boundary definitions
- [Module Dependency Map](../../01-architecture/MODULE-DEPENDENCY-MAP.md) — dependency graph
- [Temporal and Scenario Context](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) — shared temporal contract
