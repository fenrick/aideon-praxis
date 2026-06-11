# Workspace Family

The set of surfaces the product opens onto, and the role of each. Aideon is not a generic admin surface with diagrams dropped into it; it opens on a useful artefact, not on empty chrome. Each surface in the family renders inside the one shared shell ([the-shell.md](../the-shell.md)) and plays one role for one audience.

## The principle

The product serves several audiences — experts authoring the model, contributors confirming facts they own, decision-makers reading briefings — and one surface cannot serve all of them well. The workspace family gives each its own surface while keeping the shell, the selection model, and the honest-state rules common, so the surfaces read as one product rather than several. The cross-cutting surfaces close to the shell (workspace home, executive briefing, administration) are detailed in [host-surfaces/README.md](../host-surfaces/README.md); the human operating model behind who uses which surface is in [participation-and-trust/participation-modes.md](../participation-and-trust/participation-modes.md).

## The surfaces

| Surface                         | Role                                                                                                                                                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Workspace home**              | Gets the user back into useful work quickly — recency, active scenarios, and unfinished work over generic welcome content. A resume surface, not a consumer-style homepage.                                                  |
| **Modelling studio**            | The expert work surface, where structured editing, exploration, scenario awareness, explainability, and artefact authoring come together. The graph and direct-manipulation surface lives here.                              |
| **Artefact family library**     | The antidote to blank-canvas thinking: users start from known-good artefacts organised by question, audience, and abstraction level. Backed by [artefacts/families.md](../artefacts/families.md).                            |
| **Scenario studio**             | Where users work explicitly with the base case and alternative futures. Creating a scenario is easy; comparing, explaining, reviewing, and promoting it is the product's job.                                                |
| **Review and contribution**     | The bounded surface for SMEs, stewards, and other non-expert contributors. Plain business language; it does not require absorbing the whole model.                                                                           |
| **Executive briefing**          | Surfaces that survive contact with decision-makers: legible in meetings, defensible under questioning, usable in packaged output.                                                                                            |
| **Import and mapping**          | Where external material meets the controlled language of the product. Every step is reviewable, reversible, and explicit about uncertainty — quiet ingestion is how weak source material gets promoted into false certainty. |
| **Administration and controls** | Access, templates, integration controls, automation rules, and audit. Plain and explicit; the scope — personal, workspace, or organisation — is always unmistakable.                                                         |

## Worked example

A consultant authoring the FY26 plan works in the **modelling studio**, editing `Insight Hub` and authoring the **FY26 Insight Modernization** Plan Event. They move to the **scenario studio** to compare that scenario's plan layer against the base case's actual layer for `Insight Hub`. A capability owner confirming the `realises → Customer Insight` relationship works in **review and contribution**, in plain language, without seeing the whole model. A portfolio lead reads the result in an **executive briefing** surface. Each used a different surface for its role; all shared the same shell, selection model, and honest-state cues.

## References & standards

_Informative:_

- Nielsen — **10 Usability Heuristics**, 1994. Match between system and the real world; flexibility and efficiency of use across audiences.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                            | What it covers                                                                                     |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [host-surfaces/README.md](../host-surfaces/README.md)                                               | The cross-cutting surfaces close to the shell: workspace home, executive briefing, administration. |
| [participation-and-trust/participation-modes.md](../participation-and-trust/participation-modes.md) | The human operating model — who uses which surface and how.                                        |
| [artefacts/families.md](../artefacts/families.md)                                                   | The artefact families the library is organised around.                                             |
| [the-shell.md](../the-shell.md)                                                                     | The shell every surface renders inside.                                                            |
| [scenario studio → time-and-scenario-ux.md](./time-and-scenario-ux.md)                              | How scenarios are compared and shown.                                                              |
