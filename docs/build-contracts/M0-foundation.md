# M0 build contract — Foundation

The M0 milestone delivers the **foundation capability**: a portable workspace that opens, round-trips a session, and rebuilds losslessly. Its exit gate is that the canonical workspace format is closed enough to build against, every operation has a pinned shape and a validating fixture, and deleting the derived runtime then rebuilding it from canonical files yields a semantically equivalent twin — with typed IPC and capabilities enforced and no open ports ([ROADMAP](../00-index/ROADMAP.md), M0 row). This contract turns that gate into named files, ordered work, and exit tests an agent can complete without making an architectural choice.

> **Implementation state (honest).** The canonical workspace persistence layer is **not yet implemented**. Operations currently persist only to the SQLite runtime store (`aideon_ops` in [`crates/mneme_store`](../../crates/mneme_store)), which the architecture defines as _derived_ ([ADR-0004](../06-adrs/ADR-0004-storage-engine-abstraction.md), [SQLITE](../05-modules/mneme/SQLITE.md)). M0 introduces the live `model/ops/` segment writer and reader, the workspace `manifest.json`, locking, the integrity and recovery rules, the content-addressed blob boundary, and the rebuild pipeline. Existing SQLite operation storage must be converted into a derived projection — or removed from the authoritative write path. Until this lands, the implementation does **not** satisfy [ADR-0001](../06-adrs/ADR-0001-workspace-is-canonical-authority.md), [ADR-0002](../06-adrs/ADR-0002-portable-workspace-format.md), or this contract. The code was built inside-out — the runtime engine first, before the outer canonical-storage boundary existed — and M0 is the milestone that closes that gap. This is an implementation correction, not an architectural change: the architecture was already settled.

## Outcome

A workspace folder ([ADR-0002](../06-adrs/ADR-0002-portable-workspace-format.md)) can be created, opened for writing under a single-writer lock, written to via the typed operation surface, closed, and reopened. Deleting `.aideon/runtime/` and reopening rebuilds all M0-owned derived state from `model/ops/`, `model/schema/`, and canonical object material. The rebuilt runtime contains exactly the same **logical applied-operation set, canonical schema-document registry, actor registry, object index, and replay checkpoints** as before the wipe — proven by a deterministic **`foundation_rebuild_hash`** over a stable logical snapshot ([ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md), [rebuild oracle](../data/fixtures/rebuild/README.md)). Temporal and artefact _semantic_ equivalence are added as M2/M3 probes under ADR-0027, not M0. Every operation kind has a tier-2 JSON Schema and a validating fixture pair.

## In scope

- Workspace format v1: complete `manifest.json` field schema, identifier formats, segment ordering and sealing, the atomic-write/fsync sequence, integrity checksums and their coverage, truncation and sealed-segment-corruption behaviour, version maxima, and the `model/schema/` vs op-log authority rule.
- Per-operation JSON Schemas (2020-12) for the shared envelope and every op kind, plus a validating valid/invalid fixture pair per kind over the seed identifiers.
- The **canonical operation record**: the versioned [canonical-JSON profile](../04-contracts/canonical-json.md), the typed per-kind payload (replacing the opaque `Vec<u8>`), the kebab `kind` discriminator + code registry, full-range coordinates as decimal strings, and `format_version` ([ADR-0038](../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)). The fact-value algebra is `str | i64 | f64 | bool | time | ref | blob` (a typed `BlobRef`); **`json` is not a valid twin-fact value** (opaque documents are `BlobRef`s). The CRDT op kinds `or-set-update`/`counter-update` and the merge policies (`lww`/`mv`/`or-set`/`counter`/`text`) are **out of scope** — deferred to M6, codes reserved, an M0 reader refuses a workspace requiring them ([ADR-0034](../06-adrs/ADR-0034-merge-correctness-and-convergence.md)).
- The structural **foundation-rebuild gate**: `foundation_rebuild_hash` over a stable logical `FoundationProjectionSnapshot` (applied-op set, canonical schema-document digests, actor registry, object index, replay checkpoints — **not** a compiled effective schema, which is M1, and **not** a SQLite table dump). The semantic `equivalence_hash` is deferred to M2/M3.
- The **canonical write path**: canonical-append-is-the-commit-point, with SQLite repositioned as a derived projection applied after the append (see below).
- The **canonical blob contract** only: a typed `BlobRef` value (`{ algorithm, digest, length, media_type? }`) carried in ordinary property operations, hash-addressed write/read under `objects/sha256/`, **object durably committed before the referencing op is appended**, read-time hash + length verification, and **no inline binary / no `blob.attach` op kind**. M0 blob GC is conservative orphan-only (objects never referenced by any canonical op; temp-file cleanup + dry-run report); historical reclamation is deferred to op-log retention/compaction. Enough to establish the boundary, not a full attachment feature.
- The **partition model**: one manifest-declared `partition_id` per workspace (a separate mint from `workspace_id`), every operation carrying it, foreign-partition rejection, and `aideon_partitions` as a derived projection initialised from the manifest. Multiple partitions per workspace are deferred.

