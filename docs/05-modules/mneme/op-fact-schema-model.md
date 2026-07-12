# The op / fact / schema model

The three primitives Mneme stores and the relationship between them: the canonical **operation**, the derived **fact**,
and **schema-as-data**. This is the file to read to understand what is actually written to disk and what is computed on
the way out. Terms follow the project glossary ([`CONTEXT.md`](../../../CONTEXT.md)).

---

## The primitive is the operation, not the fact

Mneme stores **operations**, not facts. An operation is the canonical, append-only mutation recorded in the op log —
create, update, delete, link, unlink, and so on. A fact is the derived temporal claim the resolver computes _from_
operations on read. The op log is the durable primitive; facts are resolution inputs
([canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)). This is the event-sourcing discipline:
the log is truth, the read model is derived _(Fowler; Young, Event Sourcing & CQRS)_.

The distinction is load-bearing because it is why the derived runtime is safe to delete: every fact is reconstructible
by replaying the operations that produced it.

### The operation envelope

Every mutation is an `OpEnvelope`, stamped with an HLC asserted time and appended to the workspace op log:

```rust
pub struct OpEnvelope {
    pub op_id:       OpId,      // stable identifier; tie-break key of last resort
    pub actor_id:    ActorId,   // who asserted it — a logical actor, never a device
    pub asserted_at: Hlc,       // hybrid logical clock — full-range i64 in memory
    pub kind:        OpKind,    // stable kebab discriminator (`create-node`, …)
    pub origin:      Origin,    // through which process it arose (manual/import/connector/generated)
    pub payload:     OpPayload, // typed per kind (NOT opaque bytes)
    pub deps:        Vec<OpId>, // causal predecessors — empty for M0-authored ops; reserved for cross-source exchange
}
```

The **canonical on-disk record** is canonical JSON, not this in-memory struct: a stable kebab `kind` name (the `u16`
code lives only in the registry and the SQLite projection), a **typed payload object** per kind, `format_version`, and
full-range coordinates (`asserted_at`, valid times) as **decimal strings** — fixed by
[ADR-0038](../../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md) and the
[canonical-JSON profile](../../04-contracts/canonical-json.md). Opaque bytes survive only as a validated cache of the
canonical encoding, never as the contract. The per-kind payload shapes are the
[operation schemas](../../contracts/operations/README.md).

