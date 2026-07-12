# Idempotency and deduplication

How Continuum guarantees an **exactly-once effect** over **at-least-once delivery**: the idempotency key on a unit of
work, the deduplication window bounded by the run ledger, and event deduplication by `eventId`. The decision is fixed by
[ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md).

---

## The hazard

Delivery is not reliable from the caller's point of view: a command may time out, a backpressure retry may re-issue it,
a user may double-submit, or a re-launch may resume a run ([durable-executor-model](./durable-executor-model.md)). The
op log is append-only and canonical ([Mneme op-fact-schema-model](../mneme/op-fact-schema-model.md)), so a retried
mutation appended twice is a **duplicated fact**, not a no-op. Continuum needs an exactly-once _effect_ over an
at-least-once _delivery_.

---

## The idempotency key

A mutating command and an accepted-work submission carry an **idempotency key**
([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md), following the IETF Idempotency-Key header draft):

- The host records the first outcome under that key.
- A retry with the **same** key returns the recorded outcome and performs the mutation **at most once** — the effect is
  exactly-once even though delivery is at-least-once.
- A retry returns the **original outcome, including the original error.** If the first attempt failed terminally, a
  same-key retry returns that recorded failure rather than re-attempting; only a `transient` outcome invites a genuine
  re-execution, and the caller chooses a fresh key when it retries the _operation_ rather than polls the _result_
  ([retry-and-backoff](./retry-and-backoff.md)).

This is what makes a step in a run safe to retry and a run safe to resume: a completed step's effect, re-applied under
its key, is a no-op-with-recorded-result, so resume-from-failure never duplicates work
([run-and-step-lifecycle](./run-and-step-lifecycle.md)).

---

## The deduplication window is the run ledger

The key is honoured for **as long as its run-ledger entry lives**
([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)). Within that window a repeated key is a
no-op-with-recorded-result; once the ledger entry is retired by retention, the key is no longer special. The window is
therefore explicit and bounded by ledger retention ([snapshot-store-and-ledger](./snapshot-store-and-ledger.md)) — not
an unbounded global table that grows forever. An operator can reason about the dedup window directly from the retention
policy.

The trade-off named: tying the window to the ledger lifetime bounds memory and aligns dedup with the work it guards, at
the cost that a retry arriving _after_ the ledger entry is retired is no longer recognised as a duplicate. The retention
policy is set so this window comfortably exceeds the realistic retry horizon.

---

## Events deduplicate by `eventId`

Every emitted event carries a stable `eventId`; a consumer that has already processed an `eventId` ignores a re-delivery
([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)). This matches Mneme's projection-invalidation
model, where invalidation events carry a stable `event_id`
([PROJECTION-AND-INVALIDATION](../../04-contracts/PROJECTION-AND-INVALIDATION.md)). Event handlers must be safe to
invoke twice with the same `eventId` and converge to the same state — so a re-delivered progress or invalidation event
never double-processes.

---

## Idempotency is not conflict

A duplicate (same key) is suppressed silently; a genuine concurrent **conflict** (different intent, overlapping target)
is reported as `CONFLICT_RECORDED` ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)). Deduplication must
not mask a real conflict — they are different events with different correct responses. A natural-key dedup on content
was rejected precisely because two legitimately identical-looking writes are indistinguishable from a retry; an explicit
caller-supplied key separates intent from coincidence
([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).

---

## Worked example — a double-submitted ingest

A user triggers a connector ingest, the command times out under backpressure, and the renderer retries:

1. The first submission carries idempotency key `k1`; it times out before the renderer sees a result, but the host has
   recorded the run under `k1`.
2. The renderer retries with the **same** key `k1`. The host finds the recorded run and returns its `AcceptedJob` — it
   does **not** start a second ingest. The connector pull, the persist of `Automation Orchestrator`'s updated facts, all
   happen once.
3. A progress event for the run is delivered twice (a re-delivery); the renderer, keying on `eventId`, processes it
   once.
4. The user then makes a _different_ edit, which carries a fresh key `k2` — correctly treated as new work, not a
   duplicate of `k1`.

The effect is exactly-once: one ingest, one set of facts, despite two deliveries of the command and a duplicate event.

---

## References & standards

_Normative:_

- IETF — The Idempotency-Key HTTP Header Field (draft). The idempotency-key contract.

## Related documents

| Document                                                                         | What it covers                                            |
| -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)              | Idempotency and deduplication.                            |
| [Retry and backoff](./retry-and-backoff.md)                                      | When a retry re-executes vs returns the recorded outcome. |
| [The snapshot store and run ledger](./snapshot-store-and-ledger.md)              | The ledger that bounds the dedup window.                  |
| [PROJECTION-AND-INVALIDATION](../../04-contracts/PROJECTION-AND-INVALIDATION.md) | Event `event_id` deduplication.                           |
| [ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)                     | Conflict vs transient, which dedup must not mask.         |
