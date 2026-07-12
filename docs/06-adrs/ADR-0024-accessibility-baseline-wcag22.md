# ADR-0024: Accessibility Baseline — WCAG 2.2 AA

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0010
- Relates-To: ADR-0025, ADR-0026

## Context

The renderer presents dense, interactive surfaces — graph canvases, inspectors, matrices, roadmaps — to expert users who
may rely on a keyboard, a screen reader, reduced motion, or precise pointer targets. Accessibility on surfaces like
these is not retrofittable; it is a property of how the components are built. The design system is shadcn/Tailwind
behind a proxy boundary ([ADR-0010](./ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)), which is the
right place to make accessibility a built-in property rather than a per-feature afterthought. Without a recorded
conformance target, "accessible enough" is decided per surface and drifts.

## Governance Framing

- **Decision type:** Invariant (WCAG 2.2 AA is the conformance target) + stable seam (interaction patterns are sourced
  from the ARIA APG at the proxy boundary).
- **Known future pressure:** more complex widgets (graph canvas, virtualised tables); richer motion; new surfaces.
- **What stays stable:** WCAG 2.2 AA as the target; WAI-ARIA APG patterns for complex widgets; reduced-motion honoured;
  target-size minimums.
- **What is provisional:** which AAA criteria are adopted where they are cheap; the exact target-size values above the
  floor.
- **What is deferred:** formal third-party conformance audit and a published VPAT.
- **Why hard to reverse:** the target shapes how every component is built at the proxy boundary; lowering it would
  require revisiting every surface.

## Decision

- **WCAG 2.2 Level AA is the conformance target** (WCAG 2.2). Every renderer surface meets AA; AAA criteria are adopted
  where they are inexpensive and do not conflict with the surface's purpose. AA is the floor, applied uniformly, not
  negotiated per feature.

- **Complex widgets follow WAI-ARIA Authoring Practices Guide patterns** (WAI-ARIA APG). Keyboard interaction, focus
  management, and ARIA roles/states for menus, dialogs, comboboxes, tree and grid widgets follow the APG patterns rather
  than bespoke handling. The patterns are implemented once at the design-system proxy boundary
  ([ADR-0010](./ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)), so product surfaces inherit correct
  behaviour rather than re-implementing it.

- **Reduced motion is honoured.** Animation and transition respect the user's reduced-motion preference; motion is never
  the sole carrier of meaning. This pairs with the motion tokens in the token architecture
  ([ADR-0025](./ADR-0025-design-token-architecture.md)): a reduced-motion preference resolves motion tokens to minimal
  or no animation.

- **Pointer targets meet a minimum size.** Interactive targets meet the WCAG 2.2 target-size minimum (24×24 CSS pixels
  under 2.5.8 AA), with larger defaults for primary controls. Target size is a token-backed default at the proxy
  boundary, not a per-surface choice.

- **Honest-state indicators are perceivable without colour alone.** Result-state and content-classification badges
  ([DOCUMENTATION-STANDARD.md §9](../02-standards/DOCUMENTATION-STANDARD.md)) carry text or shape in addition to colour,
  so a `Generated` or `Stale` state is distinguishable without colour perception. The honesty obligations and the
  accessibility obligations reinforce each other here.

## Considered Options

- **WCAG 2.1 AA (rejected):** the prior version, but 2.2 adds criteria (focus appearance, target size, dragging
  alternatives) directly relevant to dense interactive surfaces; targeting the current version is the lower-debt choice.
- **AAA everywhere (rejected):** some AAA criteria conflict with information-dense expert surfaces (e.g. contrast
  maximums, no-images-of-text in diagrams); AA uniformly with selective AAA is the workable target.
- **Per-feature accessibility (rejected):** drifts and leaves gaps; building patterns once at the proxy boundary is
  consistent and reviewable.

## Consequences

- The proxy boundary is where APG patterns live, so a new product surface inherits keyboard and ARIA correctness from
  the proxies it composes.
- Reduced motion and target size are token-backed defaults, tying accessibility to the token architecture
  ([ADR-0025](./ADR-0025-design-token-architecture.md)).
- Honest-state badges are perceivable without colour, aligning the §9 vocabulary with WCAG 1.4.1.
- A formal audit/VPAT is deferred; the engineering target is in force now.
- A worked example: the inspector's type-filter combobox uses the APG combobox pattern (arrow-key navigation,
  `aria-activedescendant`, escape to close); its `Stale` badge shows an icon and label, not colour alone; its clear
  button is at least 24×24 px.

## Follow-ups / Open Questions

- Which AAA criteria are cheap enough to adopt, recorded in the design-system spec.
- Accessibility of the graph canvas (keyboard navigation of nodes/edges) as a specific APG-grid-style design.
- Timing of a formal conformance audit and VPAT.

## References & standards

- **WCAG 2.2** (W3C) _(normative: conformance target, Level AA)_.
- **WAI-ARIA Authoring Practices Guide** _(normative: interaction patterns)_.

## Related documents

| Document                                                                        | What it covers                                               |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [ADR-0010](./ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md) | The proxy boundary where APG patterns are implemented once.  |
| [ADR-0025](./ADR-0025-design-token-architecture.md)                             | Motion and target-size tokens accessibility relies on.       |
| [DOCUMENTATION-STANDARD.md §9](../02-standards/DOCUMENTATION-STANDARD.md)       | Honest-state badges that must be perceivable without colour. |
