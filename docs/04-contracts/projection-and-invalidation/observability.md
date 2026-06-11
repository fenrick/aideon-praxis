# Projection observability

The signals tracked when a projection lags, fails to refresh, or is misused, and the error code each raises. These are surfaced to the local diagnostic log ([LOGGING_FRAMEWORK.md](../../LOGGING_FRAMEWORK.md)); they carry the `correlation_id` of the originating write ([ipc/correlation-and-tracing.md](../ipc/correlation-and-tracing.md)).

---

| Signal                        | Condition                                                                                        | Error code                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------- |
| Projection lag                | Time from `stale_since` to `fresh` exceeds [`max_staleness_seconds`](./projection-descriptor.md) | `PROJECTION_STALE_THRESHOLD_EXCEEDED` |
| Refresh failure               | Delta-apply or rebuild fails                                                                     | `PROJECTION_REFRESH_FAILED`           |
| Invalidation emission failure | `projection.invalidate` not recorded before write commit                                         | `INVALIDATION_EMIT_FAILED`            |
| Descriptor invalid            | Required field missing or malformed                                                              | `PROJECTION_DESCRIPTOR_INVALID`       |
| Context mismatch              | Projection served outside declared context dimensions                                            | `PROJECTION_CONTEXT_MISMATCH`         |

Projection lag is the signal that the consistency model's eventual-convergence promise is taking too long: a `stale` [freshness state](./freshness-states.md) that outlives its budget is no longer acceptable eventual consistency, it is a fault worth surfacing.

## References & standards

- **OpenTelemetry**; W3C **Trace Context** _(normative: the correlation these signals carry, via [ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md))_.

## Related documents

| Document                                           | What it covers                                   |
| -------------------------------------------------- | ------------------------------------------------ |
| [error-codes.md](./error-codes.md)                 | The full code list these signals raise.          |
| [freshness-states.md](./freshness-states.md)       | The `stale_since` clock the lag signal reads.    |
| [LOGGING_FRAMEWORK.md](../../LOGGING_FRAMEWORK.md) | The diagnostic log these signals are written to. |