The op log is **append-only and idempotent on ingest**: the same `(partition, op_id)` pair is a no-op on replay when the
canonical content is byte-equal, and **corruption** when the same identity carries different content
([workspace-integrity-and-recovery](./workspace-integrity-and-recovery.md)). This is what makes the log safe for export,
import, and sync — replaying a package twice yields the same twin ([export-import-replay](./export-import-replay.md),
[ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).

### The operation surface

| `OpType`                            | Meaning                                                            |
| ----------------------------------- | ------------------------------------------------------------------ |
| `CreateNode` / `CreateEdge`         | A new entity or relationship with an existence interval.           |
| `SetEdgeExistenceInterval`          | Modify a relationship's existence without changing its endpoints.  |
| `TombstoneEntity`                   | Soft-delete an entity or relationship — supersession, not erasure. |
| `SetProperty` / `ClearProperty`     | A time-valid typed property interval on a slot.                    |
| `OrSetUpdate` / `CounterUpdate`     | CRDT set and counter mutations — **deferred to M6**, see below.    |
| `UpsertMetamodelBatch`              | A batch type/field/rule schema update (schema-as-data).            |
| `CreateScenario` / `DeleteScenario` | Scenario overlay lifecycle.                                        |

**Merge policies and CRDT operations are not M0.** The milestone split is deliberate: **M0** persists and replays the
supported operation/value envelope; **M1** defines slot cardinality (single- vs multi-valued shape); **M2** resolves
competing temporal facts ([temporal-and-scenario](../../04-contracts/temporal-and-scenario/resolution-rules.md)); **M6**
merges independently authored histories and implements CRDT convergence
([ADR-0034](../../06-adrs/ADR-0034-merge-correctness-and-convergence.md)). So M0 neither applies nor advertises the
`lww` / `mv` / `or-set` / `counter` / `text` policies, and the **`OrSetUpdate` and `CounterUpdate` operation kinds are
removed from the M0 schemas** (their registry codes 6/7 stay reserved; an operation carrying one requires a future
feature, so an M0 reader refuses read-write rather than misapplying it — `manifest.required_features`,
[workspace-integrity-and-recovery](./workspace-integrity-and-recovery.md)). Treating a `+1` counter or an OR-set remove
as an ordinary single-writer mutation now would fix the _wrong_ semantics — convergence needs the dedup, commutativity,
reset, and grow-only-vs-PN rules that ADR-0034/Koinon must settle before the operation enters canonical history. The
only per-field axis the MVP metamodel declares is **cardinality** — `single_value` / `multi_value`, the resolved shape,
with M2 resolution deciding which candidate facts are effective. There is **no** convergence/merge-policy axis and no
"last-writer-wins" label in the M0–M3 metamodel, because the resolver is bitemporal and viewpoint-based, not
last-op-globally. A convergence policy is added **additively at M6** when multi-writer merge needs and tests it
([ADR-0034](../../06-adrs/ADR-0034-merge-correctness-and-convergence.md)); its absence is the contract — an absent
policy means the MVP single-writer temporal resolver, and existing slots need no backfill when it lands.

For the same reason there is **no `disallow_overlap` axis on a slot in M0–M1**. It is a sound concept — a slot-level
temporal integrity constraint that rejects a write whose valid-time interval overlaps an existing applicable fact for
the same subject, slot, layer, and scenario — but it is a **write-time check that only M2 can enforce**: M0 validates
structure only, and M1 validates a single write against the effective schema, neither of which can compare a new fact
against the prior facts for its slot. Declaring it in the M0 canonical `FieldDef` would let the stored metamodel assert
an invariant the op log cannot yet honour. So a slot declares **cardinality only**; `disallow_overlap` is introduced
**additively at M2** with its write-time enforcement contract (absence meaning overlaps are permitted and resolved by
the universal resolver, so existing slots need no backfill).

The vocabulary uses the graph projection terms **node** and **edge** at the storage layer deliberately: an operation is
a graph-projection mutation. In domain prose the same things are **entities** and **relationships**
([`CONTEXT.md`](../../../CONTEXT.md)).

---

## The fact

A **fact** is a temporal claim about a [slot](../../../CONTEXT.md), derived from the op log and consumed by the
resolver. A fact carries a value, a slot, a [layer](../../../CONTEXT.md), a [scenario](../../../CONTEXT.md), a
valid-time interval, and an asserted time. Its valid-time interval is half-open, `[valid_from, valid_to)`, with
`valid_to` optionally null for an open-ended claim.

A fact is never edited in place. A change is a later operation that derives a newer or superseding fact; the resolver
decides which fact wins at a given viewpoint by the precedence chain in [bitemporal-and-hlc](./bitemporal-and-hlc.md).
The two time axes a fact carries are:

| Axis              | Type                                                 | Semantics                                                                |
| ----------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| **Valid time**    | `ValidTime(i64)` — epoch microseconds UTC            | When the fact is true in the modelled world.                             |
| **Asserted time** | `Hlc(i64)` — packed physical-micros + 12-bit counter | When the fact was recorded; the audit axis and the resolver's tie-break. |

The two are fully decoupled: a fact may be asserted now with a valid-from in the future (planning) or in the past (a
late correction). See [bitemporal-and-hlc](./bitemporal-and-hlc.md) for why both exist and how the HLC is packed.

---

## Value types

Facts carry strongly-typed values from a **controlled value algebra** — never an arbitrary document:

```rust
pub enum Value {
    Str(String), I64(i64), F64(FiniteF64), Bool(bool),
    Time(ValidTime), Ref(EntityRef), BlobRef(BlobRef),
}
```

Each value type has its own typed fact table in the derived runtime (`aideon_prop_fact_str`, `aideon_prop_fact_i64`, …),
so range scans and index maintenance stay efficient and type-correct. The full table family is specified in
[sqlite](./SQLITE.md). Two values are deliberately **excluded** from the canonical fact algebra:

- **No inline binary.** Binary content is a typed **`BlobRef`** (`{ algorithm, digest, length, media_type? }`); the
  bytes live in the content-addressed store and there is no inline `Value::Blob(Vec<u8>)`
  ([content-addressed-blobs](./content-addressed-blobs.md),
  [ADR-0038](../../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)). Raw bytes exist only
  on the host ingestion path and resolve to a `BlobRef` before serialisation.
- **No `Json` twin-fact value.** An arbitrary nested/opaque document is **not** a canonical twin-fact value — it escapes
  the metamodel's typed slots and the typed, indexable fact tables, and contradicts the SQLite rule that structured fact
  data never lives in a JSON column ([sqlite](./SQLITE.md)). A genuinely opaque document is stored as a
  content-addressed object (usually `media_type: application/json`) and referenced by a `BlobRef`. JSON objects appear
  only in **explicitly named metadata contracts** (rule parameters, import diagnostics, run-ledger details,
  owner-defined extension metadata) — never as a model slot value — and even there are encoded with the
  [canonical-JSON profile](../../04-contracts/canonical-json.md); "opaque" means Mneme does not interpret the internal
  business fields, not that the bytes may be non-deterministic. The `Json` discriminator code is reserved internally and
  never reassigned, but it is not a valid canonical value and an authored `Json` fact value is rejected.

---

## Schema-as-data

Mneme stores the [metamodel](../../../CONTEXT.md) as partition-scoped _data_, not as hard-coded enums.
[Praxis](../praxis/README.md) authors the metamodel and submits an `AuthoredMetamodelBatch`, which Mneme records as the
canonical `UpsertMetamodelBatch` operation. **The operation carries authored, unflattened definitions and means exactly
that in every milestone — it is never redefined as compiled output.** Mneme _persists_ it as canonical history at every
milestone; the flattened `EffectiveSchema` is a **derived** projection compiled at **M1** (M0 has no compiler). This is
what lets a workspace carry its own modelling language portably.

```rust
// The canonical operation payload — authored, unflattened definitions.
pub struct AuthoredMetamodelBatch {
    pub types:             Vec<TypeDef>,
    pub fields:            Vec<FieldDef>,      // value_type, cardinality, is_indexed
    pub type_fields:       Vec<TypeFieldDef>,  // per-type field attachments + defaults
    pub edge_type_rules:   Vec<EdgeTypeRule>,  // endpoint constraints + semantic direction
    pub metamodel_version: Option<String>,
    pub metamodel_source:  Option<String>,
}
```

The batch holds **only** authored source: it does **not** carry inherited fields copied into child types, resolved
defaults, flattened endpoint rules, compiled validation programs, or per-type effective schemas — those are derived M1
outputs.

**M0 vs M1 split.** At M0 Mneme performs **structural** validation of the operation and payload only — canonical-JSON
and envelope shape; required fields and field types; UUID, identifier and version-string syntax; supported M0 value and
operation kinds; package/batch identity; canonical serialisation; and same package/version identity with conflicting
bytes — and **deterministically materialises the authored documents** to `model/schema/authored/`
([workspace-integrity-and-recovery](./workspace-integrity-and-recovery.md)). M0 does **not** validate inheritance
cycles, undeclared parents, dangling type/field references, relationship-endpoint compatibility, cardinality semantics,
enum narrowing against existing data, or effective-schema compilation — all **M1**. A structurally well-formed but
semantically invalid metamodel can therefore enter canonical history at M0; that is acceptable because M0 proves durable
recording and replay, not meaning.

**When an M1 open finds the latest authored metamodel fails compilation:** ordinary entity/relationship authoring is
blocked and the workspace surfaces a schema-invalid/recovery state; the invalid authored operation stays canonical and
inspectable; a restricted schema-repair path may append a corrected, later metamodel version; and **no effective schema
is published from the invalid batch**. So a bad batch admitted at M0 is never left unrepairable except by hand-editing
the op log, which the architecture must never require.

Single inheritance is tracked by `parent_type_id`. **At M1** the compiler detects cycles and rejects the batch before
any effective schema is published. The flattened **effective schema** — the resolved inheritance chain with merged
defaults and tightened constraints — is compiled to `EffectiveSchema` and cached per type **(M1)**. The effective schema
is derived: it is never authored directly and is rebuilt from the metamodel ([`CONTEXT.md`](../../../CONTEXT.md),
[METAMODEL-PACKAGES](../../03-design/METAMODEL-PACKAGES.md)).

The seed metamodel that worked examples across this corpus draw on is [`core-v1.json`](../../data/meta/core-v1.json):
entity types `ValueStreamStage`, `Capability`, `BusinessProcess`, `Application`, `DataEntity`, `TechnologyComponent`,
`PlanEvent`; relationship types `serves`, `realises`, `accesses`, `hosts`, `plan_effect`.

### A published schema package version is immutable

A metamodel package version is published once and never edited in place. A change is a **new version**, not a mutation
of the old one. This mirrors the fact rule above — facts are append-only and superseded, never overwritten — and applies
it to schema-as-data: the `AuthoredMetamodelBatch` Mneme persists (as the `UpsertMetamodelBatch` operation) for a given
`metamodel_version` is fixed, and a later change appends a new `UpsertMetamodelBatch` operation carrying a higher
version rather than rewriting the stored one.

The immutability is what makes a past [viewpoint](../../../CONTEXT.md) resolvable against the schema that stood at that
time. Because schema changes are themselves operations on the op log, "show the model as the schema stood last quarter"
is answerable: the schema's own history is preserved like any other fact, and `aideon_metamodel_versions` records each
applied version against the `op_id` that introduced it ([sqlite](./SQLITE.md)).

Two consequences follow, both governed by Praxis's
[extension and versioning](../../03-design/metamodel/extension-and-versioning.md) rules under Semantic Versioning
([ADR-0017](../../06-adrs/ADRS.md)):

- **The UUID of a published symbol does not change.** Type, relationship, and attribute UUIDs are **UUIDv5** values
  minted from the project namespace plus the symbol's stable name path
  ([packages and registry](../../03-design/metamodel/packages-and-registry.md)). Renaming a symbol changes its name
  input and therefore its UUID — a breaking change modelled as remove-plus-add in a new major version, never an in-place
  edit.
- **A `version` string is consumed, not reissued.** Overlay packages must align on the base `version`; a workspace
  cannot carry two batches that both claim one version with different content, because the first one published is the
  one that is kept ([packages and registry](../../03-design/metamodel/packages-and-registry.md)).

The trade-off this closes is the convenience of a quick edit to a live schema: there is no such edit. In exchange, the
schema is replayable, portable, and diff-able across versions — the same property the op log buys for instance data.
Mneme stores and version-stamps the batch; it does not author or evolve it
([metamodel ownership](../praxis/metamodel-ownership.md)).

---

## From Change Event to operations

A [fact](../../../CONTEXT.md) never originates in Mneme. The canonical authoring object is a Praxis
[Change Event](../../../CONTEXT.md), which captures intent and context — owner, rationale, source, approval state,
grouping, dependencies, lifecycle — and, when applied, **compiles into one or more operations** that Mneme appends
([tasks and Change Events](../praxis/tasks-and-change-events.md)). A [Plan Event](../../../CONTEXT.md) is the subtype
that authors a non-actual layer. The chain is one-directional: `task → Change Event → operation(s) → op log`.

The compilation step is where domain intent becomes storage mutation. One Change Event — "apply the FY26 channel
cutover" — fans out into the concrete `CreateEdge`, `SetProperty`, or `TombstoneEntity` operations that realise it, each
stamped with the same `actor_id` and a contiguous run of HLCs from the single writer. Praxis validates the **whole**
operation set against the compiled effective schema before any append; a violation anywhere rejects the set
([tasks and Change Events](../praxis/tasks-and-change-events.md)). Mneme sees the operations only after they validate.

### The op batch is atomic

The operations a Change Event compiles to are appended as one atomic batch sharing a `tx_id` ([sqlite](./SQLITE.md),
`aideon_ops.tx_id`): **either every operation in the batch lands or none does.** There is no state in which half a
Change Event is on the op log. Atomicity rests on the single-writer commit being an explicit state machine
([storage-trait-and-engine](./storage-trait-and-engine.md)) — a crash mid-commit leaves the workspace at the last
fully-committed batch, never half-applied — and on validation having run over the whole set first, so an endpoint
created earlier in the batch is visible to a relationship created later in it.

This is also why the op log stays idempotent under replay: re-importing the package re-presents the same
`(partition, op_id)` pairs, every one a no-op, so a Change Event that already landed is never doubled
([export-import-replay](./export-import-replay.md),
[ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)). The trade-off this closes is incremental streaming
of a very large batch: a Change Event is committed as a unit, which bounds how large one should be. Bulk ingestion that
genuinely needs to stream is an import job, not a Change Event
([accepted work and events](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)).

---

## The obsolete-fact lifecycle — superseded, not deleted

A fact is never edited and almost never erased. When a claim ceases to hold, one of two things happens, and both are
append-only ([canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)):

| Transition          | What is appended                                                                                                            | What the resolver does                                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Superseded**      | A later operation derives a newer fact for the same slot (a `SetProperty` with a larger HLC, or a narrower valid interval). | The newer fact wins at the current belief by the precedence chain; the older fact stays on the op log and remains the winner under a belief-pinned read ([bitemporal-and-hlc](./bitemporal-and-hlc.md)). |
| **Tombstoned**      | A `TombstoneEntity` operation, or a tombstone property/edge fact, with a later asserted time.                               | The tombstone enters the same pipeline and suppresses the earlier fact within its layer — supersession, not erasure. The suppressed fact is still resolvable at a belief before the tombstone.           |
| **Closed interval** | A `SetProperty` (or `SetEdgeExistenceInterval`) that gives the prior open-ended claim a finite `valid_to`.                  | The claim's effective interval ends at `valid_to`; reads after that instant find no candidate and return an empty result. **Absence is not an error.**                                                   |

The unifying rule is **supersession, not deletion**: an obsolete fact is outranked, never removed. The earlier
`disposition = Invest` fact below is not deleted when a correction asserts `Eliminate`; it is outranked by a larger HLC,
and a read pinned to the earlier belief still returns it ([bitemporal-and-hlc](./bitemporal-and-hlc.md), resolution
precedence chain).

This is exactly what makes the lifecycle safe under **replay**. Because no fact is ever destructively removed, replaying
the op log reproduces every belief the twin has ever held — including the superseded ones — so a rebuilt runtime
resolves the same answer at every viewpoint, current or belief-pinned ([failure-modes](./failure-modes.md), recovery is
rebuild). A model that deleted obsolete facts would lose the asserted-time axis and could no longer answer "what did we
believe last quarter?"; the cost it pays is that the op log only grows — pruning is a deliberate retention decision,
never an inline side effect of a change ([content-addressed-blobs](./content-addressed-blobs.md), garbage collection).

---

## Worked example — asserting a disposition

The seed entity `Automation Orchestrator` (`n:application:automation-orchestrator`, an `Application`) carries a
`disposition` slot. The metamodel ([`core-v1.json`](../../data/meta/core-v1.json)) defines `disposition` as an enum over
`Invest`, `Tolerate`, `Migrate`, `Eliminate`.

An architect records that the application is to be migrated, effective the start of the fiscal year:

1. A `SetProperty` operation is appended, payload: slot = `(automation-orchestrator, disposition)`, value =
   `Str("Migrate")`, `valid_from` = `2026-01-01T00:00:00Z`, `valid_to` = null, layer = `actual`, scenario = baseline. It
   is stamped with `asserted_at = Hlc::now()`.
2. Mneme writes the op to `model/ops/`, then derives a fact: `disposition = "Migrate" [2026-01-01, null)` in the
   `actual` layer of the base case, Asserted content.
3. A read of `(automation-orchestrator, disposition)` at the viewpoint _{as-of valid time 2026-06-11, latest belief,
   layer actual, base case}_ returns `Migrate`, Fresh, because that fact contains the requested instant and no later
   fact supersedes it.

If a correction later asserts `disposition = "Eliminate" [2026-01-01, null)` with a larger HLC, the resolver prefers it
by the _latest asserted time_ rule — without deleting the earlier fact, which remains visible to a belief-pinned read.
The mechanics are in [bitemporal-and-hlc](./bitemporal-and-hlc.md).

---

## References & standards

_Normative:_

- Fowler; Young — **Event Sourcing & CQRS**. The append-only operation log is truth; facts are the derived read model.

_Informative:_

- Shapiro et al. — _Conflict-free Replicated Data Types_, 2011. The convergence basis for the `OrSetUpdate` and
  `CounterUpdate` operations under merge.

## Related documents

| Document                                                                             | What it covers                                                                          |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| [Bitemporal model and the HLC](./bitemporal-and-hlc.md)                              | The two time axes and the resolution precedence chain.                                  |
| [Scenarios and layers](./scenarios-and-layers.md)                                    | How `scenario_id` and layer participate in a fact's identity.                           |
| [SQLite specification](./SQLITE.md)                                                  | The typed fact tables these values land in.                                             |
| [Identifier generation and provenance](./identifier-generation-and-provenance.md)    | How op, entity, edge, and symbol IDs are minted, and the provenance every fact carries. |
| [Tasks and Change Events](../praxis/tasks-and-change-events.md)                      | The authoring object a Change Event compiles from.                                      |
| [Temporal and scenario context](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The authoritative resolution contract.                                                  |
| [Extension and versioning](../../03-design/metamodel/extension-and-versioning.md)    | The SemVer rules behind schema-package immutability.                                    |
| [METAMODEL-PACKAGES](../../03-design/METAMODEL-PACKAGES.md)                          | How Praxis publishes schema-as-data to Mneme.                                           |
