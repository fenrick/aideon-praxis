# ADR-0018: Idempotency and Deduplication

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0001, ADR-0006
- Relates-To: ADR-0016, ADR-0019

## Context

The IPC boundary is not perfectly reliable from the renderer's point of view: a command may time out, a backpressure
retry may be issued, or a user may double-submit. The op log is append-only and canonical
([ADR-0001](./ADR-0001-workspace-is-canonical-authority.md)), so a retried mutation that is appended twice is a
duplicated fact, not a no-op. Accepted-work jobs
([ACCEPTED-WORK-AND-EVENTS.md](../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)) and the events they emit have the same
hazard: a re-delivered event must not be processed twice. The product needs an exactly-once _effect_ over an
at-least-once _delivery_.

The IETF Idempotency-Key header draft establishes the contract shape: the caller supplies a key, the server records the
first outcome under that key, and a retry with the same key returns the recorded outcome rather than re-executing.

## Governance Framing

- **Decision type:** Invariant (a mutating command and an accepted-work item are idempotent under their key; an event is
  deduplicated by `eventId`) + stable seam (the idempotency-key field on mutating commands).
- **Known future pressure:** higher write volume; sync ([ADR-0005](./ADR-0005-sync-and-conflict-model.md)) replaying
  ops; longer-lived jobs; multi-window callers.
- **What stays stable:** mutating commands and accepted-work carry an idempotency key; the dedup window is the
  run-ledger lifetime; events dedup by `eventId`.
- **What is provisional:** the key format and the exact storage of the dedup record.
- **What is deferred:** idempotency across sync peers (governed by the sync/conflict model).
- **Why hard to reverse:** the idempotency-key field is part of the mutating-command contract and the stored run ledger;
  removing it reintroduces duplicate-write hazards.

## Decision

- **Mutating commands and accepted-work carry an idempotency key.** The caller supplies a key with each mutating command
  and each accepted-work submission. The host records the first outcome under that key. The guarantee is: **one
  idempotent command intent produces at most one committed effect set and one recorded outcome** — a retry with the same
  key returns the recorded outcome and commits nothing further. A command may validly produce a _batch_ of operations (a
  Change Event, a bulk import); "at most one committed effect set" holds for a single write and for a batch alike. The
  effect is exactly-once even though delivery is at-least-once (IETF Idempotency-Key draft). This is distinct from the
  permanent canonical operation identity `(partition_id, op_id)`, which governs replay and rebuild and outlives the
  run-ledger window ([canonical-vs-derived](../01-architecture/boundary/canonical-vs-derived.md),
  [workspace-integrity-and-recovery](../05-modules/mneme/workspace-integrity-and-recovery.md)).

- **The deduplication window is the run-ledger lifetime.** A key is honoured for as long as its run-ledger entry lives
  ([Continuum](../05-modules/continuum/README.md) owns the run ledger). Within that window a repeated key is a
  no-op-with-recorded-result; once the ledger entry is retired, the key is no longer special. The window is therefore
  explicit and bounded by ledger retention, not an unbounded global table.

- **Events are deduplicated by `eventId`.** Every emitted event carries a stable `eventId`; a consumer that has already
  processed an `eventId` ignores a re-delivery. This matches the projection-invalidation model, where invalidation
  events carry a stable `event_id` ([PROJECTION-AND-INVALIDATION.md](../04-contracts/PROJECTION-AND-INVALIDATION.md)).
  Event handlers must be safe to invoke twice with the same `eventId` and converge to the same state.

- **A retry returns the original outcome, including the original error.** If the first attempt failed terminally, a
  same-key retry returns that recorded failure rather than re-attempting; only `transient` outcomes
  ([ADR-0016](./ADR-0016-error-envelope-rfc9457.md)) invite a genuine re-execution, and those carry a fresh key when the
  caller chooses to retry the _operation_ rather than poll the _result_.

- **Idempotency is distinct from conflict.** A duplicate (same key) is suppressed silently; a genuine concurrent
  conflict (different intent, overlapping target) is reported as `CONFLICT_RECORDED`
  ([ADR-0016](./ADR-0016-error-envelope-rfc9457.md)). Deduplication must not mask a real conflict.

## Considered Options

- **Natural-key dedup on op content (rejected):** appealing, but two legitimately identical-looking writes are
  indistinguishable from a retry; an explicit caller-supplied key separates intent from coincidence.
- **An unbounded global idempotency table (rejected):** correct but grows without limit; tying the window to the
  run-ledger lifetime bounds it and aligns dedup with the work it guards.
- **No idempotency, rely on the user not double-submitting (rejected):** the backpressure-retry path alone guarantees
  duplicate delivery; the hazard is structural, not a user error.

## Consequences

- A backpressure retry ([ADR-0016](./ADR-0016-error-envelope-rfc9457.md)) is safe: the same key means the mutation lands
  at most once.
- A re-delivered progress or invalidation event is ignored by `eventId`, so projection maintainers converge.
- The dedup window is observable and bounded; an operator can reason about it from the run-ledger retention policy.
- A worked example: the renderer submits `append_ops` with key `k1`, times out, and retries with `k1`; the host returns
  the first outcome and the op is appended once. A subsequent, different edit uses key `k2`.

## Follow-ups / Open Questions

- The key format (UUID v4 vs caller-scoped) and its uniqueness scope.
- Where the dedup record is stored relative to the run ledger.
- Idempotency semantics across sync peers ([ADR-0005](./ADR-0005-sync-and-conflict-model.md)).

## References & standards

- IETF — **The Idempotency-Key HTTP Header Field** (draft) _(normative: idempotency-key contract)_.

## Related documents

| Document                                                                         | What it covers                                             |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [ACCEPTED-WORK-AND-EVENTS.md](../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)       | The accepted-work envelope and event taxonomy.             |
| [PROJECTION-AND-INVALIDATION.md](../04-contracts/PROJECTION-AND-INVALIDATION.md) | Invalidation events carrying a stable `event_id`.          |
| [ADR-0016](./ADR-0016-error-envelope-rfc9457.md)                                 | The conflict vs transient distinction dedup must not mask. |
