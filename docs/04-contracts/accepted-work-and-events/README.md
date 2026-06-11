# Accepted Work and Events

The contract for long-running work on Aideon Desktop: the `AcceptedJob` envelope, the run-and-step lifecycle, the typed event model, the durable run ledger, backpressure, and the control operations. Long work must not block the renderer and must not vanish into a background process the user cannot inspect. The orchestration engine is [Continuum](../../05-modules/continuum/README.md); the trust boundary is [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md).

---

## The pattern

1. A Tauri command returns an [`AcceptedJob`](./accepted-job-shape.md) immediately.
2. Progress arrives as a stream of [typed events](./event-model.md), not by polling.
3. A durable [run ledger](./run-ledger.md) in the workspace records the full lifecycle, so runs are auditable after the fact.
4. When the write queue is saturated, the command returns a [`BACKPRESSURE`](./backpressure.md) error and the UI shows a queued state.

This is the desktop translation of "202 Accepted" semantics. The lifecycle is identical; there is no HTTP — only Tauri commands and events.

---

## Contents

| #   | File                                                     | Question it answers                                                                            |
| --- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | [accepted-job-shape.md](./accepted-job-shape.md)         | What does an accepted command return, and what work classes exist?                             |
| 2   | [run-and-step-lifecycle.md](./run-and-step-lifecycle.md) | How do runs and steps move through their states, with DAG deps, leases, retries, and timeouts? |
| 3   | [event-model.md](./event-model.md)                       | What is the typed event envelope, and how is ordering and dedup handled?                       |
| 4   | [run-ledger.md](./run-ledger.md)                         | What is recorded durably, and how is it retained and collected?                                |
| 5   | [backpressure.md](./backpressure.md)                     | What happens when the queue is saturated?                                                      |
| 6   | [control-operations.md](./control-operations.md)         | How does a caller cancel or retry a run?                                                       |
| 7   | [idempotency-rules.md](./idempotency-rules.md)           | How is accepted work made safe to retry?                                                       |
| 8   | [error-codes.md](./error-codes.md)                       | What accepted-work error codes exist and what triggers them?                                   |

---

## Explorer gaps closed here

This area records the lifecycle elements an earlier survey found missing or thin: [step DAG dependencies](./run-and-step-lifecycle.md), [lease and heartbeat](./run-and-step-lifecycle.md), [max-retry and timeout](./run-and-step-lifecycle.md), [event ordering and dedup by `eventId`](./event-model.md), and [ledger retention and GC](./run-ledger.md). Elements not yet realised in code are marked as design intent in place.

## References & standards

_Normative:_

- Garcia-Molina & Salem — **Sagas**, 1987 (compensation for multi-step cross-engine work).
- IETF — **The Idempotency-Key HTTP Header Field** (draft) ([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).

_Informative:_

- Temporal.io — **durable execution model** (deterministic replay, activity retries).
- van der Aalst et al. — **Workflow Patterns** (control-flow composition and fairness).

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                        | What it covers                                                            |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [Continuum module](../../05-modules/continuum/README.md)                                        | The orchestration engine that owns runs, retries, leases, and the ledger. |
| [Host: accepted work and backpressure](../../05-modules/host/accepted-work-and-backpressure.md) | The host boundary that accepts jobs and emits events.                     |
| [projection-and-invalidation/](../projection-and-invalidation/README.md)                        | The invalidation a completing run emits.                                  |
| [UX-DESIGN.md](../../03-design/UX-DESIGN.md)                                                    | The status-surface obligations for accepted work.                         |
