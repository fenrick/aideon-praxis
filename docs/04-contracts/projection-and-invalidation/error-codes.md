# Projection error codes

The error codes raised by the projection and invalidation contract. Each is carried in the standard
[RFC 9457 error envelope](../ipc/error-envelope.md) with a category and recovery hint; this file records each code's
trigger and its envelope category.

---

| Code                                  | Category   | Recovery | Meaning                                                                                                                                   |
| ------------------------------------- | ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `PROJECTION_DESCRIPTOR_INVALID`       | validation | none     | A [descriptor](./projection-descriptor.md) is missing required fields or carries an unsupported class.                                    |
| `PROJECTION_STALE_THRESHOLD_EXCEEDED` | transient  | retry    | Projection staleness window has been exceeded ([observability.md](./observability.md)).                                                   |
| `PROJECTION_REFRESH_FAILED`           | internal   | report   | Delta-apply or rebuild workflow failed.                                                                                                   |
| `PROJECTION_CONTEXT_MISMATCH`         | validation | none     | Read context is outside the projection's declared [context dimensions](./projection-descriptor.md).                                       |
| `INVALIDATION_EMIT_FAILED`            | internal   | report   | Invalidation event could not be recorded; the write is not acknowledged as complete ([invalidation-events.md](./invalidation-events.md)). |

`PROJECTION_STALE_THRESHOLD_EXCEEDED` is `transient` because the lagging projection is expected to converge; the
renderer may retry the read once the staleness budget recovers. The two `internal` codes are genuine faults captured for
diagnostics. The two `validation` codes signal a malformed descriptor or a mis-keyed read, neither of which a blind
retry fixes.

## Related documents

| Document                                               | What it covers                                             |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| [error-envelope.md](../ipc/error-envelope.md)          | The envelope shape, category taxonomy, and recovery hints. |
| [observability.md](./observability.md)                 | The signals that raise these codes.                        |
| [projection-descriptor.md](./projection-descriptor.md) | The descriptor whose validation raises two of these codes. |
