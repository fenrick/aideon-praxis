# Schema migration patterns

How the metamodel changes shape over the life of a workspace, and what happens to the operations already in the log when
it does: the migration operation types, how an operation that validated against an old schema is treated on rebuild, the
re-validation semantics of replay under a newer schema, and how a migration spanning more than one schema package is
ordered and made atomic. The governing decision is forward-only schema evolution
([ADR-0035](../../06-adrs/ADR-0035-schema-migration-and-evolution.md)); the SemVer rules it enforces are
[ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md). Terms follow the project glossary
([`CONTEXT.md`](../../../CONTEXT.md)).

---

## Migration is an operation, not an edit

Schema is stored as data, not as hard-coded enums ([the op / fact / schema model](./op-fact-schema-model.md),
schema-as-data): [Praxis](../praxis/README.md) authors the [metamodel](../../../CONTEXT.md) and submits a
`MetamodelBatch`, which Mneme persists as the canonical schema operation `UpsertMetamodelBatch`. A migration is
therefore the same kind of thing as any other change to the twin — a new operation appended to the canonical log, never
an in-place rewrite of what is already there
([extension and versioning](../../03-design/metamodel/extension-and-versioning.md), evolution is forward-only).

This is the load-bearing consequence of the op log being canonical and the runtime derived
([canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)): because the schema's own history is
recorded as operations stamped with an asserted time, the schema as it stood at any past asserted time stays resolvable.
A migration adds a new schema version; it does not erase the one before it.

---

## The migration operation types

A migration is expressed as a transition between two [package](../../03-design/metamodel/packages-and-registry.md)
versions, carried by a `UpsertMetamodelBatch` whose `metamodel_version` advances per SemVer
([ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md)). The kinds of change a transition may carry, with
the SemVer bump each requires and whether existing instances need a data migration:

| Migration op-type     | What it does                                                                                     | SemVer bump | Touches existing data?                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------ |
| **Add type**          | Introduce a new entity or relationship type with a previously unused `id`.                       | **minor**   | No — purely additive.                                                                            |
| **Add slot**          | Append a new _optional_ attribute, relationship, or metric slot to an existing type.             | **minor**   | No — absent slots resolve as unset.                                                              |
| **Add required slot** | Append an attribute that must be present and non-null.                                           | **major**   | Yes — existing instances lack it; a data migration backfills it.                                 |
| **Widen a slot**      | Relax a rule (raise `string.maxLength`, add an enum variant, loosen cardinality).                | **minor**   | No — every previously valid value stays valid.                                                   |
| **Narrow a slot**     | Tighten a rule (lower a length cap, remove an enum variant, require a previously optional slot). | **major**   | Yes — values that no longer satisfy the rule must be migrated before the new schema is accepted. |
| **Rename**            | Retire a published `id` and introduce a new one (modelled as remove-plus-add).                   | **major**   | Yes — a mapping operation re-asserts each instance under the new `id`.                           |
| **Deprecate**         | Mark a type or slot for removal without changing validity yet.                                   | **minor**   | No — instances still validate; the marker is advisory.                                           |
| **Remove**            | Delete a published `id` or UUID.                                                                 | **major**   | Yes — instances of the removed shape are superseded before the schema drops it.                  |

A **rename is always a remove-plus-add**, because the type's UUID is a UUIDv5 hash of its name and so changes when the
name changes ([packages and the registry](../../03-design/metamodel/packages-and-registry.md), UUID minting; RFC 9562).
There is no in-place rename at the storage layer. A **widen** is the safe direction and a **narrow** is the breaking one
— the asymmetry is exactly the SemVer rule that previously valid data must stay valid within a major version
([extension and versioning](../../03-design/metamodel/extension-and-versioning.md)).

The minor-version op-types (add type, add optional slot, widen, deprecate) need no data migration: they are additive and
existing facts keep validating. The major-version op-types (add required slot, narrow, rename, remove) require a **data
migration** — a set of ordinary `SetProperty`, `TombstoneEntity`, or `CreateNode`/`CreateEdge` operations that bring the
existing instances into the new shape — appended in the same logical step as the `UpsertMetamodelBatch` that raises the
version.

---

## How an obsolete fact is handled on rebuild

A fact is derived, never stored ([the op / fact / schema model](./op-fact-schema-model.md)); the operation that produced
it is canonical. When the schema a fact once validated against changes, the operation is **not** rewritten, and on
rebuild the runtime replays it as it was recorded. What changes is only how the resolver and validator _interpret_ that
operation under the schema in force.

Three cases, all forward-only:

