# Architecture Boundary — Tauri Host ↔ Rust Engine

## Summary

The Tauri (Rust) host owns UI orchestration, OS integration, local persistence, and **secure IPC**.
The Rust engine crates provide graph analytics/ML and heavy computations (time-slicing, topology, TCO)
behind typed traits. Desktop mode uses in-process adapters; remote/server adapters must keep the same
contracts.

## RPC Boundary

- **Transport:** In-process (desktop mode). Remote/server adapters will reuse the same schema over
  pipes/UDS or HTTP/2 when enabled.
- **Auth:** Random per-launch capability token; deadlines; backpressure; per-job timeouts.
- **Schema:** Protobuf (recommended) or versioned JSON schema.

### Core Messages

- **Job**: `id`, `type`, `schemaVersion`, `payloadRef` (JSON or Arrow), `options`, `deadline`.
- **Result**: `id`, `status`, `payloadRef` (JSON or Arrow), `metrics` (duration, bytes), `error?`.
- **Health**: `status`, `versions`, `uptime`.

## Job Types (v1)

- `Analytics.ShortestPath` — `{ from, to, maxHops }`.
- `Analytics.Centrality` — `{ algorithm: "degree"|"betweenness", scope }`.
- `Analytics.Impact` — `{ seedRefs[], filters{} }`.
- `Temporal.StateAt` — `{ asOf, scenario?, confidence? }` → materialised subgraph.
- `Temporal.Diff` — `{ from: plateauId|date, to: plateauId|date, scope? }`.
- `Temporal.TopologyDelta` — `{ from, to }`.
- `Finance.TCO` — `{ scope, asOf, scenario?, policies? }`.

## Data Transfer

- **Small**: JSON (UTF-8).
- **Large/columnar**: Apache Arrow; optional Arrow Flight over gRPC (server mode).
- Payloads are immutable; results include provenance (snapshotId, policySetIds).

## Process Lifecycle

- Host initializes engine adapters during startup and keeps them in-process for desktop mode.
- Remote adapters (future) must expose health endpoints and stay supervisor-friendly.
- No open TCP ports in desktop mode; all work is local via typed traits.

## Cloud/Server Transition

- Swap the local engine adapters for remote clients (mTLS) via config while keeping DTOs stable.
- Desktop becomes a thin client; scheduling and connectors run server-side.

## Security Notes

- Evaluate `Temporal.StateAt` and `Temporal.Diff` in a sandbox context; log invocations
  (who/when/what) for audit.
- Enforce PII redaction at host boundary for all exports/results (deny-by-default with allowlists).
- Apply strict least-privilege FS and process permissions for UDS/pipe locations.

## Time & Commit Model — Authoring Standards

### 0. Principle

Time is derived from commits. The engine models time as the ordered sequence of commits in a DAG
per branch. Wall-clock timestamps are metadata for people; logical order (parents/ancestors) is the
source of truth for state, diffs, and merges.

### 1. Core definitions

- Commit — append-only change event with parent(s); creates a new logical “tick”.
- Branch — named pointer to a head commit (scenario timeline).
- Snapshot — materialised view of the graph at a specific commit.
- Node / Edge — immutable typed objects; updates create new versions.
- ChangeSet — `{ nodeCreates | nodeUpdates | nodeDeletes | edgeCreates | edgeUpdates | edgeDeletes }`
  in a commit.

These names are canonical; use them in DTOs and structs.

### 2. Invariants

1. Append-only history — commits never mutate; corrections are forward commits.
2. Determinism — same ancestor + same `ChangeSet` ⇒ same `Snapshot`.
3. No dangling edges — every edge’s endpoints exist in the target snapshot.
4. ID stability — IDs never recycle; deletes are tombstones.
5. Schema safety — all commits pass schema validation before persistence.
6. Branch isolation — changes on one branch never leak to another until merge.
7. Ordering — ancestry defines order, not wall time.

Add unit tests when touching logic that must enforce these rules.

### 3. API contracts (host ↔ UI)

#### Read

- `stateAt(target: CommitId | { branch: BranchName, at?: CommitId }) -> SnapshotSummary`
- `diff(a: CommitRef, b: CommitRef) -> Diff { nodeAdds, nodeMods, nodeDels, edgeAdds, edgeMods, edgeDels }`
- `listCommits(branch: BranchName, limit?: number, before?: CommitId) -> Commit[]`
- `listBranches() -> Branch[]`

