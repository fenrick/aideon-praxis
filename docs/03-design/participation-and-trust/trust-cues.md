# Trust Cues

What a user can tell about a result at the moment they read it — regardless of which role they hold or whether they know
the team that produced it. Trust must not depend on familiarity with the producing team; the product carries that burden
directly, in every surface. This document lists the cues the product owes its users and points at the single vocabulary
they rest on.

The cues are the same on a dense expert modelling surface and on a one-figure executive scorecard. A tidy surface that
hides uncertainty is not a better experience; it is a misleading one, and the cost of misleading a decision-maker is far
higher than the cost of a visible caveat.

---

## What a user can tell at any moment

At any moment, on any surface, a user can tell:

1. **Which viewpoint is active** — the as-of valid time, as-of asserted time, layer or layer policy, and scenario that
   frame what they are reading. The [viewpoint](../../../CONTEXT.md) is part of the question, not session trivia;
   changing it produces a materially different result. The time-and-scenario controls are always visible in the toolbar,
   never collapsed behind a click ([the-shell.md](../the-shell.md);
   [ux/time-and-scenario-ux.md](../ux/time-and-scenario-ux.md)).
2. **Whether a result is fresh or stale** — whether it was computed against current canonical material, or a canonical
   input has changed since (result states **Fresh** / **Stale**,
   [Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)).
3. **Where content came from** — its provenance: the source objects, imports, or inputs behind it, reachable in at most
   one step.
4. **Whether content is Asserted, Inferred, or Generated** — the content classification of each element, with Inferred
   carrying its derivation path and Generated visually distinct and unaccepted until a human accepts it
   ([artefacts/content-classification.md](../artefacts/content-classification.md)).
5. **Whether background work is running** — whether accepted work is still executing (result state **In progress** /
   **Rebuilding**), shown as explicit accepted-work status rather than an ambiguous spinner
   ([ux/accepted-work-ux.md](../ux/accepted-work-ux.md)).
6. **Whether a result is partial or awaiting review** — whether a fanout, depth, size, or time limit capped coverage
   (**Partial / Bounded**), or content is queued for human confirmation (**Awaiting review**).

These six map onto the two orthogonal honest-state axes fixed in the standard, and they never collapse into one badge.
Cue 4 is the **content classification** axis (Asserted / Inferred / Generated). Cues 2, 5, and 6 are the **result
state** axis (Fresh, Stale, Rebuilding, Partial/Bounded, In progress, Awaiting review, Failed). "Generated" (a claim
kind) is not "Stale" (a freshness condition), and one element can carry both. This document does not redefine those
states; the single definition lives in [§9](../../02-standards/DOCUMENTATION-STANDARD.md), and the product-wide
obligation behind them in [trust-and-honesty.md](../trust-and-honesty.md).

Where a cue expresses a quantity, it uses the unified scales without redefining them: the
[integrity score](../../02-standards/DOCUMENTATION-STANDARD.md) for how well-founded model content is, and the
[confidence](../../02-standards/DOCUMENTATION-STANDARD.md) label and band for how much to rely on a result or signal
([§8](../../02-standards/DOCUMENTATION-STANDARD.md)).

## The cues apply equally to dense and concise surfaces

The cues are not an expert luxury or an executive simplification. They apply equally to the densest expert surface and
the most concise executive output. An architect inspecting a derivation needs to know a value is Stale just as much as
an executive reading a scorecard does — and the executive needs the Generated and Partial cues just as much as the
architect, because a polished surface is the most likely place for an unflagged caveat to hide. The burden sits with the
product on both: visibility of system status is a usability obligation, not a density setting (Nielsen, 10 Usability
Heuristics, 1994).

## Worked example

A read-only executive opens a Customer Insight scorecard for the capability `n:capability:customer-insight`
([`baseline.yaml`](../../data/base/baseline.yaml)). The scorecard carries every cue:

- **Viewpoint** — the toolbar shows the as-of valid time, asserted time, the layer policy (actual-over-plan), and the
  scenario; the executive can read the frame without a click.
- **Fresh / stale** — the supporting application `n:application:insight-hub` (Insight Hub) shows **Stale** because a
  freshness task is open against its facts; the figure is not presented as current.
- **Provenance** — the `serves` relationship `e:capability-serves-discover` traces to its source; one step reaches the
  evidence.
- **Classification** — the disposition `Invest` on Insight Hub is **Asserted**; a derived portfolio health figure is
  **Inferred** with its derivation reachable; any narrative summary is **Generated** and labelled until accepted.
- **Background work** — if a recalculation is running, the affected figure shows **In progress**, not a blank.
- **Partial / awaiting review** — because the plan event `n:plan-event:fy26-modernization` (FY26 Insight Modernization,
  confidence 0.7, **Medium**) bears on this capability and is plan-layer, the scorecard marks the dependence and the
  confidence band rather than presenting one settled number.

The executive can answer "how solid is this?" from the surface itself, and drill into rationale when challenged —
without leaving the scorecard or asking the producing team.

## The trade-off

Carrying every cue on every surface costs visual space and rendering discipline; a surface that dropped the cues to look
cleaner would read faster and demo better. The product spends that space deliberately, because trust that depends on
familiarity with the author does not survive the author leaving, and a clean surface that hides a Stale or Bounded
result transfers the cost of the omission to whoever acts on it.

## References & standards

_Informative:_

- Nielsen — **10 Usability Heuristics**, 1994. Visibility of system status — the basis for surfacing viewpoint,
  freshness, and running work; recognition over recall.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md). The honest-state vocabulary and the
unified scales are fixed in [Documentation Standard §8–§9](../../02-standards/DOCUMENTATION-STANDARD.md) and not
redefined here.

## Related documents

| Document                                                                      | What it covers                                                         |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [trust-and-honesty.md](../trust-and-honesty.md)                               | The product-wide obligation the cues realise.                          |
| [artefacts/content-classification.md](../artefacts/content-classification.md) | The display rules for Asserted / Inferred / Generated.                 |
| [signal-surfaces/README.md](../signal-surfaces/README.md)                     | How analytical and ML signals carry their honest state and confidence. |
| [ux/honest-state-treatment.md](../ux/honest-state-treatment.md)               | How result states render in the shell.                                 |
| [participation-modes.md](./participation-modes.md)                            | The roles that rely on these cues.                                     |
| [behaviour-under-pressure.md](./behaviour-under-pressure.md)                  | How the cues hold up under density, ambiguity, and scrutiny.           |
