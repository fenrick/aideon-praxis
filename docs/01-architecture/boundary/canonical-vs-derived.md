# Canonical vs Derived

The deciding rule for "where does this live?", the canonical [workspace](../../../CONTEXT.md) layout, and the statement
of rebuild correctness that makes the derived runtime safe to delete. This file operationalises proposition 1 of the
[boundary thesis](./boundary-thesis.md).

---

## The deciding rule

When the question is "where does this belong, canonical or derived?", apply one test:

> **If it can be rebuilt from the canonical files alone, it is derived. If it cannot, it is canonical.**

Canonical material is the input from which everything else is computed; derived material is everything that computation
produces. There is no third category. A structure that is neither rebuildable nor part of the canonical set is a design
error to be resolved before it ships.

| Category                       | Examples                                              | Status                  |
| ------------------------------ | ----------------------------------------------------- | ----------------------- |
| Operations written by the user | `model/ops/*` append-only segments                    | **Canonical**           |
| Schema declarations            | `model/schema/` files (schema-as-data)                | **Canonical**           |
| Blob bytes                     | `objects/sha256/<hash>`                               | **Canonical**           |
| Temporal facts                 | every asserted fact, resolved from operations on read | **Derived**             |
| Effective graph views          | adjacency, reachability projections                   | **Derived**             |
| Tuple indexes                  | entity and relationship lookup tables                 | **Derived**             |
| Search and vector sidecars     | full-text and embedding indexes                       | **Derived**             |
| Runtime database               | the SQLite DB under `.aideon/runtime/`                | **Derived**             |
| UI state                       | selection, layout, in-flight edits                    | **Derived / ephemeral** |
| Blob previews and thumbnails   | rendered preview files                                | **Derived**             |

A **fact** is derived (it is resolved from operations on read), but the **operation** that records it is canonical — the
op log is the durable primitive, facts are the resolution inputs computed from it, per
[`CONTEXT.md`](../../../CONTEXT.md).

---

## The canonical workspace layout

The workspace is a portable folder, not a database file and not an opaque bundle. Its shape is fixed by
**[ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md)** (Portable workspace folder format).

```text
my-project.aideon/
  manifest.json              CANONICAL — identity, schema version, module metadata
  model/ops/                 CANONICAL — append-only operation segments (time-ordered)
  model/schema/              CANONICAL — schema-as-data
  objects/sha256/            CANONICAL — content-addressed immutable blobs
  docs/                      CANONICAL — notes, imports, unstructured attachments
  .aideon/runtime/           DERIVED   — indexes, projections, search/vector, runtime DB
```

**Rules:**

- `model/ops/` is append-only; a segment is never mutated after it is written.
- `objects/sha256/` is content-addressed; a blob is referenced by hash in the operation, never inlined as bytes, per
  **[ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md)** (Content-addressed object store).
- One single-writer queue per open workspace; concurrent writes serialise through Mneme's write queue, not through
  external locking, per **[ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)**.
- The folder is the unit of copy, zip, share, and sync — it contains everything needed to reconstruct the
  [effective graph](../../../CONTEXT.md).

The runtime database is engine-pluggable. SQLite is the current default, behind Mneme's storage trait; an implementation
may be swapped without changing the canonical format or any layer above it. Hosted PostgreSQL, where it appears, is an
optional adapter that materialises workspace semantics into a service store — never a replacement for the canonical
workspace, per **[ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)**.

---

## Rebuild correctness

The derived runtime is safe to delete because the op log is the oracle. This is the property that makes the whole
boundary trustworthy, stated as an invariant:

> **Deleting the entire `.aideon/runtime/` directory loses no user data.** The host detects the absent runtime on the
> next open and rebuilds it. A rebuild from the canonical files must reproduce the same resolved twin — the same facts,
> the same effective graphs at the same [Viewpoints](../../../CONTEXT.md) — that existed before deletion. The op log
> plus schema is the single source against which a rebuild is checked correct.

Two consequences follow, and the design holds itself to both:

- **The runtime is never the source of truth.** No read path may return a value that exists only in the runtime database
  and cannot be reconstructed from `model/ops/` and `model/schema/`. If such a value appeared, the runtime would have
  become canonical by accident — the defect named above.
