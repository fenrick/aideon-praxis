# ADR-0035: Schema Migration and Evolution

- Status: Accepted
- Date: 2026-06-16
- Depends-On: ADR-0017, ADR-0001
- Relates-To: ADR-0009, ADR-0018, ADR-0027

## Context

The metamodel is stored as data, not as hard-coded enums
([the op / fact / schema model](../05-modules/mneme/op-fact-schema-model.md), schema-as-data), so a workspace carries
its own modelling language and that language changes over the workspace's life.
[ADR-0017](./ADR-0017-contract-and-dto-versioning.md) fixes the SemVer _policy_ for whether a change is breaking, and
[extension and versioning](../03-design/metamodel/extension-and-versioning.md) states that evolution is forward-only.
What is not yet fixed as a durable decision is the migration _model_: which kinds of schema change exist, what happens
to operations already in the canonical log when the schema they validated against changes, how an operation is
re-validated when the workspace is rebuilt under a newer schema, and how a migration spanning more than one schema
package is ordered and made atomic. Without that recorded, "how do we change the schema safely?" is answered case by
case, and the most dangerous failure — silently invalidating history, or rolling a schema back in place — has no stated
guard against it.

The canonical authority is the op log ([ADR-0001](./ADR-0001-workspace-is-canonical-authority.md)); a fact is derived
from operations on read, never stored ([the op / fact / schema model](../05-modules/mneme/op-fact-schema-model.md));
rebuild from the op log is the recovery oracle ([ADR-0027](./ADR-0027-projection-consistency-model.md)). SemVer 2.0.0
supplies the breaking-change vocabulary; event-sourcing supplies the discipline that the log is truth and the read model
is derived.

## Governance Framing

- **Decision type:** Invariant (schema evolution is forward-only; a migration is appended operations, never an in-place
  rewrite) + stable seam (the migration op-type taxonomy and the major/minor classification).
- **Known future pressure:** more overlay packages; cross-package migrations; a schema mistake that a team will want to
  "undo"; large workspaces where replaying the whole log to re-validate is costly; older workspaces opened by newer
  binaries.
- **What stays stable:** forward-only evolution with no rollback; migration as appended `UpsertMetamodelBatch` plus
  data-migration operations; re-validation of each operation against the effective schema in force at that operation's
  asserted time; one aligned package version across a partition.
- **What is provisional:** the deprecation-window length (≥ one minor is the floor, per
  [ADR-0017](./ADR-0017-contract-and-dto-versioning.md)); whether the metamodel breaking-change CI gate is built as a
  diff classifier or a contract test; per-workspace snapshot acceleration of re-validation.
- **What is deferred:** automated generation of data-migration operations from a schema diff; running two major
  metamodel versions side by side; migration UX in the renderer.
- **Why hard to reverse:** the schema version is embedded in stored workspaces and gates compatibility
  (`SCHEMA_TOO_NEW`); every operation's validity depends on being checked against its asserted-time schema; weakening
  forward-only would make past viewpoints unresolvable and break the audit trail the product's honesty rests on.

## Decision

- **Schema evolution is forward-only; there is no rollback.** A schema change is recorded as an `UpsertMetamodelBatch`
  operation appended to the canonical log, never an in-place edit of the prior schema
  ([extension and versioning](../03-design/metamodel/extension-and-versioning.md);
  [ADR-0001](./ADR-0001-workspace-is-canonical-authority.md)). A schema mistake is corrected by a further forward
  migration (re-widen, re-introduce), not by rewinding history. This keeps every past [viewpoint](../../CONTEXT.md)
  resolvable.

- **A migration is a package-version transition plus data-migration operations.** A migration advances
  `metamodel_version` per SemVer 2.0.0 ([ADR-0017](./ADR-0017-contract-and-dto-versioning.md)) and carries one of a
  fixed set of op-types: add type, add slot, add required slot, widen, narrow, rename, deprecate, remove
  ([schema-migration-patterns.md](../05-modules/mneme/schema-migration-patterns.md)). The minor-version op-types (add
  type, add optional slot, widen, deprecate) are additive and need no data migration. The major-version op-types (add
  required slot, narrow, rename, remove) require accompanying data-migration operations — ordinary
  `SetProperty`/`TombstoneEntity`/`Create*` operations that bring existing instances into the new shape — appended in
  the same logical step. A rename is always a remove-plus-add, because a type's UUIDv5 is a hash of its name (RFC 9562;
  [packages and the registry](../03-design/metamodel/packages-and-registry.md)).

- **Operations are re-validated against their asserted-time schema on replay.** Because the metamodel's history is
  itself recorded as asserted-time operations, on rebuild each operation is validated against the effective schema in
  force when that operation was asserted — not against the latest schema. An operation valid when written stays valid on
  replay, and a major change is always paired with a data migration, so no operation is left validated against a schema
  removed beneath it. An obsolete fact is handled by supersession, never deletion: the migration closes or re-asserts
  it, and a belief-pinned read before the migration still resolves the old fact
  ([schema-migration-patterns.md](../05-modules/mneme/schema-migration-patterns.md)).

