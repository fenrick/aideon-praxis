# ADR-0009: Time Encoding, Colour, and Story Modes

## Status

Accepted

## Context

A core differentiator of Aideon Suite is treating time as a first-class dimension, not just a
timestamp field. The original design described specific palettes, binning rules, and “story modes”
for communicating freshness, risk, validity, and scenario differences. We need a single place that
defines these conventions so Praxis Canvas, Chrona, and other surfaces behave consistently.

## Decision

Adopt the following **time and colour encoding conventions** and story modes:

- Palettes
  - Sequential palette (e.g., Blues-5) for freshness/staleness.
  - Diverging palette (e.g., Blue↔Orange-7 centred on “today”) for schedule risk.
  - Categorical palette (Okabe-Ito or equivalent) for status chips and legends.
- Binning & rules (defaults)
  - Freshness (`updated_at`): bins such as 0–30d, 31–90d, 91–180d, 181–365d, >365d.
  - Due-date risk (`due_date − today`): well ahead, ahead, tight, overdue, severely overdue.
  - Validity: elements outside their valid window at AS-OF are desaturated; items starting soon use
    dashed borders so shape/pattern complement colour.
- Story Modes
  - Freshness Spotlight – emphasise data staleness.
  - Delivery Risk – highlight schedule risk.
  - EoL Radar – foreground end-of-life/deprecation.
  - Scenario Trade-off – compare scenarios and their impact.
  - Validity Time-Travel – show what is valid at a given AS-OF.

## Consequences

- Canvas and dashboard implementations must use these encoding rules by default; deviations should
  be deliberate and documented.
- Visual changes to palettes, bins, or story modes should update this ADR (or add a superseding
  one) so design and implementation stay aligned.