- **Rebuild is deterministic against a fixed op log.** Given the same operations and schema, two rebuilds produce
  equivalent derived state. Determinism is what lets a rebuild be _checked_ against the prior state rather than merely
  hoped equal; it is the same property the export format relies on, per
  **[ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)** (Deterministic package export).

Freshness of derived state is a contract Mneme manages: search indexes, vector sidecars, and graph projections are
invalidated and rebuilt as canonical files change, and a derived result that is mid-rebuild is shown with the
**Rebuilding** result state rather than as if fresh — see the honest-state vocabulary in
[`../../02-standards/DOCUMENTATION-STANDARD.md`](../../02-standards/DOCUMENTATION-STANDARD.md) §9 and the mechanism in
[`../../04-contracts/PROJECTION-AND-INVALIDATION.md`](../../04-contracts/PROJECTION-AND-INVALIDATION.md).

---

## Failure and recovery scenarios

The boundary is judged by how it behaves when something goes wrong. Each scenario below states the trigger, the designed
response, and the result state the user sees. These are runtime-view scenarios in the arc42 sense; the quality targets
behind them are in [`../quality-attributes.md`](../quality-attributes.md).

| Scenario                  | Trigger                                                                                                 | Designed response                                                                                                                                                                                                                                                                                     | Result state shown                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Workspace corruption**  | A canonical file fails validation on open (a truncated op segment, a bad blob hash, a schema mismatch). | The host refuses to treat the workspace as healthy. A corrupt blob is detected by hash mismatch and quarantined; a truncated trailing op segment is reported, and the op log is read up to the last valid operation. The runtime is rebuilt only from operations that validate.                       | `WORKSPACE_LOCKED` or a validation error; the affected region is surfaced, not silently dropped. |
| **Saturated write queue** | Writes arrive faster than the single-writer queue drains.                                               | The host returns `BACKPRESSURE`; the renderer shows a queued state. Writes are never silently dropped or auto-retried without user awareness.                                                                                                                                                         | Queued / backpressure.                                                                           |
| **IPC timeout**           | A command exceeds its budget, or a long operation would block the response.                             | Long work is never run inline: it is dispatched as an `AcceptedJob` and reported by event. A genuinely hung call returns a timeout error; the renderer may re-issue idempotently. The renderer is disposable, so a renderer restart loses no truth.                                                   | **In progress**, then completed/failed; or a timeout error.                                      |
| **Engine init failure**   | An engine fails to initialise on workspace open (e.g. the storage engine cannot open the runtime DB).   | The host does not present a half-initialised twin. If the failure is in a derived structure, the host triggers a rebuild from canonical files. If initialisation still fails, the workspace open fails cleanly with a diagnostic; the canonical files remain untouched and openable by a later build. | **Failed**, with explicit coverage; canonical data intact.                                       |

The unifying property across all four: **a failure in any derived structure is recoverable by rebuild, and a failure in
the host or renderer never reaches the canonical files.** The op log is the oracle the recovery is checked against.

---

## The trade-off named

Treating the runtime as purely derived costs a rebuild. A cold open after the runtime is deleted, or after a large
import, pays the full cost of replaying operations and reprojecting before the twin is queryable; that cost grows with
op-log size. The architecture accepts a bounded rebuild cost — surfaced honestly as an
[accepted job](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) with progress — in exchange for a workspace that is
portable, auditable, and impossible to corrupt by tampering with a cache. The mitigations (checkpoints, incremental
projection refresh) reduce the cost but do not change the rule.

---

## Related documents

| Document                                                                                                                   | What it covers                                  |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| [`boundary-thesis.md`](./boundary-thesis.md)                                                                               | The proposition this rule operationalises.      |
| [`layers-and-responsibilities.md`](./layers-and-responsibilities.md)                                                       | Mneme as the only engine that touches storage.  |
| [`../../04-contracts/PROJECTION-AND-INVALIDATION.md`](../../04-contracts/PROJECTION-AND-INVALIDATION.md)                   | How derived state is invalidated and rebuilt.   |
| [`../../05-modules/mneme/RUNTIME-AND-ENGINE.md`](../../05-modules/mneme/RUNTIME-AND-ENGINE.md)                             | The storage-engine abstraction and write queue. |
| [`../../06-adrs/ADR-0001-workspace-is-canonical-authority.md`](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md) | Workspace is canonical authority.               |
