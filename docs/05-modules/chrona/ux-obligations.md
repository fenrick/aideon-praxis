# UX obligations

What every temporal payload Chrona returns must carry to stay honest, and the families of payload it shapes for the renderer. Chrona is not the UI, but it returns data the UI does not have to reverse-engineer. The full UX contract is [UX-DESIGN](../../03-design/UX-DESIGN.md); the honest-state vocabulary is [DOCUMENTATION-STANDARD §9](../../02-standards/DOCUMENTATION-STANDARD.md).

---

## The obligations

Because Chrona feeds every temporal surface in the renderer, each payload **must** satisfy:

- **Name the context.** Every temporal result carries the active time, scenario, and comparison basis explicitly. A result a user cannot trace to a viewpoint is not interpretable ([re-resolution-rule](./re-resolution-rule.md)).
- **Stay explainable.** A temporal diff must be traceable to _what_ changed, _between which_ contexts, and _which_ scenario or layer contributed ([diff](./diff.md)). On request, the per-slot reason array shows which rule selected each winner ([viewpoint-resolution](./viewpoint-resolution.md)).
- **Be honest about limits.** A bounded or simplified view names its limit via a `warnings` field rather than silently collapsing it — a **Partial / Bounded** result is labelled, never disguised as complete ([bounds-and-failure-modes](./bounds-and-failure-modes.md)).
- **Fit the shared shell.** Plateau, compare, and overlay payloads fit the shared shell and inspector model, so they render without bespoke per-surface logic.
- **Keep the controls truthful.** The active time and scenario are always visible in the primary workspace; Chrona supplies the data that makes those controls truthful, so a user always knows which viewpoint they are looking at.

---

## The temporal result families

Chrona's public outputs group into four families; every response carries enough context to stay interpretable without re-inspecting the request:

| Family              | Key fields it carries                                                             |
| ------------------- | --------------------------------------------------------------------------------- |
| `state_at`          | as-of valid time, scenario identity, layer (or policy), fact count                |
| `diff`              | left viewpoint, right viewpoint, derived delta kind, added/removed/changed counts |
| `topology_delta`    | left viewpoint, right viewpoint, node and edge deltas, scenario if set            |
| timeline aggregates | segments, plateau markers, gap indicators, active effective interval              |

Where a result is partial or bounded, a `warnings` field names the limit ([bounds-and-failure-modes](./bounds-and-failure-modes.md)).

---

## Content classification and result state, kept distinct

A temporal payload carries content classification (per element: Asserted / Inferred / Generated) and result state (Fresh / Stale / Rebuilding / Partial / …) on the two orthogonal axes of the honest-state vocabulary ([DOCUMENTATION-STANDARD §9](../../02-standards/DOCUMENTATION-STANDARD.md)). The two never collapse into one badge: a fact resolved at a viewpoint may be Asserted content _and_ shown Stale because its projection is mid-refresh. Chrona surfaces both, because a user needs to know both _what kind of claim_ a value is and _how fresh_ the shown result is.

---

## Worked example — a compare payload that names its basis

A user compares the base case against `scn_consolidation` for `Automation Orchestrator`. Chrona returns a `diff` payload that carries:

- `left`: _{as-of valid time 2026-09-01, layer side_by_side, base case}_.
- `right`: _{as-of valid time 2026-09-01, layer side_by_side, scenario scn_consolidation}_.
- derived delta kind: **scenario delta**.
- changed: `(automation-orchestrator, disposition): Migrate → Invest`, with the contributing layer (plan, in the scenario) named.
- result state: `Fresh`; no `warnings`.

The renderer draws the compare widget directly from this — it does not need to know how the delta kind was derived or which rule selected each fact, because the payload says. If the scope had exceeded a fanout cap, a `warnings` entry would name the bound and the result state would read **Bounded** — the user would know the comparison is incomplete by design, not wrong.

---

## References & standards

_Informative:_

- Nielsen — _10 Usability Heuristics_, 1994. Visibility of system status and honest state.
- Pirolli & Card — _Information Foraging_, 1999. Information scent for drill-down into a diff's explanation.

## Related documents

| Document                                                  | What it covers                               |
| --------------------------------------------------------- | -------------------------------------------- |
| [UX-DESIGN](../../03-design/UX-DESIGN.md)                 | The full UX contract Chrona's payloads feed. |
| [Diff](./diff.md)                                         | The diff payload family.                     |
| [The re-resolution rule](./re-resolution-rule.md)         | Why every payload names its viewpoint.       |
| [Bounds and failure modes](./bounds-and-failure-modes.md) | How a bounded result names its limit.        |
| [Chrona README](./README.md)                              | The module index.                            |
