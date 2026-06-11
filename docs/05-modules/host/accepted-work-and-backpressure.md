# Accepted work and backpressure

How the host runs long work as accepted jobs, the backpressure signalling contract, and cancellation. For a reader who needs to know what happens when an operation cannot complete on the IPC call.

The full job and event contract is [ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md); the boundary rules are [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md). This file is the host-facing behaviour.

---

## What runs as accepted work

Any operation that can exceed roughly 200–500 ms, or performs heavy disk I/O, is an **accepted job**: the command enqueues the work and returns an `AcceptedJob` immediately rather than blocking the IPC call. The renderer stores the job, subscribes to typed progress events filtered by its run identifier, and may poll job state as a safety net ([event bus](./event-bus.md)). Schema rebuilds, blob ingestion, analytics refresh, import and export pipelines, re-indexing, and connector ingest all run this way.

This is the desktop translation of "202 Accepted" semantics — identical lifecycle, no HTTP, only Tauri commands and events ([ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)).

---

## The backpressure signalling contract

The host does not queue unboundedly. When the write queue is saturated, a submission returns the stable `BACKPRESSURE` error rather than accepting work it cannot promptly run ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). The contract is explicit on both sides:

- the **host** signals saturation with the `BACKPRESSURE` error code in the standard error envelope ([IPC command surface](./ipc-command-surface.md));
- the **renderer** surfaces a queued state to the user and **does not silently retry** — a retry storm against a saturated queue is exactly what backpressure exists to prevent.

Backpressure is the _Denial of service_ control at the boundary ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)): a flood of submissions is refused with a clear signal rather than absorbed until the process falls over. The trade-off is that a busy host visibly rejects work; the architecture accepts a visible queued state over a hidden unbounded backlog that pretends the write landed.

---

## Cancellation

A submitted job is cancellable. The renderer requests cancellation by the run identifier; the host signals the running work to stop and emits a terminal event. A cancelled job stops cleanly — because engine work is bounded and writes nothing canonical until it completes a unit, a cancellation leaves no half-applied state ([Praxis failure modes](../praxis/failure-modes.md), [Metis determinism and bounds](../metis/determinism-and-bounds.md)). Cancellation and the IPC timeout SLA are the host's two defences against a single command holding resources indefinitely ([observability](./observability.md)).

---

## Worked example — an export that meets a saturated queue

A renderer calls `mneme_store_export_ops_stream` while a large rebuild already saturates the write queue. The host returns `BACKPRESSURE` in the error envelope, carrying the command's `correlation_id`. The renderer shows "queued — the workspace is busy" and waits, rather than re-submitting in a loop. When the rebuild drains, the renderer re-submits once; the host now returns an `AcceptedJob`, streams `job.updated` events as the export runs, and emits `job.completed` with the result reference. Had the user navigated away mid-export, a cancellation by run id would stop the stream and emit a terminal event with no partial export left behind.

---

## Related documents

| Document                                                                   | What it covers                                                 |
| -------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [Accepted work and events](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) | The `AcceptedJob` shape, lifecycle, events, and queue classes. |
| [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)   | Accepted-work semantics and explicit backpressure.             |
| [Event bus](./event-bus.md)                                                | The progress and completion events a job emits.                |
| [Observability](./observability.md)                                        | The IPC timeout SLA and cancellation's place in it.            |
| [Engine wiring](./engine-wiring.md)                                        | How a multi-engine job is composed as one run.                 |
