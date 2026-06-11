# Backpressure and Write-Queue UX

What the renderer shows when the write queue is saturated. When the host cannot accept a write immediately, the UI renders an explicit queued or backpressure state rather than pretending the write landed. This is the write-side counterpart to [accepted-work-ux.md](./accepted-work-ux.md): both refuse optimistic success.

## The principle

A write that the host has not yet accepted has not happened, and the UI must not say it has. Rendering an optimistic "saved" when a write is queued teaches the user a falsehood and risks a decision made on a change that may still fail. The honest state here is cheap to show and expensive to omit (the trade-off recorded in [trust-and-honesty.md](../trust-and-honesty.md)).

The backpressure signal is part of the accepted-work contract: when the write queue is saturated, the command returns a `BACKPRESSURE` error rather than an `AcceptedJob`, and the UI shows a queued state ([ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)).

## The states

| State          | What it means                                          | What the UI shows                                                                          |
| -------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `queued`       | The write is accepted but waiting behind earlier work. | A queue-depth indicator, and an estimated wait when the host provides one.                 |
| `backpressure` | The queue is saturated; new writes are held.           | An explicit notice that the system is busy and the change is queued — never a success cue. |
| `resumed`      | The queue is draining; held writes are proceeding.     | The backpressure notice clears; the accepted-work strip updates.                           |

## The rules

- The UI **never** renders an optimistic "saved" while a write is in a `queued` or `backpressure` state. The field row or action that produced the write shows the queued state instead (see [editing-flow.md](./editing-flow.md) for field-row states).
- The notice appears **close to the action** that produced it — in the inspector action strip or as an inline field-row cue — not silently in a remote corner. A user who pressed save in the inspector should learn the outcome in the inspector. This follows the same proximity rule that governs inline state cues (see [selection-model.md](./selection-model.md)).
- Users **may** keep submitting work while backpressure is active. The queue depth increments visibly; this is normal, and the product does not lock the UI. Visible depth lets the user judge for themselves whether to wait or stop.
- Backpressure **clears automatically** when the queue drains. The UI does not require the user to dismiss it by hand — a notice the user must clear would outlive the condition it describes.

## Worked example

A user is editing several `Insight Hub` slots in quick succession while a large import is consuming the write queue.

1. The user submits a change to `Insight Hub`'s `lifecycle`. The host returns `BACKPRESSURE`. The inspector field row shows a `queued` cue beside the field — not "saved" — and a notice names that the system is busy.
2. The user submits a second change anyway. The queue-depth indicator increments to show two writes waiting. The UI stays responsive.
3. The import drains; the queue resumes. The held writes proceed as accepted work, the field rows move to their `accepted` then `completed` states, and the backpressure notice clears on its own.

At no point did the UI claim a write had landed before the host accepted it.

## References & standards

_Informative:_

- Nielsen — **10 Usability Heuristics**, 1994. Visibility of system status; user control and freedom.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                      | What it covers                                           |
| ----------------------------------------------------------------------------- | -------------------------------------------------------- |
| [ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) | The `BACKPRESSURE` error and the queued-state contract.  |
| [accepted-work-ux.md](./accepted-work-ux.md)                                  | The accepted-work strip the backpressure notice updates. |
| [editing-flow.md](./editing-flow.md)                                          | The field-row states a queued write shows.               |
| [trust-and-honesty.md](../trust-and-honesty.md)                               | Why optimistic confirmation is forbidden.                |
| [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md)                                       | The notice and field-row cue anatomy.                    |
