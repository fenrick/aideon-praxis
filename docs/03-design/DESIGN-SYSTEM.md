# Aideon Design System

The shared UI layer that makes Aideon's calm, dense, explainable, workspace-first posture the cheapest path to build.

---

## What This Document Covers

This document defines what the design system must make easy and what it must make hard: the shell primitives, data-display primitives, token system, interaction-state requirements, honest-state treatments, density posture, and the domain-free boundary.

It is the rulebook for the reusable UI layer that keeps Aideon behaving like one serious work platform rather than a row of adjacent experiments.

**Related docs:**

- [DESIGN.md](./DESIGN.md) — product posture and shell layout
- [UX-DESIGN.md](./UX-DESIGN.md) — UX contract and workspace interaction model
- [SIGNAL-SURFACES.md](./SIGNAL-SURFACES.md) — status and signal surfaces contract
- [ARCHITECTURE-BOUNDARY.md](../01-architecture/ARCHITECTURE-BOUNDARY.md) — domain-free boundary rule
- [CODING-STANDARDS.md](../02-standards/CODING-STANDARDS.md) — implementation conventions

---

## Design Lineage

The design system is where product promise stops being prose and becomes reusable structure.

1. **Product posture** — desktop-first, local-first, time-first digital-twin modelling tool
2. **HIG obligations** — calm density, explicit context, honest state, workspace dominance
3. **Design and UX docs** — shell slots, inspector choreography, artefact rendering
4. **Design system** — tokens, primitives, blocks, and patterns that make those obligations repeatable
5. **Product surfaces** — feature UI composed from stable shared parts

If the product promise cannot be built cheaply and consistently from this layer, the design system is not doing its job.

---

## What The Design System Must Make Easy

- Open a workspace that feels calm, dense, and ready for work
- Keep context visible when time, scenario, freshness, or status changes meaning
- Move from artefact to explanation to action without leaving the shared shell
- Show long-running work as one coherent status language across the product
- Render honest loading, empty, warning, partial, stale, rebuilding, generated, and error states
- Keep the chrome quiet enough that the work surface stays dominant
- Compose resizable, dense, multi-panel workspaces without hand-rolling layout logic
- Distinguish generated, asserted, and inferred content at a glance

These are not optional extras. They are part of the product posture.

---

## What The Design System Must Prevent

- Raw third-party primitives (Radix, shadcn, XYFlow) leaking straight into product surfaces
- Module-specific shell chrome and panel choreography invented in feature code
- Hidden context on surfaces where time, scenario, or freshness changes meaning
- Custom status colours, local loader vocabularies, and one-off success theatre
- Sparse, decorative layouts that waste space and slow serious work
- Blank-canvas defaults where the product should start from a viewpoint, template, or task
- Domain semantics encoded in shared components — the design system is domain-free

A design system that only enables and never forbids ends up being a polite suggestion.

---

## Domain-Free Boundary

The design system carries **no domain semantics**.

It does not know about any specific domain model, entity type, or workflow. It provides structural, visual, and interaction vocabulary. Feature code decides what the work means. The design system decides how shared UI structures behave.

This boundary is enforced at the architecture level. See [ARCHITECTURE-BOUNDARY.md](../01-architecture/ARCHITECTURE-BOUNDARY.md).

If a component only makes sense inside one domain feature and has no reusable pattern behind it, it belongs in that feature module, not here.

If two feature modules need the same pattern, it belongs in the design system.

---

## Layer Model

The design system is layered. Each layer depends only on layers below it.

### Layer 1 — Tokens and Foundations

The lowest and most stable level:

- CSS custom property variables for colour, spacing, radius, typography, and motion
- Density and theme rules
- Focus ring and high-contrast rules
- The `cn()` utility and other stateless helpers

Product code must not hard-code visual values when a token already exists.

### Layer 2 — Primitives

Accessible low-level controls, wrapped and controlled by the design system:

- Buttons, inputs, labels, toggles, checkboxes, radio groups, switches, selects, comboboxes
- Cards, tables, tabs, tooltips, drawers, dialogs, sheets, popovers, badges
- Sidebars, menubars, resizable panels, scroll areas, command surfaces
- Skeletons, progress indicators, empty-state frames, charts

Implementation substrate: **shadcn/ui** (Radix-based, Tailwind-styled) as the generated base. Primitives are wrapped and re-exported; product surfaces never import shadcn or Radix directly.

Canvas and node-graph primitives: **XYFlow** wrapped inside design-system canvas containers.

