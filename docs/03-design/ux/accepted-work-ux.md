# Accepted-Work UX

How long-running work is shown. Imports, recalculations, scenario promotions, large comparisons, and export generation appear as **accepted work** with explicit status — not as vague spinners, and not as work the user must babysit. This document fixes the renderer behaviour; the lifecycle and event schema it renders are the contract in [ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md), orchestrated by [Continuum](../../05-modules/continuum/README.md).

## The principle

Work the user cannot see is work the user cannot trust. A spinner says "something is happening" and nothing more; accepted work says _what_ is running, _what state_ it is in, and _where to look_. This is the visibility-of-system-status obligation made concrete (Nielsen, _10 Usability Heuristics_, 1994): the system keeps the user informed about what is going on, through appropriate feedback, in reasonable time.

The pattern is fixed by the contract: a command returns an `AcceptedJob` immediately with a `runId`; progress arrives as typed events; a durable run ledger records the lifecycle so a run is auditable after the fact. The renderer renders that lifecycle — it does not invent its own.

## The shared lifecycle vocabulary

Every module uses the **same** status vocabulary. There is no per-module polling protocol and no private status set; a user who learns the vocabulary once reads every module's work the same way.

```
Submit
  └─▶ accepted   (system acknowledged the work, assigned a runId)
        ├─▶ running     (progress events streaming)
        ├─▶ warning     (running, with caveats the user should know)
        ├─▶ cancelled   (user or system cancelled)
        ├─▶ failed      (terminal failure; partial results shown with explicit coverage)
        └─▶ completed   (work finished, results available)
```

The states are `accepted`, `running`, `warning`, `failed`, `cancelled`, `completed`. They map onto the honest-state result states (Documentation Standard §9): an `accepted` or `running` job carries the **In progress** result state; a `failed` job carries **Failed**. The vocabulary is referenced from the standard, not redefined here.

## The accepted-work strip

The accepted-work strip is the shared inline summary for running or recently completed work. It appears in the toolbar when relevant work is in flight, and looks deliberately the same product-wide — infrastructure the user learns by repetition. Its slots (work label, state badge, progress cue, recency note, detail link) and visual form are owned by [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md); this document fixes that the strip exists, is shared, and is where in-flight work surfaces.

## No silent success

If the renderer submits a write and receives an `AcceptedJob`, it renders that **acceptance** state. It does not pretend the write has already landed. The content surface continues to show the last confirmed state until a `completed` event arrives and the artefact refreshes. There is no optimistic "saved" before the job completes — the obligation against optimistic confirmation also governs write backpressure (see [backpressure-ux.md](./backpressure-ux.md)), and is the editing-flow contract (see [editing-flow.md](./editing-flow.md)).

A job that ends in `failed` says so, with whatever partial results exist shown under an explicit coverage statement; it does not fall back to a clean success state or vanish silently.

## Worked example

A user runs an impact recomputation across the capabilities that `Insight Hub` `realises` and `accesses`.

1. The command returns an `AcceptedJob` with a `runId`. The accepted-work strip appears in the toolbar: label "Recomputing impact for Insight Hub", state badge `accepted`.
2. Progress events stream; the badge moves to `running` with a step cue. The capability map keeps showing the last confirmed result, not a half-computed one.
3. A bounded fan-out caps the traversal; the job emits a `warning`. The strip shows `warning`, and the result, when it arrives, carries a Partial/Bounded caveat (see [honest-state-treatment.md](./honest-state-treatment.md)).
4. The job reaches `completed`; the artefact refreshes to the new result. At no point did the UI claim completion before the `completed` event.

## References & standards

_Informative:_

- Nielsen — **10 Usability Heuristics**, 1994. Visibility of system status; user control and freedom (cancel).

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md). The orchestration model (sagas, durable execution) is cited in [Continuum](../../05-modules/continuum/README.md).

## Related documents

| Document                                                                      | What it covers                                                  |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) | The `AcceptedJob` shape, lifecycle, events, and run ledger.     |
| [continuum/README.md](../../05-modules/continuum/README.md)                   | The module that orchestrates jobs, retries, and the run ledger. |
| [backpressure-ux.md](./backpressure-ux.md)                                    | What the UI shows when the write queue is saturated.            |
| [honest-state-treatment.md](./honest-state-treatment.md)                      | How the In-progress and Failed result states render.            |
| [editing-flow.md](./editing-flow.md)                                          | How an edit becomes accepted work.                              |
| [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md)                                       | The accepted-work-strip anatomy.                                |
