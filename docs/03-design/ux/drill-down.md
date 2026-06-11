# Drill-down: Result → Explanation → Action

The standard path from a rendered result to understanding it to acting on it. Drill-down must never require a mental-model switch: the user moves from a summary to the underlying entity, from the entity to its evidence, and from evidence to a valid action without breaking the conceptual frame. This document fixes the interaction contract; the surfaces explanation renders on are catalogued in [artefacts/explanation-surfaces.md](../artefacts/explanation-surfaces.md), which this restates rather than duplicates.

## The principle

Explanation is how the product earns the right to ask for a decision. If the user cannot tell _why_ something is showing before being asked to trust it, the surface has failed its contract. Drill-down is therefore the normal path, not appendix content: every serious result carries its explanation and evidence one step away.

The path follows information foraging (Pirolli & Card, _Information Foraging_, 1999): each surface gives a strong **scent** — a cue that tells the user the evidence they want lies one step away, and in which direction — and **progressive disclosure** keeps the dense detail behind that step rather than crowding the summary.

```
Artefact result
  └─▶ Inspector: properties + explanation + provenance
        └─▶ Evidence: contributing entities, relationships, paths
              └─▶ Valid action: a task into the model (accepted work)
```

_The standard drill-down path; each step is reachable in one move from the last._

## The explanation-placement rule

Explanation appears in one of three places, chosen by context. The same scent rule decides which; the test is _what the user is doing when they need the explanation_.

| Placement                         | Use it for                                                                                                                            | Rule                                                                                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inline caveat**                 | A short qualification read alongside a value: a stale cue, a partial-scope note, a confidence caveat, a content-classification label. | A qualification that changes how a _currently-read_ value should be taken **must** render inline, on the value. It is part of the artefact's visual contract, not a tooltip afterthought. |
| **Inspector explanation section** | The standing account of a selected element: what it is, why it looks this way, how solid it is, what to do next.                      | The full explanation of the primary selection **must** render in the inspector's explanation section.                                                                                     |
| **Companion / packaged view**     | Narrative summaries, briefings, and handovers where the explanation _is_ the product.                                                 | A composed report or page where explanation is foregrounded; used when the audience reads the explanation as the deliverable, not as a side note.                                         |

Whichever placement applies, the obligation holds: the path from any signal, score, or caveat to its underlying evidence takes **at most one click**. Evidence one click away is the difference between a number a user can trust and one they must take on faith.

## Worked example

A user views the "Application Portfolio Health" catalogue and sees an `Inferred` health roll-up for **Insight Hub** marked **Medium** confidence.

1. The catalogue carries an **inline caveat** on the roll-up: the `Inferred` label and the `Medium` confidence cue, read in place.
2. The user selects the `Insight Hub` row; the **inspector explanation section** opens and names why the roll-up is Medium and not High — it combined `lifecycle: Run` (Asserted) with the `realises → Customer Insight` relationship's criticality, but the `accesses → Customer Profile` relationship lacks a reviewed freshness date, lowering the recency dimension of the integrity score (Documentation Standard §8 — the scale is referenced, not redefined here).
3. The evidence link opens the contributing relationships in place — one click, no frame switch.
4. The action offers a steward task to confirm the access freshness: a typed command into the model, not a silent edit (see [editing-flow.md](./editing-flow.md)).

The user never left the conceptual frame, and every claim was one click from its evidence.

## References & standards

_Informative:_

- Pirolli & Card — **Information Foraging**, 1999; progressive disclosure. Information scent for drill-down and explanation placement.
- Nielsen — **10 Usability Heuristics**, 1994. Recognition over recall; help users diagnose.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                  | What it covers                                               |
| ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [artefacts/explanation-surfaces.md](../artefacts/explanation-surfaces.md) | Where explanation appears and the four questions it answers. |
| [selection-model.md](./selection-model.md)                                | How a selection opens the inspector explanation section.     |
| [honest-state-treatment.md](./honest-state-treatment.md)                  | How inline caveats render their result state.                |
| [editing-flow.md](./editing-flow.md)                                      | How a valid action becomes accepted work.                    |
| [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md)                                   | The inspector-section and caveat-area anatomy.               |
