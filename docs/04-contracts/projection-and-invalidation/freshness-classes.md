# Freshness classes

Every projection declares exactly one freshness class in its [descriptor](./projection-descriptor.md). The class determines when the projection is refreshed, what staleness is acceptable, and what rebuild trigger applies.

---

| Class               | Refresh trigger                                        | Acceptable staleness          | Typical projections                                         |
| ------------------- | ------------------------------------------------------ | ----------------------------- | ----------------------------------------------------------- |
| `on_demand`         | Computed at read time                                  | None — always current         | Small or rare derived surfaces; simple fact lookups         |
| `incremental`       | Op-append event; applied after each write              | Configurable; default ≤ 30 s  | Effective graph, adjacency index, entity status             |
| `batch_rebuild`     | Scheduled or explicit maintenance trigger              | Minutes to hours              | Full-text search index, vector sidecar, bulk analytics      |
| `scenario_specific` | Scenario activation or op-append within scenario scope | Per-scenario staleness budget | Scenario-scoped graphs, comparison views, planning surfaces |

## Class rules

- **`on_demand`** projections must complete within the read-path latency budget; they must not perform full-workspace scans.
- **`incremental`** projections register a handler with the op-append pipeline. The handler applies a delta; it does not rebuild from scratch. Its delta-apply must be provably equivalent to a [full rebuild](./rebuild-from-workspace.md) ([consistency-model.md](./consistency-model.md)).
- **`batch_rebuild`** projections are rebuilt by an explicit workflow. The workflow records its completion time in the projection metadata table. Reads during rebuild serve the previous version with a `rebuilding` [freshness state](./freshness-states.md).
- **`scenario_specific`** projections are keyed on `(workspace_id, scenario_id, effective_as_of)`. They are invalidated when any op in the scenario scope is appended, and when the scenario is activated or deactivated. They follow the `incremental` path within the scenario scope.

The per-family choice of class, and the per-family staleness budget, are provisional ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md), open questions) — design intent tuned per family.

## Related documents

| Document                                                 | What it covers                                       |
| -------------------------------------------------------- | ---------------------------------------------------- |
| [projection-descriptor.md](./projection-descriptor.md)   | The descriptor that names the class.                 |
| [invalidation-events.md](./invalidation-events.md)       | The op-append event the `incremental` class follows. |
| [rebuild-from-workspace.md](./rebuild-from-workspace.md) | The rebuild the `batch_rebuild` class relies on.     |
