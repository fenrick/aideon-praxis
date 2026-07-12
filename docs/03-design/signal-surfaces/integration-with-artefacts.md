# Integration with artefacts

Where signals attach in the shell, how cross-cutting signals are kept from swamping artefacts, how freshness is shown,
and why a signal is not the same as an artefact's provenance.

---

## Two attachment points

A signal appears at one of two places, chosen by its locality.

### Inline on the artefact

A **local** signal — a warning about one entity, an anomaly flag on one node, a confidence cue on one value — appears
inline on the artefact surface, close to the affected object. Inline placement follows information scent (Pirolli &
Card, _Information Foraging_, 1999): the cue sits where the user is already looking, and the path from the cue to its
evidence is **at most one click**. An inline signal uses the signal treatment defined in the
[Design System](../DESIGN-SYSTEM.md) and does not compete visually with the artefact it annotates.

### Inspector rail

The **inspector rail** carries the full signal detail for the selected object or surface. When a signal is selected or
expanded, the inspector shows all [six required elements](./required-elements.md) — type, scope, why, strength, context,
actions — without a separate drawer or modal. The inspector contract lives in [ux/README.md](../ux/README.md).

The division of labour: inline carries the scent and a one-click route to evidence; the inspector carries the detail.

## Cross-cutting signals route away from inline

A **cross-cutting** signal — one that spans many artefacts or needs coordinated review — **must not** be scattered
inline on every affected artefact. Doing so would bury the artefact under repeated badges and turn a single finding into
visual noise on a dozen surfaces. Instead, a cross-cutting signal routes to the review / task surface
([signal-families.md](./signal-families.md), Review tasks), where it is seen once, with its full affected scope listed.

The rule, stated plainly: inline density scales with locality, not with the number of objects a signal touches. A signal
that touches `Insight Hub`, `Journey Studio`, and `Automation Orchestrator` at once is one review task, not three inline
badges.

## Freshness must be honest

A signal is computed at a viewpoint — an as-of valid time, an as-of asserted time, a layer policy, and a scenario. The
surface is honest about that:

- A **Stale** signal (a canonical input changed since it was computed) **must** show its staleness and offer a rerun
  ([suppression-and-lifecycle.md](./suppression-and-lifecycle.md)).
- A **scenario-mismatched** signal — computed against one scenario while the user views another — **must** say so and
  **must not** present itself as current for the viewed scenario.
- A **Partial / Bounded** signal **must** name the gap.

These are the honest-state result states (§9), referenced from the
[Documentation Standard](../../02-standards/DOCUMENTATION-STANDARD.md), not a local invention. A stale or
scenario-mismatched signal shown without its flag is actively misleading.

## Signal provenance versus artefact provenance

A signal is not an artefact's provenance or freshness notice, and the two use distinct treatments in distinct places:

- **Artefact provenance** describes the origin and computation trail of artefact _content_ — what it was derived from
  and how fresh it is ([artefacts/explanation-surfaces.md](../artefacts/explanation-surfaces.md),
  [artefacts/content-classification.md](../artefacts/content-classification.md)).
- A **signal** is an active prompt for a _decision_. It has its own provenance (which module fired it, on which inputs),
  separate from the provenance of the content it points at.

Both can sit on the same artefact at once — provenance saying "this value is Inferred and Fresh" and a signal saying
"this value is an outlier worth reviewing". They must not collapse into one badge.

## Worked example

On a capability-map artefact, the `realises` relationship from `Insight Hub` to `Customer Insight`
(`e:insight-realises-insight`, criticality High) carries an **inline** confidence cue and, beside it, an anomaly flag —
one click reaches the evidence. Selecting the relationship opens the **inspector** with the full Metis warning.
Separately, a Chrona scenario-divergence finding that spans `Insight Hub`, `Journey Studio`, and
`Automation Orchestrator` does **not** appear inline on all three; it routes to a single review task. If the map is
viewed in the `FY26 Insight Modernization` scenario context but the Metis warning was computed against the base case,
the warning shows a **scenario-mismatched** flag.

## References & standards

_Informative:_

- Pirolli & Card — **Information Foraging**, 1999. Information scent and the one-click path from cue to evidence.
  Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                      | What it covers                                                      |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [artefacts/explanation-surfaces.md](../artefacts/explanation-surfaces.md)     | Inspector, inline, and companion explanation; drill-down and scent. |
| [artefacts/content-classification.md](../artefacts/content-classification.md) | How Asserted / Inferred / Generated content is displayed.           |
| [ux/README.md](../ux/README.md)                                               | The inspector and shell interaction contract.                       |
| [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md)                                       | The visual treatment for inline signals.                            |
| [suppression-and-lifecycle.md](./suppression-and-lifecycle.md)                | Stale state and explicit rerun.                                     |
| [DOCUMENTATION-STANDARD.md](../../02-standards/DOCUMENTATION-STANDARD.md)     | Result states (§9): Stale, Partial / Bounded, and the rest.         |
