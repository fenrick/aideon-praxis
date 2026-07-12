# Surfaces

The top layer of the design system: product feature UI and host-shell composition, where the work means something. This
file is for anyone building a feature surface. Surfaces are the fourth layer of the
[layer model](./README.md#1-the-layer-model): they compose [blocks](./blocks.md) and decide what the work means; they do
not reinvent how shared structures behave.

---

## The principle

A surface is where domain meaning lives. It knows about entity types, layers, scenarios, artefact families, and the
viewpoint; it composes blocks to present them. The division of labour is strict: **the design system decides how shared
UI structures behave; feature code decides what the work means**
([README.md §2](./README.md#2-the-domain-free-boundary)).

Surfaces are not part of `src/design-system`. They live in feature modules and the app shell
([frontend/DESIGN.md](../../frontend/DESIGN.md)), mirroring the modules they face. The design system is a dependency of
a surface, never the other way round.

## What a surface may do

- Compose shell, inspector, artefact-frame, dashboard, and honest-state blocks into a working screen.
- Supply domain content to blocks through slots and props — rows, nodes, labels, the active classification of a value.
- Map host signals to honest-state blocks — drive a `StaleBadge` from `ProjectionFreshnessStatus`, a `ConfidenceLabel`
  from a result's confidence band ([DOCUMENTATION-STANDARD.md §8.2](../../02-standards/DOCUMENTATION-STANDARD.md)).
- Register commands with the `CommandPalette`; the design system owns the surface, the domain team registers the entries
  ([the-shell.md](../the-shell.md)).
- Hold its own server-state cache, keyed by the full `Viewpoint`, and its own UI-state
  ([ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)).

## What a surface must not do

- **Import raw libraries.** A surface imports design-system proxies, never `shadcn`, `radix`, `react-resizable-panels`,
  or the icon library directly — a lint-enforced boundary
  ([ADR-0010](../../06-adrs/ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)).
- **Invent chrome.** A surface composes into the four shell regions; it does not ship its own sidebar, toolbar, or
  window frame ([the-shell.md](../the-shell.md)).
- **Hard-code visual values.** Every colour, size, radius, and duration is a semantic token ([tokens.md](./tokens.md)).
- **Re-implement honest state.** A surface uses the honest-state blocks rather than rolling its own loader or status
  colour ([honest-state-treatments.md](./honest-state-treatments.md)).
- **Hide the viewpoint.** Where time, layer, scenario, or freshness changes meaning, the surface keeps the viewpoint
  context visible ([trust-and-honesty.md](../trust-and-honesty.md)).

## The promotion rule

If two surfaces need the same pattern, it **should** be promoted into a block — stripped of domain meaning, the domain
part exposed through slots ([README.md §2](./README.md#2-the-domain-free-boundary)). Copying a pattern between features
is a signal that a block is missing. Promotion is the mechanism that keeps the system from fragmenting into parallel
experiments.

## Worked example

The Praxis metamodel surface renders an entity-type editor. It composes `ResizableShell` (content + inspector), puts the
type list in a `DataTable`, and reframes an `InspectorPanel` around the selected type. When the user edits a slot
definition, the edit happens in the inspector — a structured edit kept off the table per
[hig/interaction-model.md](../hig/interaction-model.md). The surface knows what a slot is; every block it uses does not.
When the team later needs the same inspector pattern in the artefacts surface, the inspector blocks already exist — no
promotion needed, because the shared behaviour was always a block.

## Related documents

| Document                                                          | What it covers                                             |
| ----------------------------------------------------------------- | ---------------------------------------------------------- |
| [blocks.md](./blocks.md)                                          | The compositions surfaces consume.                         |
| [README.md](./README.md)                                          | The layer model and domain-free boundary.                  |
| [frontend/DESIGN.md](../../frontend/DESIGN.md)                    | The renderer architecture and per-module feature packages. |
| [ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md) | The state separation a surface holds.                      |
| [the-shell.md](../the-shell.md)                                   | The shell regions a surface composes into.                 |
