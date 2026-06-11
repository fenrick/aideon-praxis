# Aideon Desktop

The domain glossary for Aideon Desktop — a time-first digital twin of an organisation. This file defines the project's canonical vocabulary. It is a glossary, not a spec: it says what each term *is*, never how it is implemented.

## Twin and workspace

**Twin**:
The complete modelled organisation represented by a workspace, across all slots, layers, scenarios, valid time, and asserted time, as derivable from the canonical operation log and schema. The twin is the whole; a **snapshot** is the twin resolved through one **viewpoint**. Conceptual and resolvable — not a single stored object.
_Avoid_: current state, present state (that collapses the twin into a snapshot); database, model store (the twin is the resolvable model, not the stored material — see Workspace).

**Workspace**:
The portable container that stores the canonical material and supporting artefacts for one twin: operation log, schema, metadata, indexes, caches, attachments, exports, and configuration as applicable. The canonical truth is the op log plus schema; indexes, caches, and exported snapshots are derived and rebuildable. Default rule: **one workspace represents one twin** (multiple twins per workspace would be a later, explicit design decision — not the assumed model).
_Avoid_: database, project file, repo (workspace is the canonical term); twin (the workspace is the container; the twin is the model it represents).

## Time

**Fact**:
A temporal claim about a **slot** — a value in a **layer** (plan, actual, …) and a **scenario** (or the base case), with a **valid-from** (when it becomes true in the world) and an **asserted time** (when the system was told) — derived from the append-only operation log and used by the resolver. A fact is not edited in place; changes are represented by later operations that derive newer or superseding facts. The op log is canonical truth; facts are derived resolution inputs, not the stored primitive.
_Avoid_: record, row, op-log entry (a fact is the derived semantic claim, not the canonical mutation — see Operation).