## Out of scope

- The metamodel compile/validate path and invalid-write rejection (M1; [op-fact-schema-model](../05-modules/mneme/op-fact-schema-model.md)).
- Temporal resolution, viewpoints, and diff (M2; [temporal-and-scenario](../04-contracts/temporal-and-scenario/README.md)).
- Artefact execution and the catalogue result shape (M3).
- A user-facing attachment/blob experience (upload UX, previews, large-object streaming) — only the canonical blob _contract_ is in scope; the UX is later.
- **Record-level access control / RBAC.** M0 is one principal with full authority; `owner_actor_id` / `acl_group_id` / `visibility` are **omitted** from the canonical `create-node`/`create-edge` payloads and public authoring inputs (not carried as reserved nulls). Policy is owned by Themis (M6, [ADR-0030](../06-adrs/ADR-0030-governance-themis.md)) and arrives as explicit versioned policy operations; a workspace whose `manifest.required_features` demands access-policy support is refused read-write at M0. (Ownership ≠ provenance: `actor_id` records who asserted; an owner is a future governance assignment, not the historical author.)

## The canonical write path

Calling the files canonical has a direct consequence for how a write commits. SQLite and the JSONL op log cannot share one atomic transaction, so the **canonical append is the commit point** and SQLite is downstream of it. Every write follows this order:

1. Validate and serialise the canonical operation.
2. **Durably append it to the loose `model/ops/` segment** (write + `fsync`, per [workspace-integrity-and-recovery](../05-modules/mneme/workspace-integrity-and-recovery.md)). This is the commit.
3. Only after the append succeeds, **apply it to the SQLite projection**.
4. Treat a projection failure as a recoverable _derived-state_ failure — rebuild from the op log; never lose the committed operation.
5. **Never acknowledge a write that exists only in SQLite.** An operation that did not reach the canonical segment did not happen.

This makes projection application necessarily **idempotent and replayable** ([ADR-0018](../06-adrs/ADR-0018-idempotency-and-deduplication.md), [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md)): a rebuild re-applies the same operations and must reach the same projection. Do not build two unrelated persistence paths and reconcile them later — the append is the single source, the projection is a pure function of it.

## Operation identity and idempotency

Rebuild, replay, import, and torn-write recovery all rest on a single permanent identity for a canonical operation. Three distinct identities exist and must not be conflated:

| Layer                   | Identity                    | Purpose                                                                   | Lifetime                  |
| ----------------------- | --------------------------- | ------------------------------------------------------------------------- | ------------------------- |
| Command / accepted work | `idempotencyKey`            | Suppress repeated delivery of one caller intent; return its first outcome | Run-ledger retention      |
| **Canonical operation** | **`(partition_id, op_id)`** | Identify one historical mutation during replay, import, projection apply  | **Permanent**             |
| Event delivery          | `eventId`                   | Prevent a consumer processing the same emitted event twice                | Consumer retention policy |

