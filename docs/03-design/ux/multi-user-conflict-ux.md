# Multi-User Conflict UX

How concurrent edits reconcile, and how a conflict that cannot be reconciled automatically is surfaced for a human to resolve. This is **design intent**: collaboration is a product goal whose implementation is deferred, owned by the planned [Koinon](../../05-modules/koinon/README.md) module. The data model that makes it possible is fixed now by [ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md); the UX described here is framed in the present tense as the standard requires, but constrains an implementation not yet in code.

> **Status: design intent (planned).** No `koinon` crate exists. The behaviour below is normative for the implementation when it lands; it does not describe a shipped feature.

## The principle

Concurrent editing reconciles **operations and semantic facts**, not file diffs. Two editors do not merge text or database files; they exchange the operations they authored, and those operations resolve against the temporal-truth rules — valid-time containment, interval specificity, then a stable tie-break — with layers combined by the viewpoint's policy ([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)). Additive changes union safely; identical operations are idempotent. Most concurrent work therefore merges without a conflict, because the model reconciles meaning, not bytes.

This matters for the UX because it sets what a conflict _is_: not "two people touched the same file", but "two operations make incompatible claims about the same slot, interval, and preference level". The UX only has to surface the genuine incompatibilities, not every co-edit.

## Conflicts are first-class records

When operations cannot reconcile automatically — incompatible values for the same subject, slot, and interval; a delete-versus-edit race; a schema change that alters a field's meaning; or two different binary replacements claiming to be the new version — the system records an explicit **conflict record**, not a silent overwrite ([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md), `conflict.recorded`). A conflict is a durable, traceable record surfaced for human resolution, never a last-writer-wins guess.

The UX obligations that follow:

- **No silent resolution.** A conflict must surface as a user-visible record; the system never picks a winner quietly. This extends the no-silent-success rule of [accepted-work-ux.md](./accepted-work-ux.md) and the no-silent-overwrite rule of [editing-flow.md](./editing-flow.md) to the concurrent case.
- **Resolution is human and explained.** The conflict surface presents the competing claims side by side — the before/after of each, their authors, and their asserted times — using the Difference block form already used for scenario deltas (see [time-and-scenario-ux.md](./time-and-scenario-ux.md)), so a user reads _this claim versus that claim_ and chooses, with the choice recorded as a new operation.
- **Presence reduces collisions before they happen.** Presence and merge cues show who else holds a selection or is editing a slot, so users can avoid colliding rather than only reconciling afterwards. Presence is a cue, not a lock; the model still reconciles operations.
- **The conflict is reachable from the affected object.** A slot in conflict carries a state cue on its field row (a conflict cue alongside the field-row states of [editing-flow.md](./editing-flow.md)) and on the selection (see [selection-model.md](./selection-model.md)), so a user who selects the object finds the conflict one step away.

## Worked example

Two editors work on `Insight Hub` concurrently.

1. Editor A sets `lifecycle` to `Build` on the plan layer under the **FY26 Insight Modernization** scenario; Editor B sets `lifecycle` to `Plan` on the same layer, scenario, and interval. Presence cues show both editors holding the `Insight Hub` selection.
2. The two operations make incompatible claims about the same slot, layer, scenario, and interval, so they cannot reconcile automatically; the system records a `conflict.recorded` op.
3. `Insight Hub`'s field row carries a conflict cue; selecting the object surfaces the conflict record. The conflict surface shows the two claims as a Difference block: A's `Build` and B's `Plan`, each with its author and asserted time.
4. A steward resolves the conflict by choosing a claim (or authoring a third); the choice is recorded as a new operation, and the conflict record is closed but remains traceable.

## References & standards

_Normative:_

- **[ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)** — Sync and Conflict Model. Operations-not-files exchange; semantic typed merge; conflicts as first-class `conflict.recorded` records.

_Informative:_

- Shapiro et al. — **Conflict-free Replicated Data Types**, 2011. Convergence properties behind additive merge.
- Nielsen — **10 Usability Heuristics**, 1994. Visibility of system status (presence); user control and freedom (human resolution).

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                      | What it covers                                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [koinon/README.md](../../05-modules/koinon/README.md)         | The planned module that owns sync, presence, and the merge/conflict experience. |
| [ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md) | The sync and conflict data model fixed now.                                     |
| [editing-flow.md](./editing-flow.md)                          | The single-user edit flow conflicts extend.                                     |
| [selection-model.md](./selection-model.md)                    | How a conflict surfaces on a selection.                                         |
| [time-and-scenario-ux.md](./time-and-scenario-ux.md)          | The Difference block the conflict surface reuses.                               |
