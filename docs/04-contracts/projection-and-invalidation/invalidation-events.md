# Invalidation events

A projection-affecting write is not complete until it has emitted an invalidation event. The event is recorded in the
local derived database and consumed by projection maintainers within the same process. It follows the op-append; it is
never a network cache-tag call.

---

## The shape

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
  "tags": ["workspace:ws_1", "scenario:scn_plan_q3", "projection:effective_graph", "entity:component:cmp_42"],
  "correlation_id": "op_abc123"
}
```

The event carries a stable `event_id` (the dedup key — a re-delivered event is ignored,
[ipc/idempotency.md](../ipc/idempotency.md)) and a `correlation_id` joining it to the originating command's trace
([ipc/correlation-and-tracing.md](../ipc/correlation-and-tracing.md)).

## How invalidation follows op-append

The op-append pipeline is the authoritative source of workspace mutations. Within a single write transaction it runs in
this order:

1. Validate and accept the op segment.
2. Append to the canonical op log in the workspace folder.
3. Determine which projection families are affected by inspecting the op payload and the registered projection index.
4. Emit `projection.invalidate` for each affected projection.
5. If the projection is `incremental`, enqueue a delta-apply task.
6. If the projection is `batch_rebuild`, mark the projection as `stale` in the projection metadata table.
7. Commit the transaction.

Delta-apply tasks for `incremental` projections run immediately after commit on the single-writer queue
([ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)); they do not block the write acknowledgment, and they
are what give the writer [read-your-writes](./consistency-model.md). `on_demand` projections are not enqueued; they
recompute on the next read. `scenario_specific` projections follow the `incremental` path within the scenario scope.

## Invalidation rules

- Every op-append that touches a projection-backed surface emits `projection.invalidate` before the write transaction
  closes.
- Invalidation emission failure is a retryable error. The write must not be acknowledged as complete until emission
  succeeds or the failure is durably recorded for retry (`INVALIDATION_EMIT_FAILED`,
  [error-codes.md](./error-codes.md)).
- Invalidation [cascades](./consistency-model.md): a write that invalidates a projection invalidates every projection
  derived from it, transitively, following the tags below.
- Invalidation events are local. They are not forwarded over HTTP and do not involve any network cache-tag API.

## Tag taxonomy

Tags follow the format `<kind>:<value>`. Required tag categories: workspace, scenario (if applicable), projection
family, and affected entity identity.

| Category          | Format               | Example                         |
| ----------------- | -------------------- | ------------------------------- |
| Workspace         | `workspace:<id>`     | `workspace:ws_1`                |
| Scenario          | `scenario:<id>`      | `scenario:scn_plan_q3`          |
| Projection family | `projection:<name>`  | `projection:effective_graph`    |
| Entity identity   | `entity:<type>:<id>` | `entity:application:app_ledger` |

## References & standards

- (System contract) [accepted-work-and-events/](../accepted-work-and-events/README.md) — the op-append pipeline this
  follows.

## Related documents

| Document                                                                                            | What it covers                             |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| [consistency-model.md](./consistency-model.md)                                                      | The cascade these tags drive.              |
| [ipc/idempotency.md](../ipc/idempotency.md)                                                         | The `event_id` dedup the consumer applies. |
| [Mneme: derived runtime and projections](../../05-modules/mneme/derived-runtime-and-projections.md) | The pipeline implementation.               |
