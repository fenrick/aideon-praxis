# Accepted-work execution

How heavy Metis jobs run: as accepted work through the host, with typed progress events and a completion envelope. For a reader who needs to know how a client submits and observes an analytics job.

This describes **design intent** ([README](./README.md)); the accepted-work contract it conforms to is normative now ([ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)).

---

## Heavy jobs are accepted work

Analytics is the highest-cost computation in the system ([algorithms and bounds](./algorithms-and-bounds.md)), so a heavy job — a centrality run, a large impact calculation, a path analysis over a dense graph — does not run synchronously on the IPC call. It runs as **accepted work**: the client submits an analytics command through the host, the platform returns an `AcceptedJob` immediately, and execution is routed through the worker contract ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). Metis emits typed progress events as work proceeds and a completion envelope when the job finishes.

Clients observe the **standard** accepted-work status model ([ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)); there is no Metis-specific polling protocol. The renderer stores the `AcceptedJob`, subscribes to events filtered by its run identifier, and tolerates missed events with fallback polling as a safety net only.

---

## The lifecycle

```text
client
  → host IPC analytics command
    → AcceptedJob returned immediately (queueClass: AnalyticsRefresh)
    → Continuum enqueues the job
      → Metis computes (bounded, deterministic)
        → Mneme projection read (input)
      → result write
    → typed progress events (job.updated)
  → completion event (job.completed) with the result envelope
```

The completion envelope carries the result _and_ its honest-state flags — truncation, approximation, warnings, algorithm parameters ([determinism and bounds](./determinism-and-bounds.md)) — so a completed job that was bounded reports its coverage rather than implying completeness.

---

## Backpressure and isolation

When the platform is saturated, an analytics submission returns `BACKPRESSURE` rather than queuing unboundedly ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)); the client surfaces a queued state rather than silently retrying. Jobs are isolated: each runs within its own memory and time budget, and a job that exhausts its budget halts itself and returns partial results with coverage, without starving sibling jobs or corrupting shared state — possible because Metis results are derived and write nothing canonical ([determinism and bounds](./determinism-and-bounds.md)).

The trade-off accepted-work closes: an analytics result is not available the instant the command returns — the client waits on events. The architecture accepts that latency in exchange for a renderer thread that never blocks on a heavy computation and a job that is inspectable and cancellable rather than lost in a background process.

---

## Worked example — a centrality job over a large twin

A client requests a PageRank ranking over a workspace too large to compute interactively. The host returns an `AcceptedJob` with `queueClass: AnalyticsRefresh`; Continuum enqueues it; Metis runs PageRank bounded to its iteration cap and time budget, reading the projection from Mneme and emitting `job.updated` events with progress. If the iteration cap is reached before convergence, the completion envelope marks the result **approximated** and records the iteration count ([algorithms and bounds](./algorithms-and-bounds.md)); the client receives `job.completed` with the ranking, its evidence, and the approximation marker. Had the write queue been saturated at submission, the command would have returned `BACKPRESSURE` and the job would not have started.

---

## Related documents

| Document                                                                   | What it covers                                                         |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [Accepted work and events](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) | The `AcceptedJob` shape, lifecycle, events, and backpressure contract. |
| [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)   | The trust boundary and the accepted-work pattern.                      |
| [Determinism and bounds](./determinism-and-bounds.md)                      | The honest-state flags the completion envelope carries.                |
| [Boundaries](./boundaries.md)                                              | Why Continuum composes the job, not Metis itself.                      |
