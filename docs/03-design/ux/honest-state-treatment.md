# Honest-State Treatment

How the honest-state vocabulary renders in the shell. The UI must never present a partial, stale, generated, or bounded result as if it were complete, fresh, asserted, or unbounded. This document fixes _where_ and _how_ those states appear on a surface. It does **not** define the states — those are fixed once, in the [Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md), and the obligation behind them is stated in [trust-and-honesty.md](../trust-and-honesty.md).

## The principle

The obligation is a core product invariant, not a nice-to-have ([trust-and-honesty.md](../trust-and-honesty.md), axiom 10). It rests on two orthogonal axes, both referenced from the standard and never collapsed into one badge:

- **Content classification** — what _kind_ of claim an element is: **Asserted**, **Inferred**, **Generated**.
- **Result state** — the condition of a result when shown: **Fresh**, **Stale**, **Rebuilding**, **Partial/Bounded**, **In progress**, **Awaiting review**, **Failed**.

A surface carries one content classification per element and any number of result states. "Generated" (a claim kind) is not "Stale" (a freshness condition), and a result can be both. The display rules for the classification axis are in [artefacts/content-classification.md](../artefacts/content-classification.md); this document covers the result-state axis and where each cue sits.

## Where state renders

Honest state renders at three escalating depths, chosen by how much it should change the user's decision.

| Depth                              | For                                                                                                                                              | Behaviour                                                                                                                                                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Field-row state cue**            | A single value's condition: a `Stale` value, a `Generated` field, an `Inherited` value, a validation block.                                      | A cue on the field row itself, grouped with the value, so the value is never read as plain when it is not.                                                                                                                                                                  |
| **Caveat area**                    | A result-level disclosure: what a Partial/Bounded result omitted, why a Stale result has not refreshed, what process produced Generated content. | The caveat area sits **beneath the content body** of every artefact frame. It is a disclosure surface, not an error panel; it states what was returned, what was omitted or capped, and why.                                                                                |
| **Warning / partial-result panel** | A caveat significant enough to change a decision.                                                                                                | Escalates from an inline notice to a full panel carrying severity, a concise problem statement, the affected scope, the reason, and the next action (refresh, review, constrain the query). It is a caution surface, visually distinct from neutral metadata — not a toast. |

The placement follows the rule in [selection-model.md](./selection-model.md): a cue that qualifies a value being read renders inline on that value; a result-level disclosure renders in the caveat area; an escalation that demands attention becomes a panel.

## The result states in the UI

| Result state          | What the surface must do                                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Fresh**             | No special cue; this is the baseline.                                                                                                   |
| **Stale**             | Surface a staleness cue with the last-computed time; offer a refresh. Do not hide the value.                                            |
| **Rebuilding**        | Show a rebuilding indicator; keep the last result visible. Do not blank the surface.                                                    |
| **Partial / Bounded** | Name what was capped, omitted, or bounded, and why, in the caveat area.                                                                 |
| **In progress**       | Show the prior or interim state with an in-progress cue; do not present it as final (see [accepted-work-ux.md](./accepted-work-ux.md)). |
| **Awaiting review**   | Mark content queued for human confirmation; expose the review path. Do not render it as settled.                                        |
| **Failed**            | State the failure and show any partial results under an explicit coverage statement.                                                    |

## Worked example

A user views the "Application Portfolio Health" catalogue at valid time _2026-06-11_, layer `actual`.

- The `Insight Hub` health roll-up carries a **field-row** `Inferred` cue and a `Stale` cue — its `accesses → Customer Profile` input changed since it was last computed.
- A bounded fan-out capped the dependency roll-up, so the catalogue's **caveat area** names the result as Partial/Bounded: it states that the traversal stopped at the fan-out limit and which subgraph was therefore omitted.
- Because the cap materially changes the health reading, the caveat escalates to a **warning panel**: severity, the problem (coverage incomplete), the affected scope (the omitted subgraph), the reason (fan-out bound), and the next action (re-run with a narrower scope).

The visual form of each cue, area, and panel is owned by [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md); this document fixes only what each must say and where it sits.

## References & standards

_Normative:_

- **[Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)**. The single honest-state vocabulary — content classification and result states — this document renders.

_Informative:_

- Nielsen — **10 Usability Heuristics**, 1994. Visibility of system status; error prevention; help users recognise and recover.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                      | What it covers                                         |
| ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| [trust-and-honesty.md](../trust-and-honesty.md)                               | The obligation this rendering serves.                  |
| [artefacts/content-classification.md](../artefacts/content-classification.md) | The display rules for Asserted/Inferred/Generated.     |
| [drill-down.md](./drill-down.md)                                              | How a caveat reaches its evidence in one click.        |
| [accepted-work-ux.md](./accepted-work-ux.md)                                  | The In-progress and Failed states for running work.    |
| [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md)                                       | The caveat-area, field-row, and warning-panel anatomy. |
