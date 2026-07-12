# ProjectionDescriptor

Every projection-backed read surface carries a `ProjectionDescriptor` — the executable contract between the writer that
maintains the projection and the reader that consumes it.

---

## The shape

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

## Required fields

| Field                   | Type     | Description                                                                                                               |
| ----------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `projection_id`         | string   | Stable identifier for this projection family.                                                                             |
| `projection_version`    | string   | Monotonically increasing version string; increment on schema or logic changes.                                            |
| `freshness_class`       | enum     | One of `on_demand`, `incremental`, `batch_rebuild`, `scenario_specific` ([freshness-classes.md](./freshness-classes.md)). |
| `max_staleness_seconds` | integer  | Acceptable staleness window; enforced by [observability](./observability.md).                                             |
| `context_dimensions`    | string[] | Dimensions that scope a projection instance; must include at least `workspace_id`.                                        |
| `owner`                 | string   | Module responsible for maintaining this projection.                                                                       |
| `failure_mode`          | enum     | One of `serve_stale_with_indicator`, `block_on_stale`, `fail_open`.                                                       |

A descriptor with missing required fields is rejected with `PROJECTION_DESCRIPTOR_INVALID`
([error-codes.md](./error-codes.md)).

## Context dimensions and correctness

A projection instance is only correct for the context dimensions it was built against. Cache correctness depends on
three axes:

| Axis               | Description                                                                                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Time context       | The `effective_as_of` timestamp used when the projection was built. A projection built at T₁ is not correct for reads at T₂ unless the op log contains no mutations in `(T₁, T₂)`. |
| Scenario context   | A projection built for `scenario_id = null` (workspace baseline) is not correct for a scenario-scoped read. Scenario projections are keyed separately.                             |
| Projection version | A stored projection at `pv_N` is not served for a descriptor at `pv_N+1`. A version increment triggers a [rebuild](./rebuild-from-workspace.md) before serving.                    |

These axes are the same [viewpoint coordinates](../temporal-and-scenario/viewpoint-shape.md) that key a read. Serving a
projection for a context outside its declared dimensions is an error (`PROJECTION_CONTEXT_MISMATCH`). The renderer keys
its cache by the same coordinates ([ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)), so consistency is
per-context, not global ([consistency-model.md](./consistency-model.md)).

## References & standards

- Fowler; Young — **Event Sourcing & CQRS** _(normative: derived read models rebuilt from the log)_.

## Related documents

| Document                                       | What it covers                                               |
| ---------------------------------------------- | ------------------------------------------------------------ |
| [freshness-classes.md](./freshness-classes.md) | The classes `freshness_class` selects.                       |
| [freshness-states.md](./freshness-states.md)   | The runtime state a descriptor instance is in.               |
| [consistency-model.md](./consistency-model.md) | Why a projection is correct only for its context dimensions. |
