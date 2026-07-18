# ADR-0041: Design-token contract reconciliation — DTCG source authoritative, shadcn variables generated

- Status: Accepted
- Date: 2026-07-18
- Depends-On: ADR-0025
- Relates-To: ADR-0010, ADR-0024

## Context

[ADR-0025](./ADR-0025-design-token-architecture.md) chose the token architecture: tokens authored in the W3C Design
Tokens Community Group (DTCG) `$type`/`$value` format, tiered reference → semantic, with CSS custom properties
**generated** from the DTCG source and product code consuming semantic tokens only.
[`tokens.md`](../03-design/design-system/tokens.md) enumerates the families that contract requires.

The implementation on `main` diverged from that decision, and the gap is structural rather than cosmetic:

- **No DTCG source and no reference tier.** Tokens are hand-authored as TypeScript objects in
  `src/design-system/foundations/tokens.ts` plus hand-written shadcn CSS variables in `src/design-system/styles/`. There
  is no `$type`/`$value` source and no reference → semantic separation; semantic values are written directly.
- **Palette is not teal-anchored and ramps are incomplete.** The reference ramps specified as `neutral` +
  `teal / blue / green / amber / red` at steps `50…950` are absent; the active theme's primary hue drifts off the teal
  anchor, and hover/active/disabled tones are produced with `opacity` modifiers rather than named ramp steps.
- **Named semantic families are missing.** `color.action.*-hover/-active/-disabled`, `color.border.focus`,
  `color.foreground.disabled`, `color.provenance.*`, `size.target.min`/`comfortable`, `space.inset/stack/inline.*`, and
  `motion.duration.{instant,fast,normal,slow}` have no counterpart; interaction states consume raw `--primary`/`--ring`
  and `disabled:opacity-50`.
- **Chart colours fail the accessibility obligation.** Fewer than the specified eight series colours exist and they do
  not survive greyscale / colour-vision-deficiency checks.

Issue #769 was raised during audit triage and framed this as an **open** decision — migrate the code to the DTCG
contract (**A**), or revise the docs to ratify the shadcn-variable system as the contract (**B**) — on the assumption
that the source of truth had not been chosen. That assumption is incorrect: **ADR-0025 already chose A** and is
Accepted. The purpose of this ADR is therefore not to re-open a settled choice but to **reconcile** the divergence:
restate that A stands, reject B explicitly so the ambiguity stops recurring, and resolve ADR-0025's open follow-up —
"the semantic token name set and its mapping to shadcn's expected variables" — so the ~30 dependent token,
interaction-state, and motion audit issues become actionable against a named contract.

## Governance Framing

- **Decision type:** Invariant (the DTCG source is the single source of truth; generation is one-directional) built on
  the ADR-0025 stable seam. This ADR does not create a new seam; it removes an ambiguity in an existing one.
- **Known future pressure:** more themes and brand variants; a high-contrast theme; design-tool round-tripping;
  contributors reaching for the familiar shadcn habit of hand-editing CSS variables.
- **What stays stable:** the DTCG source is authoritative; generation flows one way, source → generated CSS variables;
  the reference → semantic tiers; product and proxy code consume semantic tokens only; shadcn's expected variables exist
  only as **generated aliases** bound to semantic tokens, never as an independent source.
- **What is provisional:** the concrete palette values, the exact reference steps chosen for each semantic binding, and
  the generator tool. These may change without reopening the decision.
- **What is deferred:** the token-generation build step itself, the teal-palette re-derivation, automated DTCG ↔
  design-tool synchronisation, and the high-contrast theme. This ADR fixes the contract; the migration lands as its own
  reviewed work.
- **Why hard to reverse:** the semantic → reference binding and the generated variables are consumed by every themed
  component; choosing B (or re-hand-authoring variables as source) would be a UI-wide edit and would contradict an
  Accepted ADR.

## Decision

1. **Option A stands; Option B is rejected.** The DTCG token source — the families enumerated in
   [`tokens.md`](../03-design/design-system/tokens.md) — is the single source of truth for the design system. Revising
   the docs to ratify the hand-written shadcn-variable system as the contract (B) is explicitly rejected: it would
   contradict Accepted [ADR-0025](./ADR-0025-design-token-architecture.md), collapse the reference/semantic tiers, and
   forfeit design-tool portability. The implementation conforms to the docs, per the repository's precedence rule; the
   docs are not lowered to the implementation.

2. **Generation is one-directional: DTCG source → generated CSS custom properties.** The generated variables (and the
   TypeScript semantic-key facade in `foundations/tokens.ts`) are **build artifacts** of the DTCG source. They are not
   hand-edited as a source of truth. A change to a token is made in the DTCG source and regenerated.