**Valid time**:
The "valid-from" point at which a fact's value becomes true in the world. A fact carries a single valid-from instant and holds until otherwise stated — i.e. until another fact for the same slot has a later valid-from that supersedes it. No fact stores an end; ends are implied by the next fact.
_Avoid_: effective date, start date, valid interval (a fact's validity is a point, not an interval).

**Asserted time**:
When the system was told a fact — the instant it was recorded. Fully decoupled from valid time: a fact may be asserted now with a valid-from in the future (planning) or in the past (late correction). The audit axis.
_Avoid_: created at, recorded at, transaction time (asserted time is the canonical name).

**Effective interval**:
A resolved value's derived "valid from / to" — the span over which the value actually holds, bounded below by its own valid-from and above by the next superseding fact's valid-from. Computed by walking valid-from stamps; never stored, and never definitive because a future- or past-dated assertion can resize it.
_Avoid_: effective time, effective date, valid interval (validity is a derived span over resolved values, not stored on a fact).

**Viewpoint**:
The complete frame for resolving or analysing the twin: an as-of **valid time**, an as-of **asserted time** (which belief — what the system knew as of that recording instant), a **layer** or **layer policy** (a single layer such as actual-only, or a blend such as actual-over-plan), a **scenario** (which world), and a **scope**. The first four answer *which version* of the twin you are looking at; scope answers *which part*. A resolved snapshot or diff is not fully specified without all of them — which is why scope rides inside the viewpoint, not beside it. The asserted coordinate is part of the question, not just audit metadata: pinning it replays a past belief, leaving it at latest shows current belief.
_Avoid_: subjective time, as-of context, temporal context (viewpoint is the canonical term); bare "as-of" (ambiguous — say *as-of valid time* / *as-of asserted time*).

**Snapshot**:
The twin's resolved state at a single viewpoint. A resolved *view*, not necessarily a stored copy — it is computed from facts for the given valid time, asserted time, and scenario.
_Avoid_: copy, dump, export (a snapshot is a resolved view, not a materialised artefact).

**Diff**:
A comparison of two snapshots, one per viewpoint. The kind of delta — valid-time, asserted/belief, layer (variance), scenario, or mixed — is *derived* from which viewpoint coordinates differ between the two sides; it is not an enumerated kind the caller chooses up front.
_Avoid_: compare, delta-kind enum, time_delta / scenario_delta (those name a fixed taxonomy; the delta kind is derived from the viewpoints).

## Model

**Entity**:
An identified thing in the twin that can carry slots, with a **type** from the metamodel. Examples: application, vendor, team, capability, process, system, control. The subject a slot belongs to.
_Avoid_: node (the graph projection of an entity — storage/validation/traversal/layout/canvas only), object, record, item.

**Relationship**:
A typed, directed connection between entities. It is itself **addressable** — a relationship carries its own slots, so its attributes are facts over time (e.g. an application *depends on* a system, and that dependency has criticality, confidence, source, or review status that change). This requires stable relationship identity, so slots can attach to the relationship itself, not only to its source or target entity.
_Avoid_: edge (the graph projection of a relationship — storage/validation/traversal/layout/canvas only), link, connection, association.

**Node**:
The graph projection of an **entity** — its representation in storage, validation, indexing, traversal, layout, and canvas (React Flow). Use only when the topic is the graph itself; the domain term is entity.
_Avoid_: entity (in domain prose say entity; node is the graph form).

**Edge**:
The graph projection of a **relationship** — its representation in storage, validation, traversal, layout, and canvas. Use only when the topic is the graph itself; the domain term is relationship.
_Avoid_: relationship (in domain prose say relationship; edge is the graph form).

**Slot**:
The addressable claim target in the twin — the stable question a fact answers, independent of the value, valid time, asserted time, layer, and scenario. A slot defines a resolution key: facts about the same slot compete or compose according to that slot's cardinality and resolution rule. An attribute, relationship, membership, classification, or metric is each a *kind* of slot, never the definition of one.
_Avoid_: entity attribute, field, cell, edge (those are special cases of a slot, not the general claim target).

**Layer**:
A resolution coordinate that answers "what kind of claim is this?" — `plan`, `actual`, and extensibly `forecast`, `budget`, `target`, or other baselines. Part of a fact's identity: a plan value and an actual value coexist for the same slot, valid time, and scenario. How layers combine on read is a **policy** chosen by the viewpoint (a single selected layer, or a blend such as actual-over-plan) — never a fixed precedence, because variance analysis requires plan and actual to stay visible side by side.
_Avoid_: baseline, band, track (those name a specific layer value, not the coordinate); treating "actual overrides plan" as a universal rule (it is one selectable policy).

**Scenario**:
An alternate modelling branch or world that facts belong to — an additive overlay on the base case. Orthogonal to layer: a scenario carries its own layers, so you can compare plan vs actual *within* one scenario, or one scenario's plan against another's. Omitting a scenario resolves the base case.
_Avoid_: branch, variant, what-if, version (scenario is the canonical term); layer (a scenario is a world; a layer is a kind of claim within it).

**Scope**:
The "which part" coordinate of a viewpoint — the selection that narrows a question to a slice of the twin (a snapshot, diff, export, impact, centrality, or any query). Composable, not one fixed mechanism: select by type, by explicit entity set, by traversal from seed refs (e.g. dependencies within N hops), by relationship filter, by attribute filter, and later by named saved scopes. Scope changes what is *included* in the question and answer; it never changes the underlying twin.
_Avoid_: filter, query, selection, view (those are partial mechanisms; scope is the composable selection coordinate as a whole).

**Change Event**:
The user-facing authoring object: it captures intent and context — owner, rationale, source, approval state, grouping, dependencies, lifecycle. When applied it compiles into one or more **operations**. **Plan Event** is a subtype that authors a non-actual layer; other subtypes represent observation, import, reconciliation, or correction (which may author the actual layer).
_Avoid_: operation (an op is the canonical storage mutation a Change Event compiles into), transaction, command (Change Event is the canonical term for the authoring object).

**Plan Event**:
A subtype of **Change Event** — an authoring object representing an intended change. When applied it produces slot-level **facts** in a selected non-actual **layer** (default plan, also forecast / target / budget / baseline), under the base case or a **scenario**; its `effective_at` is the **valid-from** of those facts, and its effects describe the claims to write (attribute updates, relationship link / unlink, create, delete). It also carries planning context — owner, rationale, source, approval state, dependencies, grouping — that facts do not. The twin resolves the produced facts, not the Plan Event directly. Actual-layer facts come from observation, import, reconciliation, or explicit correction — not from Plan Events.
_Avoid_: change, edit, transaction (a Plan Event is the authored intention, not a generic write); reading its `effective_at` as "effective interval" (on a Plan Event it is valid-from).

**Operation** (op):
The canonical, append-only mutation recorded in the **op log** — create, update, delete, link, unlink, or similar. It records that a mutation happened, carrying the claim payload, valid-from, layer, scenario, provenance, and asserted time (the append instant). The op log is the durable truth from which facts are derived; reserve "operation" for this storage layer.
_Avoid_: change, edit (those are authoring; see Change Event); fact (a fact is the derived claim, an op is the mutation that records it); transaction.

## Metamodel

**Metamodel**:
The authored, portable definition of the twin's modelling language for a workspace — entity types, relationship types, slot definitions, inheritance, validation rules, defaults, and merge policies. Schema-as-data: the authority for what can exist in the twin.
_Avoid_: schema (too overloaded — say *metamodel* for the authored definition and *effective schema* for the compiled form), ontology, data model.

**Type**:
A metamodel-defined **kind** for an entity or a relationship; it governs which **slots** an instance may carry and the rules for them (cardinality, merge policy, required, defaults, validation). Say *entity type* / *relationship type* when the distinction matters. An **entity type** defines the allowed slots and rules for entities of that kind (attributes, allowed relationships, category, inheritance, defaults). A **relationship type** defines a typed, directed connection between entity types: valid source/target types, multiplicity, direction, and any slots the relationship itself carries.
_Avoid_: class, category (category is one facet of a type, not the type itself).

**Effective schema**:
The compiled, flattened slot-and-rule set for a single type after inheritance and metamodel rules are applied. Derived from the **metamodel** and used by validation and resolution — never authored directly.
_Avoid_: schema (bare), type definition (effective schema is the compiled view; the metamodel is the authored source).