M0 pins these invariants:

1. **`(partition_id, op_id)` is the permanent canonical operation key.** `op_id` is minted once for a new operation and is thereafter immutable; every canonical record, package, replay, and rebuild preserves it verbatim.
2. **Replay preserves all identity, temporal, and provenance fields** — `op_id`, `asserted_at` (HLC), actor, and source provenance are carried, never regenerated.
3. **Duplicate identity with identical canonical content is a no-op** (`ingest_ops` recognises it by `(partition_id, op_id)` and skips it — `store.rs`).
4. **Duplicate identity with _different_ canonical content is corruption** — the reader rejects it and names the workspace corrupt; it never silently takes the first record.
5. **The authoring path (`insert_op`) mints IDs; the replay path (`ingest_ops`) never does.** The create path must never be used to rebuild or resume canonical history — re-authoring the same semantic content is a new assertion, not replay.
6. **ADR-0018 idempotency is not a rebuild mechanism.** Its dedup window is the run-ledger lifetime, which the runtime wipe destroys; recovery rides on `(partition_id, op_id)` carried in the canonical record, never on the caller key.
7. **Import retry identity is scoped to an accepted import batch, not to a source file** (see [Pylon import identity](../05-modules/pylon/deterministic-reviewable-import.md)): a retry of the same accepted batch preserves `import_batch_id` and produces the same `(partition_id, op_id)` set; a newly accepted import gets a new batch identity even when its source digest matches an earlier one.

The recovery narrative therefore reads: **recovery re-ingests the same canonical operation envelopes; it does not recreate operations through the authoring path. Existing operations are recognised by `(partition_id, op_id)` and become no-ops; missing operations are applied with their original identity, asserted time, and provenance.**

- The expected-output golden hash value for the rebuild test (filled in once the resolve/catalogue oracles land, Increments 3–4).
- Drift-checking the new operation schemas in CI (follow-up; the existing `*-manifest.json` checks under `tests/` are untouched).
- The two scenario-lifecycle op kinds (`CreateScenario`, `DeleteScenario`).

## Authoritative sources