#### Write

- `commit(changes: ChangeSet, message: string, tags?: string[]) -> CommitId`
- `createBranch(name: string, from?: CommitRef) -> Branch`
- `merge(source: BranchName, target: BranchName, strategy?: MergeStrategy) -> { result?: CommitId, conflicts?: ConflictSet }`

Read APIs must be pure; write APIs are atomic. Never expose storage-internal fields.

### 4. Commit structure

```json
{
  "id": "c:1234",
  "parents": ["c:0123"],
  "branch": "main",
  "author": "alex",
  "time": "2025-11-02T11:05:44Z",
  "message": "feat: add capability and link to system",
  "tags": ["capability"],
  "changes": {
    "nodeCreates": [
      { "id": "n:cap-1", "type": "Capability", "props": { "title": "Time travel", "owner": "Ops" } }
    ],
    "edgeCreates": [
      {
        "id": "e:cap1->sys7",
        "type": "supports",
        "from": "n:cap-1",
        "to": "n:sys-7",
        "directed": true,
        "props": { "weight": 0.6 }
      }
    ]
  }
}
```

Order change entries deterministically (by kind → id). ID generation must be independent of wall
time.

### 5. Validation rules

- Schema — every node/edge respects its type definition.
- Edge constraints — `(fromType, edgeType, toType)` combinations must be allowed.
- Uniqueness — enforce per-type unique keys when defined.
- Referential integrity — edges reference nodes in `parent snapshot + ChangeSet`.
- No-op — reject empty `ChangeSet` unless flagged as meta.
- Size guardrails — cap changes per commit to keep diffs tractable.

### 6. Diff & merge semantics

- Diff works on snapshots derived from commit ancestry.
- Three-way merge uses `{ base, ours, theirs }` at the structural level.
- Scalar prop conflicts default to last-writer-wins with deterministic tie-breaks.
- Collections use set-union with stable ordering; duplicates removed by id.
- Delete vs update — delete wins by default (configurable).
- Always surface a machine-readable `ConflictSet`; never drop conflicting changes silently.

### 7. Persistence & caching (desktop default)

- Use immutable stores with structural sharing for snapshots.
- Cache frequently visited snapshots by `SnapshotId = hash(parentSnapshotId + changes)`.
- Background compaction may compress history but must preserve commit boundaries.

### 8. Error handling

- `ValidationError` — schema/constraint breach.
- `ConflictError` — merge requires human decision.
- `IntegrityError` — dangling ids, hash mismatch.
- `ConcurrencyError` — branch head moved; retry with updated parent.

Renderer should receive typed error codes, not ad-hoc strings.

### 9. UI obligations

- Display branch and commit id in the chrome at all times.
- Timebar scrubs commit order, not wall time.
- “Unsaved changes” reflects working `ChangeSet` vs head snapshot.
- Diff legend uses ADD / MOD / DEL consistently.
- Merge UI surfaces the `ConflictSet` and chosen resolutions.

### 10. Testing requirements

- Unit — success + failure + edge cases for new engine functions.
- Property-based (where feasible) — `apply(diff(a,b), snapshot(a)) == snapshot(b)`.
- Golden tests — serialised commits/diffs remain stable.
- Contract tests — host commands return the DTO schema exactly.

### 11. Performance guardrails

- Snapshot materialisation for a median commit ≤ 10 ms (dev laptop).
- Diff of typical commits (≤ 500 changes) ≤ 15 ms.
- Timebar load (latest 200 commits) ≤ 50 ms from cache/index.

Add perf marks and fail CI if budgets regress by >20%.

### 12. Optional — effective time

When bitemporal behaviour is needed:

- Add `valid_from?` / `valid_to?` on node/edge props.
- Queries must choose transaction time (default) or effective time explicitly.
- Do not mix unless the caller requests it.

### 13. Versioning & migration

- Breaking DTO/storage changes require an `engineVersion` bump.
- Provide forward-only migrators; keep an explicit back-compat window or emit “upgrade required”.

### 14. Do / Don’t

**Do**

- Commit small, coherent `ChangeSet`s with clear messages.
- Experiment on branches; merge with three-way merges.
- Treat wall time as display-only metadata.

**Don’t**

- Compute state via `now()` or wall-time filters.
- Mutate past commits or rewrite branch history.
- Leak storage internals into public DTOs.
