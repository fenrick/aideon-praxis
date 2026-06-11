# HIG: Interaction Model

How Aideon expects users to move, select, edit, confirm, recover, and read state across serious work surfaces. This is the operating model for input, focus, selection, editing, undo, drag and drop, long-running work, and error recovery. Apply it when designing or reviewing any interaction that depends on input, focus, selection, direct manipulation, destructive actions, or workflow feedback.

It does not define backend command semantics, retry policies, or workflow state machines — those are the contracts ([04-contracts](../../04-contracts/)). This page governs what the user experiences and how the interface communicates it.

---

## The principle

Aideon is desktop-first and keyboard-first, but not keyboard-exclusive ([DESIGN.md](../DESIGN.md)). Pointer interaction matters because direct manipulation is central to several surfaces; keyboard interaction matters because dense work needs speed, repeatability, and pointer-independent access. The model **should** make the product faster as users learn it without being cryptic to begin with — discoverable controls and expert paths reinforce one another.

## Input and navigation

Every important workflow **must** be achievable without a mouse; pointer-only capability is not acceptable for core work. Pointer interaction nonetheless stays fluent — dragging, selecting, resizing, and connecting feel direct, not second-class. Shortcut models stay stable across related surfaces: if Enter edits a row in one table and opens a side detail in another, that difference needs a reason stronger than local convenience.

## Focus and selection

Focus and selection are different states and **must never** collapse into one treatment. Focus tells the user where keyboard input will go; selection tells them what object, row, cell, or range is targeted. On complex surfaces both can exist at once, and the user **must** be able to see both ([design-system/interaction-states.md](../design-system/interaction-states.md)). Selection drives inspector content, bulk actions, and direct manipulation; focus drives keyboard action. Ambiguity here makes users second-guess what the next command will do.

## Editing and validation

The correct edit model is the least disruptive one that still preserves clarity and safety. Small, low-risk changes happen in place; larger or structured edits belong in an inspector or modal; batch changes need staging and review before commitment ([tables-and-dashboards.md](./tables-and-dashboards.md)). Validation prevents bad state early and explains failure clearly — a terse blocking message that does not say what went wrong is a design failure, not a copy problem.

An edit in Aideon authors a **Change Event** that compiles into operations ([CONTEXT.md](../../../CONTEXT.md)); the surface presents the authoring intent, never the raw op log. A write flows through an IPC command and may return an `AcceptedJob`; the renderer reflects backpressure as a queued state rather than pretending the write landed ([ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)).

## Undo, destructive action, and recovery

Undo gives users permission to explore; where practical, user-visible mutations **should** be reversible. Where undo is not possible, the interface says so before the action becomes final. Destructive actions are either recoverable or visibly consequential enough that the cost is understood. Recovery paths are concrete: telling the user something failed is half the job — the product also says whether their work is safe, what can be retried, and where the last known good state is.

## Drag and drop

Drag and drop earns its place when it is faster or more direct than a form or menu. It is a poor choice when it hides targets, offers no keyboard path, or worsens precision. Valid drop targets are obvious, and essential actions always have a non-pointer alternative ([design-system/interaction-states.md](../design-system/interaction-states.md)).

## Long-running work and error states

Imports, exports, analyses, and recalculations **must not** pretend to complete synchronously when they do not. The UI acknowledges accepted work, shows running status, surfaces warnings and failures, and lets the user return later without losing context — the In-progress, Awaiting-review, and Failed result states ([DOCUMENTATION-STANDARD.md §9](../../02-standards/DOCUMENTATION-STANDARD.md), [design-system/honest-state-treatments.md](../design-system/honest-state-treatments.md)). Errors are written for the person blocked by the problem, not the engineer reading logs: what happened, what it affects, whether partial work was preserved, and the next sensible action.

## Worked example

A user renames a capability in a table. The rename is low-risk, so it edits in place; pressing Enter commits a Change Event. The cell shows an in-progress marker while the command is in flight ([design-system/honest-state-treatments.md](../design-system/honest-state-treatments.md)); on success it settles, on failure an `ErrorFrame`-style inline message states what failed and that the prior value is intact. The row's _selection_ (driving the inspector) stays visually separate from the cell's _focus_ throughout.

## References & standards

_Informative:_

- Nielsen — **10 Usability Heuristics**, 1994. User control and freedom; error recovery.

## Related documents

| Document                                                                      | What it covers                                  |
| ----------------------------------------------------------------------------- | ----------------------------------------------- |
| [design-system/interaction-states.md](../design-system/interaction-states.md) | The focus/selection/active/disabled treatments. |
| [ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)             | Commands, backpressure, and the queued state.   |
| [ux/README.md](../ux/README.md)                                               | The behaviour-level interaction contract.       |
| [foundations.md](./foundations.md)                                            | The defaults this model builds on.              |