In precedence order ([contract precedence](./README.md#contract-precedence)):

1. **ADRs** — [ADR-0001](../06-adrs/ADR-0001-workspace-is-canonical-authority.md) (workspace is canonical), [ADR-0002](../06-adrs/ADR-0002-portable-workspace-format.md) (portable format), [ADR-0038](../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md) (canonical operation record, identity, commit protocol), [ADR-0003](../06-adrs/ADR-0003-content-addressed-object-store.md) (content-addressed blobs), [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md) (projection consistency + rebuild equivalence), [ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md) (error envelope), [ADR-0018](../06-adrs/ADR-0018-idempotency-and-deduplication.md) (idempotent ingest).
2. **Schemas** — the [canonical-JSON profile](../04-contracts/canonical-json.md), [`docs/contracts/operations/`](../contracts/operations/README.md) (envelope + per-op-kind), and the command surface in [`ipc-manifest.json`](../contracts/ipc-manifest.json).
3. **Contract docs** — [op-fact-schema-model](../05-modules/mneme/op-fact-schema-model.md), [identifier-generation-and-provenance](../05-modules/mneme/identifier-generation-and-provenance.md), [workspace-integrity-and-recovery](../05-modules/mneme/workspace-integrity-and-recovery.md), [export-import-replay](../05-modules/mneme/export-import-replay.md).
4. **Fixtures** — [`docs/data/fixtures/operations/`](../data/fixtures/operations/README.md), [`docs/data/fixtures/rebuild/`](../data/fixtures/rebuild/README.md), seeded from [`core-v1.json`](../data/meta/core-v1.json) and [`baseline.yaml`](../data/base/baseline.yaml).

## Contracts and fixtures this milestone produces

| Path                                                                                                   | What it pins                                                                                         |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| [`docs/contracts/operations/op-envelope.schema.json`](../contracts/operations/op-envelope.schema.json) | The canonical append record shape.                                                                   |
| `docs/contracts/operations/<op-kind>.schema.json` (9 files)                                            | Each operation kind's payload shape, grounded in the Rust DTOs.                                      |
| [`docs/contracts/operations/README.md`](../contracts/operations/README.md)                             | The schema index, serde conventions, and tier-2 status.                                              |
| `docs/data/fixtures/operations/<op-kind>.valid.json` / `.invalid.json`                                 | A passing and a failing example per op kind, over seed identifiers.                                  |
| [`docs/data/fixtures/operations/README.md`](../data/fixtures/operations/README.md)                     | The seed identifiers used and the failure reason per invalid fixture.                                |
| [`docs/data/fixtures/rebuild/README.md`](../data/fixtures/rebuild/README.md)                           | The rebuild-equivalence oracle: input op set, asserted equality, hash definition.                    |
| `docs/05-modules/mneme/workspace-integrity-and-recovery.md` (extended)                                 | The closed on-disk format v1: manifest, identifiers, sealing, checksums, recovery, schema authority. |
| `docs/06-adrs/ADR-0002…` (extended)                                                                    | The manifest field summary and the schema-authority rule, within the ADR.                            |
| `docs/06-adrs/ADR-0027…` (extended)                                                                    | The rebuild-equivalence relation and hash.                                                           |

## Module ownership

- **Mneme** ([`crates/mneme_core`](../../crates/mneme_core), [`crates/mneme_store`](../../crates/mneme_store)) — the op envelope, op kinds, schema-as-data, the canonical files, sealing, checksums, and rebuild.
- **Host** ([`src-tauri`](../../src-tauri)) — workspace lifecycle (open/close/lock), the typed IPC surface, capability enforcement, and the rebuild trigger ([workspace-lifecycle](../05-modules/host/workspace-lifecycle.md)).
- **Engine** ([`crates/engine`](../../crates/engine)) — the in-process execution seam the host calls.

## Implementation sequence

Dependency-ordered:

1. **Workspace format v1 closure** — manifest schema, identifiers, sealing/ordering, atomic-write sequence, checksums, recovery rules, version maxima, schema-authority rule. Everything else assumes a settled on-disk format.
2. **Operation schemas + fixtures** — envelope first, then per-op-kind schemas, then the valid/invalid fixture pairs (validated against the schemas).
3. **Rebuild-equivalence relation + oracle** — the hash definition and the single invariant test, which depends on both the format and the op shapes being fixed.
4. **Host lifecycle + IPC enforcement** — open/lock/close/reopen and the rebuild-on-missing-runtime path, exercising the format and the equivalence oracle.

## Golden-journey segment

This milestone covers golden-journey steps **1, 8, 9, 10** ([golden-journey](./golden-journey.md)): create and open a workspace, close and reopen it, delete `.aideon/runtime/`, and rebuild with proven equivalence. (Steps 2–3 are M1, 4–6 are M2, 7 is M3.)

## Exit tests

Each assertion maps to its oracle fixture:

| Assertion                                                                                                                                                                                                | Oracle                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| A fresh workspace has a format-v1 `manifest.json` with all required fields and valid identifiers.                                                                                                        | The manifest field schema in [workspace-integrity-and-recovery](../05-modules/mneme/workspace-integrity-and-recovery.md).                       |
| Every op-kind valid fixture validates against its schema.                                                                                                                                                | `docs/data/fixtures/operations/<op-kind>.valid.json` against `docs/contracts/operations/<op-kind>.schema.json`.                                 |
| Every op-kind invalid fixture is rejected for its stated reason.                                                                                                                                         | `docs/data/fixtures/operations/<op-kind>.invalid.json` + the reason table in the fixtures README.                                               |
| A torn loose-segment write recovers to the last whole record; the partial tail is discarded, not lost.                                                                                                   | The truncated-final-record rule in [workspace-integrity-and-recovery](../05-modules/mneme/workspace-integrity-and-recovery.md).                 |
| A corrupt sealed segment is detected and named, never silently skipped.                                                                                                                                  | The sealed-segment-corruption rule, same doc + [failure-modes](../05-modules/mneme/failure-modes.md).                                           |
| A workspace newer than `MAX_WORKSPACE_FORMAT_VERSION` is refused with `WORKSPACE_FORMAT_TOO_NEW`.                                                                                                        | The version-maxima table, same doc + [ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md).                                                 |
| A stale `model/schema/` is recompiled from the op log on open; the op log wins.                                                                                                                          | The schema-authority rule, same doc.                                                                                                            |
| Creation yields one manifest-declared partition with `workspace_id != partition_id`; a copy preserves both; a foreign-`partition_id` op is rejected; an empty workspace rebuilds with one partition row. | The partition scope-and-authority rule, same doc.                                                                                               |
| After a wipe, canonical material is untouched (manifest digest, op-segment set + checksums, schema-document digests, object hashes all unchanged).                                                       | The verify routine + checksum rules in [workspace-integrity-and-recovery](../05-modules/mneme/workspace-integrity-and-recovery.md).             |
| After rebuild, every canonical op is replayed exactly once — the `(partition_id, op_id, canonical_digest)` set matches, and a second rebuild adds nothing.                                               | [`rebuild` oracle](../data/fixtures/rebuild/README.md), proof 2.                                                                                |
| Delete `.aideon/runtime/`, rebuild, and `foundation_rebuild_hash` (over the `FoundationProjectionSnapshot`) matches before vs after.                                                                     | [`docs/data/fixtures/rebuild/README.md`](../data/fixtures/rebuild/README.md) + [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md). |
| Rebuild runs as accepted work; the workspace is not exposed ready before foundation projections complete; a rebuild failure leaves canonical files untouched; reopen does not re-rebuild.                | [`rebuild` oracle](../data/fixtures/rebuild/README.md), proof 4 + [workspace-lifecycle](../05-modules/host/workspace-lifecycle.md).             |

## Open questions

Design-intent items not yet pinned in code, to resolve before or during build:

- **The canonical persistence layer is unbuilt** (see the Implementation-state note at the top). The `manifest.json` field schema, segment writer, locking, and blob boundary are specified from [ADR-0002](../06-adrs/ADR-0002-portable-workspace-format.md), not read back from code; the exact `feature_flags` keys are unspecified.
- **Sealing thresholds are provisional configuration**, not invariants; the 8 MiB / 24 h defaults are placeholders.
- **The M0 gate is the structural `foundation_rebuild_hash`, not the semantic `equivalence_hash`.** The foundation hash is computable at M0 once the segment writer and rebuild pipeline exist (its value lands then); the semantic equivalence hash has no probes until M2/M3 and is deferred wholesale ([rebuild oracle](../data/fixtures/rebuild/README.md), [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md)). M0 does **not** pull a temporary resolver forward to fabricate a semantic probe. `FoundationProjectionSnapshot` is a test-only DTO not yet implemented.
- **Scenario-lifecycle op kinds** (`CreateScenario`/`DeleteScenario`) are inline `OpPayload` variants without dedicated input structs and are not schema'd in this increment.
- **Operation-schema drift-checking is not wired** — the schemas are authoritative-by-review until a CI check pins them to the Rust DTOs.

## Related documents

| Document                                                                                    | What it covers                                 |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [golden-journey](./golden-journey.md)                                                       | Steps 1, 8, 9, 10 that this contract delivers. |
| [ROADMAP](../00-index/ROADMAP.md)                                                           | The M0 exit criteria.                          |
| [operations schemas](../contracts/operations/README.md)                                     | The tier-2 op shapes.                          |
| [operation fixtures](../data/fixtures/operations/README.md)                                 | The validating examples.                       |
| [rebuild oracle](../data/fixtures/rebuild/README.md)                                        | The rebuild-equivalence invariant test.        |
| [workspace-integrity-and-recovery](../05-modules/mneme/workspace-integrity-and-recovery.md) | The closed on-disk format.                     |
