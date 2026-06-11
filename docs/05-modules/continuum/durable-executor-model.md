# The durable executor model

Why Continuum's orchestration runtime is an in-process, workspace-backed durable executor with no external service, and what that model guarantees. The decision is rooted in the desktop-first posture ([DESKTOP-FIRST-WORKSPACE](../../03-design/DESKTOP-FIRST-WORKSPACE.md)); the run-ledger contract is [ACCEPTED-WORK-AND-EVENTS](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md).

---

## In-process, workspace-backed, durable

The orchestration runtime is **in-process** — there is no external orchestration service, no separate daemon, no cloud workflow engine. All workflow state — runs, steps, retry counters, artefact references — persists in the local workspace ([run-and-step-lifecycle](./run-and-step-lifecycle.md)). The scheduler is Tokio-driven; bespoke thread pools and external scheduling services are out of scope.

This model is what gives the product its automation guarantees:

- **Work survives restarts**, because the run ledger is durable on disk. A run interrupted by a crash or a quit is resumable from its recorded state, not lost.
- **Retries are deliberate and bounded**, not implicit timer loops ([retry-and-backoff](./retry-and-backoff.md)).
- **Every run is identifiable; every step is inspectable.** The system can answer what ran, why, which inputs it used, what it wrote, what failed, and what can be retried safely.

---

## Durable execution as an established pattern

The model is the desktop, single-node form of **durable execution** — the pattern where workflow progress is persisted so a workflow can be resumed deterministically after a failure rather than restarted from the top _(Temporal.io, durable execution model)_. Continuum borrows the _principle_ — persist progress, resume from it, retry activities, version workflows — without the distributed runtime: there is one node (the desktop), one workspace, one durable ledger.

Two differences from a distributed durable executor are deliberate and worth naming:

- **No distributed consensus.** A single-node executor needs no leader election or cross-node coordination; the single-writer queue in Mneme already serialises the writes a workflow makes ([Mneme storage-trait-and-engine](../mneme/storage-trait-and-engine.md)).
- **Replay is for recovery, not for determinism-across-replicas.** Continuum replays a run from the ledger to resume it after interruption; it does not run a workflow redundantly on multiple replicas and reconcile. The ledger, not a replicated log, is the source of truth ([snapshot-store-and-ledger](./snapshot-store-and-ledger.md)).

---

## Replayability

Because run inputs are structured and artefact references carry provenance, any workflow can be re-examined after the fact ([run-and-step-lifecycle](./run-and-step-lifecycle.md)):

- the exact input set is recoverable from the run record;
- step-level events record what each connector or engine received and returned;
- retry decisions reference the ledger state, not implicit in-memory state;
- support and audit queries against run history are first-class, not afterthoughts.

Replayability is the property that lets a failed run be understood and safely resumed. A retry that re-runs a completed step would be a hazard; idempotency ([idempotency-and-dedup](./idempotency-and-dedup.md)) plus the recorded step state is what makes resume-from-failure exactly-once in effect.

---

## The trade-off named

An in-process executor closes the door on offloading long work to a separate scaled service: Continuum runs within the desktop process, so a very large workflow competes with the UI process for resources, and there is no horizontal scale-out. The product accepts this because the desktop is single-user and single-node — the workloads are bounded (connector pulls, recompute over one workspace), and the durability and inspectability of a local ledger are worth more than the scale a service would buy. The seam to a hosted relay is left open as an _optional adapter_ ([snapshot-store-and-ledger](./snapshot-store-and-ledger.md)), never as the authoritative executor.

---

## Worked example — a refresh that survives a restart

A scheduled connector refresh of the seed workspace begins, then the application is quit mid-run:

1. Continuum records a `run` (trigger `scheduled`, status `running`) and a `run_step` for the connector pull before the pull starts ([run-and-step-lifecycle](./run-and-step-lifecycle.md)).
2. The pull completes and writes its facts through Mneme; a `run_step` for the persistence step is recorded `completed`.
3. The application quits before the downstream recompute step runs. The ledger holds the run as `running` with the pull and persistence steps `completed`.
4. On the next launch, Continuum reads the ledger, sees the run incomplete, and resumes from the recompute step — it does **not** re-run the connector pull or re-write the facts, because those steps are recorded `completed` and their effects are idempotent ([idempotency-and-dedup](./idempotency-and-dedup.md)).
5. The recompute runs, the run reaches `completed`, and the full lifecycle is inspectable in the ledger.

No work is lost and no work is duplicated, because the durable ledger recorded exactly how far the run had progressed.

---

## References & standards

_Informative:_

- Temporal.io — durable execution model. Persist-progress-and-resume, activity retries, workflow versioning.
- van der Aalst et al. — Workflow Patterns. The control-flow vocabulary the executor realises.

## Related documents

| Document                                                              | What it covers                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------ |
| [Run and step lifecycle](./run-and-step-lifecycle.md)                 | The run/step/event records and resume-from-failure.    |
| [The snapshot store and run ledger](./snapshot-store-and-ledger.md)   | Where durable state lives.                             |
| [Idempotency and deduplication](./idempotency-and-dedup.md)           | Why resume is exactly-once in effect.                  |
| [DESKTOP-FIRST-WORKSPACE](../../03-design/DESKTOP-FIRST-WORKSPACE.md) | The desktop-first posture behind the in-process model. |
| [Continuum README](./README.md)                                       | The module index.                                      |
