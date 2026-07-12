# Layers and Responsibilities

Who owns what, and what each layer is forbidden from doing, across the six bands of Aideon Desktop: renderer, the Tauri
IPC boundary, the Rust host, the domain engines, the canonical workspace, and the derived runtime. Each band has an
allowed list and a forbidden list; the forbidden list is the load-bearing half.

The shape of all six bands together is drawn in [`README.md` Figure 1](./README.md). This file gives the detail.

---

## Renderer (React / WebView)

The renderer is a static bundle loaded inside the WebView. It is untrusted by the OS and by the host. It is
[disposable UI](./boundary-thesis.md): discarding it loses no model correctness.

**Allowed:**

- Render artefact results, diagram specs, and signal surfaces received from the host.
- Hold local UI state: selection, filters, tabs, layout, and undo/redo stacks for in-flight edits.
- Call the host exclusively through typed adapter modules under `src/adapters`.
- Listen to typed push events emitted by the host (progress, invalidation, watch notifications).
- Display honest **Partial**, **Stale**, **Rebuilding**, and **Generated** states and propagate backpressure feedback to
  the user, per the honest-state vocabulary in
  [`../../02-standards/DOCUMENTATION-STANDARD.md`](../../02-standards/DOCUMENTATION-STANDARD.md) §9.

**Forbidden:**

- Node integration, OS APIs, or direct filesystem access of any kind.
- Spawning shell processes or loading native plugins outside Tauri's capability model.
- Direct access to the runtime database, workspace files, or blob store.
- Issuing raw HTTP requests to local or remote services as the primary communication seam.
- Opening a local HTTP or WebSocket server to bridge host logic.
- Holding or reconstructing canonical model truth independently of the host.
- Bypassing the adapter layer to call Tauri `invoke` directly from UI components.

---

## Tauri IPC boundary

The seam between renderer and Rust. Rust defines the wire shape; TypeScript consumes generated types. The renderer
cannot see or influence anything not exposed here. The full contract is in
[`../../04-contracts/CONTRACTS-AND-SCHEMAS.md`](../../04-contracts/CONTRACTS-AND-SCHEMAS.md); the rules that bear on the
boundary are:

| Rule              | Obligation                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Command naming    | Namespaced `domain.capability.action` (e.g. `workspace.lifecycle.open`, `ops.append`, `graph.slice`).                                                                                                                                            |
| Payloads          | A single JSON object per command; no positional arguments.                                                                                                                                                                                       |
| Errors            | Every response uses the stable error envelope with machine-readable codes (`WORKSPACE_NOT_FOUND`, `WORKSPACE_LOCKED`, `SCHEMA_TOO_NEW`, `CONFLICT_RECORDED`, `BACKPRESSURE`, …), following RFC 9457 _(RFC 9457, Problem Details for HTTP APIs)_. |
| Capability gating | Commands are capability-gated; the default posture is deny. Definitions live in `src-tauri/capabilities/default.json`.                                                                                                                           |
| Type generation   | Rust→TS type generation runs during build; CI enforces zero drift.                                                                                                                                                                               |

**Long-running work — the accepted-work model.** Long work must not block a command response. The host returns an
`AcceptedJob`, then streams typed events:

```text
renderer  →  command(payload)
host      →  AcceptedJob { job_id, status_endpoint }
host      →  event(job_id, JobProgress { … })   [0..N]
host      →  event(job_id, JobCompleted { … })  or  JobFailed { … }
```

This applies to workspace rebuilds, large blob ingestion, re-indexing, export and import, sync application, and
analytics recalculation. The shapes are in
[`../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md`](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md).

**Backpressure.** When the write queue is saturated, the host returns `BACKPRESSURE` and the renderer shows a queued
state. Writes are never silently dropped or retried without user awareness.

**File-watch hints.** The host watches the canonical roots (`manifest.json`, `model/ops/`, `model/schema/`,
`objects/sha256/`). Watch events are hints only — the host re-reads and validates before acting. The derived runtime
directory is never watched as a trigger.

---

## Rust host (crate `desktop` / `src-tauri`)

The single privileged process and the sole security boundary. It holds the Tauri runtime, enforces capabilities, and
owns all side effects, per **[ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)** (Tauri trust
boundary and typed IPC). It is the **composition root**: it holds the engines and routes between them.

**Allowed:**

- Expose and enforce the typed IPC surface (commands and events).
- Apply and enforce Tauri capability and CSP configuration.
- Manage workspace lifecycle: open, close, watch, trigger rebuilds, prepare backups.
- Own the job orchestrator: accept, run, report progress on, cancel, and recover long-running jobs.
- Mediate all OS integration: file dialogs, filesystem roots scoped to the workspace and app data, window management.
- Hold trait-object references to the engines and route each command and job to the correct engine trait.
- Emit typed push events to the renderer on behalf of the engines.

