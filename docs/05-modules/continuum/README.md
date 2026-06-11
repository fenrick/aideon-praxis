# Continuum — Orchestration, Scheduling & Connectors

Continuum is the local durable executor: it owns orchestration, scheduling, and connector workflows, keeping all scheduled and triggered work visible, governed, and replayable under the shared accepted-work language.

## What Continuum owns

| Area | Responsibility |
| --- | --- |
| Scheduling | Timed and recurring work, refresh policies, bounded retry windows |
| Triggers | Event-driven workflow invocation from host or connector events |
| Connector orchestration | Adapter-driven ingest flows (CMDB, file imports, snapshot pulls) |
| Workflow execution | Multi-step, cross-engine composition with step-level progress |
| Run ledger | Durable record of runs, steps, and events persisted in the workspace |
| Snapshot persistence | `SnapshotStore` abstraction and `FileSnapshotStore` implementation |
| Provenance & replayability | Structured run inputs, op/fact lineage, idempotent retries |

Continuum does not own semantic modelling rules (Praxis), raw persistence internals (Mneme), user-facing accepted-work APIs (host), or UI shell behaviour.

## Local durable executor model

The orchestration runtime is an in-process, workspace-backed durable executor. There is no external orchestration service. All workflow state — runs, steps, retry counters, artefact references — persists in the local workspace ops/local store.

This model gives the product its automation guarantees:

- work survives restarts because the run ledger is durable on disk
- retries are deliberate and bounded, not implicit timer loops
- every run is identifiable; every step is inspectable
- the system can answer what ran, why, which inputs it used, what it wrote, what failed, and what can be retried safely

The scheduler is Tokio-driven. Bespoke thread pools and external scheduling services are explicitly out of scope.

## SnapshotStore abstraction

```rust
pub trait SnapshotStore: Send + Sync {
    fn put(&self, key: &str, bytes: &[u8]) -> Result<(), String>;
    fn get(&self, key: &str) -> Result<Vec<u8>, String>;
}
```

`FileSnapshotStore` is the production implementation. Keys are paths relative to a base directory; parent directories are created on `put`. Additional backends (SQLite, object stores) implement the same trait without touching workflow logic.

The host wires a concrete `SnapshotStore` into Continuum at startup. Continuum holds only the trait reference.

## Run ledger

A run is the unit of durable work. Every workflow execution produces:

| Record              | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `run`               | Identity, trigger type, start/end timestamps, terminal status  |
| `run_step`          | Per-step name, status, start/end, connector or engine target   |
| `run_event`         | Structured progress, warning, and failure events within a step |
| Artefact references | Input and output lineage references for provenance             |
| Idempotency key     | Enables safe retries without duplicate side effects            |

The ledger persists in the workspace ops/local store. It is the source of truth for automation history; hosted relays and connector services are optional adapters, never authoritative.

## Replayability

Because run inputs are structured and artefact references carry provenance, any workflow can be re-examined after the fact:

- the exact input set is recoverable from the run record
- step-level events record what each connector or engine received and returned
- retry decisions reference the ledger state, not implicit memory
- support and audit queries against run history are first-class, not afterthoughts

## Accepted-work status language

Continuum emits the shared accepted-work statuses for all automated work: `accepted`, `running`, `warning`, `failed`, `cancelled`, `completed`. The host owns the user-facing status surfaces and progress subscriptions; Continuum owns what the workflow does, which steps run, and what counts as success, retry, or failure.

See [ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) for the full contract.

## Connector orchestration

External integrations sit behind typed connector contracts. The workflow that coordinates those adapters lives in Continuum; connector-specific implementation detail lives behind the adapter boundary. Current adapter families:

- CMDB ingest
- File imports
- External snapshot pulls

Future sync scheduling, conflict surfacing, and federated workflow coordination are designed to enter the system through this same seam.

## Workflow composition

Multi-step workflows may span:

1. Connector pull
2. Semantic validation or shaping (Praxis-facing step)
3. Persistence write (Mneme boundary)
4. Downstream refresh or recompute trigger (Chrona, Metis)
5. Run event emission and terminal status

Each step is explicit. Continuum composes engine and connector capabilities into governed workflows; it does not own those engines.

## Dependency posture

Continuum depends on contracts and host wiring. It exposes capability traits that other modules' work is dispatched through. It does not depend on any other module that depends on it — there are no engine-to-engine cycles.

| Dependency direction | Notes |
| --- | --- |
| Continuum → host | Receives `SnapshotStore` and accepted-work wiring at startup |
| Continuum → Praxis | Dispatches semantic steps through Praxis capability traits |
| Continuum → Mneme | Writes ops and facts through Mneme persistence traits |
| Other modules → Continuum | Dispatch scheduled/triggered work through Continuum capability traits |

See [MODULE-DEPENDENCY-MAP.md](../../01-architecture/MODULE-DEPENDENCY-MAP.md) for the full graph.

## Crate shape

| Path                          | Contents                                                  |
| ----------------------------- | --------------------------------------------------------- |
| `crates/continuum/src/lib.rs` | `SnapshotStore` trait, `FileSnapshotStore` implementation |
| `crates/continuum/DESIGN.md`  | Scope, allowed dependencies, anti-goals, public surface   |
| `crates/continuum/tests/`     | Integration tests                                         |

The crate is a library; it carries no Tauri bindings and no direct database coupling beyond Mneme traits.

## References

- [Accepted-work contract](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)
- [Host module](../host/README.md)
- [Module dependency map](../../01-architecture/MODULE-DEPENDENCY-MAP.md)
- [Cross-module design overview](../../03-design/DESIGN.md)
