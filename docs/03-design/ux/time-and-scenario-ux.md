# Time and Scenario UX

How the toolbar exposes the viewpoint, and how changing it behaves. Time is not a filter applied to results; it is the coordinate system every result is resolved in. A result read without its temporal context is read wrongly, so the toolbar makes that context readable in place and re-executes when it changes.

## The principle

Every result is meaningful only relative to its **viewpoint** — an as-of valid time, an as-of asserted time, a layer or layer policy, and a scenario ([`CONTEXT.md`](../../../CONTEXT.md)). The toolbar exposes the viewpoint because the system's status must be visible without the user having to ask (Nielsen, _10 Usability Heuristics_, 1994 — visibility of system status). The contract that defines how a viewpoint resolves is [TEMPORAL-AND-SCENARIO-CONTEXT.md](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md), interpreted by [Chrona](../../05-modules/chrona/README.md); this document fixes only how the controls behave for the user.

Time is the coordinate system, not a filter. A filter hides rows from a fixed result; changing the viewpoint asks a _different question_ of the twin and gets a _different result_. Conflating the two would teach the user that "moving time" is a cheap local operation, when it is a re-resolution.

## What the toolbar exposes

The toolbar exposes the four viewpoint coordinates, always visible and never collapsible (the rule fixed in [shell-structure.md](./shell-structure.md)).

| Control           | What it exposes                                                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Valid time**    | The business/world point-in-time or period the twin is resolved for.                                                                                                                                      |
| **Asserted time** | Which belief is being read — latest belief, or a pinned past belief (the audit axis).                                                                                                                     |
| **Layer**         | A single layer (`plan`, `actual`, `forecast`, …) or a named layer policy (such as actual-over-plan). The product does not treat "actual overrides plan" as a universal rule; it is one selectable policy. |
| **Scenario**      | The active scenario overlay, or the base case when none is selected.                                                                                                                                      |

## Changes re-execute; they do not silently mutate

A change to any viewpoint coordinate **triggers re-execution** of the active artefact, or an explicit refresh — it does not silently mutate already-rendered content in place. The user must be able to tell that the surface now answers a different question. While the re-execution runs, the surface follows the honest-state rules: it does not present the prior result as if it were the new one (see [honest-state-treatment.md](./honest-state-treatment.md)).

## Scenario overlays mark differences

Scenarios are explicit overlays on the base case, never silent substitutions. When a scenario is active, the UI **marks** the results that differ from the base case, so the user can see what the scenario changed rather than reading an altered result as if it were the base.

The difference itself renders as a **Difference block**: the compared value, its before state, its after state, and an optional reason or impact cue. The block stays literal — the user reads what changed without decoding a colour trick or an animation. The before/after pairing is the contract: a scenario delta is shown as _this became that_, not as a single replaced value.

## Worked example

A user reads the capability map at valid time _2026-06-11_, layer `actual`, base case. `Insight Hub` shows `lifecycle: Run`.

1. They select the scenario tied to the **FY26 Insight Modernization** Plan Event. The toolbar's scenario control updates, and the artefact **re-executes** — it does not silently redraw.
2. The map now marks `Insight Hub` as differing from the base case. Its inspector **Difference block** shows `lifecycle`: before `Run` (base case), after `Build` (the scenario, authored by the FY26 Insight Modernization Plan Event), with the Plan Event named as the reason.
3. The user moves valid time forward to the **FY26 Q2 Channel Cutover** date. The artefact re-executes again; the result now reflects that later valid time. The toolbar makes both the new valid time and the active scenario readable without a secondary click.

## References & standards

_Informative:_

- Nielsen — **10 Usability Heuristics**, 1994. Visibility of system status; match between system and the real world.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md). The temporal model itself cites Snodgrass and Allen via [TEMPORAL-AND-SCENARIO-CONTEXT.md](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md).

## Related documents

| Document                                                                                | What it covers                                                                     |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [TEMPORAL-AND-SCENARIO-CONTEXT.md](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The viewpoint contract these controls drive.                                       |
| [chrona/README.md](../../05-modules/chrona/README.md)                                   | The module that resolves viewpoints, layer policy, diff, and scenario composition. |
| [shell-structure.md](./shell-structure.md)                                              | Why the controls are always visible in the toolbar.                                |
| [honest-state-treatment.md](./honest-state-treatment.md)                                | How a re-executing surface stays honest.                                           |
| [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md)                                                 | The difference-block and toolbar control anatomy.                                  |
