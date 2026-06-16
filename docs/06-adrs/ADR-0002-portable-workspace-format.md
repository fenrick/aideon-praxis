# ADR-0002: Portable Workspace Folder Format

- Status: Accepted
- Date: 2026-06-10
- Depends-On: ADR-0001

## Context

[ADR-0001](./ADR-0001-workspace-is-canonical-authority.md) makes the workspace canonical. This ADR specifies what the workspace _is_ on disk. The requirement is a folder layout that is portable (copy, zip, or sync without a server), auditable (append-only, replayable), forward-tolerant (readable by newer software), and cleanly separated into canonical data and disposable derived state.

The two key design pressures are portability and rebuild correctness: a recipient with only the canonical portion must be able to reconstruct the full runtime state with no other inputs.

## Governance Framing

- **Decision type:** Invariant (the canonical/derived split) + stable seam (the exact layout).
- **Known future pressure:** sync, deterministic export, binary growth, schema evolution.
- **What stays stable:** the split between canonical `model/` + `objects/` and disposable `.aideon/runtime/`; append-only op segments; schema-as-data.
- **What is provisional:** JSONL wire format for op segments (a compact binary segment format may replace it later with identical semantics); the exact sidecar directory names.
- **What is deferred:** encryption envelopes; the on-wire sync format (ADR-0005).
- **Why hard to reverse:** the layout is what users copy, zip, and sync; readers must stay forward-tolerant. Migration needs explicit format versioning.

## Decision

A workspace is a folder (conventionally `*.aideon/`) with this shape:

```text
my-project.aideon/
  manifest.json              # workspace_format_version, schema_version, ids, feature flags

  model/                     # CANONICAL
    ops/                     # append-only operation segments
      000001.ops.jsonl       # sealed segment
      current.ops.jsonl      # loose (open) segment
    schema/                  # schema-as-data
      types.json  fields.json  edge_rules.json  policies.json

  objects/                   # CANONICAL — content-addressed blobs (see ADR-0003)
    sha256/ab/cd/abcdef...

  docs/                      # CANONICAL — user notes, imports

  .aideon/                   # DERIVED — disposable runtime state (gitignored, not synced)
    runtime/
      state.json  locks/  checkpoints/
      tuple_index/  graph/  search/  vector/
```

Everything under `model/` and `objects/` is canonical. Everything under `.aideon/runtime/` is derived: it may be deleted and rebuilt from the canonical files with no data loss.

**Operation envelope** (canonical record; JSON Lines). The exact record shape — `op_id`, `actor_id`, `asserted_at`, the stable kebab `kind`, `format_version`, `deps`, the on-operation `origin`, and the typed `payload` — and its byte-exact serialisation are fixed by **[ADR-0038](./ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)** and the [canonical-JSON profile](../04-contracts/canonical-json.md); this ADR does not maintain a second example. The asserting identity is the logical **`actor_id`** alone — never a device identity; `device_id` is host-local and never enters a canonical record ([workspace-integrity-and-recovery](../05-modules/mneme/workspace-integrity-and-recovery.md)).

Rules:

- **Append-only, auditable, replayable.** New facts are new ops; nothing is mutated in place.
- **Schema lives in the op stream** (`schema.upsert`) and in `model/schema/`, never buried in code enums. **The op stream is authoritative; `model/schema/` is a derived, reconstructible cache** of the compiled effective schema at the latest belief. On disagreement, `model/schema/` is recompiled from the op log — a hand-edited cache is never trusted over the operations that define the schema's history ([workspace-integrity-and-recovery](../05-modules/mneme/workspace-integrity-and-recovery.md), schema-authority rule).
- **Canonical writes use temp-file-plus-rename**; op segments are sealed before export.
- `manifest.json` carries `workspace_format_version` and `schema_version`; readers are forward-tolerant where sensible and reject formats newer than they understand with a clear error.

### `manifest.json` fields (format v1)

The root descriptor. Required: `workspace_format_version` (integer), `schema_version` (integer), `workspace_id` (UUID string, minted once and never regenerated), `created_at` (RFC 3339 UTC). Optional with defaults: `created_by_actor_id` (the logical [actor](../05-modules/mneme/identifier-generation-and-provenance.md) that created the workspace; never a device identifier), `hash_algorithm` (default `"sha256"`), `segment_seal_max_bytes` (default `8388608`), `segment_seal_max_age_secs` (default `86400`), `feature_flags` (object, default `{}`). Unknown top-level keys are ignored, not rejected, so a newer minor format stays readable. The complete field table, the workspace/actor identifier formats, and the maximum supported versions (`MAX_WORKSPACE_FORMAT_VERSION = 1`, `MAX_SCHEMA_VERSION = 1` at the v1 baseline) are specified in [workspace-integrity-and-recovery](../05-modules/mneme/workspace-integrity-and-recovery.md). `workspace_id` is canonical and travels with the workspace; `device_id` is host-local derived state, never recorded in the manifest or any canonical file.

### Durability rules

The portability rules above leave four durability concerns implicit. They are fixed here because they govern what users copy, zip, and sync, and a reader on an older build must behave predictably against a newer-format workspace.

