# Error envelope — RFC 9457 Problem Details

Every IPC error is a typed Problem Detail (RFC 9457, obsoleting RFC 7807), carrying a stable code, a category from a
fixed taxonomy, and a machine-readable recovery hint. This is the decision of
[ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md); RFC 9457 supplies the shape, transported over IPC rather
than HTTP.

---

## The shape

`HostError` maps to `IpcError` at the boundary. The wire object adopts the RFC 9457 members and keeps the existing
structured `details` as an extension:

```json
{
  "requestId": "uuid-v4",
  "status": "error",
  "error": {
    "type": "aideon:problem/conflict-recorded",
    "code": "CONFLICT_RECORDED",
    "title": "Scenario conflict recorded",
    "detail": "A slot changed in both the scenario overlay and canonical facts.",
    "category": "conflict",
    "recovery": "reconcile",
    "correlationId": "c1-...",
    "details": { "scenarioId": "scn_plan_q3", "slot": "app_ledger.disposition" }
  }
}
```

| Member          | Role                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`          | A stable URI reference identifying the problem kind (a non-dereferenceable namespace, per RFC 9457's allowance).                                                    |
| `code`          | The stable, machine-readable identifier behind `type`. Changing a code is a breaking change ([versioning-and-compatibility.md](./versioning-and-compatibility.md)). |
| `title`         | A short human summary, safe for UI display.                                                                                                                         |
| `detail`        | A human-readable explanation of this occurrence. Must not leak secrets or stack traces.                                                                             |
| `category`      | One of the five categories below; lets the renderer react generically.                                                                                              |
| `recovery`      | A machine-readable hint: `retry`, `reconcile`, `refresh`, `none`, or `report`.                                                                                      |
| `correlationId` | The correlation id of the failing command, joining the error to host logs and the trace ([correlation-and-tracing.md](./correlation-and-tracing.md)).               |
| `details`       | Structured debug context, defaults to `{}`. Must not leak secrets.                                                                                                  |

## The category taxonomy

Every code maps to exactly one category, so the renderer reacts without hard-coding per-code knowledge:

| Category       | Meaning                                                         | Renderer default reaction                    | Example codes                                                                                                                                      |
| -------------- | --------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **validation** | The request was malformed or violated a contract precondition   | Surface the problem; do not retry unchanged  | `INVALID_INPUT`, `INVALID_TIME`, `TEMPORAL_CONTEXT_INVALID`, `TEMPORAL_INTERVAL_INVALID`, `SCENARIO_CONTEXT_INVALID`, `COMPARISON_CONTEXT_INVALID` |
| **permission** | The caller lacks the capability or the target is not accessible | Surface; do not retry                        | `WORKSPACE_NOT_FOUND`, capability-denied codes                                                                                                     |
| **conflict**   | A concurrent or recorded conflict blocked the operation         | Surface; offer reconcile/refresh             | `CONFLICT_RECORDED`, `WORKSPACE_LOCKED`, `IDEMPOTENCY_CONFLICT`                                                                                    |
| **transient**  | A temporary condition; the same request may succeed later       | Retry with backoff                           | `BACKPRESSURE`                                                                                                                                     |
| **internal**   | An unexpected host-side failure                                 | Surface generically; capture for diagnostics | `INTERNAL_ERROR`, `SCHEMA_TOO_NEW` (compatibility-fatal)                                                                                           |

## The existing codes, mapped

The codes carried over from the prior envelope, with their category and recovery hint:

| Code                       | Category   | Recovery  | Meaning                                                                                                                                       |
| -------------------------- | ---------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `WORKSPACE_NOT_FOUND`      | permission | none      | The requested workspace does not exist or is not accessible.                                                                                  |
| `WORKSPACE_LOCKED`         | conflict   | refresh   | The workspace is locked by another operation.                                                                                                 |
| `SCHEMA_TOO_NEW`           | internal   | report    | The stored schema MAJOR exceeds what this host supports ([versioning-and-compatibility.md](./versioning-and-compatibility.md)).               |
| `CONFLICT_RECORDED`        | conflict   | reconcile | A scenario conflict was recorded and the operation halted.                                                                                    |
| `BACKPRESSURE`             | transient  | retry     | The host job queue is saturated; the caller retries with backoff ([accepted-work backpressure](../accepted-work-and-events/backpressure.md)). |
| `TEMPORAL_CONTEXT_INVALID` | validation | none      | The temporal context was malformed ([temporal error-codes](../temporal-and-scenario/error-codes.md)).                                         |
| `INVALID_INPUT`            | validation | none      | Payload validation failed.                                                                                                                    |
| `INVALID_TIME`             | validation | none      | A time string could not be parsed or is out of range.                                                                                         |
| `INTERNAL_ERROR`           | internal   | report    | An unexpected host-side error occurred.                                                                                                       |

## Stability and evolution

Codes are version-stable. Adding a code, or refining a recovery hint, is additive (MINOR). Renaming a code is a breaking
change (MAJOR) — see [versioning-and-compatibility.md](./versioning-and-compatibility.md). `detail` and `details` must
not leak secrets or stack traces ([LOGGING_FRAMEWORK.md §10](../../LOGGING_FRAMEWORK.md)). Idempotency must not mask a
real conflict: a suppressed duplicate is silent, but a genuine conflict is `CONFLICT_RECORDED`
([idempotency.md](./idempotency.md)).

## Worked example: `CONFLICT_RECORDED` on a scenario rebase

The renderer rebases `scn_plan_q3` after canonical facts moved under it. A slot the overlay changed
(`app_ledger.disposition`) also changed in canonical facts. The host records the conflict and returns the envelope shown
at the top of this file: `category: "conflict"`, `recovery: "reconcile"`. The renderer surfaces a reconcile affordance
rather than retrying, and the `correlationId` joins the UI error to the host log line and span.

## References & standards

- **RFC 9457** — Problem Details for HTTP APIs (obsoletes RFC 7807) _(normative: error-envelope shape)_.

## Related documents

| Document                                                                                    | What it covers                                        |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)                                | The decision behind this shape, taxonomy, and hints.  |
| [temporal-and-scenario/error-codes.md](../temporal-and-scenario/error-codes.md)             | The temporal codes carried in this envelope.          |
| [accepted-work-and-events/error-codes.md](../accepted-work-and-events/error-codes.md)       | The accepted-work codes carried in this envelope.     |
| [projection-and-invalidation/error-codes.md](../projection-and-invalidation/error-codes.md) | The projection codes carried in this envelope.        |
| [correlation-and-tracing.md](./correlation-and-tracing.md)                                  | The `correlationId` that joins an error to its trace. |
