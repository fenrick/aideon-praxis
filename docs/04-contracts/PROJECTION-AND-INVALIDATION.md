# Projection and Invalidation Contract

Defines `ProjectionDescriptor`, freshness classes, invalidation triggers, UI freshness reporting, and the rebuild-from-workspace guarantee for all derived read surfaces in Aideon Desktop.

## Core Invariant

Projections are derived artifacts. They are never canonical truth. The canonical authority is the workspace folder and its append-only op log ([ADR-0001](../06-adrs/ADR-0001-workspace-is-canonical-authority.md)). Every projection is rebuildable from the workspace at any time; a missing or corrupt projection is a performance cost, never a data loss.

The local derived database at `.aideon/runtime/` is the cache. There is no HTTP/CDN tier and no remote invalidation endpoint. Freshness, invalidation, and rebuild are all local operations coordinated by the Mneme runtime ([Mneme: Runtime and Engine](../05-modules/mneme/RUNTIME-AND-ENGINE.md)).

---

## ProjectionDescriptor

Every projection-backed read surface carries a `ProjectionDescriptor`. It is the executable contract between the writer that maintains the projection and the reader that consumes it.

```json
{
  "projection_id": "effective_graph_workspace",
  "projection_version": "pv_2026_06_10_001",
  "freshness_class": "incremental",
  "max_staleness_seconds": 30,
  "context_dimensions": ["workspace_id", "scenario_id", "effective_as_of", "authz_scope"],
  "owner": "mneme",
  "failure_mode": "serve_stale_with_indicator"
}
```

### Required Fields

| Field                   | Type     | Description                                                                       |
| ----------------------- | -------- | --------------------------------------------------------------------------------- |
| `projection_id`         | string   | Stable identifier for this projection family                                      |
| `projection_version`    | string   | Monotonically increasing version string; increment on schema or logic changes     |
| `freshness_class`       | enum     | One of `on_demand`, `incremental`, `batch_rebuild`, `scenario_specific`           |
| `max_staleness_seconds` | integer  | Acceptable staleness window; enforced by observability                            |
| `context_dimensions`    | string[] | Dimensions that scope a projection instance; must include at least `workspace_id` |
| `owner`                 | string   | Module responsible for maintaining this projection                                |
| `failure_mode`          | enum     | One of `serve_stale_with_indicator`, `block_on_stale`, `fail_open`                |

A descriptor with missing required fields is rejected with `PROJECTION_DESCRIPTOR_INVALID`.

---

## Freshness Classes

Every projection declares exactly one freshness class. The class determines when the projection is refreshed, what staleness is acceptable, and what rebuild trigger applies.

| Class               | Refresh trigger                                        | Acceptable staleness          | Typical projections                                         |
| ------------------- | ------------------------------------------------------ | ----------------------------- | ----------------------------------------------------------- |
| `on_demand`         | Computed at read time                                  | None — always current         | Small or rare derived surfaces; simple fact lookups         |
| `incremental`       | Op-append event; applied after each write              | Configurable; default ≤ 30 s  | Effective graph, adjacency index, entity status             |
| `batch_rebuild`     | Scheduled or explicit maintenance trigger              | Minutes to hours              | Full-text search index, vector sidecar, bulk analytics      |
| `scenario_specific` | Scenario activation or op-append within scenario scope | Per-scenario staleness budget | Scenario-scoped graphs, comparison views, planning surfaces |

### Class Rules

- `on_demand` projections must complete within the read path latency budget; they must not perform full-workspace scans.
- `incremental` projections register a handler with the op-append pipeline. The handler applies a delta; it does not rebuild from scratch.
- `batch_rebuild` projections are rebuilt by an explicit workflow. The workflow records its completion time in the projection metadata table. Reads during rebuild serve the previous version with a `rebuilding` freshness indicator.
- `scenario_specific` projections are keyed on `(workspace_id, scenario_id, effective_as_of)`. They are invalidated when any op in the scenario scope is appended, and when the scenario is activated or deactivated.

---

## Invalidation Event

A projection-affecting write is not complete until it has emitted an invalidation event. The event is recorded in the local derived database and consumed by projection maintainers within the same process.

