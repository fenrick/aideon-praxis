# Accepted-work error codes

The error codes raised by the accepted-work and event contract. Each is carried in the standard [RFC 9457 error envelope](../ipc/error-envelope.md) with a category and recovery hint; this file records each code's trigger and its envelope category.

---

| Code                   | Category   | Recovery  | Meaning                                                                                                    |
| ---------------------- | ---------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| `BACKPRESSURE`         | transient  | retry     | Write queue saturated; the caller retries later with backoff ([backpressure.md](./backpressure.md)).       |
| `RUN_NOT_FOUND`        | validation | none      | No run with the given `runId` in the [ledger](./run-ledger.md).                                            |
| `RUN_ALREADY_TERMINAL` | conflict   | refresh   | Attempted to cancel or retry a terminal run ([control-operations.md](./control-operations.md)).            |
| `IDEMPOTENCY_CONFLICT` | conflict   | reconcile | A run with the given key exists in an incompatible state ([idempotency-rules.md](./idempotency-rules.md)). |
| `STEP_NOT_FOUND`       | validation | none      | A `fromStepId` in a retry request does not exist in the run.                                               |

`BACKPRESSURE` is the only `transient` code here — the queued-state retry. The two `conflict` codes signal a state the caller must resolve (refresh the run, or reconcile the key) rather than blindly retry; the two `validation` codes signal a malformed request a retry will not fix.

## Related documents

| Document                                         | What it covers                                             |
| ------------------------------------------------ | ---------------------------------------------------------- |
| [error-envelope.md](../ipc/error-envelope.md)    | The envelope shape, category taxonomy, and recovery hints. |
| [backpressure.md](./backpressure.md)             | The `BACKPRESSURE` queued-state contract.                  |
| [control-operations.md](./control-operations.md) | The cancel/retry paths that raise the run/step codes.      |
