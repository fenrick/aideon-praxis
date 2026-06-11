# Signal Surfaces

How ML, system, and analytics outputs are presented as prompts for human judgement — the required surface elements, the authority rule, and the integration contract with artefacts and inspectors.

---

## Contents

1. [The Authority Rule](#1-the-authority-rule)
2. [Scope](#2-scope)
3. [Required Surface Elements](#3-required-surface-elements)
4. [Asserted vs Inferred vs Generated](#4-asserted-vs-inferred-vs-generated)
5. [Signal Families](#5-signal-families)
6. [Honest Partial and Stale States](#6-honest-partial-and-stale-states)
7. [Interaction Rules](#7-interaction-rules)
8. [Integration with Artefacts and Inspectors](#8-integration-with-artefacts-and-inspectors)
9. [Ownership by Module](#9-ownership-by-module)
10. [What Signals Are Not](#10-what-signals-are-not)

---

## 1. The Authority Rule

Signals are prompts for judgement, not replacements for judgement. The human remains the authority over the model.

A signal may flag, rank, recommend, or create work. It does not commit business truth. It does not silently mutate artefacts. It does not resolve itself. Every signal surface exists to help the user decide — not to decide on their behalf.

A signal that cannot declare what it is, why it fired, how strong it is, and what the user can do with it does not graduate beyond raw diagnostics.

---

## 2. Scope

Signal surfaces cover system-generated review and decision inputs:

| Category                           | Examples                                                        |
| ---------------------------------- | --------------------------------------------------------------- |
| Anomaly and quality warnings       | missing coverage, outlier values, structural inconsistencies    |
| Rankings and concentration signals | entity scoring, dependency concentration, top-N by criterion    |
| Risk and impact alerts             | change propagation, dependency hazards, scenario divergence     |
| Trend indicators                   | model drift over time, growth/decline curves, plateau detection |
| Suggested review tasks             | Metis- or Chrona-generated work items surfaced for acceptance   |

Signal surfaces do not cover generic workflow status, ordinary validation errors, provenance freshness notices, or free-form assistant responses. Those surfaces interact with signals but are distinct.

---

## 3. Required Surface Elements

Every signal surface makes these elements easy to find without requiring a secondary click:

| Element                           | What it answers                                                                                                                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Signal type**                   | What category of signal is this — warning, ranking, recommendation, review task?                                                                                                                     |
| **Affected scope**                | Which artefact, object, layer, or collection does this concern?                                                                                                                                      |
| **Why it fired**                  | What condition, threshold, or pattern triggered this signal?                                                                                                                                         |
| **Strength or confidence**        | How strong is the signal? Is it a hard rule, a probabilistic score, or a heuristic flag? Express this as a bounded cue — a tier label, a confidence range, a score — never as unqualified certainty. |
| **Temporal and scenario context** | At what active time and active scenario was this signal computed? Freshness matters. A stale signal computed against an obsolete scenario context must say so.                                       |
| **Valid actions**                 | What can the user do? At minimum: review the evidence, inspect the affected scope, suppress, accept, or request a rerun.                                                                             |

If a signal cannot surface all six elements, it should not be promoted to a first-class surface. It belongs in a raw diagnostics panel with a clear label.

---

## 4. Asserted vs Inferred vs Generated

The distinction between asserted, inferred, and generated content is always visible on signal surfaces. It is never collapsed.

| Origin        | Meaning                                                              | Visual treatment                                         |
| ------------- | -------------------------------------------------------------------- | -------------------------------------------------------- |
| **Asserted**  | Entered or confirmed by a human                                      | No modifier needed; it is the baseline                   |
| **Inferred**  | Derived algorithmically from asserted content                        | Labelled as inferred; carries the derivation path        |
| **Generated** | Produced by ML, heuristics, or synthesis without a direct data trail | Labelled as generated; carries confidence and provenance |

A signal that blends inferred and generated sources labels both. A signal that presents generated output as if it were asserted truth is a product defect.

---

## 5. Signal Families

### Warnings

Warnings tell the user something may be wrong, stale, incomplete, or risky. They name the issue directly. They do not soften the finding with hedging language that obscures the problem. They do not claim certainty beyond what the underlying detection supports.

A warning without a declared reason for firing is not a warning. It is noise.

### Rankings and Prioritisation

A ranking surface declares:

- what is being ranked
- what criterion or question the ranking answers
- which inputs and assumptions shape the ranking
- what the score or position represents

A sorted list without a declared question is numerology with spacing. Rankings that show only the sorted result — without the governing criterion — are not actionable and must not be presented as primary signals.

### Recommendations

A recommendation surface shows:

- the recommendation itself, stated clearly
- the reasoning path that produced it
- the evidence or inputs it depends on
- the review and challenge path (how to interrogate or override it)

A recommendation that cannot be challenged is a product smell. Recommendations are not instructions. They are informed suggestions that require human acceptance before any model mutation occurs.

### Review Tasks

When a signal creates work, that work becomes explicit. The review task surface shows:

- what or who needs review
- what triggered the task
- what evidence is attached
- what "done" looks like — the acceptance criterion

Review tasks generated by Metis, Chrona, or Continuum sit in the same task infrastructure as human-created work. Their origin is always declared. Their completion requires a human action, not automatic resolution.

---

## 6. Honest Partial and Stale States

Signals are computed at a point in time against a specific scenario. The surface is honest about the freshness of that computation.

| State                   | Required treatment                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| **Fresh**               | No modifier needed                                                                           |
| **Partial**             | Label indicates incomplete computation; scope of gap is named                                |
| **Stale**               | Label names the staleness; rerun action is available                                         |
| **Scenario-mismatched** | Signal computed against a different scenario than the current view; label names the mismatch |

A stale signal shown without a staleness indicator is actively misleading. A signal computed against scenario A while the user is viewing scenario B must not present itself as current.

Signals never silently update when the underlying model changes. Recomputation is explicit and triggered.

---

## 7. Interaction Rules

- A signal lands close to the affected work when it is local. Cross-cutting signals surface in review or task surfaces, not scattered inline.
- A signal links cleanly to its explanation, its evidence, and its available actions. The path from signal to evidence takes at most one click.
- A signal does not look identical to settled, asserted truth. Visual differentiation is not cosmetic — it is part of the authority rule.
- A signal may drive accepted work into the model after explicit human acceptance. It does not commit anything on its own.
- Suppressing a signal is a first-class action. Suppression is logged and attributed, not silent.
- Signals do not stack-rank themselves against each other without a declared ranking criterion.

---

## 8. Integration with Artefacts and Inspectors

Signals appear at two attachment points in the shell:

### Inline on artefacts

Local signals — warnings about a specific entity, anomaly flags on a specific node, confidence cues on a specific value — appear inline on the artefact surface close to the affected object. They use the signal treatment defined in [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) and do not compete visually with the artefact itself.

### Inspector rail

The inspector rail carries the full signal detail panel for the selected object or surface. When a signal is selected or expanded, the inspector shows the complete required elements (type, scope, why, strength, context, actions) without requiring a drawer or modal. See [UX-DESIGN.md](./UX-DESIGN.md) for the inspector contract.

Cross-cutting signals — those that span multiple artefacts or require coordinated review — route to the review task surface. They do not appear as scattered inline signals on every affected artefact simultaneously.

### Artefact provenance vs signal

A signal is not the same as an artefact's provenance or freshness notice. Provenance describes the origin and computation trail of artefact content. A signal is an active prompt for a decision. The two appear in different places and use distinct visual treatments. See [ARTEFACTS-AND-VIEWPOINTS.md](./ARTEFACTS-AND-VIEWPOINTS.md) for the artefact contract.

---

## 9. Ownership by Module

| Module                                   | Signal responsibility                                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [Metis](../05-modules/metis/README.md)   | Analytical generation: rankings, anomaly detection, risk and concentration signals, trend computation                 |
| [Chrona](../05-modules/chrona/README.md) | Temporal and scenario-aware comparison signals: plateau detection, scenario divergence, time-bounded trend            |
| Continuum                                | Rule-driven task creation, escalation workflows, reminder signals                                                     |
| Praxis                                   | Domain framing when a signal requires semantic explanation or task shaping                                            |
| Host (desktop shell)                     | Rendering all signals as visible, reviewable product surfaces; enforcing visual differentiation and interaction rules |

No module bypasses the surface contract. Metis and Chrona produce signal payloads. The host shell renders them. Signal payloads carry all required elements; the host does not fabricate missing context.

---

## 10. What Signals Are Not

Signals are distinct from:

| Surface                  | How it differs                                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Accepted-work status** | Status reflects completion state of committed work, not a prompt for a new decision                                                    |
| **Validation errors**    | Validation errors are synchronous, rule-bound, and block a specific action; signals are asynchronous, analytical, and invite judgement |
| **Provenance notices**   | Provenance describes origin and freshness of content; it is not a decision prompt                                                      |
| **Assistant responses**  | Free-form responses from an AI assistant are conversational outputs, not bounded analytical signals with declared confidence           |

These surfaces interact — a validation error may accompany a warning signal; provenance context enriches a stale signal — but they do not collapse into one undifferentiated alert layer.

---

## References

- [UX Contract](./UX-DESIGN.md)
- [Artefacts and Viewpoints](./ARTEFACTS-AND-VIEWPOINTS.md)
- [Design System](./DESIGN-SYSTEM.md)
- [Metis — Analytics](../05-modules/metis/README.md)
- [Chrona — Time and Scenario](../05-modules/chrona/README.md)