- **The slot still exists and still validates.** The operation replays unchanged and derives the same fact. Adding an
  unrelated type or widening a different slot leaves it untouched.
- **The slot was deprecated but not removed.** The operation still replays and derives a fact; the deprecation marker is
  advisory only ([extension and versioning](../../03-design/metamodel/extension-and-versioning.md)). Validation does not
  reject deprecated content — deprecation precedes removal by at least one minor version
  ([ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md)).
- **The slot or type was removed, or its rule narrowed so the old value no longer satisfies it.** The original operation
  is _superseded_ by the data migration appended alongside the major-version bump — closing the old fact's valid-time
  interval or re-asserting it under the new shape — exactly as any later operation supersedes an earlier one
  ([the op / fact / schema model](./op-fact-schema-model.md), the fact). The earlier operation is never deleted, so a
  belief-pinned read at an asserted time before the migration still resolves the old fact. A read at a viewpoint after
  the migration resolves the migrated fact.

Because supersession is the mechanism, there is no orphaned-fact state to clean up: an operation under a now-removed
shape is shadowed by a later operation, not erased. This is the same supersession rule the bitemporal model uses for
ordinary corrections ([bitemporal and the HLC](./bitemporal-and-hlc.md)).

---

## Re-validation on replay

Replay re-derives the runtime from the op log ([derived-runtime-and-projections](./derived-runtime-and-projections.md));
rebuild is the recovery path and the oracle every optimisation is checked against ([failure modes](./failure-modes.md),
recovery is rebuild). When a workspace is rebuilt after its schema has advanced, each operation is re-validated against
the **effective schema in force at that operation's asserted time**, not against the latest schema.

This is the only interpretation consistent with the schema being itself a temporal fact:

- The metamodel's history is recorded as `UpsertMetamodelBatch` operations stamped with asserted time, so for any
  operation `O` the resolver knows which schema version was current when `O` was asserted.
- `O` is validated against _that_ effective schema. An operation that was valid when written stays valid on replay,
  because the schema it is checked against is the one it was written under. Forward-only evolution guarantees this: a
  major-version change is accompanied by a data migration, so no operation is left validated against a schema that has
  been removed beneath it.
- A migrated workspace therefore replays cleanly end to end: pre-migration operations validate against the pre-migration
  schema, the `UpsertMetamodelBatch` advances the version, and post-migration operations validate against the new
  schema.

The honest-state consequence ([DOCUMENTATION-STANDARD §9](../../02-standards/DOCUMENTATION-STANDARD.md)): a rebuild in
progress carries the **Rebuilding** result state, and the rebuilt twin is **Fresh** only once it is checked against the
op log as oracle. A workspace whose stored schema major version is newer than the binary understands is rejected at open
with `SCHEMA_TOO_NEW` rather than partially interpreted ([failure modes](./failure-modes.md), schema too new;
[ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md)) — the binary never guesses at a future schema.

There is no rollback. Forward-only means a schema mistake is corrected by a further forward migration (a new version
that re-widens or re-introduces), never by rewinding history. The trade-off this closes: it forecloses the convenience
of "undo the last schema change in place"; in exchange, every past [viewpoint](../../../CONTEXT.md) stays resolvable and
no migration can silently invalidate an audit trail.

---

## Coordinating a migration across multiple packages

A workspace may carry several metamodel packages — a base package plus overlays grouped by area (motivation, capability,
data, technology, change) — installed per [partition](../../03-design/metamodel/packages-and-registry.md) and merged in
manifest order. A migration that spans packages — for example, a base type gains a required slot _and_ an overlay
relationship's endpoint set must change to match — needs ordering and atomicity rules, because a half-applied
cross-package change would leave the merged schema internally inconsistent.

The rules:

- **One aligned version.** All overlay packages must carry the same `version` string as the base; a mismatch is a hard
  merge error ([packages and the registry](../../03-design/metamodel/packages-and-registry.md), merge rules). A
  cross-package migration therefore advances every package's version together to the new aligned value. There is no
  state in which the base is at `2.0.0` and an overlay still at `1.0.0`.
- **Merge-order dependency.** Overlays load in manifest order and a later overlay may depend on a type a base or earlier
  overlay defines. A migration that adds such a dependency orders its operations so the depended-on type exists before
  the dependent overlay references it — the same dependency-respecting order import already uses
  ([export-import-replay](./export-import-replay.md), order-robust).
