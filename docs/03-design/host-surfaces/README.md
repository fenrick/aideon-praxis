# Host Surfaces

Three product surfaces sit close to the shell and cut across every module: **workspace home**, **executive briefing**, and **administration and controls**. This folder fixes what each surface is for, what it owns versus what it composes from the modules, and the rules all three share. A reader who needs one surface opens its file; this README carries the cross-cutting narrative.

These surfaces are easy to hand-wave and awkward to leave undefined. They sit _above_ the modules — composing artefact results, signals, and accepted-work status that the engines produce — so they have no model of their own to keep them honest. That is exactly why they need explicit rules. Each renders inside the four fixed regions of [the-shell.md](../the-shell.md) and brings no chrome of its own.

---

## Contents

1. [Workspace home](./workspace-home.md) — the workbench a user returns to: resume work, active scenarios, unfinished accepted work, recent and pinned artefacts.
2. [Executive briefing](./executive-briefing.md) — decision-ready views that survive a difficult room without losing context, explanation, or honesty.
3. [Administration and controls](./administration-and-controls.md) — access, templates, integrations, automation rules, audit, import/export history, and recovery, scoped and predictable.

---

## What the three surfaces have in common

Each surface is a composition layer, not an engine. None of them stores canonical truth, runs analytics, or resolves the twin; each reads typed results from the modules across the Host trust boundary and arranges them ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md), Tauri trust boundary and typed IPC). The renderer is untrusted and holds no model semantics; the Host owns the side effects. This is the same offline-first, no-HTTP posture that governs the rest of the product — these surfaces call the same typed IPC, not a web backend.

Because they compose rather than compute, the failure mode they share is **softness**: vague cards, vague counts, vague labels, and vague ownership. A card that says "3 items need attention" without saying which items, in which scenario, as of when, has already drifted from the product's honesty obligation. The rules below exist to hold the line.

## Shared rules across all three surfaces

These bind every surface in this folder. They restate, for the composition layer, the obligations fixed in [trust-and-honesty.md](../trust-and-honesty.md) and the [Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md); they do not redefine them.

1. **Context stays visible when it changes meaning.** A scorecard, a resume card, or an audit row carries the viewpoint that produced it — the as-of valid time, as-of asserted time, layer or layer policy, and scenario ([`CONTEXT.md`](../../../CONTEXT.md)). The toolbar's time and scenario controls are always visible (the-shell.md); a surface must not show a number whose viewpoint the user cannot read.
2. **Accepted work uses the shared model.** Long-running work — an import, a recompute, a packaged export — renders through the one accepted-work lifecycle, not a bespoke spinner. See [../ux/accepted-work-ux.md](../ux/accepted-work-ux.md).
3. **Explanation and provenance stay close to the decision.** A user must reach the evidence behind a count, a ranking, or a status in at most one step (Pirolli & Card, _Information Foraging_, 1999). A surface that summarises must offer the route back to what it summarised.
4. **Dense information stays calm and structured.** These surfaces carry counts, lists, and tables. They use the dense list and table primitives of the [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md); labels lead, counts stay secondary.
5. **High-consequence actions feel deliberate.** A recovery, a retention change, or a published export is framed as a specific task with a stated consequence and a review path, never as an incidental button. The product accepts the friction.

## The trade-off

Holding these rules costs surface area and speed. A workspace home that rendered every plausible card, or a briefing that exported a clean slide without its caveat strip, would look busier and faster. The product spends that surface area deliberately: a surface that sits above the modules and hides its own uncertainty misleads the reader more cheaply than any single module could, because the reader has no model in front of them to check it against.

## References & standards

_Informative — the basis this folder leans on (full entries in the [standards register](../../02-standards/STANDARDS-REGISTER.md)):_

- ISO/IEC/IEEE 42010:2022, Architecture description. Stakeholders and concerns — the frame for treating each surface as serving a named stakeholder with explicit concerns. Disambiguated from the product's _Viewpoint_ (the query frame), per the [Documentation Standard §3](../../02-standards/DOCUMENTATION-STANDARD.md).
- Nielsen — **10 Usability Heuristics**, 1994. Visibility of system status; recognition over recall; user control.
- Pirolli & Card — **Information Foraging**, 1999. Information scent for one-step drill-down to evidence.

## Related documents

| Document                                                                                               | What it covers                                                             |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| [the-shell.md](../the-shell.md)                                                                        | The four fixed shell regions every surface renders inside.                 |
| [trust-and-honesty.md](../trust-and-honesty.md)                                                        | The honest-state obligations the shared rules restate.                     |
| [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md)                                                                | The dense list, table, card, and status primitives these surfaces compose. |
| [../ux/workspace-family.md](../ux/workspace-family.md)                                                 | The wider set of surfaces the product opens onto.                          |
| [../ux/accepted-work-ux.md](../ux/accepted-work-ux.md)                                                 | The shared accepted-work lifecycle these surfaces render.                  |
| [../participation-and-trust/participation-modes.md](../participation-and-trust/participation-modes.md) | Who uses which surface and with what authority.                            |
