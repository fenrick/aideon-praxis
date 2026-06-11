# Retry and backoff

How Continuum retries a failed step — exponential backoff with jitter, bounded by a maximum attempt count — and how it tells a transient failure (retry) from a permanent one (do not retry). Retries are deliberate and bounded, never implicit timer loops ([durable-executor-model](./durable-executor-model.md)).

---

## Transient versus permanent

The first decision on a step failure is whether it is worth retrying at all:

| Class         | Examples                                                                                                         | Continuum's response                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Transient** | `BACKPRESSURE` from the write queue; a connector timeout; a temporary network error; a lease lost to a crash     | Retry with backoff, up to `max_attempts`.                    |
| **Permanent** | A validation rejection; a malformed connector response; a contract `CONFLICT_RECORDED`; an authorisation failure | Do **not** retry; record a terminal `failed` and surface it. |

The distinction maps onto the error envelope's transient marker ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)): only outcomes marked `transient` invite a genuine re-execution; a terminal failure is recorded and returned, not retried ([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)). Retrying a permanent failure would be a busy-loop that never succeeds — the classification is what prevents it.

---

## Exponential backoff with jitter

A transient failure is retried after a delay that grows exponentially with the attempt number, with random jitter added:

```text
delay(attempt) = min(base × 2^attempt, cap) ± jitter
```

- **Exponential growth** spaces retries out so a struggling dependency (a saturated write queue, a rate-limited connector) is given progressively more room to recover, rather than being hammered at a fixed interval.
- **Jitter** — a random perturbation of each delay — prevents retry storms: if many steps fail at once (e.g. a connector outage), un-jittered exponential backoff would re-issue them all in lock-step, recreating the load spike. Jitter spreads them ([scheduling-and-fairness](./scheduling-and-fairness.md)).
- **A cap** bounds the delay so a long-lived run does not back off to an impractically long wait.
- **`max_attempts`** bounds the _number_ of retries; exhausting them is a terminal `failed`, recorded in the ledger ([run-and-step-lifecycle](./run-and-step-lifecycle.md)). There is no infinite retry.

The `next_run_after` and `attempts` / `max_attempts` fields that carry this state are the same primitives Mneme's job queue uses ([Mneme SQLITE](../mneme/SQLITE.md)), so the backoff discipline is consistent across both the cross-engine run ledger and Mneme's own derived-artefact jobs.

---

## Retry is safe because effects are idempotent

A retry re-executes a step, so the step's effect must be safe to apply more than once. That safety is the idempotency contract: a retried unit of work lands its effect at most once under its idempotency key ([idempotency-and-dedup](./idempotency-and-dedup.md), [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)). A retry under `BACKPRESSURE` with the same key appends the operation once even though the call was delivered twice — which is exactly why backoff-and-retry is a safe response to a transient write failure and not a duplicate-write hazard.

---

## Worked example — a rate-limited connector pull

A connector pull step hits the provider's rate limit on its first attempt:

1. The provider returns a transient `429`-style error. Continuum classifies it transient and schedules a retry.
2. **Attempt 1** fails → wait `base × 2^1 ± jitter` (say ~2 s ± a fraction).
3. **Attempt 2** fails again (still rate-limited) → wait `base × 2^2 ± jitter` (~4 s).
4. **Attempt 3** succeeds; the pull completes and the step records `completed`. Each attempt used the same idempotency key, so even if attempt 2 had partially succeeded server-side, the effect lands once.
5. Had the provider been hard-down through `max_attempts`, the step would record a terminal `failed` with the last error — no infinite loop, and the failure is visible in the ledger for a human to act on.

Contrast a _permanent_ failure: if the connector returned a malformed payload that fails validation, Continuum would not retry — re-fetching the same malformed payload cannot succeed, so it records `failed` immediately and surfaces it for correction.

---

## Bounds

- Total retry time for a step is bounded by `sum over attempts of min(base × 2^attempt, cap)` plus jitter — finite, because `max_attempts` is finite.
- A retry storm is bounded by jitter spreading concurrent retries across the backoff window.

---

## References & standards

_Informative:_

- Temporal.io — durable execution model. Activity retry policies with exponential backoff.

_Normative (related):_

- IETF — The Idempotency-Key HTTP Header Field (draft) — the contract that makes retry safe ([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).

## Related documents

| Document                                                     | What it covers                                  |
| ------------------------------------------------------------ | ----------------------------------------------- |
| [Idempotency and deduplication](./idempotency-and-dedup.md)  | Why a retried step is exactly-once in effect.   |
| [Run and step lifecycle](./run-and-step-lifecycle.md)        | Where `attempts` / `max_attempts` are recorded. |
| [Scheduling and fairness](./scheduling-and-fairness.md)      | How jitter avoids retry storms.                 |
| [ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md) | The transient-vs-permanent marker.              |
| [Continuum README](./README.md)                              | The module index.                               |
