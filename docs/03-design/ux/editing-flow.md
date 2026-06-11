# Editing Flow

How edits happen. Edits are **task-based**: the product does not let users silently edit persistence shapes, and the renderer never mutates durable truth directly. An authoring intent is a **Change Event** that compiles into operations ([`CONTEXT.md`](../../../CONTEXT.md)); the renderer expresses that intent and reflects the result, but the host owns the mutation.

## The principle

Durable truth lives behind the host's typed boundary. The renderer is an untrusted WebView; it proposes changes and renders outcomes, but it never writes the op log. This keeps the trust boundary intact and means every change carries the authoring context — owner, rationale, source — that a raw field write would lose. The host module that owns this boundary is [Host](../../05-modules/host/README.md).

Edits being task-based also keeps the model honest: a change is an authored intent with provenance, not an anonymous overwrite. This is why a write becomes accepted work rather than an immediate mutation.

## The flow

1. **Selection** updates the global shell state (see [selection-model.md](./selection-model.md)). The primary selection determines what can be edited.
2. The **inspector** renders the appropriate edit surface — field rows, a property list, or a dedicated form in a drawer for a multi-field edit.
3. **Apply** sends a **typed command** through the host API over typed IPC. The renderer never mutates durable truth directly.
4. The command compiles the authoring intent — a **Change Event**, or a **Plan Event** when it authors a non-actual layer — into operations, and returns an `AcceptedJob`.
5. The inspector **reflects the accepted state immediately** and updates to the completed result when the job finishes (see [accepted-work-ux.md](./accepted-work-ux.md)). There is no optimistic "saved".

Cache refresh and projection invalidation happen through platform contracts after the job completes, not through ad hoc UI mutation.

## Field-row states

Each field row carries enough context that the user understands the value without a separate lookup. These cues are the field-row depth of the honest-state treatment (see [honest-state-treatment.md](./honest-state-treatment.md)).

| Cue                       | Meaning                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Plain value               | Asserted, current, authoritative.                                                                              |
| `Generated` cue           | Produced by inference or an AI process; a review path is available; not yet Asserted.                          |
| `Inherited` cue           | Sourced from a parent or template scope, not set on this object.                                               |
| `Stale` cue               | The value has not been recomputed since a dependency changed.                                                  |
| `queued` / `accepted` cue | A submitted edit is queued or accepted but not yet completed (see [backpressure-ux.md](./backpressure-ux.md)). |
| Validation message        | A structural constraint is violated; the save is blocked.                                                      |

## Worked example

A user changes `Insight Hub`'s `lifecycle` from `Run` to `Build` as part of the **FY26 Insight Modernization** plan.

1. The user selects `Insight Hub`; the inspector shows its field rows, with `lifecycle: Run` as a plain (Asserted) value.
2. They open the `lifecycle` edit surface and choose `Build`, authoring it as a Plan Event on the plan layer under the FY26 Insight Modernization scenario (so the actual-layer `Run` value is untouched).
3. Apply sends a typed command over IPC. The host compiles the Plan Event into operations and returns an `AcceptedJob`; the field row shows `accepted`, not "saved".
4. When the job completes, the inspector reflects the new plan-layer value. The actual layer still resolves `Run`; the difference is now visible as a scenario delta (see [time-and-scenario-ux.md](./time-and-scenario-ux.md)).

If a second editor changes the same `Insight Hub` slot concurrently and the two intents are incompatible, the result is not a silent last-writer-wins overwrite; it becomes a first-class conflict record surfaced for human resolution (design intent — see [multi-user-conflict-ux.md](./multi-user-conflict-ux.md)).

## References & standards

_Informative:_

- Nielsen — **10 Usability Heuristics**, 1994. User control and freedom; error prevention; visibility of system status.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md). The trust-boundary and typed-IPC basis is cited in [Host](../../05-modules/host/README.md).

## Related documents

| Document                                                 | What it covers                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [host/README.md](../../05-modules/host/README.md)        | The trust boundary, typed IPC, and command routing the renderer edits through. |
| [`CONTEXT.md`](../../../CONTEXT.md)                      | The Change Event and Plan Event terms an edit compiles into.                   |
| [selection-model.md](./selection-model.md)               | How a selection opens the inspector edit surface.                              |
| [accepted-work-ux.md](./accepted-work-ux.md)             | The accepted-job lifecycle an edit produces.                                   |
| [multi-user-conflict-ux.md](./multi-user-conflict-ux.md) | What happens when two edits collide.                                           |
| [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md)                  | The field-row and edit-surface anatomy.                                        |
