# ADR-0002: Portable Workspace Folder Format

- Status: Accepted
- Date: 2026-06-10
- Depends-On: ADR-0001

## Context

[ADR-0001](./ADR-0001-workspace-is-canonical-authority.md) makes the workspace canonical.
This ADR specifies what the workspace *is* on disk. The requirement is a folder layout that
is portable (copy, zip, or sync without a server), auditable (append-only, replayable),
forward-tolerant (readable by newer software), and cleanly separated into canonical data and
disposable derived state.

The two key design pressures are portability and rebuild correctness: a recipient with only
the canonical portion must be able to reconstruct the full runtime state with no other
inputs.

## Governance Framing

- **Decision type:** Invariant (the canonical/derived split) + stable seam (the exact layout).
- **Known future pressure:** sync, deterministic export, binary growth, schema evolution.
- **What stays stable:** the split between canonical `model/` + `objects/` and disposable
  `.aideon/runtime/`; append-only op segments; schema-as-data.
- **What is provisional:** JSONL wire format for op segments (a compact binary segment
  format may replace it later with identical semantics); the exact sidecar directory names.
- **What is deferred:** encryption envelopes; the on-wire sync format (ADR-0005).
- **Why hard to reverse:** the layout is what users copy, zip, and sync; readers must stay
  forward-tolerant. Migration needs explicit format versioning.

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

Everything under `model/` and `objects/` is canonical. Everything under `.aideon/runtime/`
is derived: it may be deleted and rebuilt from the canonical files with no data loss.

**Operation envelope** (canonical record; JSONL initially):

```json
{
  "opId": "op_01J2X0V5M7T3D9M...",
  "workspaceId": "ws_...",
  "hlc": "<hybrid logical clock>",
  "parents": ["op_..."],
  "kind": "entity.upsert | edge.upsert | fact.upsert | fact.tombstone | blob.attach | schema.upsert | conflict.recorded",
  "actor": { "userId": "...", "deviceId": "..." },
  "context": { "scenarioId": null, "validFrom": null, "validTo": null },
  "body": { },
  "bodySha256": "..."
}
```

Rules:

- **Append-only, auditable, replayable.** New facts are new ops; nothing is mutated in place.
- **Schema lives in the op stream** (`schema.upsert`) and in `model/schema/`, never buried
  in code enums.
- **Canonical writes use temp-file-plus-rename**; op segments are sealed before export.
- `manifest.json` carries `workspace_format_version` and `schema_version`; readers are
  forward-tolerant where sensible and reject formats newer than they understand with a
  clear error.

## Consequences

- A workspace opens locally with no server and no pre-existing runtime cache.
- Deleting `.aideon/runtime/` is always safe; "rebuild runtime from workspace" is a
  first-class operation ([ADR-0004](./ADR-0004-storage-engine-abstraction.md)).
- `.aideon/runtime/` must be excluded from Git, sync tools, and package export.
- The HLC in each op gives stable causal ordering for offline edits and later merge
  ([ADR-0005](./ADR-0005-sync-and-conflict-model.md)).
- The op envelope schema is published under
  [`../04-contracts/CONTRACTS-AND-SCHEMAS.md`](../04-contracts/CONTRACTS-AND-SCHEMAS.md).
- Segment-sealing policy (size/age/explicit) is documented in
  [`../05-modules/mneme/RUNTIME-AND-ENGINE.md`](../05-modules/mneme/RUNTIME-AND-ENGINE.md).
