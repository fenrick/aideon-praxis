# Backpressure

When the internal write queue reaches its capacity threshold, the executor returns a structured error instead of
accepting new work. `BACKPRESSURE` is the one `transient` code in the [error taxonomy](../ipc/error-envelope.md) — the
renderer treats it as a queued state, not a failure.

---

## The error

```json
{
  "code": "BACKPRESSURE",
  "category": "transient",
  "recovery": "retry",
  "message": "Write queue is saturated. Retry after active jobs complete.",
  "details": { "queueClass": "rebuild", "activeCount": 3, "queueDepth": 16 }
}
```

## How the renderer reacts

The renderer treats `BACKPRESSURE` as a distinct UI state: the initiating action shows a **queued** badge, not a
failure. The caller may retry the command once queue depth drops. `BACKPRESSURE` is **not** retried automatically by the
host — retry is a renderer responsibility, with exponential backoff. The `transient`/`retry` category-and-hint
([error-envelope.md](../ipc/error-envelope.md)) is what lets the renderer react generically rather than hard-coding
knowledge of this one code.

A backpressure retry is safe because the submission carries an [idempotency key](./idempotency-rules.md): the same key
means the work lands at most once even though the caller retries.

## Two sources, one code

Saturated-queue behaviour is distinct from a `BACKPRESSURE` on an individual write operation (e.g. `append_ops`); both
use the same code, but the `queueClass` field in `details` disambiguates the source. A renderer shows the same queued
affordance for either.

## References & standards

- van der Aalst et al. — **Workflow Patterns** _(informative: fairness and admission control under load)_.

## Related documents

| Document                                                                                        | What it covers                                                          |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [error-envelope.md](../ipc/error-envelope.md)                                                   | The `transient`/`retry` category that drives the queued-state reaction. |
| [idempotency-rules.md](./idempotency-rules.md)                                                  | Why the retry is safe.                                                  |
| [Host: accepted work and backpressure](../../05-modules/host/accepted-work-and-backpressure.md) | The host-side queue and threshold.                                      |
| [Continuum: scheduling and fairness](../../05-modules/continuum/scheduling-and-fairness.md)     | The admission policy behind the threshold.                              |