### Layer 3 — Aideon Blocks and Patterns

Where the design system feels like Aideon rather than a bag of library exports:

- Shell layout blocks (see [Shell Primitives](#shell-primitives) below)
- Artefact frames for graph, table, matrix, map, chart, page, and report outputs
- Inspector and detail patterns for explanation, provenance, difference, and action
- Dashboard and canvas composition patterns
- Honest-state treatments for every recognised operational state
- Status and provenance badges, difference markers, and explanation affordances

### Layer 4 — Product Surfaces

Feature UI and host-shell composition sit here. They decide what the work means. They do not reinvent how shared structures behave.

---

## Token System

Tokens are the contract between design intent and implementation. They must not be bypassed.

### Colour Tokens

Tokens use semantic names, not palette names. The design system defines:

| Token category         | Purpose                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `--color-background-*` | Surface hierarchy (base, elevated, overlay)                        |
| `--color-foreground-*` | Text and icon on each surface                                      |
| `--color-border-*`     | Dividers, outlines, focus rings                                    |
| `--color-accent-*`     | Primary interactive and branded emphasis                           |
| `--color-status-*`     | Operational state colours (info, success, warning, error, neutral) |
| `--color-provenance-*` | Asserted, generated, inferred distinction colours                  |
| `--color-chart-*`      | Stable chart series colours with sufficient contrast               |
| `--color-sidebar-*`    | Sidebar-specific surface tokens                                    |

No specific palette is mandated here. Token assignments are resolved in `globals.css` for each active theme.

### Typography Tokens

| Token                | Purpose                                |
| -------------------- | -------------------------------------- |
| `--text-*` (scale)   | Fluid type scale from label to display |
| `--font-family-*`    | Product typefaces (UI and mono)        |
| `--font-weight-*`    | Weight ramp                            |
| `--line-height-*`    | Reading and dense display variants     |
| `--letter-spacing-*` | Caption and label tracking             |

### Spacing and Radius Tokens

Spacing follows a consistent scale. Dense surfaces use the smaller end of the scale; breathing room is earned, not defaulted.

| Token        | Purpose                                         |
| ------------ | ----------------------------------------------- |
| `--space-*`  | Spacing scale used for padding, gap, and margin |
| `--radius-*` | Corner radius ramp (none → sm → md → lg → full) |

### Motion Tokens

| Token          | Purpose                                                        |
| -------------- | -------------------------------------------------------------- |
| `--duration-*` | Transition duration ramp (instant → fast → normal → slow)      |
| `--ease-*`     | Easing functions (out-expo for entrances, linear for progress) |

Animate compositor-friendly properties only: `transform`, `opacity`, `clip-path`. Do not animate layout-bound properties. Respect `prefers-reduced-motion` — all transitions degrade gracefully to instant.

---

## Shell Primitives

The shell provides four named slots. Every product surface composes into these slots rather than shipping its own chrome.

| Slot            | Component                                | Role                                                          |
| --------------- | ---------------------------------------- | ------------------------------------------------------------- |
| Navigation      | `Sidebar`                                | Primary and secondary navigation, workspace switching         |
| Toolbar         | `Toolbar` / `Menubar`                    | Contextual actions, time and scenario controls, view options  |
| Content surface | `ResizablePanelGroup` + `ResizablePanel` | The dominant working area — canvas, table, dashboard, report  |
| Inspector       | `ResizablePanel` (trailing)              | Context-sensitive detail, explanation, properties, provenance |

### Sidebar

The `Sidebar` primitive wraps `react-resizable-panels` and the shadcn sidebar composition. It:

- Provides collapsible navigation with consistent icon-and-label treatment
- Supports keyboard navigation and focus management
- Exposes `sidebar-background`, `sidebar-foreground`, and `sidebar-border` token slots
- Never carries domain state — it renders navigation items supplied by the host shell

### Resizable Panels

`ResizablePanelGroup`, `ResizablePanel`, and `ResizableHandle` are the primary layout mechanism for workspaces. They:

- Support horizontal and vertical splits
- Respect minimum size constraints to prevent unusable panels
- Persist size preferences across sessions (handled by the host, not the primitive)
- Allow the content surface to be dominant; inspector and sidebar panels are secondary

### Toolbar and Menubar

- `Toolbar` — icon-and-label button row for contextual commands near the active surface
- `Menubar` — application-level menu bar for top-level commands and modal-free actions
- Both respect the token system for spacing, focus, and active state treatment
- Local toolbars live near the surface they control; they do not float in isolation

### Command Palette

`Command` (shadcn CMDk-based) provides a keyboard-first command surface:

- Triggered globally or locally depending on scope
- Supports fuzzy search, grouped results, and keyboard navigation
- Domain teams register commands; the design system owns the surface

---

## Data-Display Primitives

These cover the common output shapes across Aideon workspaces.

### Table

`Table` and `DataTable` compositions:

- Dense row/column display with sticky headers
- Sortable columns, row selection, inline actions
- Loading skeleton, empty state, and partial-result variants built in
- Cell content slotted — the table does not know what data means

### Canvas (XYFlow)

The canvas surface wraps XYFlow inside design-system containers:

- `CanvasContainer` — provides the outer bounds, background, and scroll region
- `CanvasToolbar` — floating control bar for zoom, fit, and mode controls
- Node and edge styles follow design-system tokens; custom node types supply their own content via slot props
- Selection, hover, and focus states use design-system interaction tokens

### Chart

`Chart` (recharts-based, shadcn chart composition):

- Stable series colours from `--color-chart-*` tokens
- Consistent legend, tooltip, and axis treatment
- Loading, empty, and partial-result states handled at the chart level
- Chart type (line, bar, area, scatter) supplied by consumer; visual language is shared

### Matrix

`Matrix` — a specialised grid for dense comparative data:

- Row and column headers with sticky behaviour
- Cell value rendering slotted to consumer
- Shared hover, selection, and highlight token treatment

### Map

`Map` — a spatial rendering surface:

- Consistent overlay and control panel positioning
- Token-based colour treatment for spatial layers
- Loading and empty state frames provided

### Card and Widget Frame

`Card` and `WidgetFrame`:

- `Card` — standard surface for contained information units
- `WidgetFrame` — dashboard-specific wrapper with header slot, loading state, and drag handle for composition layouts
- Both respect density and surface hierarchy tokens

---

## Interaction-State Requirements

Every interactive component must implement all four interaction states. There are no exceptions.

| State            | Requirement                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Hover            | Visible change in background, border, or text colour. Must feel deliberate, not accidental.                                      |
| Focus            | High-contrast focus ring using `--color-border-focus` token. Keyboard-navigable without pointer. Must meet WCAG 2.1 AA contrast. |
| Active / Pressed | Distinct from hover. Typically a slight inward transform or deeper tone.                                                         |
| Disabled         | Reduced opacity using `--color-foreground-disabled`. Non-interactive. Does not respond to hover or active.                       |

Selected, checked, and expanded states follow the same discipline — they use tokens, not hard-coded values.

---

## Honest-State Treatments

Aideon surfaces live data with latency, partial results, and model outputs. The design system provides a shared vocabulary for every operational state a surface can be in.

These treatments are not bolt-ons. They are first-class components.

| State          | Treatment                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Loading**    | Skeleton shimmer over the content region. Proportional to expected content shape. No spinner-only defaults.             |
| **Partial**    | Content renders with a partial-result banner or inline indicator. Not silently truncated.                               |
| **Stale**      | Content renders with a stale-data badge near the affected region. Timestamp shown on hover.                             |
| **Rebuilding** | Content renders with a rebuilding indicator. Previous values remain visible. Progress token shown if duration is known. |
| **Error**      | Content region replaced with an error frame. Error message, retry action, and optional detail. Never a blank surface.   |
| **Empty**      | Content region shows a purposeful empty state — contextual message, suggested action, no generic placeholder.           |
| **Generated**  | Content cell or region carries a `generated` provenance mark using `--color-provenance-generated`.                      |
| **Asserted**   | Content cell or region carries an `asserted` provenance mark using `--color-provenance-asserted`.                       |
| **Inferred**   | Content cell or region carries an `inferred` provenance mark using `--color-provenance-inferred`.                       |
| **Warning**    | Inline warning badge or banner without blocking the surface. Action optional.                                           |

### Provenance Distinction

The generated / asserted / inferred triad is a first-class design concern for Aideon. Model-derived values, user-entered values, and computationally derived values are visually distinguishable at the cell and region level. This is not a tooltip afterthought — it is a token-level and component-level design commitment.

---

## Density and Calm Posture

Aideon is a serious work tool used in long sessions. The design system enforces a calm, dense default.

### Dense By Default

- Use the small end of the spacing scale for interactive controls, table rows, and list items
- Breathing room is intentional, not a default. Open space must earn its place.
- Typography is readable at smaller sizes — the scale supports compact UI labels alongside body text

### Chrome Must Stay Quiet

- Navigation and toolbar chrome use subdued surface tokens, not accent colours
- Status indicators use small, inline affordances — not full-width banners by default
- Decorative elements (gradients, illustrations, animations) are absent unless they carry information
- The content surface is always the visual focus

### Hierarchy Through Scale Contrast

- Establish visual hierarchy through type scale and weight contrast, not through colour quantity
- Limit accent colour use to interactive affordances and genuine status signals
- Use layered surface tokens to create depth without heavy shadows

### Long-Session Stability

- Avoid layout shifts during data updates — use skeleton frames that match content shape
- Animate entrances and exits with restraint; motion must clarify flow, not compete with work
- Avoid unsolicited full-page transitions; panel and content transitions are local

---

## Implementation Substrate

The design system uses these libraries as its building material. Product surfaces never import them directly.

| Library                    | Role                                                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **shadcn/ui**              | Generated primitive base (Radix + Tailwind). Lives under `components/ui/`. Not edited directly — customised through wrapping. |
| **Tailwind CSS**           | Utility layer and token consumer. Config maps design tokens to utilities.                                                     |
| **XYFlow**                 | Node-graph and canvas rendering. Wrapped in design-system canvas containers.                                                  |
| **Phosphor Icons**         | Icon set. Used through the `Icon` primitive, not imported ad-hoc.                                                             |
| **React Hook Form**        | Form state management. Integrated at the block layer with shared field and validation components.                             |
| **react-resizable-panels** | Shell and workspace panel layout.                                                                                             |
| **recharts**               | Chart rendering substrate. Wrapped in design-system chart components.                                                         |

---

## File Structure

```
src/design-system/
├── styles/
│   ├── globals.css          # CSS custom properties — the token contract
│   └── tokens.ts            # JS/TS token helpers for layout decisions
├── components/
│   ├── ui/                  # Generated shadcn primitives — do not edit directly
│   └── canvas/              # XYFlow wrappers and canvas containers
├── blocks/
│   ├── shell/               # Sidebar, Toolbar, Menubar, ResizableShell
│   ├── inspector/           # Inspector panel compositions
│   ├── dashboard/           # WidgetFrame, card grids, filter bars
│   ├── artefact/            # CanvasContainer, DataTable, Matrix, Map, Chart
│   └── states/              # Skeleton, Empty, Error, Stale, Partial, Provenance
├── hooks/                   # Shared UI hooks (useReducedMotion, usePanelSize, …)
└── index.ts                 # Consolidated export surface
```

Generated primitives in `components/ui/` are not edited directly. All customisation happens through wrapping in `blocks/` or through Tailwind variant configuration.

### Refresh Generated Primitives

```
pnpm --filter @aideon/desktop run components:refresh
```

---

## Usage Rules

1. Import shared UI from `@aideon/design-system/*` (or the local design-system path in the desktop renderer). Do not import Radix, shadcn, or XYFlow directly from product surfaces.
2. Include `styles/globals.css` to pick up the token contract.
3. Use exported tokens and shared state treatments instead of hard-coded visual values.
4. Promote repeated cross-feature patterns into the design system rather than copying them into feature code.
5. Keep host-shell-only composition in the app shell; keep reusable structural parts in the design system.
6. The design system is domain-free. If a component encodes domain meaning, it belongs in feature code.

---

## Placement Rules

| Location                           | What lives there                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| `design-system/blocks/`            | Shell, inspector, dashboard, artefact, and state patterns — no domain semantics |
| `design-system/components/ui/`     | Generated shadcn primitives                                                     |
| `design-system/components/canvas/` | XYFlow wrappers                                                                 |
| `design-system/hooks/`             | UI hooks with no domain dependency                                              |
| Feature modules                    | Domain-specific presenters and work surfaces that consume the design system     |
| App shell                          | Host-specific wiring of shared blocks into application layout                   |

---

## References

- [DESIGN.md](./DESIGN.md) — product posture and shell contract
- [UX-DESIGN.md](./UX-DESIGN.md) — UX contract and workspace interaction model
- [SIGNAL-SURFACES.md](./SIGNAL-SURFACES.md) — status and signal surfaces
- [ARCHITECTURE-BOUNDARY.md](../01-architecture/ARCHITECTURE-BOUNDARY.md) — domain-free boundary rule
- [CODING-STANDARDS.md](../02-standards/CODING-STANDARDS.md) — implementation conventions
