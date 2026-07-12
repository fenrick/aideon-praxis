# Idempotency

A mutation must be safe to retry: the renderer may time out, a backpressure retry may be issued, or a user may
double-submit. The op log is append-only and canonical, so a retried write appended twice is a duplicated fact, not a
no-op. The contract gives an exactly-once _effect_ over an at-least-once _delivery_. The decision is
[ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md), following the IETF Idempotency-Key header draft.

---

## The key on the request

Every mutating command and every accepted-work submission carries an `idempotencyKey` in the
[request envelope](./envelope.md). The host records the first outcome under that key. A retry with the same key returns
the recorded outcome and performs the mutation **at most once**.

```json
{
  "requestId": "uuid-v4",
  "idempotencyKey": "k1-3f9a...",
  "payload": { ... }
}
```

## The deduplication window

A key is honoured for as long as its run-ledger entry lives — the dedup window is the
[run-ledger lifetime](../accepted-work-and-events/run-ledger.md), owned by
[Continuum](../../05-modules/continuum/README.md). Within that window a repeated key is a no-op-with-recorded-result;
once the ledger entry is retired by [retention](../accepted-work-and-events/run-ledger.md), the key is no longer
special. The window is therefore explicit and bounded by ledger retention, not an unbounded global table — the trade-off
accepted in [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md) over a correct-but-unbounded global
table.

## A retry returns the original outcome

If the first attempt failed terminally, a same-key retry returns that recorded failure rather than re-attempting. Only a
`transient` outcome ([error-envelope.md](./error-envelope.md)) — chiefly `BACKPRESSURE` — invites a genuine
re-execution, and the caller carries a fresh key when it chooses to retry the _operation_ rather than poll the _result_.

## Idempotency is distinct from conflict

A duplicate (same key) is suppressed silently; a genuine concurrent conflict (different intent, overlapping target) is
reported as `CONFLICT_RECORDED` (`conflict` category, [error-envelope.md](./error-envelope.md)). Deduplication must not
mask a real conflict.

## Events deduplicate by `eventId`

The same hazard applies to emitted events: a re-delivered event must not be processed twice. Every event carries a
stable `eventId`, and a consumer that has already processed an `eventId` ignores a re-delivery
([event-model.md](../accepted-work-and-events/event-model.md),
[invalidation-events.md](../projection-and-invalidation/invalidation-events.md)). Event handlers must be safe to invoke
twice with the same `eventId` and converge to the same state.

## Worked example

The renderer submits `mneme_store_ingest_ops` with key `k1`, times out, and retries with `k1`; the host returns the
first outcome and the ops are appended once. A subsequent, different edit uses key `k2`. A re-delivered `step.progress`
event with `eventId = evt_03` is ignored by a consumer that already saw it.

## References & standards

- IETF — **The Idempotency-Key HTTP Header Field** (draft) _(normative: idempotency-key contract)_.

## Related documents

| Document                                                                                          | What it covers                                             |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)                               | The idempotency and dedup decision.                        |
| [accepted-work-and-events/idempotency-rules.md](../accepted-work-and-events/idempotency-rules.md) | How accepted-work applies the same key.                    |
| [accepted-work-and-events/run-ledger.md](../accepted-work-and-events/run-ledger.md)               | The ledger whose lifetime bounds the dedup window.         |
| [error-envelope.md](./error-envelope.md)                                                          | The conflict-vs-transient distinction dedup must not mask. |
