# The golden journey

The one concrete, demonstrable path that joins the M0–M3 milestones into a single product story: a single user authors a twin, time-travels it, reasons over it, and proves the workspace survives a runtime wipe. It exists so an agent (or a person) can see the whole vertical before building any slice of it, and so the milestones have a shared acceptance test rather than only per-module outcomes ([ROADMAP](../00-index/ROADMAP.md)).

Every step names the **command** from the authoritative [IPC manifest](../contracts/ipc-manifest.json) (tier 2 of the [contract precedence](./README.md#contract-precedence)), the **canonical files** it writes, the **events** it emits, the **oracle** (expected fixture output) it is checked against, and its **error** cases. Where a step is host lifecycle rather than a renderer command, that is stated. Request/response _shapes_ are governed by `docs/contracts/` and `docs/04-contracts/`; this file pins the _sequence and the oracle_, and flags any shape not yet schema-pinned as design intent.

> **Honest state.** This journey is the target. Several commands exist in the manifest today; the per-step request/response schemas and the expected-output fixtures are authored incrementally (Increments 2–4 of the [build plan](./README.md)). A step whose oracle fixture does not yet exist is marked _(oracle: planned)_.

All steps run against the seed metamodel [`core-v1.json`](../data/meta/core-v1.json) and produce results comparable to the seed dataset [`baseline.yaml`](../data/base/baseline.yaml), so the journey is reproducible.

---

## The path

### 1. Create and open a workspace

- **Mechanism:** host workspace lifecycle, not a renderer command — the host resolves a storage root inside the trust boundary, acquires the single-writer lock, and validates the schema version ([workspace-lifecycle](../05-modules/host/workspace-lifecycle.md)).
- **Canonical files:** a new workspace folder — `manifest.json`, empty `model/ops/`, seed `model/schema/`, empty `objects/sha256/` ([ADR-0002](../06-adrs/ADR-0002-portable-workspace-format.md), [canonical-vs-derived](../01-architecture/boundary/canonical-vs-derived.md)).
- **Events:** `workspace_opened` _(gap: not in [event-manifest.json](../contracts/event-manifest.json) yet — registry follow-up, Increment 4)_.
- **Errors:** `WORKSPACE_NOT_FOUND`, `WORKSPACE_LOCKED`, `SCHEMA_TOO_NEW` in the standard envelope ([ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md)); none leaks a raw path.
- **Oracle:** the freshly created folder matches the format fixture _(oracle: planned — workspace format v1, Increment 2)_.

### 2. Load the seed metamodel

- **Command:** `mneme_store_upsert_metamodel_batch` (Praxis publishes the compiled `MetamodelBatch`), then `mneme_store_compile_effective_schema`; read back with `praxis_metamodel_get` / `mneme_store_get_effective_schema`.
- **Canonical files:** schema-as-data under `model/schema/`; the upsert appends operations to `model/ops/` ([op-fact-schema-model](../05-modules/mneme/op-fact-schema-model.md)).
- **Oracle:** the compiled effective schema for representative seed types equals the expected effective-schema fixture _(oracle: planned — Increment 3)_.
- **Errors:** metamodel validation failure (a type extending an undeclared supertype — the known `Stage` gap, [data/README](../data/README.md)) is rejected with a validation error code, not stored.

### 3. Create one entity and one relationship

- **Commands:** `mneme_store_create_node` (e.g. an `Application`), then `mneme_store_create_edge` (e.g. `realises` to a `Capability`) — or the same expressed as a Change Event via `praxis_task_apply_operations`, which Praxis validates against the metamodel before it compiles to operations ([tasks-and-change-events](../05-modules/praxis/tasks-and-change-events.md)).
- **Canonical files:** new append-only operations in `model/ops/`. The derived runtime updates incrementally ([ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md)).
- **Events:** `mneme_change_event` (payload keys `partition, sequence, op_id, asserted_at, entity_id, change_kind, payload`).
- **Errors:** a write that is structurally valid but invalid against the metamodel is rejected at the boundary and **does not enter the op log** (this is itself an oracle assertion).

### 4. Record plan and actual claims at different valid times

- **Command:** `mneme_store_set_property_interval` (or a Change Event) — assert a slot value on the `plan` layer with one valid-time interval and on the `actual` layer with another ([layer-and-policy](../04-contracts/temporal-and-scenario/layer-and-policy.md), [bitemporal-and-hlc](../05-modules/mneme/bitemporal-and-hlc.md)).
- **Canonical files:** two appended operations carrying layer, valid-time interval, and asserted-time (HLC).
- **Oracle:** the operations match the valid/invalid operation fixtures for `set_property_interval` _(oracle: planned — Increment 2)_.

### 5. Resolve two viewpoints

- **Command:** `chrona_temporal_state_at` (or `mneme_store_read_entity_at_time`) at two viewpoints that differ by as-of valid time, layer policy, or scenario ([resolution-rules](../04-contracts/temporal-and-scenario/resolution-rules.md), [viewpoint-shape](../04-contracts/temporal-and-scenario/viewpoint-shape.md)).
- **Oracle:** each resolved value equals the corresponding temporal resolution vector _(oracle: planned — Increment 3)_; a superseded fact is absent from the effective value but remains inspectable via `mneme_store_explain_resolution` ([conflicts-during-resolution](../04-contracts/temporal-and-scenario/conflicts-during-resolution.md)).

### 6. Produce a diff

- **Command:** `chrona_temporal_diff` over the two viewpoints from step 5 ([diff](../04-contracts/temporal-and-scenario/diff.md), [ADR-0008](../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)).
- **Oracle:** the delta set equals the expected diff fixture; a delta that exists only because layer policy differs (no fact changed) is reported as policy-driven, not data-driven _(oracle: planned — Increment 3)_.

### 7. Execute one catalogue artefact

- **Command:** `praxis_artefact_execute_catalogue` at a named viewpoint with a scope, sort, and page ([ADR-0033](../06-adrs/ADR-0033-artefact-execution-model.md), [catalogue-result](../04-contracts/artefact-results/catalogue-result.md)).
- **Oracle:** the result JSON — rows, per-row provenance/classification, pagination cursor, integrity — equals the expected catalogue fixture for that viewpoint _(oracle: planned — Increment 4)_. The catalogue is the first artefact built because it exercises resolution, scope, sort, pagination, integrity, and honest-state without deterministic graph layout.

### 8. Close and reopen the workspace

- **Mechanism:** host lifecycle — close drains in-flight jobs and flushes engine state (`workspace_closed`); reopen repeats step 1's validate path.
- **Oracle:** after reopen, step 5 resolves the same values and step 7 returns the same catalogue result (continuity across a session boundary).

### 9. Delete `.aideon/runtime/`

- **Mechanism:** delete the derived runtime directory while the workspace is closed. No canonical file is touched ([canonical-vs-derived](../01-architecture/boundary/canonical-vs-derived.md)).

### 10. Rebuild and prove equivalence

- **Mechanism:** reopen — the host detects the absent runtime and rebuilds it from `model/ops/` + `model/schema/` as an accepted job ([workspace-integrity-and-recovery](../05-modules/mneme/workspace-integrity-and-recovery.md)); `mneme_store_trigger_rebuild_effective_schema` and the analytics/integrity refresh triggers participate.
- **Oracle — the journey's final assertion, in two layers:** **(M0, structural)** the rebuild reproduces the same logical foundation state — proven by the deterministic **`foundation_rebuild_hash`** over the `FoundationProjectionSnapshot` (applied-op set, schema-document digests, actor registry, object index, replay checkpoints), equal before vs after the wipe ([rebuild oracle](../data/fixtures/rebuild/README.md)). **(M2/M3, semantic)** once probes exist, re-running steps 5–7 after the rebuild produces **semantically equivalent** results — identical resolved facts and catalogue rows — under the ADR-0027 `equivalence_hash`. Equivalence is _not_ byte-identical runtime state; it is identical resolved meaning. _(M0 hash computable once the rebuild pipeline exists; semantic probes land at M2/M3.)_

---

## What the journey proves

| Milestone | Steps       | The capability the journey demonstrates                                     |
| --------- | ----------- | --------------------------------------------------------------------------- |
| **M0**    | 1, 8, 9, 10 | A portable workspace opens, round-trips a session, and rebuilds losslessly. |
| **M1**    | 2, 3        | Meaning is authored against the metamodel; invalid writes are rejected.     |
| **M2**    | 4, 5, 6     | Every read is time-and-scenario qualified; resolution and diff are correct. |
| **M3**    | 7           | An artefact executes against the twin and renders deterministically.        |

A build is **golden-journey-complete** when every step runs against the seed data, every command resolves in the IPC manifest, and every oracle fixture exists and matches. Until then, each _(oracle: planned)_ marker is a tracked build-contract item, not a silent gap.

---

## Related documents

| Document                                                                  | What it covers                                                   |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [README.md](./README.md)                                                  | Contract precedence and how an agent uses this folder.           |
| [ROADMAP.md](../00-index/ROADMAP.md)                                      | The MVP definition and milestone exit criteria.                  |
| [ipc-manifest.json](../contracts/ipc-manifest.json)                       | The authoritative command surface every step names.              |
| [temporal-and-scenario/](../04-contracts/temporal-and-scenario/README.md) | The viewpoint, resolution, and diff semantics steps 4–6 rely on. |
