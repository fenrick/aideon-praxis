# Rebuild-equivalence oracle

The invariant test that proves a workspace survives a runtime wipe: a derived runtime rebuilt from canonical files reconstructs the **same logical foundation state** that was deleted. This is the **M0** gate ([ROADMAP](../../../00-index/ROADMAP.md), [M0 build contract](../../../build-contracts/M0-foundation.md)) and the structural half of the [golden journey](../../../build-contracts/golden-journey.md) final assertion (steps 9–10). It is deliberately split from ADR-0027's _semantic_ equivalence hash, whose probes do not exist until M2/M3.

## Two hashes, one relation

| Hash                                                                                           | Proves                                                           | Computable from | Defined by |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------- | ---------- |
| **`foundation_rebuild_hash`**                                                                  | Deterministic, exact replay of M0-owned logical foundation state | **M0**          | this file  |
| **`equivalence_hash`** ([ADR-0027](../../../06-adrs/ADR-0027-projection-consistency-model.md)) | Semantic equivalence — resolved facts, diffs, artefact results   | M2/M3 (probes)  | ADR-0027   |

The foundation hash proves the rebuild pipeline runs and is deterministic; the semantic hash proves the rebuilt twin _means_ the same thing. M0 must not pull a temporary temporal resolver forward to fabricate a semantic probe — the milestone boundary is stated honestly instead.

## What M0 proves

### 1. Canonical material survives untouched

Before and after deleting `.aideon/runtime/`: the `manifest.json` canonical digest is unchanged; the ordered operation-segment set is unchanged and each sealed segment's checksum still validates; the authored schema-document set (`model/schema/authored/`) is unchanged by digest; every content-addressed object still matches its hash. This proves the wipe touched only derived state — not rebuild correctness by itself.

### 2. Every canonical operation is replayed exactly once

The rebuilt runtime reports the same logical applied-operation set as before, compared as a set of `(partition_id, op_id, canonical_record_digest)` sorted by the contract key and independent of physical row order:

- every valid canonical operation appears exactly once; none is omitted; none appears that is absent from the log; none has different canonical content;
- replay checkpoints point to the same canonical segment heads;
- running rebuild a second time produces no additional applied operations (idempotent).

This directly tests the identity and canonical-record decisions ([ADR-0038](../../../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)).

### 3. Foundation projections are logically equivalent

Compare only the stable logical projections M0 owns, exposed through a **test-only `FoundationProjectionSnapshot` DTO** — never a dump of SQLite tables, so the derived store's schema, indexes, and ordering may change without breaking the test ([ADR-0027](../../../06-adrs/ADR-0027-projection-consistency-model.md) rejects physical-DB equivalence):

```text
FoundationProjectionSnapshot {
  workspace_id,
  partitions: [
    { partition_id, applied_ops: [ { op_id, canonical_record_digest } ], replay_head }
  ],
  schema_documents: [ { package_id, version, relative_path, canonical_digest } ],  // raw AUTHORED docs under model/schema/authored/, NOT a compiled effective schema (M1)
  actors:           [ { actor_id, declaration_digest } ],
  objects:          [ { sha256, byte_length } ]
}
```

**Digests in the snapshot** (all `blake3-256`, lower-case hex, per [Aideon Canonical JSON v1](../../../04-contracts/canonical-json.md)):

- `applied_ops[].canonical_record_digest` — over `canonical_record_bytes` (the canonical JSON value **plus** its one trailing LF), the same bytes the segment checksum covers.
- `schema_documents[].canonical_digest` — over `canonical_json_bytes(document)` (a whole-file authored JSON document, **no** trailing LF). M0 includes only authored documents; effective-schema digests, compiler output, and validation-result hashes enter **M1**'s oracle, never M0's.
- `actors[].declaration_digest` — the `canonical_record_digest` of the actor's `actor-declare` operation.

### 4. Rebuild behaviour is operationally correct

The lifecycle is part of M0 even though it is not in the hash: a missing runtime is detected on open; rebuild runs as **accepted work**, not a blocking unbounded IPC call ([accepted-work-and-events](../../../04-contracts/accepted-work-and-events/README.md)); the workspace is not exposed as ready before the required foundation projections complete; progress and completion events are emitted; a rebuild failure leaves the canonical files untouched; and a second reopen uses the rebuilt runtime without an unnecessary re-rebuild.

## The M0 hash

```text
foundation_rebuild_hash = BLAKE3( canonical_serialisation( FoundationProjectionSnapshot ) )
```

`canonical_serialisation` is the shared [canonical-JSON profile](../../../04-contracts/canonical-json.md) (sorted keys, UUIDs lower-case, full-range coordinates as decimal strings). The assertion:

```text
foundation_rebuild_hash(before_wipe) == foundation_rebuild_hash(after_rebuild)
```

BLAKE3 is the family already used for sealed-segment and export-package checksums ([ADR-0002](../../../06-adrs/ADR-0002-portable-workspace-format.md)). The input op set is the seed dataset compiled to operations — the `baseline-graph` and `baseline-plan` commits of [`baseline.yaml`](../../base/baseline.yaml) against [`core-v1.json`](../../meta/core-v1.json).

## The semantic hash arrives later

ADR-0027's `equivalence_hash` is defined now but its probes arrive incrementally, never wholesale at M0:

| Milestone | Added probe                                                    |
| --------- | -------------------------------------------------------------- |
| **M0**    | None — `foundation_rebuild_hash` only.                         |
| **M1**    | Optional metamodel compilation and validation-result fixtures. |
| **M2**    | Resolved facts and diffs at fixed viewpoints.                  |
| **M3**    | Catalogue and other artefact-result fixtures.                  |

Once M2 and M3 are complete, the same wipe-and-rebuild flow must also produce identical resolved facts and artefact results under the fixed ADR-0027 probe set — that is the semantic gate, layered on top of this structural one.

> **Honest state.** `FoundationProjectionSnapshot` is a test-only DTO not yet implemented; the concrete `foundation_rebuild_hash` value is produced once the M0 segment writer and rebuild pipeline exist. This file fixes the _relation, the snapshot shape, and the assertion_ now.

## Related documents

| Document                                                                                          | What it covers                                                      |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [ADR-0027](../../../06-adrs/ADR-0027-projection-consistency-model.md)                             | The semantic equivalence relation and the milestone probe schedule. |
| [M0 build contract](../../../build-contracts/M0-foundation.md)                                    | The milestone this oracle gates.                                    |
| [golden-journey](../../../build-contracts/golden-journey.md)                                      | Steps 9–10; structural here, semantic at M2/M3.                     |
| [workspace-integrity-and-recovery](../../../05-modules/mneme/workspace-integrity-and-recovery.md) | Rebuild as the recovery path.                                       |
| [operation fixtures](../operations/README.md)                                                     | The op-set building blocks the input is compiled from.              |