- **A workspace whose stored major schema version exceeds the binary is rejected.** The host returns `SCHEMA_TOO_NEW`
  rather than partially interpret a future schema ([ADR-0017](./ADR-0017-contract-and-dto-versioning.md)). A newer
  binary opening an older workspace within the same major is supported; the reverse is not.

- **A cross-package migration moves every package to one aligned version atomically.** All overlay packages in a
  partition carry the same `version` string as the base; a mismatch is a hard merge error
  ([packages and the registry](../03-design/metamodel/packages-and-registry.md)). The compiler validates the fully
  merged effective schema (cycles, dangling endpoints, rule conflicts) before any batch is accepted, and the schema and
  data operations are appended as one idempotent logical unit ([ADR-0018](./ADR-0018-idempotency-and-deduplication.md));
  a crash leaves the workspace at the last committed operation, never half-migrated.

- **Breaking changes are detected in CI and demand a version bump.** Classifying a metamodel or DTO diff as breaking,
  and failing a major change that lacks its version bump and migration, is recorded as design intent in
  [CI-CHECKS.md](../02-standards/CI-CHECKS.md). The detection enforces the SemVer policy; it does not replace it.

## Considered Options

- **In-place schema edit with rollback (rejected):** the convenient model, but it rewrites history — a past viewpoint
  becomes unresolvable and the audit trail is falsified. Forward-only is the price of the bitemporal guarantee
  ([ADR-0009](./ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)).
- **Re-validate every operation against the latest schema (rejected):** simpler to implement, but it would retroactively
  invalidate operations that were valid when written, turning a routine migration into a corruption event. Validating
  against the asserted-time schema is the only interpretation consistent with schema-as-temporal-fact.
- **Per-package independent versioning across a partition (rejected):** more flexible, but it admits a state where a
  base and an overlay disagree on the language version, producing an internally inconsistent merged schema. One aligned
  version is strict but keeps the merge sound.
- **Automated migration-op generation from the diff (deferred):** valuable, but the safe core is the manual, reviewed
  data migration; generating it is an optimisation layered on top later.

## Consequences

- Any past viewpoint stays resolvable, because the schema's own history is preserved like any other fact; "show the
  model as the schema stood last quarter" is always answerable.
- A schema mistake cannot be silently undone — it is corrected forward, leaving an honest record of both the mistake and
  its correction.
- Rebuild remains the oracle: a migrated workspace replays cleanly end to end, and the rebuilt twin is checkable against
  the op log ([ADR-0027](./ADR-0027-projection-consistency-model.md)).
- Overlays must be re-versioned together even when only one changed — the cost of the one-aligned-version rule.
- A worked example: narrowing `Application.disposition` to drop the `Tolerate` variant is a major bump from `1.0.0` to
  `2.0.0` carrying a `SetProperty` data migration that re-asserts each `Tolerate` instance as `Invest`; on replay the
  pre-migration value validates against `1.0.0` and the post-migration value against `2.0.0`, and a belief-pinned read
  before the migration still resolves `Tolerate`
  ([schema-migration-patterns.md](../05-modules/mneme/schema-migration-patterns.md)).

## Follow-ups / Open Questions

- Whether the metamodel breaking-change CI gate ships as a schema-diff classifier or a contract test
  ([CI-CHECKS.md](../02-standards/CI-CHECKS.md)).
- Snapshot-plus-tail acceleration of re-validation for large migrated workspaces
  ([export-import-replay](../05-modules/mneme/export-import-replay.md)).
- Tooling to generate data-migration operations from a declared schema diff.
- The deprecation-window length beyond the ≥ one-minor floor ([ADR-0017](./ADR-0017-contract-and-dto-versioning.md)).

## References & standards

- **Semantic Versioning 2.0.0** _(normative: the major/minor classification of migration op-types)_.
- **RFC 9562** — UUIDv5 name-based identifiers _(normative: why a rename is a remove-plus-add)_.
- Fowler; Young — **Event Sourcing & CQRS** _(normative: migration as an appended operation over a canonical log; replay
  re-derives the runtime)_.

## Related documents

| Document                                                                         | What it covers                                                    |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [schema-migration-patterns.md](../05-modules/mneme/schema-migration-patterns.md) | The migration op-types, replay re-validation, and worked example. |
| [extension and versioning](../03-design/metamodel/extension-and-versioning.md)   | The forward-only principle and the SemVer bump table.             |
| [ADR-0017](./ADR-0017-contract-and-dto-versioning.md)                            | The SemVer policy this decision applies to schema.                |
| [CI-CHECKS.md](../02-standards/CI-CHECKS.md)                                     | The breaking-change detection gate (design intent).               |
| [ADR-0027](./ADR-0027-projection-consistency-model.md)                           | Rebuild as the oracle re-validation is checked against.           |