3. **shadcn's expected variables are generated aliases, not a parallel source.** shadcn/ui primitives expect variables
   such as `--background`, `--foreground`, `--primary`, `--ring`, `--destructive`, `--radius`. Each is emitted by the
   generator as an **alias bound to a semantic token** — e.g. `--primary` ← `color.action.primary`, `--ring` ←
   `color.border.focus`, `--destructive` ← `color.action.destructive`, `--radius` ← `radius.surface`. This is the
   adapter that reconciles "shadcn expects these names" with "DTCG is the source": the names survive, but they resolve
   _through_ the semantic tier, so a theme remains a semantic → reference rebinding.

4. **The named contract that dependent issues build against** is exactly the family set in
   [`tokens.md`](../03-design/design-system/tokens.md): reference ramps `neutral/teal/blue/green/amber/red` at `50…950`;
   semantic `color.surface/foreground/border/action(+-hover/-active/-disabled)/status/provenance/chart.1…8/sidebar`;
   `space.inset/stack/inline.*`; `radius.control/surface/pill`; `elevation.0…3`;
   `motion.duration.{instant,fast,normal,slow}` / `motion.easing.*` / `motion.transition.*`; `size.target.min` (24 px) /
   `size.target.comfortable` (40 px); and the typography families and semantic text roles. The provenance/status/chart
   families must satisfy the colour-independence and greyscale obligations of
   [ADR-0024](./ADR-0024-accessibility-baseline-wcag22.md).

5. **The existing T-shirt-size TypeScript keys are retained as the semantic facade,** not a competing source. As
   [`tokens.md`](../03-design/design-system/tokens.md) already notes, `foundations/tokens.ts` keys (`space` `2xs…3xl`,
   `radiusScale` `sm…frame`) are the semantic names components consume; under this ADR they are generated from — and
   kept consistent with — the DTCG source rather than authored independently.

## Considered Options

- **(A) Reaffirm the DTCG contract; the code conforms (chosen).** Consistent with Accepted ADR-0025 and `tokens.md`;
  preserves tiering, portability, and accessibility-in-the-token-layer; the migration is bounded, reviewable work.
- **(B) Ratify the shadcn hand-written variables as the contract (rejected).** Cheaper short-term, but reverses an
  Accepted ADR, collapses the reference/semantic separation (theming reverts to find-and-replace), loses DTCG
  portability, and entrenches the opacity-modifier and incomplete-palette problems the audit flagged.
- **(C) Keep both and treat them as peers (rejected).** Two sources of truth guarantee drift; it is the status quo that
  produced this divergence.

## Consequences

- The ~30 token / interaction-state / motion audit issues listed on #769 become agent-actionable: they build against the
  named families above rather than waiting on an undecided source. Issues asserting behaviour that needs the generated
  variables (named action/focus/disabled tones, target-size, provenance ramp, eight chart colours) now have a contract
  to satisfy.
- A **token-generation build step** (DTCG source → CSS variables + TS facade; e.g. Style Dictionary or an equivalent)
  becomes a required follow-up. Until it lands, hand-written variables remain in place but are understood as a temporary
  stand-in for generator output, not the source.
- The reference palette is re-derived teal-anchored in oklch with complete `50…950` ramps, and the chart family is
  expanded to eight contrast/CVD-checked series colours. These are provisional values under this contract, not new
  decisions.
- shadcn primitives are unaffected structurally: they keep consuming the same variable names, which now resolve through
  the semantic tier.
- No change is forced into product code by this ADR itself; it fixes the contract that the migration work then follows.

## Follow-ups / Open Questions

- The token-generation tool and pipeline (source location, output targets, CI wiring). Owned by the migration work, not
  this decision.
- The precise reference step bound to each semantic token (e.g. which neutral step is `surface.raised` in dark).
  Provisional per ADR-0025.
- A high-contrast theme as a further semantic remap, and automated DTCG ↔ design-tool synchronisation — both deferred by
  ADR-0025 and unchanged here.
- Canvas layout authority (#673) is a separate design decision and is intentionally out of scope for this ADR.

## References & standards

- W3C — **Design Tokens Community Group format** _(normative: token source format)_.
- **WCAG 2.2** (W3C) — contrast (1.4.3), colour independence (1.4.1), target size (2.5.8) _(via
  [ADR-0024](./ADR-0024-accessibility-baseline-wcag22.md))_.
- Google — **Material Design 3** token architecture _(informative: reference vs semantic separation)_.

## Related documents

| Document                                                                        | What it covers                                                         |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [ADR-0025](./ADR-0025-design-token-architecture.md)                             | The token architecture this ADR reconciles the implementation back to. |
| [ADR-0010](./ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md) | Tokens as styling truth behind the proxy boundary.                     |
| [ADR-0024](./ADR-0024-accessibility-baseline-wcag22.md)                         | Colour-independence, reduced-motion, and target-size obligations.      |
| [tokens.md](../03-design/design-system/tokens.md)                               | The token families that constitute the DTCG contract.                  |
