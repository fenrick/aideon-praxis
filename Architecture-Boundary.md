# Architecture & Boundaries (Aideon Suite)

## Purpose

Provide the canonical code-level architecture and boundary reference for the Aideon Suite monorepo:
how renderers, host, and engine crates are layered; how adapters and RPC work; and which security
and time-first constraints must hold across modules (Praxis, Chrona, Metis, Continuum, Mneme).

## Layers

- **Renderer**
  - React-based Praxis Canvas runs inside the Tauri shell.
  - Renders the canvas, dashboards, and inspectors; owns view state only (selection, filters, time).
  - No Node integration; strict CSP; no direct DB or network access; all backend calls go through a
    typed IPC bridge.

- **Host (Tauri)**
  - Creates windows and binds typed commands that wrap engine traits.
  - Owns capabilities, CSP, window configuration, logging, and OS integration.
  - Enforces “no open TCP ports” in desktop mode; all work is in-process or over local IPC.

- **Adapters (TypeScript)**
  - `GraphAdapter`, `StorageAdapter`, and `WorkerClient` define the renderer-facing contracts for
    graph access, snapshot persistence, and analytics/worker jobs.
  - Implementations remain backend-agnostic; renderer code depends on interfaces only.

- **Engines (Rust crates)**
  - Praxis Engine, Chrona Visualisation, Metis Analytics, Continuum Orchestrator expose computation
    traits consumed by the host.
  - Desktop mode uses in-process adapters; future server mode swaps in remote adapters that honour
    the same trait contracts.

- **Persistence & schema (Mneme + MetaModelRegistry)**
  - Mneme Core provides the ACID store (SQLite/WAL in desktop mode) and shared DTOs for
    commits/refs/snapshots and analytics events.
  - Praxis Engine materialises the schema payloads (e.g., `core-v1.json`) into a `MetaModelRegistry`
    that enforces node/edge validation and exposes the active schema via host commands.

## Host ↔ Engine RPC boundary

Desktop mode keeps all work **in-process** behind Rust traits, but the same contracts are designed
to support remote/server adapters over pipes/UDS or HTTP/2 when enabled. This section captures the
canonical RPC boundary between the Tauri host and the Rust engine crates (Chrona, Metis, Praxis,
Continuum).

### Transport, auth, and schema

- **Transport (desktop):** in-process calls over trait objects; no open TCP ports.
- **Transport (server mode, future):** pipes/UDS or HTTP/2/gRPC with the same DTOs.
- **Auth:** random per-launch capability token, per-job deadlines, backpressure, and timeouts.
- **Schema:** versioned JSON schema or Protobuf; DTOs are versioned and compatible across local and remote adapters.

### Core messages

- **Job**: `id`, `type`, `schemaVersion`, `payloadRef` (JSON or Arrow), `options`, `deadline`.
- **Result**: `id`, `status`, `payloadRef` (JSON or Arrow), `metrics` (duration, bytes), optional `error`.
- **Health**: `status`, `versions`, `uptime`.

### Job types (v1)

- `Analytics.ShortestPath` — `{ from, to, maxHops }`.
- `Analytics.Centrality` — `{ algorithm: "degree"|"betweenness", scope }`.
- `Analytics.Impact` — `{ seedRefs[], filters{} }`.
- `Temporal.StateAt` — `{ asOf, scenario?, confidence? }` → materialised subgraph.
- `Temporal.Diff` — `{ from: plateauId|date, to: plateauId|date, scope? }`.
- `Temporal.TopologyDelta` — `{ from, to }`.
- `Finance.TCO` — `{ scope, asOf, scenario?, policies? }`.

### Data transfer and lifecycle

- **Small payloads:** JSON (UTF‑8).
- **Large/columnar payloads:** Apache Arrow; optional Arrow Flight over gRPC in server mode.
- Payloads are immutable; results include provenance (snapshot IDs, policy set IDs).
- Host initialises engine adapters during startup and keeps them in-process for desktop mode; remote
  adapters must expose health endpoints and remain supervisor-friendly.

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

- Temporal operations (`state_at`, `diff`, topology deltas, TCO) are implemented by Rust engine
  crates (Praxis Engine, Chrona, Metis) and exposed via typed host commands.
- Canvas-level layout snapshots are persisted per `asOf` (and optional scenario) through host
  commands backed by Continuum’s snapshot/storage APIs.
- Future analytics jobs (shortest path, centrality, impact) belong in the engine crates with tests
  and SLO notes; the renderer must never implement analytics logic directly.

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
- Validation is driven by the active meta-model registry; see `docs/meta/README.md` and ADR
  `0005-metamodel-as-graph-dataset.md` for schema details.

### Diff & merge semantics

- Diff runs on snapshots derived from ancestry.
- Three-way merge uses `{ base, ours, theirs }` at the structural level.
- Scalar conflicts default to deterministic last-writer-wins.
- Collections default to set-union with stable order.
- Deletes win over updates by default (configurable).
- Return conflicts explicitly; never drop edits silently.

### Persistence & caching

- Persistence for commits/refs/snapshots is provided by Mneme Core using SQLite in desktop mode; see
  `docs/storage/sqlite.md` and ADR `0006-sqlite-storage-layer.md` for schema and migration details.
- Engines should treat persistence behind traits and avoid embedding DB specifics outside Mneme
  Core.

### Error handling

- Emit typed errors (`ValidationError`, `ConflictError`, `IntegrityError`, `ConcurrencyError`)
  across the host boundary; avoid generic strings.

### UI/UX obligations

- UI obligations for branch/commit display, timebar behaviour, diff legends, and merge flows are
  captured in Praxis Canvas UX and design docs (`docs/UX-DESIGN.md`,
  `app/PraxisCanvas/DESIGN.md`). This file focuses on backend contracts only.

### Testing requirements

- Engine crates must include unit and property-based tests that exercise commit invariants, diff
  semantics, and persistence boundaries; see `docs/testing-strategy.md` for detailed expectations.

### Performance guardrails

- Temporal APIs (`state_at`, `diff`, analytics jobs) should respect the SLOs defined in
  `docs/ROADMAP.md` (SLO section). Regressions beyond agreed thresholds must be surfaced via tests
  or benchmarks.

### Optional effective time

- When bitemporal behaviour is needed, add `valid_from` / `valid_to` and require callers to choose
  transaction vs effective time explicitly; do not mix semantics implicitly.

### Versioning & migration

- Breaking DTO or storage changes require explicit version bumps and migrations; see ADR
  `0006-sqlite-storage-layer.md` and relevant engine/persistence design docs.

### Checklist

- **Do:** commit coherent ChangeSets, branch experiments safely, treat wall time as display-only
  metadata.
- **Don’t:** compute state via `now()`, mutate history, or leak storage internals.

## Compliance checklist

- [x] No renderer HTTP
- [x] No open TCP ports in desktop mode
- [x] Renderer invokes host commands through typed helper modules (no preload globals)
- [x] Worker logic executes in-process via Rust engine traits
- [x] No auxiliary worker binaries embedded
- [x] Version injection via semantic-release