```json
{
  "event_id": "inv_7f3a2b",
  "type": "projection.invalidate",
  "occurred_at": "2026-06-10T09:03:00Z",
  "workspace_id": "ws_1",
  "scenario_id": "scn_plan_q3",
  "projection_id": "effective_graph_workspace",
  "projection_version": "pv_2026_06_10_001",
  "affected_entity_ids": ["cmp_42", "rel_17"],
  "tags": [
    "workspace:ws_1",
    "scenario:scn_plan_q3",
    "projection:effective_graph",
    "entity:component:cmp_42"
  ],
  "correlation_id": "op_abc123"
}
```

### Invalidation Rules

- Every op-append that touches a projection-backed surface emits `projection.invalidate` before the write transaction closes.
- Invalidation emission failure is a retryable error. The write must not be acknowledged as complete until emission succeeds or the failure is durably recorded for retry.
- Tags follow the format `<kind>:<value>`. Required tag categories: workspace, scenario (if applicable), projection family, and affected entity identity.
- Invalidation events are local. They are not forwarded over HTTP and do not involve any network cache tag API.

### Tag Taxonomy

| Category          | Format               | Example                      |
| ----------------- | -------------------- | ---------------------------- |
| Workspace         | `workspace:<id>`     | `workspace:ws_1`             |
| Scenario          | `scenario:<id>`      | `scenario:scn_plan_q3`       |
| Projection family | `projection:<name>`  | `projection:effective_graph` |
| Entity identity   | `entity:<type>:<id>` | `entity:component:cmp_42`    |

---

## How Invalidation Follows Op-Append

The op-append pipeline is the authoritative source of workspace mutations. See [Accepted Work and Events](./ACCEPTED-WORK-AND-EVENTS.md) for the op structure.

The pipeline runs in this order within a single write transaction:

1. Validate and accept the op segment.
2. Append to the canonical op log in the workspace folder.
3. Determine which projection families are affected by inspecting the op payload and the registered projection index.
4. Emit `projection.invalidate` for each affected projection.
5. If the projection is `incremental`, enqueue a delta-apply task.
6. If the projection is `batch_rebuild`, mark the projection as `stale` in the projection metadata table.
7. Commit the transaction.

Delta-apply tasks for `incremental` projections run immediately after commit on the single-writer queue ([ADR-0004](../06-adrs/ADR-0004-storage-engine-abstraction.md)). They do not block the write acknowledgment.

`on_demand` projections are not enqueued; they recompute on the next read.

`scenario_specific` projections follow the `incremental` path within the scenario scope.

---

## Freshness States

A projection instance at a given `(projection_id, projection_version, context_dimensions)` is in exactly one of four freshness states:

| State        | Meaning                                                                          | UI indicator                          |
| ------------ | -------------------------------------------------------------------------------- | ------------------------------------- |
| `fresh`      | Projection is current; no pending invalidation                                   | None (default)                        |
| `stale`      | An invalidation event has been emitted; delta-apply or rebuild has not completed | Staleness badge; age in seconds       |
| `rebuilding` | A full rebuild workflow is in progress                                           | Rebuilding spinner                    |
| `failed`     | The last refresh or rebuild attempt failed                                       | Error indicator with retry affordance |

### Reporting Freshness to the UI

The IPC layer exposes a `ProjectionFreshnessStatus` type on every read response that involves a projection-backed surface. See [Temporal and Scenario Context](./TEMPORAL-AND-SCENARIO-CONTEXT.md) for how `effective_as_of` intersects with freshness.

```rust
pub struct ProjectionFreshnessStatus {
    pub projection_id: String,
    pub projection_version: String,
    pub state: ProjectionFreshnessState,
    pub stale_since: Option<SystemTime>,
    pub last_refreshed_at: Option<SystemTime>,
    pub failure_detail: Option<String>,
}

pub enum ProjectionFreshnessState {
    Fresh,
    Stale,
    Rebuilding,
    Failed,
}
```

The frontend uses `ProjectionFreshnessState` to render contextual freshness indicators. A `fresh` state renders nothing. `Stale` renders an age badge. `Rebuilding` renders a non-blocking spinner. `Failed` renders an error with a user-initiated retry control.

