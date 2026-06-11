# Selection Model

How selection works across the workspace, and the rule for where the information about a selected thing appears — inline on the artefact, in the inspector rail, or in a transient drawer or sheet. Selection is the mechanism that keeps the inspector, the action affordances, and the drill-down path coherent; if it behaves inconsistently across surfaces, the interaction spine breaks.

## The principle

Selection is **global within a workspace**. Once the user selects something meaningful on any surface, the rest of the workspace responds predictably: the inspector updates, the valid actions narrow, and the drill-down path follows the selection. This is the conclusion fixed in [the-shell.md](../the-shell.md); this document states the behaviour that follows from it.

A predictable selection is a recognition aid, not a recall task (Nielsen, _10 Usability Heuristics_, 1994 — recognition over recall): the user does not have to remember what they clicked, because the inspector shows it.

## Selection kinds and cardinality

| Property           | Behaviour                                                                                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Selection kinds    | `node`, `edge`, `cell`, `artefact`, `none`. (`node` and `edge` are the graph projection of an entity and a relationship — graph-surface terms, per [`CONTEXT.md`](../../../CONTEXT.md).) |
| Cardinality        | A single **primary** selection always exists when anything is selected. Multi-select is permitted; one selected item remains primary.                                                    |
| Context            | A selection carries the id of the artefact or widget it originated from, so the inspector can explain _why this is showing_.                                                             |
| Inspector response | The inspector updates **immediately** to the primary selection's properties, explanation, provenance, differences, and valid actions.                                                    |
| Action sharpening  | Available actions narrow to those valid for the primary selection in its current state — not a fixed menu.                                                                               |

The inspector responds immediately because a delayed or stale inspector breaks the link between what the user clicked and what they see — the visibility-of-system-status obligation again.

## The placement rule: inline, inspector, or drawer

The same fact about a selected object can live in three places. The rule fixes which, by the job the information is doing. The principle behind it is Gestalt grouping (Wertheimer, _Gestalt principles_): information placed close to, and visually grouped with, the thing it describes is read as belonging to it; information placed far away reads as unrelated.

| Surface                       | Use it for                                                                                                                                                                  | Why there                                                                                                          | Rule                                                                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inline on the artefact**    | State that changes how the user reads the result _at a glance_: content-classification labels (Generated/Inferred), a stale or partial cue, a confidence caveat on a value. | Proximity binds the cue to the value it qualifies; a stale number must look stale where it is read, not elsewhere. | A cue that changes the meaning of a value the user is _currently reading_ **must** render inline, grouped with that value.                                                    |
| **Inspector rail**            | The full account of the primary selection: properties, explanation, provenance, differences, valid actions.                                                                 | The inspector is the durable home for "everything about the selected object"; it persists while the user works.    | The complete, persistent detail of the primary selection **must** render in the inspector. The inspector is not a place for one-off transient detail.                         |
| **Transient drawer or sheet** | A focused, temporary task that needs room but must not replace the content surface: a multi-field edit form, a side-by-side comparison, a confirmation with consequences.   | A drawer borrows space without unseating the dominant content surface, and dismisses cleanly when the task ends.   | Work that is **temporary and self-contained** may use a drawer or sheet; it **must not** be used for information the user needs to keep referring to while working elsewhere. |

Stated plainly: **inline** when the cue qualifies a value being read right now; **inspector** when it is the standing detail of the selection; **drawer or sheet** when it is a transient task that needs room. A cue that belongs inline must not be demoted to a tooltip, and standing detail must not be trapped in a drawer that closes.

## Worked example

A user selects the `Insight Hub` node on a capability map.

- **Inline**, on the node: a small `Inferred` label on its health roll-up, and a `Stale` cue because an input changed since it was last computed. These qualify what the user is reading on the canvas, so they stay on the node.
- **Inspector**, in the rail: the full account — `disposition: Invest`, `lifecycle: Run`, the `realises → Customer Insight` relationship, the explanation of the roll-up, its provenance, and the valid actions. This is the standing detail of the selection, so it lives in the inspector.
- **Drawer**, when the user starts an edit: a focused edit surface for the `lifecycle` field opens as a sheet, leaving the map dominant behind it, and dismisses when the edit is submitted as accepted work (see [editing-flow.md](./editing-flow.md)).

When two editors hold the same `Insight Hub` selection and submit incompatible edits, the conflict is not resolved inline or in a drawer; it becomes a first-class record surfaced for human resolution (design intent — see [multi-user-conflict-ux.md](./multi-user-conflict-ux.md)).

## References & standards

_Informative:_

- Wertheimer — **Gestalt principles**. Proximity and common-region grouping: information placed with the object it describes is read as belonging to it.
- Nielsen — **10 Usability Heuristics**, 1994. Recognition over recall; visibility of system status.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                 | What it covers                                                 |
| -------------------------------------------------------- | -------------------------------------------------------------- |
| [the-shell.md](../the-shell.md)                          | Where the rule that selection is global is fixed.              |
| [drill-down.md](./drill-down.md)                         | The path from a selected result to its explanation and action. |
| [honest-state-treatment.md](./honest-state-treatment.md) | How the inline cues this rule places actually render.          |
| [editing-flow.md](./editing-flow.md)                     | How a selection opens an edit surface.                         |
| [multi-user-conflict-ux.md](./multi-user-conflict-ux.md) | What happens when two selections collide in a concurrent edit. |
| [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md)                  | The inspector, drawer, and sheet primitives.                   |
