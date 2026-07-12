# Temporal and scenario error codes

The error codes raised by temporal and scenario context validation. Every one is carried in the standard
[RFC 9457 error envelope](../ipc/error-envelope.md) with a category and a recovery hint; this file records each code's
trigger and its envelope category.

---

| Code                         | Category   | Recovery  | Trigger                                                                                                                                                                             |
| ---------------------------- | ---------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TEMPORAL_CONTEXT_INVALID`   | validation | none      | Both `as_of_valid_time.instant` and `as_of_valid_time.interval` provided, or neither provided, or a field has an invalid type or value.                                             |
| `TEMPORAL_INTERVAL_INVALID`  | validation | none      | `as_of_valid_time.interval.start` is after `.end`, or either end is not valid UTC ISO-8601.                                                                                         |
| `SCENARIO_CONTEXT_INVALID`   | validation | none      | `scenario_id` is present but `mode` has an unsupported value, or the scenario does not exist.                                                                                       |
| `COMPARISON_CONTEXT_INVALID` | validation | none      | A diff side carries an invalid viewpoint, or `left`/`right` viewpoints are incompatible.                                                                                            |
| `CONFLICT_RECORDED`          | conflict   | reconcile | A scenario rebase found a slot the overlay and canonical facts both changed; the conflict is recorded and the operation halted. See [scenario-overlays.md](./scenario-overlays.md). |

The category column maps each code to the fixed five-category taxonomy ([error-envelope.md](../ipc/error-envelope.md)):
the four validation codes are `validation` (surface the problem; do not retry unchanged), and `CONFLICT_RECORDED` is
`conflict` (surface; offer reconcile/refresh). None of these is `transient`; none should be retried unchanged.

## Related documents

| Document                                       | What it covers                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| [error-envelope.md](../ipc/error-envelope.md)  | The envelope shape, the category taxonomy, and the recovery hints. |
| [viewpoint-shape.md](./viewpoint-shape.md)     | The field rules these validation codes enforce.                    |
| [scenario-overlays.md](./scenario-overlays.md) | The rebase operation that records `CONFLICT_RECORDED`.             |
