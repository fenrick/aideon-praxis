# Explanation Surfaces

Explanation is a first-class obligation, not optional garnish. The product does not dump model content onto the screen
and expect the user to do the interpretive work alone. This document fixes where explanation appears, how drill-down
works, and the principle — information scent — that governs both.

## Explanation has a place

Explanation appears at three locations, chosen by context. The rule for which one is fixed in
[ux/drill-down.md](../ux/drill-down.md); the summary:

| Surface                       | When                                                                                              | What it carries                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Inspector**                 | The primary surface, for a selected entity, relationship, or artefact element.                    | What it is, why it matters, its quality signals, and the valid actions. If the inspector is a property dump, it is not doing its job. |
| **Inline in the artefact**    | For stale indicators, confidence caveats, partial-scope notes, and content-classification labels. | Part of the artefact's visual contract — not a tooltip afterthought.                                                                  |
| **Companion / packaged view** | For narrative summaries, briefings, and handovers where explanation is the product.               | A composed [report or page](./forms.md) where the explanation is foregrounded.                                                        |

The mechanism varies; the obligation does not. Every serious result answers the [four questions](./the-contract.md):
what am I looking at, why does it look this way, how solid is it, what can I do next.

## Drill-down is structural

A user moves from a summary result to the underlying entity, from the entity to its relationships, from a relationship
to its evidence, and from evidence to a valid action — **without losing orientation and without switching mental
models**. If the user must break the conceptual frame to follow the evidence, the explanation surface is incomplete.

```
Artefact result
  └─▶ Inspector: properties + explanation + provenance
        └─▶ Evidence: contributing entities, relationships, paths
              └─▶ Valid action: task into the model (accepted work)
```

_The standard drill-down path; each step is reachable in one move from the last._

## Information scent

Explanation placement follows **information foraging** (Pirolli & Card, _Information Foraging_, 1999): each surface
gives a strong _scent_ — a cue that tells the user the evidence they want lies one step away, and in which direction.
The path from a signal, score, or caveat to its evidence takes **at most one click**
([signal-surfaces/integration-with-artefacts.md](../signal-surfaces/integration-with-artefacts.md)). Progressive
disclosure keeps the dense detail behind that one step rather than on the summary surface, so a reader is never made to
process material that does not answer their current question ([abstraction-levels.md](./abstraction-levels.md)).

## Worked example

A user views the "Application Portfolio Health" catalogue and sees an Inferred health roll-up for **Insight Hub** marked
**Medium** confidence. Following the scent:

1. They select the `Insight Hub` row; the **inspector** opens with the roll-up's explanation — it combined
   `lifecycle: Run` (Asserted) with the `realises → Customer Insight` relationship's `criticality: High` (Asserted).
2. The **explanation** names why it is Medium and not High: the `accesses → Customer Profile` relationship lacks a
   reviewed freshness date, lowering the recency dimension of the
   [integrity score](../../02-standards/DOCUMENTATION-STANDARD.md).
3. The **evidence** link opens the contributing relationships in place.
4. The **action** offers a steward task to confirm the access freshness — accepted work, not a silent edit.

The user never left the conceptual frame, and every claim was one click from its evidence.

## References & standards

_Informative:_

- Pirolli & Card — **Information Foraging**, 1999; progressive disclosure. Information scent for drill-down and
  explanation placement.
- Nielsen — **10 Usability Heuristics**, 1994. Recognition over recall.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                        | What it covers                           |
| --------------------------------------------------------------- | ---------------------------------------- |
| [ux/drill-down.md](../ux/drill-down.md)                         | The interaction contract for drill-down. |
| [ux/honest-state-treatment.md](../ux/honest-state-treatment.md) | How inline caveats render.               |
| [the-contract.md](./the-contract.md)                            | The four questions explanation answers.  |
| [signal-surfaces/README.md](../signal-surfaces/README.md)       | How signals carry their explanation.     |
