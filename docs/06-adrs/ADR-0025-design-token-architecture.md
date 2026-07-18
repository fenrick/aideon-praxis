# ADR-0025: Design Token Architecture — W3C DTCG, Tiered Tokens

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0010
- Relates-To: ADR-0024, ADR-0026, ADR-0041

## Context

[ADR-0010](./ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md) made tokens the source of styling truth
— colour, radius, spacing, elevation, motion as CSS variables, with light/dark as token remaps — and placed components
behind a proxy boundary. What it did not record is the _format_ tokens are authored in and the _tiering_ that separates
a raw value from its meaning. Without that, a semantic decision ("the colour of a destructive action") leaks raw hex
values across components, and theming becomes a find-and-replace instead of a remap. The token set also has to express
reduced-motion and target-size defaults that accessibility depends on
([ADR-0024](./ADR-0024-accessibility-baseline-wcag22.md)).

The W3C Design Tokens Community Group format supplies a standard, tool-portable token file format; a reference/semantic
tiering supplies the separation of value from meaning.

## Governance Framing

- **Decision type:** Stable seam (the token format and tier contract consumed by every component) + invariant (product
  code consumes semantic tokens, never reference values directly).
- **Known future pressure:** more themes; brand variants; high-contrast modes; design-tool round-tripping.
- **What stays stable:** the DTCG format; the reference → system/semantic tier separation; tokens behind the proxy
  boundary; semantic tokens as the product-facing layer.
- **What is provisional:** the specific palette, radius, and spacing values, and the set of semantic token names.
- **What is deferred:** automated design-tool sync and a high-contrast theme.
- **Why hard to reverse:** the tier contract is consumed by every themed component; changing the format or collapsing
  the tiers is a UI-wide edit.

## Decision

- **Tokens are authored in the W3C Design Tokens Community Group format** (W3C Design Tokens Community Group format).
  The DTCG `$type`/`$value` shape is the source format, so tokens are portable to design tooling and not locked to a
  single build pipeline. CSS variables are generated from the DTCG source; components consume the variables.

- **Tokens are tiered: reference, then system/semantic.** A **reference** token is a raw value with no meaning
  (`teal.500`, `space.4`, `radius.md`). A **system/semantic** token gives a reference value a role
  (`color.action.destructive`, `surface.raised`, `motion.transition.standard`). Product code and proxy components
  consume **semantic** tokens only; they never reference a raw value directly. This is the separation that makes theming
  a remap of semantic→reference bindings rather than a hunt through components (cf. Material Design 3 token
  architecture, informative).

- **Light and dark are semantic remaps.** A theme rebinds semantic tokens to different reference values; components are
  unchanged. This is the [ADR-0010](./ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md) "light/dark are
  token remaps" rule, made precise by the tier separation.

- **Motion and target-size tokens carry accessibility defaults.** Motion tokens resolve to minimal or no animation under
  a reduced-motion preference, and target-size tokens default to the WCAG 2.2 minimum
  ([ADR-0024](./ADR-0024-accessibility-baseline-wcag22.md)). Accessibility defaults live in the token layer, so a
  component inherits them by consuming the semantic token.

- **Tokens live behind the proxy boundary.** The DTCG source and the generated variables are owned by
  `src/design-system` ([ADR-0010](./ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)); product code
  reaches tokens through the proxies, never through raw component-library theming. The proxy boundary is the single
  place tokens are defined, themed, and swapped.

## Considered Options

- **A flat, single-tier token set (rejected):** simpler, but semantic decisions leak raw values across components and
  theming becomes a global find-and-replace; the tier separation localises change.
- **A framework-specific token format (rejected):** ties tokens to one tool; the DTCG format is portable and
  standards-based.
- **Hard-coded values in components (rejected):** explicitly disallowed by
  [ADR-0010](./ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md); tokens are the styling truth.

## Consequences

- A new theme is a rebinding of semantic tokens to reference values; no component changes.
- Accessibility defaults (reduced motion, target size) are inherited through the token layer, tying
  [ADR-0024](./ADR-0024-accessibility-baseline-wcag22.md) to
  [ADR-0010](./ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md).
- Tokens round-trip to design tooling through the DTCG format.
- A worked example: a destructive button consumes `color.action.destructive` (semantic), which binds to `red.600`
  (reference) in light and `red.400` in dark; its hover transition consumes `motion.transition.standard`, which resolves
  to `0ms` under reduced motion; its hit area consumes `size.target.min`, which is at least 24 px.

## Follow-ups / Open Questions

- The semantic token name set and its mapping to shadcn's expected variables — resolved by
  [ADR-0041](./ADR-0041-token-contract-reconciliation-dtcg-source-shadcn-generated.md).
- A high-contrast theme as a further semantic remap.
- Automated DTCG ↔ design-tool synchronisation.

## References & standards

- W3C — **Design Tokens Community Group format** _(normative: token format)_.
- Frost — **Atomic Design**, 2016 _(informative: token → primitive → block layering)_.
- Google — **Material Design 3** token architecture _(informative: reference vs semantic separation)_.

## Related documents

| Document                                                                        | What it covers                                             |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [ADR-0010](./ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md) | Tokens as styling truth behind the proxy boundary.         |
| [ADR-0024](./ADR-0024-accessibility-baseline-wcag22.md)                         | Reduced-motion and target-size defaults carried by tokens. |
| [ADR-0026](./ADR-0026-frontend-state-architecture.md)                           | Persistent UI state, including the active theme.           |
