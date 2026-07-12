# Projection and Invalidation

The contract for every derived read surface in Aideon Desktop: the `ProjectionDescriptor`, the freshness classes, the
invalidation events that follow an op-append, the consistency guarantee a reader gets, and the rebuild-from-workspace
oracle. The governing decision for the consistency guarantee is
[ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md).

---

## Core invariant

Projections are derived artefacts. They are never canonical truth. The canonical authority is the workspace folder and
its append-only op log ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)). Every projection is
rebuildable from the workspace at any time; a missing or corrupt projection is a performance cost, never data loss.

The local derived database at `.aideon/runtime/` is the cache. There is no HTTP/CDN tier and no remote invalidation
endpoint. Freshness, invalidation, and rebuild are all local operations coordinated by the Mneme runtime
([Mneme: runtime and engine](../../05-modules/mneme/RUNTIME-AND-ENGINE.md)).

---

## Contents

| #   | File                                                     | Question it answers                                                    |
| --- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | [projection-descriptor.md](./projection-descriptor.md)   | What contract does a projection-backed surface carry?                  |
| 2   | [freshness-classes.md](./freshness-classes.md)           | When and how is a projection refreshed?                                |
| 3   | [invalidation-events.md](./invalidation-events.md)       | What event follows an op-append, and how are affected surfaces tagged? |
| 4   | [consistency-model.md](./consistency-model.md)           | What does a reader see after a write, and when?                        |
| 5   | [rebuild-from-workspace.md](./rebuild-from-workspace.md) | How is any projection rebuilt, and why is rebuild the oracle?          |
| 6   | [freshness-states.md](./freshness-states.md)             | What freshness state does a read report to the UI?                     |
| 7   | [observability.md](./observability.md)                   | What signals are tracked when a projection lags or fails?              |
| 8   | [error-codes.md](./error-codes.md)                       | What projection error codes exist and what triggers them?              |

---

## The shape of the flow

A write appends to the canonical op log, then emits an [invalidation event](./invalidation-events.md) before the
transaction closes; the event's tags drive a [cascade](./consistency-model.md) to every derived projection; an
`incremental` projection's delta-apply runs immediately after commit, giving the writer
[read-your-writes](./consistency-model.md); a concurrent reader sees a [`stale` freshness state](./freshness-states.md)
until it converges. Incremental maintenance must be provably equivalent to a
[full rebuild](./rebuild-from-workspace.md), which is also the recovery path.

## References & standards

_Normative:_

- Fowler; Young — **Event Sourcing & CQRS** (append-only log as truth; derived read models rebuilt from it).
- Gupta & Mumick — **Maintenance of Materialized Views**, 1995 (incremental view maintenance correctness).

_Informative:_

- Kleppmann — _Designing Data-Intensive Applications_, 2017 (causal vs eventual consistency).

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                            | What it covers                                     |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)                                  | The consistency guarantee this contract realises.  |
| [Mneme: derived runtime and projections](../../05-modules/mneme/derived-runtime-and-projections.md) | The runtime that maintains projections.            |
| [accepted-work-and-events/](../accepted-work-and-events/README.md)                                  | The op-append pipeline that triggers invalidation. |
| [ipc/correlation-and-tracing.md](../ipc/correlation-and-tracing.md)                                 | The correlation id invalidation events carry.      |
