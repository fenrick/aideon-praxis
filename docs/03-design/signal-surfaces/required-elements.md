# Required surface elements

The six elements every signal must surface. A signal that cannot present all six belongs in a raw diagnostics panel, not on a first-class surface. This page is the checklist a renderer and a payload author both work against.

---

## The six elements

Every signal surface makes these findable without a secondary click. The signal payload carries them; the host renders them and never fabricates a missing one ([ownership-by-module.md](./ownership-by-module.md)).

| Element                           | What it answers                                                                                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Signal type**                   | Which family is this — warning, ranking, recommendation, or review task? ([signal-families.md](./signal-families.md))                                                                                                                                               |
| **Affected scope**                | Which entity, relationship, artefact, layer, scenario, or collection does this concern? Stated in terms the user can navigate to.                                                                                                                                   |
| **Why it fired**                  | Which condition, threshold, or pattern triggered it? A signal with no declared reason is noise.                                                                                                                                                                     |
| **Strength or confidence**        | How much should it be relied upon, and what kind of basis does it have — hard rule, probabilistic score, or heuristic flag? Expressed on the unified confidence scale, never as unqualified certainty ([confidence-and-strength.md](./confidence-and-strength.md)). |
| **Temporal and scenario context** | At which as-of valid time, as-of asserted time, layer policy, and scenario was it computed? A stale or scenario-mismatched signal must say so ([integration-with-artefacts.md](./integration-with-artefacts.md)).                                                   |
| **Valid actions**                 | What can the user do? At minimum: inspect the affected scope, review the evidence, accept, suppress, or request a rerun ([suppression-and-lifecycle.md](./suppression-and-lifecycle.md)).                                                                           |

## The graduation test

The six elements are a gate, not a wish list. If a producing module cannot supply all six for a given signal, that output **must not** be promoted to a first-class surface; it stays in a raw diagnostics panel with a clear label. This keeps the signal surface trustworthy: every item on it can be understood, traced, and acted on.

A signal also carries its content classification — Asserted, Inferred, or Generated (§9) — and any result states it is in (Fresh, Stale, Partial / Bounded, and so on). These are not a seventh element to invent; they are the honest-state vocabulary referenced from the [Documentation Standard](../../02-standards/DOCUMENTATION-STANDARD.md) and shown alongside the six.

## Worked example

A Metis concentration warning on `Insight Hub` (`n:application:insight-hub`) surfaces:

- **Signal type** — warning.
- **Affected scope** — `n:application:insight-hub`, via its `realises` relationship to `Customer Insight` (`e:insight-realises-insight`) and its `hosts`, `accesses` relationships.
- **Why it fired** — three inbound/outbound critical relationships converge on one Run-lifecycle application, above the concentration threshold.
- **Strength or confidence** — Medium; a probabilistic concentration score, not a hard rule.
- **Temporal and scenario context** — computed at as-of valid time today, base case (no scenario), actual layer; Fresh.
- **Valid actions** — inspect `Insight Hub`, review the contributing relationships, accept (open a review task), suppress, or rerun.

All six are present, so the warning is a first-class surface. Were the score missing, it would stay in diagnostics.

## Related documents

| Document                                                                  | What it covers                                                      |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [signal-families.md](./signal-families.md)                                | What each family must declare beyond the six elements.              |
| [confidence-and-strength.md](./confidence-and-strength.md)                | How the strength element maps to the unified confidence scale.      |
| [integration-with-artefacts.md](./integration-with-artefacts.md)          | Where the elements appear: inline cue versus full inspector detail. |
| [DOCUMENTATION-STANDARD.md](../../02-standards/DOCUMENTATION-STANDARD.md) | Honest-state vocabulary (§9) carried alongside the six elements.    |