- **Single-writer concurrent access.** A workspace is opened for writing by **at most one process at a time**. The opening process takes an exclusive **workspace lock** — an advisory lock file at `.aideon/runtime/locks/workspace.lock` carrying the holder's process and device identity — before the single-writer actor starts ([storage-trait-and-engine](../05-modules/mneme/storage-trait-and-engine.md)). A second process that finds a live lock must refuse to open for writing rather than start a second writer; it may open **read-only** against the canonical files. The lock lives under `.aideon/runtime/` because it is host-local state, never copied, zipped, or synced. A stale lock left by a crashed process is reclaimable: the lock records the holder identity so a new opener can detect that the holder is gone and take over. This makes the single-writer constraint of [ADR-0004](./ADR-0004-storage-engine-abstraction.md) a property of the **workspace on disk**, not only of the in-process queue.

- **Op-segment sealing.** Operations are appended to the loose segment `current.ops.jsonl`. A segment is **sealed** — closed, fsync'd, and renamed to a monotonic numbered name (`000001.ops.jsonl`) — when it reaches a size or age threshold, or on an explicit checkpoint or export. A sealed segment is **immutable**: it is never appended to or rewritten, only superseded by the next loose segment. Only the trailing loose segment can ever be incomplete after a crash; every sealed segment is whole, which is what lets a reader trust all-but-the-tail without re-validating the whole log on every open. The exact sealing thresholds are provisional configuration; that a sealed segment is immutable and only the loose tail is mutable is the invariant.

- **Format forward-compatibility.** `manifest.json` carries `workspace_format_version` as an integer. The rule a reader follows on open is **refuse-or-degrade**, never silently misinterpret:
  - **Equal version** — open normally.
  - **Older workspace, newer reader** — open and, where a one-way migration is needed, perform it (forward-only; [ADR-0017](./ADR-0017-contract-and-dto-versioning.md)).
  - **Newer workspace, older reader** — if the format major version exceeds what the build understands, refuse the open with a clear `WORKSPACE_FORMAT_TOO_NEW` diagnostic ([ADR-0016](./ADR-0016-error-envelope-rfc9457.md)), mirroring the `SCHEMA_TOO_NEW` rule for schema versions ([failure-modes](../05-modules/mneme/failure-modes.md)). A reader degrades — opens read-only and ignores fields it does not recognise — only when the newer format declares itself backward-compatible at that major version. A reader never partially interprets a structure it does not fully understand and then writes to it.

- **Integrity checks on canonical files.** Canonical files are integrity-checkable without a side database:
  - **Blobs are self-checksumming** — the `objects/sha256/<hash>` path _is_ the checksum; re-hashing the bytes detects corruption with no separate digest to keep in sync ([ADR-0003](./ADR-0003-content-addressed-object-store.md)).
  - **A sealed op segment carries a trailing checksum** (BLAKE3 over the segment's complete records, in file order, excluding the checksum line itself) so a sealed segment can be verified whole on open; the loose segment carries no trailing checksum and is validated by record framing up to the last complete record. A sealed segment that fails its checksum is detected loss — the workspace refuses a read-write open and the operations are recovered from a redundant copy (export package, sync peer) or reported with their exact extent, never silently skipped ([workspace-integrity-and-recovery](../05-modules/mneme/workspace-integrity-and-recovery.md)).
  - **An export package carries a footer checksum** (BLAKE3 over the op records) so a transferred package is verified before ingest ([export-import-replay](../05-modules/mneme/export-import-replay.md)). The hash family is versioned by directory (`objects/sha256/`) so a second algorithm can coexist later ([ADR-0003](./ADR-0003-content-addressed-object-store.md)).

## Consequences

- A workspace opens locally with no server and no pre-existing runtime cache.
- Deleting `.aideon/runtime/` is always safe; "rebuild runtime from workspace" is a first-class operation ([ADR-0004](./ADR-0004-storage-engine-abstraction.md)).
- `.aideon/runtime/` must be excluded from Git, sync tools, and package export.
- The HLC in each op gives stable causal ordering for offline edits and later merge ([ADR-0005](./ADR-0005-sync-and-conflict-model.md)).
- The op envelope schema is published under [`../04-contracts/CONTRACTS-AND-SCHEMAS.md`](../04-contracts/CONTRACTS-AND-SCHEMAS.md).
- Segment-sealing policy (size/age/explicit) is documented in [`../05-modules/mneme/RUNTIME-AND-ENGINE.md`](../05-modules/mneme/RUNTIME-AND-ENGINE.md).
- The mechanisms behind the durability rules — locking under concurrent open, append safety on the loose segment, the verify routine, orphaned-blob garbage collection, and recovery from a torn write — are documented operationally in [`../05-modules/mneme/workspace-integrity-and-recovery.md`](../05-modules/mneme/workspace-integrity-and-recovery.md); the failure _taxonomy_ those mechanisms serve is [`../05-modules/mneme/failure-modes.md`](../05-modules/mneme/failure-modes.md).
