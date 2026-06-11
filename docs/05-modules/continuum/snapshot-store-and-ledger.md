# The snapshot store and run ledger

The `SnapshotStore` seam Continuum persists through, the run-ledger record schema, and how ledger entries are retained and garbage-collected. The ledger is the source of truth for automation history; hosted relays and connector services are optional adapters, never authoritative.

---

## The `SnapshotStore` seam

Continuum persists durable workflow state behind a narrow trait, so the storage backend is wired by the host and replaceable without touching workflow logic:

```rust
pub trait SnapshotStore: Send + Sync {
    fn put(&self, key: &str, bytes: &[u8]) -> Result<(), String>;
    fn get(&self, key: &str) -> Result<Vec<u8>, String>;
}
```

`FileSnapshotStore` is the production implementation: keys are paths relative to a base directory, and parent directories are created on `put`. Additional backends (SQLite, object stores) implement the same trait without changing workflow code. The host wires a concrete `SnapshotStore` into Continuum at startup; Continuum holds only the trait reference, consistent with the composition-root model ([dependency-rules](../../01-architecture/boundary/dependency-rules.md)).

The deliberate narrowness named: a two-method `put`/`get` seam keeps Continuum decoupled from any storage engine, at the cost that richer query (e.g. "list all runs by status") is the ledger schema's job layered over `put`/`get`, not the store's. This keeps the store trivially swappable.

---

## The run-ledger schema

A run is the unit of durable work ([run-and-step-lifecycle](./run-and-step-lifecycle.md)). The ledger persists, in the workspace:

| Record              | Fields (representative)                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run`               | run id, trigger type (`scheduled` / `triggered` / `manual`), queue class, idempotency key, start/end timestamps, terminal status, input reference |
| `run_step`          | run id, step name, status, start/end, target (connector or engine), dependency references, `attempts` / `max_attempts`, `lease_expires_at`        |
| `run_event`         | run id, step name, event time, kind (progress / warning / failure), structured payload                                                            |
| artefact references | input and output lineage references for provenance                                                                                                |

The ledger persists in the workspace's ops/local store. It is the **source of truth for automation history**: a hosted relay or a connector's own logs are optional adapters that mirror or extend the ledger, never replace it. This mirrors the workspace-canonical principle — the local, durable record is authoritative, and remote services are derived or supplementary ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)).

---

## Retention and garbage collection

A ledger entry does not live forever — unbounded history would grow without limit. Retention is explicit and bounded:

- A run's ledger entry is retained for a configured window after the run reaches a terminal status.
- The **idempotency dedup window is the ledger lifetime** ([idempotency-and-dedup](./idempotency-and-dedup.md), [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)): while an entry lives, its key is honoured; once retired, the key is no longer special. So retention must comfortably exceed the realistic retry horizon, or a late retry would no longer be recognised as a duplicate.
- Garbage collection of retired entries is a batch operation, not an inline side effect of a run completing — completing a run never blocks on GC.

The trade-off named: a longer retention window gives more audit history and a wider dedup window, at the cost of more storage; a shorter window reclaims space sooner but narrows both. The policy is set so the dedup window is safe; audit history beyond it, where needed, is a reporting concern (Kerux, planned) rather than a reason to keep the operational ledger unbounded.

---

## Worked example — a run's ledger trail

A triggered connector ingest of the seed workspace produces this ledger trail:

1. On accept, a `run` record: trigger `triggered`, queue class `connector_ingest`, idempotency key `k1`, status `accepted`, input reference to the connector config.
2. As steps run, `run_step` records: `pull` (`completed`), `shape` (`completed`), `persist` (`completed`, 2 attempts after a transient backpressure retry), `recompute` (`completed`).
3. `run_event` records capture progress within each step and the one `warning` on the persist retry.
4. Artefact references link the run to the facts it wrote — e.g. the updated `disposition` on `Automation Orchestrator` — so a later audit can trace from the run to its effect on the twin.
5. The `run` reaches `completed`. Its entry is retained for the configured window; during that window a retry under `k1` is recognised as a duplicate and returns the recorded outcome. After the window, GC retires the entry.

A support query against the ledger answers "what did this ingest write, and did any step retry?" directly from these records — replayability is a first-class property, not an afterthought ([durable-executor-model](./durable-executor-model.md)).

---

## References & standards

_Informative:_

- Temporal.io — durable execution model. The persisted event-history-per-run pattern the ledger realises.

_Normative (related):_

- [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md) — the dedup window bounded by ledger lifetime.

## Related documents

| Document                                                                   | What it covers                                   |
| -------------------------------------------------------------------------- | ------------------------------------------------ |
| [Run and step lifecycle](./run-and-step-lifecycle.md)                      | The records this schema persists.                |
| [Idempotency and deduplication](./idempotency-and-dedup.md)                | Why the dedup window equals the ledger lifetime. |
| [The durable executor model](./durable-executor-model.md)                  | Why the local ledger is authoritative.           |
| [ACCEPTED-WORK-AND-EVENTS](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) | The accepted-work envelope the ledger records.   |
| [Continuum README](./README.md)                                            | The module index.                                |