Staleness age is computed as `now - stale_since`. When `stale_since` exceeds `max_staleness_seconds` from the descriptor, the observability layer emits `PROJECTION_STALE_THRESHOLD_EXCEEDED`.

---

## Rebuild-from-Workspace Guarantee

Any projection can be rebuilt from the canonical workspace at any time. This is a hard invariant.

The rebuild procedure for a given `projection_id`:

1. Mark the projection as `rebuilding` in the projection metadata table.
2. Read op segments from the workspace folder in op-log order.
3. Apply each segment through the projection's build function.
4. Write the completed projection to the local derived database at `.aideon/runtime/`.
5. Record `last_refreshed_at` and set state to `fresh`.
6. Notify any waiting read handles.

A rebuild does not require network access, external services, or a sync peer. The workspace folder is sufficient.

The `batch_rebuild` freshness class relies on this procedure as its primary refresh mechanism. The `incremental` class falls back to a full rebuild when the delta log is missing or inconsistent.

Projection version mismatches between the descriptor and the stored projection always trigger a full rebuild before the projection is served.

---

## Context Dimensions and Correctness

A projection instance is only correct for the context dimensions it was built against. Cache correctness depends on three axes:

| Axis               | Description                                                                                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Time context       | The `effective_as_of` timestamp used when the projection was built. A projection built at T₁ is not correct for reads at T₂ unless the op log contains no mutations in `(T₁, T₂)`. |
| Scenario context   | A projection built for `scenario_id = null` (workspace baseline) is not correct for a scenario-scoped read. Scenario projections are keyed separately.                             |
| Projection version | A stored projection at `pv_N` is not served for a descriptor at `pv_N+1`. Version increment triggers rebuild before serving.                                                       |

The descriptor's `context_dimensions` field lists the dimensions that scope each instance. Serving a projection for a context outside its declared dimensions is an error (`PROJECTION_CONTEXT_MISMATCH`).

---

## Observability

The following signals are tracked and surfaced to the local diagnostic log:

| Signal                        | Condition                                                          | Error code                            |
| ----------------------------- | ------------------------------------------------------------------ | ------------------------------------- |
| Projection lag                | Time from `stale_since` to `fresh` exceeds `max_staleness_seconds` | `PROJECTION_STALE_THRESHOLD_EXCEEDED` |
| Refresh failure               | Delta-apply or rebuild fails                                       | `PROJECTION_REFRESH_FAILED`           |
| Invalidation emission failure | `projection.invalidate` not recorded before write commit           | `INVALIDATION_EMIT_FAILED`            |
| Descriptor invalid            | Required field missing or malformed                                | `PROJECTION_DESCRIPTOR_INVALID`       |
| Context mismatch              | Projection served outside declared context dimensions              | `PROJECTION_CONTEXT_MISMATCH`         |

---

## Error Codes

| Code                                  | Meaning                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| `PROJECTION_DESCRIPTOR_INVALID`       | Descriptor is missing required fields or carries an unsupported class           |
| `PROJECTION_STALE_THRESHOLD_EXCEEDED` | Projection staleness window has been exceeded                                   |
| `PROJECTION_REFRESH_FAILED`           | Delta-apply or rebuild workflow failed                                          |
| `PROJECTION_CONTEXT_MISMATCH`         | Read context is outside the projection's declared context dimensions            |
| `INVALIDATION_EMIT_FAILED`            | Invalidation event could not be recorded; write is not acknowledged as complete |

---

## References

- [Temporal and Scenario Context](./TEMPORAL-AND-SCENARIO-CONTEXT.md)
- [Accepted Work and Events](./ACCEPTED-WORK-AND-EVENTS.md)
- [Mneme: README](../05-modules/mneme/README.md)
- [Mneme: Runtime and Engine](../05-modules/mneme/RUNTIME-AND-ENGINE.md)
- [ADR-0004: Storage-Engine Abstraction and Single-Writer Queue](../06-adrs/ADR-0004-storage-engine-abstraction.md)
- [Desktop-First Workspace](../03-design/DESKTOP-FIRST-WORKSPACE.md)
