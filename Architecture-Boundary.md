# Architecture & Boundaries

This document describes how the codebase implements the guardrails in `AGENTS.md` and where
boundaries are enforced.

## Layers

- Renderer (SvelteKit front end)
  - Built with SvelteKit; the Tauri host serves the built assets.
  - No Node integration; strict CSP enforced by Tauri (see `crates/tauri/tauri.conf.json`).
- Renderer modules call Tauri commands directly via `@tauri-apps/api/core` helpers (see `app/desktop/src/lib/ports`). No backend logic in renderer.
  - UI code lives under `app/desktop/src/lib/**` and talks only to adapters/host via IPC.

- Host (Tauri)
  - Rust entrypoint: `crates/tauri/src/lib.rs` creates windows at runtime and binds typed commands.
  - Security: capabilities and CSP configured in `crates/tauri/tauri.conf.json`. No open TCP ports in desktop mode.

- Adapters (TypeScript interfaces)
  - `app/adapters/src/index.ts` defines `GraphAdapter`, `StorageAdapter`, and `WorkerClient`
    interfaces. No backend specifics.

- Worker (Rust engine crates)
  - Modules: `crates/chrona`, `crates/praxis`, `crates/metis`, `crates/continuum` expose the
    computation traits consumed by the host.
  - The default desktop mode uses in-process adapters. Remote/server adapters will implement the
    same traits without changing the renderer contract.
- Persistence & Schema (Mneme + MetaModelRegistry)
- `crates/mneme` owns the ACID store (SQLite/WAL today) plus shared DTOs, including the
  meta-model document types. SeaORM/SeaQuery 1.1.19 drives the new persistence layer, creating the
  `commits`, `refs`, `snapshots`, and readonly `metis_events` tables so the host can keep analytics
  data alongside the graph.
  - `crates/praxis/src/meta.rs` materialises `docs/data/meta/core-v1.json` (and optional overrides)
    into a `MetaModelRegistry` that performs all node/edge validation and exposes the active schema
    through the `temporal_metamodel_get` IPC command.

## Boundaries & Security

- Renderer has no direct Node or backend access.
- Host ↔ Renderer: preload IPC only; strict CSP applied in HTML.
- Host ↔ Worker: in-process Rust traits today; future remote adapters must preserve the same
  command surface. No open ports in desktop mode.
- PII: No export code currently; future exports must include redaction tests.
- Health: Host exposes `worker_health` for status indicators; remote adapters must mirror it.

## Packaging

- Rust engine crates are compiled into the host binary; no auxiliary worker bundle is required.
- Remote/server adapters will ship as separate binaries once implemented, controlled via config.

## Time‑first design

- `Temporal.StateAt` implemented as a stub in `chrona::TemporalEngine::state_at` and surfaced via `temporal_state_at` command.
- `Temporal.Diff` summarised by `chrona::TemporalEngine::diff_summary` and exposed through the `temporal_diff` host command, returning node/edge deltas only.
- Canvas persists layout snapshots per `asOf` (and optional scenario) via `canvas_save_layout`; persistence boundary provided by `continuum::SnapshotStore` (file-backed in desktop mode).
- Future jobs (shortest path, centrality, impact) belong in the Rust engine crates with tests and SLO notes.

## Time & Commit Model — Authoring Standards

> **Principle**: Time is derived from commits. Logical ancestry defines the state of the twin; wall-clock timestamps remain metadata only.

### Core definitions

- **Commit** — Append-only change event with parent(s); introduces a new logical “tick”.
- **Branch** — Named pointer to a head commit (scenario timeline).
- **Snapshot** — Materialised graph view for a specific commit.
- **Node / Edge** — Immutable typed objects; updates yield new versions.
- **ChangeSet** — `{ nodeCreates | nodeUpdates | nodeDeletes | edgeCreates | edgeUpdates | edgeDeletes }` captured within a commit.

Use the names above across DTOs, structs, and variables.

### Invariants (must hold)

1. Append-only history; corrections arrive as new commits.
2. Determinism: identical ancestry + ChangeSet ⇒ identical Snapshot.
3. No dangling edges: every edge’s endpoints exist in the resulting snapshot.
4. ID stability: IDs are never recycled; deletes use tombstones.
5. Schema safety: each commit passes validation before persistence.
6. Branch isolation: changes remain scoped until merge.
7. Ordering by ancestry, never wall time.

Add unit tests that exercise the invariants when touching relevant code.

### API contracts (host ↔ UI)

**Read**

- `stateAt(target: CommitId | { branch: BranchName, at?: CommitId }) -> SnapshotSummary`
- `diff(a: CommitRef, b: CommitRef) -> Diff { nodeAdds, nodeMods, nodeDels, edgeAdds, edgeMods, edgeDels }`
- `listCommits(branch: BranchName, limit?: number, before?: CommitId) -> Commit[]`
- `listBranches() -> Branch[]`

**Write**