**Forbidden:**

- Embedding domain semantics (model traversal, artefact execution, scenario resolution) inside IPC handler bodies —
  these delegate to engine traits.
- Allowing any IPC command to block indefinitely; long work is dispatched as an accepted job.
- Granting the renderer a capability not declared in the manifest.
- Accessing the canonical files except through Mneme's storage interface — the explicit exception being workspace open
  and lifecycle operations, which the host performs directly.
- Importing domain logic that properly belongs in an engine crate.

The host's internal structure and the `engine` harness crate that assembles the engines behind their traits are
described in [`../../05-modules/host/README.md`](../../05-modules/host/README.md) and the
[module dependency map](../module-dependency-map.md).

---

## Domain engines (Rust crates)

In-process Rust crates called by the host through typed trait boundaries. Each engine owns a specific capability; none
owns another engine's capability. The `engine` crate is the shared harness that wires these implementations behind their
traits for the host — its role is described in the [module dependency map](../module-dependency-map.md).

| Engine                 | Crate(s)                             | Owns                                                                                                     |
| ---------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| **Praxis**             | `praxis`                             | Meaning: metamodel, types, edge catalogue, tasks, artefact execution, integrity scoring, explainability. |
| **Mneme**              | `mneme`, `mneme_core`, `mneme_store` | Storage: op log, bitemporal facts, schema-as-data, blob store, derived runtime, the storage trait.       |
| **Metis**              | `metis`                              | Analytics: deterministic, bounded graph computation — centrality, impact, paths, cost.                   |
| **Chrona**             | `chrona`                             | Time and scenario interpretation: Viewpoint resolution, layer policy, diff, scenario composition.        |
| **Continuum**          | `continuum`                          | Local durable orchestration: jobs, retries, schedules, workflow composition, run ledger.                 |
| **Lexis** _(planned)_  | _(planned)_                          | Search and discovery: full-text and semantic retrieval over the twin, bounded and Viewpoint-aware.       |
| **Pylon** _(planned)_  | _(planned)_                          | Interchange: import/export and connectors.                                                               |
| **Sophia** _(planned)_ | _(planned)_                          | AI assistance: LLM-assisted authoring behind guardrails; all output Generated.                           |
| **Kerux** _(planned)_  | _(planned)_                          | Reporting and publishing: deterministic briefings and packaged outputs, redaction by default.            |

The taxonomy and the planned engines are fixed by
**[ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)** (Module taxonomy and boundaries) and the naming
table in [`../../02-standards/DOCUMENTATION-STANDARD.md`](../../02-standards/DOCUMENTATION-STANDARD.md) §10.

**Allowed:**

- Implement domain logic behind the engine's published trait contract.
- Perform deterministic computation independent of UI state and runtime details.
- Persist only through Mneme's storage interface; no engine but Mneme touches the runtime database directly.
- Compose with other engines through the host (the composition root); engines do not call each other peer-to-peer.

**Forbidden:**

- Importing Tauri, WebView, or UI-layer dependencies into an engine crate.
- Emitting events directly to the renderer — the host owns event publication.
- Cross-engine private-implementation imports that bypass published trait contracts; no engine↔engine dependency cycle,
  per the [dependency rules](./dependency-rules.md).
- Spawning unmanaged background threads or tasks that cannot be observed, cancelled, or reported through the host job
  orchestrator.
- Coupling tightly to a concrete storage engine; Mneme's storage engine is replaceable behind a trait, per
  **[ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)**.

---

## Canonical workspace and derived runtime

These two bands are covered in full in [`canonical-vs-derived.md`](./canonical-vs-derived.md). In summary of
responsibility:

- **Canonical workspace folder** — owns the truth: operations, facts, schema-as-data, blob bytes. Only Mneme reads and
  writes it (the host's lifecycle operations excepted).
- **Derived runtime (`.aideon/runtime/`)** — owns no truth: indexes, projections, sidecars, and the runtime DB.
  Rebuildable from canonical files; deletable without data loss.

---

## Related documents

| Document                                                                                     | What it covers                                   |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| [`boundary-thesis.md`](./boundary-thesis.md)                                                 | The propositions these responsibilities realise. |
| [`canonical-vs-derived.md`](./canonical-vs-derived.md)                                       | The canonical and derived bands in full.         |
| [`dependency-rules.md`](./dependency-rules.md)                                               | The dependency directions between these layers.  |
| [`../../05-modules/host/README.md`](../../05-modules/host/README.md)                         | The host's internal structure and IPC handlers.  |
| [`../../04-contracts/CONTRACTS-AND-SCHEMAS.md`](../../04-contracts/CONTRACTS-AND-SCHEMAS.md) | The full IPC contract and error envelope.        |
