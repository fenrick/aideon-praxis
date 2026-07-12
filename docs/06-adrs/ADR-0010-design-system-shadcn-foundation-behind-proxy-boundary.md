# ADR-0010: Design System — shadcn/Tailwind Foundation Behind a Proxy Boundary

- Status: Accepted
- Date: 2026-06-11
- Relates-To: ADR-0006

## Context

The desktop renderer needs a consistent, themeable, offline-capable UI foundation. The repo adopted shadcn/ui + Tailwind
v4 with a token preset derived from `b4HQ2Ldkxe`, reconciled against the platform design system, and placed product code
behind a design-system **proxy layer** (`src/design-system`). These choices are mandated in CLAUDE.md ("frameworks-first
defaults"; "do not build your own UI kits"; "use design-system proxies for Sidebar, Resizable, Menubar/Toolbar") and
specified in [docs/03-design/design-system/](../03-design/design-system/README.md), but the _decision_ and its
trade-offs were never recorded. This ADR records the decision (the analogue of
[ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md) for the trust boundary); the spec docs remain the
authoritative reference.

## Governance Framing

- **Decision type:** Technology choice with lock-in (component foundation) + invariant (the proxy boundary).
- **Why hard to reverse:** the component foundation is consumed UI-wide; the proxy boundary is relied on by every
  product surface, so changing either is a broad, multi-surface edit.
- **What stays stable:** product code consumes `src/design-system`, never raw component libraries; tokens are the source
  of styling truth; fonts are self-hosted.
- **What is provisional:** the specific shadcn components vendored, and the exact token values (palette/radius/spacing),
  which may be tuned.

## Decision

- **Foundation: shadcn/ui + Tailwind v4**, tokens derived from the `b4HQ2Ldkxe` preset reconciled with the platform
  design system. **No bespoke UI kit** and no second component library.
- **Tokens are the source of styling truth** — colour (teal oklch palette), radius, spacing, elevation, and motion are
  CSS variables; components consume tokens, not hard-coded values. Light/dark are token remaps.
- **Fonts are self-hosted** (`@fontsource-variable`): Geist (sans/mono) for UI, **Newsreader** for editorial/headers (a
  deliberate override of the preset's header choice). Self-hosting — never a runtime CDN — to honour the offline-first /
  no-renderer-network posture (ADR-0006).
- **Proxy boundary (invariant):** product code imports the design-system proxies in `src/design-system` (Sidebar,
  Resizable, Menubar/Toolbar, Panel, Modal, icon primitive, …) and **never** raw `shadcn`, `radix`,
  `react-resizable-panels`, or `lucide` directly. The design system is the single place primitives are wrapped, themed,
  and swapped.

## Considered Options

- **Bespoke UI kit (rejected):** maximal control, but slow, inconsistent, and explicitly disallowed by the
  frameworks-first rule; reinvents accessible primitives.
- **Direct shadcn/radix imports in product code (rejected):** less indirection, but scatters primitive choices across
  the app, prevents one-point theming/swapping, and erodes the boundary CLAUDE.md enforces.
- **Runtime-CDN fonts (rejected):** simpler, but violates the offline-first / no-renderer-network posture.

## Consequences

- Primitives can be re-themed or swapped at one seam without product-code churn.
- The proxy boundary is enforced by ESLint `no-restricted-imports`: `lucide-react`, `@radix-ui/*`,
  `design-system/components/**`, and `design-system/blocks/**` are blocked in product code; violations are CI errors.
  The correct import paths are `'design-system'`, `'design-system/icons'`, and `'design-system/reactflow/*'`.
- The component foundation is a deliberate lock-in; replacing shadcn/Tailwind would be a UI-wide migration.
- The design-system _token and primitive foundations_ are in place; the _applied component layer_ (ArtefactFrame,
  inspector stack, honest-state blocks) is tracked in #257.
- The spec lives in [docs/03-design/design-system/](../03-design/design-system/README.md); this ADR records the decision
  and boundary.