- `commit(changes: ChangeSet, message: string, tags?: string[]) -> CommitId`
- `createBranch(name: string, from?: CommitRef) -> Branch`
- `merge(source: BranchName, target: BranchName, strategy?: MergeStrategy) -> { result?: CommitId, conflicts?: ConflictSet }`

Rules: read APIs are pure; write APIs are atomic and never leak storage internals.

### Commit structure (canonical)

```json
{
  "id": "c:ad3e…",
  "parents": ["c:9bf2…"],
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

- Commit IDs are now content-addressed: `id = "c_" + blake3(parents + branch + author + message + ChangeSet)`.
- The engine stamps `time` with an ISO-8601 UTC string if the caller omits it, ensuring commits always carry a wall-clock reference while ancestry remains authoritative.
- ChangeSets are normalised (per-kind, deterministic ordering) before hashing or persistence so semantically identical edits yield the same commit hash.
- Snapshots are serialised alongside commits to a binary payload so `state_at`/`diff` can hydrate directly from disk without replaying every ChangeSet.

Order ChangeSet entries deterministically (by kind → id) and keep ID generation independent of wall time.

### Validation rules

- Enforce schema per element type.
- Guard edge constraints (`fromType`, `edgeType`, `toType`).
- Maintain unique keys per type where defined.
- Ensure referential integrity (parent snapshot + ChangeSet).
- Reject empty ChangeSets unless explicitly tagged.
- Cap ChangeSet size (configurable) to keep diffs tractable.
- Praxis loads the schema via `MetaModelRegistry` at startup so every commit/merge passes
  validation before persistence; the renderer consumes the same JSON via `temporal_metamodel_get`
  (see `MetaModelPanel` in the desktop UI) to avoid hard-coded enums.

### Diff & merge semantics

- Diff runs on snapshots derived from ancestry.
- Three-way merge uses `{ base, ours, theirs }` at the structural level.
- Scalar conflicts default to deterministic last-writer-wins.
- Collections default to set-union with stable order.
- Deletes win over updates by default (configurable).
- Return conflicts explicitly; never drop edits silently.

### Persistence & caching

- Backing store: `AppData/AideonPraxis/.praxis/praxis.sqlite` (SQLite 3, WAL mode) with tables for commits, refs, and snapshots. See `docs/storage/sqlite.md` for schemas + rules.
- Commit metadata + ChangeSets live in the `commits` table (JSON columns) written inside transactions; snapshots share the same DB so recovery never depends on loose files.
- Branch refs update through `INSERT ... ON CONFLICT ... DO UPDATE` statements that enforce compare-and-swap semantics and still bubble concurrency conflicts via the engine.
- The `CommitStore` trait (Praxis) abstracts `put_commit`, `get_commit`, `list_refs`, and `compare_and-swap` ref updates so adapters (file, remote API, etc.) can slot in without touching the engines.
- `cargo xtask migrate-state --input legacy.json --output ~/.praxis` replays exported in-memory commits into the durable layout so older builds can upgrade without data loss; upcoming flags will target SQLite directly.
- Use immutable stores with structural sharing (copy-on-write) and cache snapshots by `SnapshotId = hash(parentSnapshotId + changes)`; background compaction may collapse history, but commit boundaries stay intact.

### Error handling

Emit typed errors (`ValidationError`, `ConflictError`, `IntegrityError`, `ConcurrencyError`) across the host boundary; avoid generic strings.

### UI/UX obligations

- Surface branch + commit ID in chrome.
- Timebar scrubs commit order, not wall time.
- “Unsaved changes” reflect working ChangeSet vs head snapshot.
- Diff legend uses ADD/MOD/DEL consistently.
- Merge UI surfaces the `ConflictSet` and chosen resolutions.

### Testing requirements

- Unit tests cover success, failure, and edge cases.
- Property-based checks where feasible (`apply(diff(a,b), snapshot(a)) == snapshot(b)`).
- Golden tests ensure serialised commits/diffs remain stable.
- Contract tests assert command DTO schemas.

### Performance guardrails

- Snapshot materialisation ≤ 10 ms for median commits.
- Diff for ≤ 500 changes ≤ 15 ms.
- Timebar load for latest 200 commits ≤ 50 ms from cache/index.

### Optional effective time

- Add `valid_from` / `valid_to` when bitemporal semantics are needed.
- Callers must specify whether they query transaction or effective time.

### Versioning & migration

- Breaking DTO/storage changes bump `engineVersion`, ship migrators, and keep a back-compat window or explicit upgrade error.

### Checklist

- **Do:** commit coherent ChangeSets, branch experiments, treat wall time as display-only.
- **Don’t:** compute state via `now()`, mutate history, or leak storage internals.

## Compliance checklist

- [x] No renderer HTTP
- [x] No open TCP ports in desktop mode
- [x] Renderer invokes host commands through typed helper modules (no preload globals)
- [x] Worker logic executes in-process via Rust engine traits
- [x] No auxiliary worker binaries embedded
- [x] Version injection via semantic-release
