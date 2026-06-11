# Idempotency rules for accepted work

How accepted work is made safe to retry. This is the accepted-work application of the boundary-wide [idempotency contract](../ipc/idempotency.md); the governing decision is [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md).

---

- **Every command that initiates long-running work must supply an `idempotencyKey`.** It rides in the [request envelope](../ipc/envelope.md) and is echoed on the [`AcceptedJob`](./accepted-job-shape.md).
- **The executor checks the run ledger before creating a new run record.** A duplicate submission with the same `idempotencyKey` returns the **existing** `AcceptedJob` without creating a second run — the work lands at most once.
- **The dedup window is the [run-ledger](./run-ledger.md) lifetime.** A key is honoured for as long as its ledger entry lives; once [retention](./run-ledger.md) retires the entry, the key is no longer special. The window is therefore explicit and bounded, not an unbounded global table.
- **A retry returns the original outcome, including the original error.** A same-key retry of a terminally-failed run returns the recorded failure rather than re-attempting. A genuine re-execution ([control-operations.md](./control-operations.md)) carries a **fresh** key.
- **Idempotency is distinct from conflict.** A duplicate (same key) is suppressed silently and returns the recorded result; a genuine conflict is `IDEMPOTENCY_CONFLICT` ([error-codes.md](./error-codes.md)) — raised when a run with the given key exists in an _incompatible_ state, which dedup must never silently mask.
- **Events deduplicate by `eventId`.** A re-delivered progress or invalidation event is ignored by a consumer that has seen its `eventId` ([event-model.md](./event-model.md)).

## Worked example

The renderer submits a rebuild with key `idem_xyz`; the call times out before the `AcceptedJob` is received; the renderer retries with `idem_xyz`. The executor finds the existing `run_abc` ledger entry under that key and returns the same `AcceptedJob` — one run, not two. A later, deliberately different rebuild uses a fresh key.

## References & standards

- IETF — **The Idempotency-Key HTTP Header Field** (draft) _(normative: idempotency-key contract)_.

## Related documents

| Document                                                            | What it covers                                           |
| ------------------------------------------------------------------- | -------------------------------------------------------- |
| [ipc/idempotency.md](../ipc/idempotency.md)                         | The boundary-wide idempotency contract this specialises. |
| [run-ledger.md](./run-ledger.md)                                    | The ledger lifetime that bounds the window.              |
| [error-codes.md](./error-codes.md)                                  | `IDEMPOTENCY_CONFLICT`.                                  |
| [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md) | The decision.                                            |
