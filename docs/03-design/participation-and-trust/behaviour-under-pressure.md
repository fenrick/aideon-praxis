# Behaviour Under Pressure

How Aideon Desktop holds the line when a surface is dense, a result is uncertain, an action is consequential, or a user
moves between surfaces. Trust is easy to keep on a tidy, certain, single-screen view; the product earns it under
pressure. This document states the four behaviours the product holds to and why each matters.

The four behaviours apply across every participation mode and every surface. They are quality constraints on how the
product behaves, not features a surface may opt out of when it gets busy.

---

## The four behaviours

### Calm under density

Expert use is fast without becoming cryptic. A modelling studio, an impact analysis, or a portfolio matrix carries a lot
of information at once; the product keeps it structured and legible rather than thinning it out or hiding it behind
cleverness. Density is not the enemy — disorder is. Repeated expert use should accelerate, with stable structure,
predictable selection, and consistent placement of explanation, so a practitioner builds speed without the surface
turning into shorthand only its author can read ([ux/selection-model.md](../ux/selection-model.md);
[ux/drill-down.md](../ux/drill-down.md)).

### Explicit under ambiguity

Uncertainty surfaces honestly, not as a vague label. When a result is bounded, stale, derived, generated, or
low-confidence, the product names the specific condition and its degree — it does not fall back on a soft word like
"approximate" that hides which honest-state condition applies. The states and scales it uses are fixed elsewhere and not
redefined here: the result states and content classification of
[Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md), and the integrity and confidence scales of
[§8](../../02-standards/DOCUMENTATION-STANDARD.md). A [confidence](../../02-standards/DOCUMENTATION-STANDARD.md) of
**Medium** with its band is explicit; "probably fine" is not. The full obligation behind this behaviour is
[trust-and-honesty.md](../trust-and-honesty.md), and the cues that carry it are in [trust-cues.md](./trust-cues.md).

### Clear under scrutiny

Consequential actions feel deliberate, not slippery. Promoting a scenario, accepting a generated suggestion into the
Asserted record, deleting an entity, or running an export feels like a decision with a stated consequence, not a button
that quietly did something. The product states what will change, who it affects, and whether the change is immediate,
reviewable, or workflow-backed, before it happens. This is the same discipline behind task-based editing and visible
accepted work ([ux/editing-flow.md](../ux/editing-flow.md); [ux/accepted-work-ux.md](../ux/accepted-work-ux.md)) — under
scrutiny, the user can show that the action was deliberate and trace what it did.

### Consistent across surfaces

The same idea looks and behaves the same wherever it appears. A Stale badge, a confidence label, a provenance path, or a
drill-down gesture means the same thing in the modelling studio, the review queue, and the executive briefing.
Structural inconsistency erodes trust faster than most teams admit, because a user who learns a cue on one surface and
finds it broken on another stops trusting the cue everywhere. Consistency is what lets a user read a capability map, an
impact analysis, and a scorecard as one product rather than several ([the-shell.md](../the-shell.md)).

---

## Legibility is a quality constraint, not a simplification

Non-specialists read outputs without specialist training. That is a constraint on the **explanation**, not on the
**content**. The product does not strip a read-only output down to make it readable; it explains the output well enough
that a reader without model literacy can follow it and a reader with model literacy loses nothing. A scorecard that a
decision-maker can read in a meeting and a steward can audit afterwards is the same scorecard, explained well — not a
dumbed-down copy. Reducing the content to achieve legibility would trade one failure (illegibility) for a worse one (a
confident, simple, wrong answer).

## Worked example

A steward works a freshness task on the application `n:application:insight-hub` (Insight Hub, `disposition: Invest`;
[`baseline.yaml`](../../data/base/baseline.yaml)) while an executive reads a Customer Insight scorecard built on the
same capability `n:capability:customer-insight`. The four behaviours show on both surfaces at once:

- **Calm under density** — the steward's queue holds many tasks; the freshness task on Insight Hub stays structured and
  selectable, not buried.
- **Explicit under ambiguity** — the task names the condition precisely: the facts are **Stale** against the
  `Application` freshness policy, with the changed input identified — not "needs attention".
- **Clear under scrutiny** — confirming the task states that it writes a new operation and clears the Stale state; in
  hosted mode it resolves through a Themis approval
  ([approvals and workflow](../../05-modules/themis/approvals-and-workflow.md)). The consequence is stated before the
  steward commits.
- **Consistent across surfaces** — the same **Stale** cue the steward acts on is the cue the executive sees on the
  scorecard for the related plan event `n:plan-event:fy26-modernization` (FY26 Insight Modernization, confidence 0.7,
  **Medium**). One vocabulary, two surfaces, no reconciliation by the reader.

## The trade-off

Holding all four behaviours constrains every surface equally: a surface cannot drop a cue to look calmer, soften a
consequence to feel friendlier, or diverge from the shared vocabulary to suit its own audience. That uniformity costs
per-surface optimisation — a briefing surface that wanted a bespoke, frictionless "looks good, ship it" affordance must
instead carry the same deliberate confirmation as everywhere else. The product accepts that cost because the
alternative, surfaces that each feel best in isolation but contradict each other in aggregate, is exactly the structural
inconsistency that erodes trust.

## References & standards

_Informative:_

- Nielsen — **10 Usability Heuristics**, 1994. Visibility of system status, consistency and standards, and error
  prevention — the basis for calm density, consistency across surfaces, and deliberate consequential actions.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md). The honest-state vocabulary and unified
scales are fixed in [Documentation Standard §8–§9](../../02-standards/DOCUMENTATION-STANDARD.md) and not redefined here.

## Related documents

| Document                                            | What it covers                                                        |
| --------------------------------------------------- | --------------------------------------------------------------------- |
| [trust-and-honesty.md](../trust-and-honesty.md)     | The product-wide obligation behind explicit-under-ambiguity.          |
| [trust-cues.md](./trust-cues.md)                    | The honest-state cues these behaviours keep legible.                  |
| [participation-modes.md](./participation-modes.md)  | The roles these behaviours protect, including non-specialist readers. |
| [the-shell.md](../the-shell.md)                     | The one shared shell that makes consistency across surfaces possible. |
| [ux/editing-flow.md](../ux/editing-flow.md)         | Task-based editing and deliberate consequential actions.              |
| [ux/accepted-work-ux.md](../ux/accepted-work-ux.md) | How running work shows status instead of a spinner.                   |