- **Atomic acceptance.** The compiler validates the _fully merged_ effective schema before any `UpsertMetamodelBatch` is
  accepted: inheritance cycles, dangling endpoint references, and rule conflicts are rejected at load time
  ([extension and versioning](../../03-design/metamodel/extension-and-versioning.md);
  [validation rules](../../03-design/metamodel/validation-rules.md)). The migration's schema operations and its
  data-migration operations are appended as one logical unit; a crash mid-append leaves the workspace at the last
  committed operation, never half-migrated ([failure modes](./failure-modes.md), crash-safety), and a retry with the
  same idempotency keys completes without duplication
  ([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).

The trade-off named: requiring every package to move to one aligned version is deliberately strict — it stops a
partition from silently mixing two incompatible language versions, at the cost of forcing overlays to be re-versioned
together even when only one of them changed.

---

## Worked example — narrowing `Application.disposition` to drop a variant

The seed metamodel ([`core-v1.json`](../../data/meta/core-v1.json)) defines `Application.disposition` as an enum over
`Invest`, `Tolerate`, `Migrate`, `Eliminate`. Suppose a later policy retires `Tolerate`, folding it into `Invest`. This
is a **narrow** (removing an enum variant), so it is a **major** version bump and needs a data migration. The seed
entity `Automation Orchestrator` (`n:application:automation-orchestrator`) carries `disposition = "Migrate"`; assume
another seed `Application` carries `disposition = "Tolerate"`.

1. **Schema operation.** Praxis submits a `MetamodelBatch` whose `metamodel_version` advances from `1.0.0` to `2.0.0`,
   with `disposition`'s enum variant list now `Invest`, `Migrate`, `Eliminate`. Mneme persists it as an
   `UpsertMetamodelBatch` operation, stamped `asserted_at = Hlc::now()`.
2. **Data migration.** In the same logical step, a `SetProperty` operation re-asserts the affected application's
   `disposition` from `"Tolerate"` to `"Invest"`, with the same `valid_from` as the value it supersedes, in the `actual`
   layer of the base case. `Automation Orchestrator`'s `"Migrate"` is unaffected and needs no operation — it still
   satisfies the narrowed enum.
3. **Validation before acceptance.** The compiler validates the merged effective schema and the migration data together:
   no instance is left holding `"Tolerate"` once the data migration applies, so the narrowed enum is accepted. Had any
   `"Tolerate"` value been left unmigrated, acceptance would fail rather than admit a schema that its own data violates.
4. **Replay.** On a later rebuild, the pre-migration `SetProperty` that set `"Tolerate"` validates against the `1.0.0`
   effective schema (where `Tolerate` was a legal variant) and derives its fact; the `UpsertMetamodelBatch` advances the
   version; the migration `SetProperty` derives the superseding `"Invest"` fact. A read at the post-migration viewpoint
   resolves `"Invest"`, **Fresh**; a belief-pinned read at an asserted time before the migration still resolves
   `"Tolerate"`, because the original operation was superseded, not deleted.

No history is rewritten, no rollback exists, and the audit trail of the variant's retirement is itself a recorded
operation.

---

## References & standards

_Normative:_

- **Semantic Versioning 2.0.0** — the major/minor split that classifies each migration op-type
  ([ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md)).
- **RFC 9562** — UUIDv5 name-based identifiers; why a rename is a remove-plus-add.
- Fowler; Young — **Event Sourcing & CQRS**. Migration as an appended operation over a canonical log; replay re-derives
  the runtime.

_Informative:_

- Gupta & Mumick — _Maintenance of Materialized Views_, 1995. The rebuild-equivalence property re-validation relies on
  ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)).

## Related documents

| Document                                                                          | What it covers                                                      |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [Extension and versioning](../../03-design/metamodel/extension-and-versioning.md) | The SemVer bump rules and the forward-only evolution principle.     |
| [Packages and the registry](../../03-design/metamodel/packages-and-registry.md)   | Package merge order, version alignment, and UUID minting.           |
| [Validation rules](../../03-design/metamodel/validation-rules.md)                 | What the effective schema checks each operation against.            |
| [The op / fact / schema model](./op-fact-schema-model.md)                         | The `UpsertMetamodelBatch` operation and schema-as-data.            |
| [Export, import, and replay](./export-import-replay.md)                           | Order-robust, idempotent replay the migration relies on.            |
| [Failure modes and recovery](./failure-modes.md)                                  | `SCHEMA_TOO_NEW`, crash-safety, and rebuild as the recovery oracle. |
| [ADR-0035](../../06-adrs/ADR-0035-schema-migration-and-evolution.md)              | The durable decision this document implements.                      |
| [ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md)                 | Contract and DTO versioning under SemVer.                           |
