# Accessibility and Performance

The accessibility and performance obligations every surface in this layer carries. These are not polish applied late; they are part of the interaction contract, because a surface that a user cannot reach by keyboard or that misleads by colour alone has failed regardless of how it looks. The conformance target and the state architecture behind it are fixed by ADR; this document states the behaviour those decisions require.

## Accessibility obligations

The conformance target is **WCAG 2.2 Level AA**, fixed by [ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md). The interaction patterns for complex widgets follow the **WAI-ARIA Authoring Practices Guide** (WAI-ARIA APG). The obligations that bind every surface:

- **Keyboard navigation is required for all flows.** Every artefact flow and every inspector interaction — selection, drill-down, editing, accepting work — must be operable from the keyboard alone, following the APG patterns for the widget in use (WAI-ARIA APG). A flow reachable only by pointer is incomplete.
- **Colour never carries meaning alone.** Every state distinction — a result state, a content classification, a validation block — has a secondary cue: a label, an icon, or a pattern (WCAG 2.2, _Use of Color_). A user who cannot distinguish the colours still reads the state.
- **Overlays carry legends.** A scenario overlay, a heat layer, or any encoded overlay includes a legend; the encoding is never left for the user to infer.

## Performance obligations

Performance here is an honesty obligation as much as a speed one: a surface that stalls without saying so, or that silently truncates, misleads.

- **Large tables are virtualised.** A dense analytical list or grid renders only the visible rows; virtualisation keeps the surface responsive without dropping rows from the result.
- **Bounded detail is explicit.** A graph-heavy or large result that truncates or simplifies says so, with an explicit truncation warning — never a silent cap. This is the Partial/Bounded result state rendered in the caveat area (see [honest-state-treatment.md](./honest-state-treatment.md)).
- **Skeletons versus progress text.** A skeleton is used where layout continuity matters during a load — the surface is about to fill with a known shape. Progress text is used where accepted work is already running and the user needs to know _what_ is running, not just that something is (see [accepted-work-ux.md](./accepted-work-ux.md)). The two are not interchangeable: a skeleton on a long-running job hides its status; progress text on a quick load adds noise.

The frontend state architecture that makes these behaviours implementable — how derived state, loading states, and accepted-work subscriptions are held — is fixed by [ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md).

## Worked example

A user opens the "Application Portfolio Health" catalogue with several hundred applications.

- The table is **virtualised**: it scrolls smoothly, and `Insight Hub` renders the same whether near the top or deep in the list.
- The catalogue's fan-out roll-up was **bounded**; the caveat area carries an explicit truncation warning naming what was capped.
- The user navigates to `Insight Hub` and opens its inspector entirely **by keyboard**, following the APG list and disclosure patterns.
- The `Stale` cue on the health roll-up shows both a colour and a text label, so it is legible without relying on colour.
- While the roll-up recomputes, the cell shows **progress text** (accepted work is running), not a skeleton.

## References & standards

_Normative:_

- **WCAG 2.2** (W3C), Level AA. The accessibility conformance target; _Use of Color_ for the non-colour-alone rule. Adopted by [ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md).
- **WAI-ARIA Authoring Practices Guide**. Keyboard and ARIA patterns for the complex widgets these flows use.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                            | What it covers                                             |
| ------------------------------------------------------------------- | ---------------------------------------------------------- |
| [ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md) | The WCAG 2.2 AA accessibility baseline.                    |
| [ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)   | The frontend state architecture these behaviours build on. |
| [honest-state-treatment.md](./honest-state-treatment.md)            | The bounded-result and truncation warnings.                |
| [accepted-work-ux.md](./accepted-work-ux.md)                        | When progress text replaces a skeleton.                    |
| [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md)                             | The token-level contrast, focus, and skeleton primitives.  |
