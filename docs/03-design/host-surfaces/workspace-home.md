# Workspace Home

Workspace home is the product's workbench, not its lobby. It is the surface a user lands on when they open a workspace, and its one job is to get them back into useful work quickly. This document fixes what it shows, what it deliberately refuses to become, and which modules own which part of it.

## The principle

A workbench favours **recency and relevance** over coverage. The question workspace home answers is "what was I doing, and what needs me now?" — not "show me everything this workspace contains". That second question is what the navigation rail and the artefact family library are for. Workspace home reads the user's recent and pending work and arranges it; it adds no new model content of its own.

It surfaces four kinds of thing:

- **Resume work** — recent artefact results and modelling sessions still worth returning to, ordered by recency and relevance, each carrying the viewpoint it was last read under.
- **Active scenarios** — the scenarios the user has open or is comparing, distinct from the base case, so the user re-enters the world they were working in rather than the default one.
- **Unfinished accepted work** — imports, recomputes, scenario promotions, and reviews that are _In progress_ or _Awaiting review_, shown through the shared accepted-work lifecycle (see [../ux/accepted-work-ux.md](../ux/accepted-work-ux.md)).
- **Recent and pinned artefacts** — common entry points the user has pinned, plus recently opened artefact definitions, so a known-good starting shape is one click away.

## The rules it imposes

Workspace home **must not** become any of three things, because each is a failure of the principle:

- a **dashboard graveyard** — a wall of charts nobody reads, where staleness hides because no surface owns refreshing it;
- a **dumping ground** — a front page that accretes a card for every feature that wants visibility, until relevance is lost to volume;
- a **second navigation system** — a parallel sitemap competing with the navigation rail, so the user learns two ways to reach the same place and trusts neither.

Each resume or queue card **must** carry enough context to explain why it matters _before_ the user opens it: the viewpoint, the accepted-work state, and a one-line reason. A card that says only "Application portfolio · opened 2 days ago" has drifted into softness; it should say which scenario and as-of date it was read under, so the user knows whether reopening it answers the same question. This is the shared honest-state rule applied to a card: context stays visible when it changes meaning ([trust-and-honesty.md](../trust-and-honesty.md)).

A card **should** offer its drill-down in one step — open the artefact, open the queue entry, or open the scenario — and **may** offer a secondary action (pin, dismiss) where it does not compete with the primary one.

## Ownership

Workspace home composes; it does not compute. The split:

| Concern                                                                             | Owner                                                                                                                              |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Surface composition, layout, and routing into the right workspace                   | **Host** shell (the surface renders inside the four shell regions; the Host owns routing and the typed IPC the cards read through) |
| Artefact and template identity — what a "recent artefact" or "pinned artefact" _is_ | **Praxis** (artefact and artefact-family identity, execution)                                                                      |
| Unfinished accepted work, freshness reminders, and queue-oriented entry points      | **Continuum** (the local durable run ledger) and the automation layer that raises reminders and review tasks                       |

Workspace home holds no run state and no artefact semantics of its own. When it shows "FY26 Insight Modernization — import awaiting review", the _awaiting-review_ state is Continuum's run-ledger entry, the artefact identity is Praxis's, and the Host only arranges them.

## Worked example

A planner returns to the seed workspace (`baseline.yaml`, v1.0.0) mid-week to continue the FY26 plan work. Workspace home composes from three sources:

- **Resume work.** The top card is the artefact result the planner read last: an **application portfolio** catalogue over `n:application:insight-hub`, `n:application:journey-studio`, and `n:application:automation-orchestrator`. The card carries its viewpoint — as-of valid time today, base case, `plan` layer policy — and a one-line reason: "3 applications, last opened under the FY26 plan layer". The viewpoint is on the card because reopening it under `actual` rather than `plan` would answer a different question.
- **Active scenarios.** Below it, the two open Plan Events surface as in-flight planning work: `n:plan-event:fy26-modernization` (FY26 Insight Modernization, `effective_at` 2026-01-15, confidence 0.7) and `n:plan-event:fy26-channel-cutover` (FY26 Q2 Channel Cutover, `effective_at` 2026-05-01, confidence 0.8). Each card states the layer it authors and its effective-from date, so the planner re-enters the plan world rather than the actual one.
- **Unfinished accepted work.** A queue card shows an import that is _Awaiting review_ — an exception raised against `n:application:automation-orchestrator` (disposition `Migrate`, lifecycle `Plan`). The card is a Continuum run-ledger entry rendered through the accepted-work lifecycle; its primary action opens the review queue, one step away.

The planner reads three cards, knows which world each belongs to, and resumes the modernization work without re-deriving where they left off. No card asserts a count it cannot explain.

> **Design intent.** The composition rules and ownership split above are normative now and constrain the surface when it lands. The resume, scenario, and queue cards are described as the workspace-home surface is designed to behave; where Continuum's reminder and review-task automation is not yet in code it is design intent (see the Continuum and Metis READMEs for current implementation status).

## Edge cases and honest-state behaviour

- **A resume card's underlying result has gone stale.** A canonical input changed since the artefact was last read. The card shows the _Stale_ result state inline and offers re-execution; it does not silently re-run or hide the change. See [../ux/honest-state-treatment.md](../ux/honest-state-treatment.md).
- **No recent work.** A new workspace has no history. Workspace home shows entry points (open an artefact family, start a scenario) rather than empty placeholder cards. It does not fabricate activity.
- **A queue entry failed.** An import that errored shows the _Failed_ state with its partial coverage, not a generic error toast; the entry stays in place until the user acts on it.

## References & standards

_Informative — recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md):_

- Nielsen — **10 Usability Heuristics**, 1994. Recognition over recall (resume rather than re-navigate); visibility of system status.
- Pirolli & Card — **Information Foraging**, 1999. Information scent — each card carries enough to judge whether it is worth opening.

## Related documents

| Document                                                                                               | What it covers                                                         |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| [README.md](./README.md)                                                                               | The three host surfaces and the rules they share.                      |
| [executive-briefing.md](./executive-briefing.md)                                                       | The decision-ready sibling surface.                                    |
| [the-shell.md](../the-shell.md)                                                                        | The four shell regions workspace home renders inside.                  |
| [../ux/accepted-work-ux.md](../ux/accepted-work-ux.md)                                                 | The accepted-work lifecycle the queue cards render.                    |
| [../ux/workspace-family.md](../ux/workspace-family.md)                                                 | The wider set of surfaces, of which workspace home is the entry point. |
| [../participation-and-trust/participation-modes.md](../participation-and-trust/participation-modes.md) | Who uses workspace home and with what authority.                       |
| [../../05-modules/continuum/README.md](../../05-modules/continuum/README.md)                           | The run ledger behind unfinished accepted work and reminders.          |
| [../../05-modules/praxis/README.md](../../05-modules/praxis/README.md)                                 | Artefact and template identity behind recent and pinned cards.         |
