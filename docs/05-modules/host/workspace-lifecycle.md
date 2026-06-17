# Workspace lifecycle

How the host opens, validates, migrates, and closes a workspace, and what happens when validation or migration fails. For a reader who needs the state transitions and the recovery posture.

The host is the sole authority over workspace paths, locks, and state transitions; the renderer never sees a filesystem path ([capabilities and CSP](./capabilities-and-csp.md)). The canonical workspace is the portable op log plus schema ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)).

---

## The transitions

```text
App start
  └─ setup.rs: run_backend_setup()
       ├─ initialise engines (WorkerState, via the engine harness)
       ├─ signal backend ready
       └─ await frontend ready signal

Workspace open
  ├─ resolve storage root (OS data dir / AIDEON_TEST_DATA_DIR)
  ├─ acquire workspace lock
  ├─ recover canonical tail; validate metamodel_package_version
  ├─ rebuild decision via the replay frontier — fast-path | incremental tail replay | full rebuild
  │    └─ a full or substantial replay runs as an accepted job (blocks write-enable)
  ├─ restore the HLC watermark from the complete canonical maximum
  ├─ run migration job if required (blocks workspace use until complete)
  └─ reach ready_read_write (or recovery_read_only) — emit workspace.lifecycle.changed

Workspace close
  ├─ cancel active subscriptions
  ├─ drain in-flight jobs
  ├─ flush engine state
  └─ transition to closed — emit workspace.lifecycle.changed
```

The rebuild decision (fast-path / incremental tail replay / full rebuild), the derived **replay frontier** it turns on, and the transactional cursor advance are owned by Mneme and specified in [workspace-integrity-and-recovery](../mneme/workspace-integrity-and-recovery.md#open-time-rebuild-decision-and-the-replay-frontier).

Opening resolves the storage root inside the boundary, acquires a lock (so two processes cannot write the same workspace), validates the schema version, and runs a migration job if the on-disk version is behind — migration **blocks** workspace use until it completes, because operating against a half-migrated schema would corrupt meaning. Closing cancels subscriptions, drains in-flight jobs, flushes engine state, and emits the close event ([event bus](./event-bus.md)). Engine wiring rides on the same hooks ([engine wiring](./engine-wiring.md)).

The host **owns** these semantics and all OS access, but a UI-initiated lifecycle action still crosses the boundary as a **typed IPC command** — the renderer never touches the filesystem directly. The lifecycle command surface (create, open, close, reopen-read-only, request local-copy recovery, workspace status, request rebuild) is therefore part of the IPC contract, granted only to the workspace-bearing window ([capabilities-and-csp](./capabilities-and-csp.md), [mvp-command-registry](../../build-contracts/mvp-command-registry.md)); "the host owns lifecycle" means it owns the _semantics_, not that lifecycle is invisible to the renderer.

---

## Lifecycle state and the readiness signal

The host retains an **authoritative lifecycle state** per open workspace and is the source of truth for whether writes are permitted. The states:

```text
opening → validating → replaying | rebuilding → ready_read_write
                                  ↘ ready_read_only
                                  ↘ recovery_read_only
                                  ↘ failed
ready_* → closed
```

**Write capability is enabled only in `ready_read_write`.** A full rebuild or substantial incremental replay runs as **accepted work** ([accepted work and backpressure](./accepted-work-and-backpressure.md)); progress is carried by the job's events, and the workspace is **not** exposed ready before the required foundation projections (and the HLC watermark restore) complete. A rebuild failure produces the accepted-work failure event, transitions to `recovery_read_only` where possible (canonical files untouched, raw op-log export available), and never enables writes.

**Readiness is event-driven, but not event-only.** State changes are announced by a typed **`workspace.lifecycle.changed`** event carrying `{ workspace_id, state, job_id?, error_code?, canonical_tail, replay_head?, mode }`. Because a renderer may restart, a child window may subscribe after readiness, or an event may precede a listener, the host also makes the current state retrievable without polling — via the synchronous open response when the fast path completes immediately, the terminal accepted-job result, an initial state snapshot delivered on subscription, and a one-shot `workspace.status` command. That is state synchronisation, not polling.

> **Event-manifest follow-up.** `workspace_opened`/`workspace_closed` are prose-only today and absent from [`event-manifest.json`](../../build-contracts/contracts/event-manifest.json). Resolve the gap by defining **one** typed `workspace.lifecycle.changed` Rust event and generating it into the manifest, rather than leaving prose-only events. If `workspace_opened` is retained, it is defined narrowly: emitted only on reaching a terminal usable open state, with an explicit `mode` of read-write or recovery read-only.

**Synchronous vs accepted work.** Per the registry threshold ([mvp-command-registry](../../build-contracts/mvp-command-registry.md)): a full rebuild is always accepted work; a substantial incremental replay is accepted work; a very small bounded tail may complete synchronously if it fits the synchronous-latency limit. Readiness semantics are identical either way — the open command returns either `WorkspaceOpenResult { state: ready_read_write, … }` or an `AcceptedJob { job_id, … }`, and writes stay disabled until the state is `ready_read_write`.

---

## Recovery mode

If schema migration fails, the workspace opens in **read-only recovery mode** rather than failing to open at all. The Status window remains usable and surfaces diagnostics, and raw data export is available from recovery mode — so a user can always extract their canonical op log even when the derived runtime cannot be built. This follows from the canonical/derived split: the op log is the truth and is recoverable; the runtime cache is rebuildable and may be the thing that failed ([canonical vs derived](../../01-architecture/boundary/canonical-vs-derived.md)).

A workspace that fails to open is a `WORKSPACE_NOT_FOUND` or `SCHEMA_TOO_NEW` error in the standard envelope ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)); a locked workspace is `WORKSPACE_LOCKED`. None leaks a raw path or internal error ([IPC command surface](./ipc-command-surface.md)).

---

## Export and import

Export and import are accepted-work jobs ([accepted work and backpressure](./accepted-work-and-backpressure.md)): they stream data, carry manifest metadata, and surface findings as job results. Import conflicts are visible in the post-import integrity report rather than failing silently, and an import is treated as untrusted input — validated against the metamodel and surfaced as `Awaiting review` where ambiguous ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)).

---

## Worked example — opening a workspace one schema version behind

A user opens a workspace whose on-disk schema is one version behind the running build. The host resolves the root, acquires the lock, and finds the version is behind, so it enqueues a migration job and blocks workspace use, emitting `job.updated` events as the migration runs ([event bus](./event-bus.md)). On success it transitions to `ready_read_write` (a `workspace.lifecycle.changed` event) and the workspace becomes usable. Had the migration failed, the host would transition to `recovery_read_only` — keeping the Status window live with diagnostics and offering raw op-log export, so the user's canonical data stays reachable regardless.

---

## Related documents

| Document                                                                       | What it covers                                                |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| [ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)         | The workspace as canonical authority.                         |
| [Canonical vs derived](../../01-architecture/boundary/canonical-vs-derived.md) | Why the runtime cache is rebuildable and the op log is truth. |
| [Engine wiring](./engine-wiring.md)                                            | The lifecycle hooks engines are wired through.                |
| [Accepted work and backpressure](./accepted-work-and-backpressure.md)          | Migration, export, and import as jobs.                        |
| [Event bus](./event-bus.md)                                                    | The open/close/job events the lifecycle emits.                |
| [Window and splash](./window-and-splash.md)                                    | The Status window used in recovery mode.                      |
