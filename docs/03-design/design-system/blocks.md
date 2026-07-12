# Blocks

Where the design system stops being a bag of library exports and starts feeling like Aideon. This file is for anyone
building or reviewing a shared composition. Blocks are the third layer of the
[layer model](./README.md#1-the-layer-model): they compose [primitives](./primitives.md) and consume
[tokens](./tokens.md), and they remain [domain-free](./README.md#2-the-domain-free-boundary).

---

## The principle

A block is a reusable composition of primitives that realises an Aideon pattern — a shell region, an inspector stack, an
artefact frame, an honest-state treatment. It is the layer that makes obligations repeatable: the calm shell, the
visible viewpoint, the honest state, the provenance distinction are each carried by a block, so a feature surface
inherits them rather than re-inventing them.

A block carries no domain meaning. It renders what the surface supplies through slots and props. The test is in
[README.md §2](./README.md#2-the-domain-free-boundary): if a composition only makes sense in one feature, it is a
surface, not a block.

## The block families

### Shell blocks

The shell provides four named regions; every surface composes into them rather than shipping its own chrome
([the-shell.md](../the-shell.md)). The blocks: `ShellLayout`, `Sidebar`, `Toolbar`/`Menubar`, `ResizableShell`
(content + inspector), `CommandPalette`.

- The `Sidebar` block renders navigation items supplied by the host shell; it never carries domain state.
- `ResizableShell` makes the content region dominant and the inspector and sidebar secondary; minimum sizes prevent
  unusable panels; size preferences persist as persistent UI state
  ([ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)), handled by the host, not the block.
- The shell keeps the viewpoint controls (as-of valid time, asserted time, layer policy, scenario, scope) visible
  because they change meaning ([trust-and-honesty.md](../trust-and-honesty.md)). The shell renders the control; the host
  owns the viewpoint.

### Inspector blocks

The inspector reframes around the current selection so the surface and the inspector read as one conversation, not two
applications ([hig/canvas-and-graph-work.md](../hig/canvas-and-graph-work.md)). Blocks: `InspectorPanel`,
`InspectorSection`, `PropertyList`, `ExplanationSurface`, `ProvenancePanel`, `DiffMarker`. The inspector is the place
for structured edits that would be risky to perform directly on a surface.

### Artefact frames

A shared frame per artefact **form** — the controlled presentation shapes from the glossary (view, catalogue, matrix,
map, report, page) ([CONTEXT.md](../../../CONTEXT.md)): `ArtefactFrame`, `DataTable`, `Matrix`, `Map`, `Chart`,
`CanvasContainer` (see [canvas-and-graph.md](./canvas-and-graph.md)), `ReportFrame`. Each frame builds in loading,
empty, partial, and error variants ([component-completeness-checklist.md](./component-completeness-checklist.md)); the
cell or node content is slotted — the frame does not know what the data means.

### Dashboard blocks

`WidgetFrame` (header slot, status slot, loading/empty/error built in, drag handle for composition), `DashboardGrid`,
`FilterBar`. Editing mode is explicit and visibly distinct from viewing mode
([hig/tables-and-dashboards.md](../hig/tables-and-dashboards.md)).

### Honest-state blocks

The first-class treatments for every recognised state — `Skeleton`, `EmptyState`, `ErrorFrame`, `StaleBadge`,
`PartialBanner`, `RebuildingIndicator`, `ProvenanceBadge`, `WarningBanner`, `ConfidenceLabel`. These are not bolt-ons;
they carry the §9 honest-state vocabulary and content classification and are fully specified in
[honest-state-treatments.md](./honest-state-treatments.md).

## The rules every block obeys

1. **Domain-free** — content arrives through slots; the block never names a type, layer, scenario, or status string
   ([README.md §2](./README.md#2-the-domain-free-boundary)).
2. **Complete** — it ships the loading/error/empty/honest-state variants its content can be in
   ([component-completeness-checklist.md](./component-completeness-checklist.md)).
3. **Token-bound** — every value is a semantic token ([tokens.md](./tokens.md)).
4. **Accessible** — keyboard path, focus management, and announcement follow the relevant APG pattern
   ([accessibility.md](./accessibility.md)).

## Worked example

A feature module renders a capability catalogue. It supplies rows to `DataTable` (an artefact frame) and, per cell, a
`ProvenanceBadge` whose classification prop is `inferred` (an integrity score is Inferred content,
[DOCUMENTATION-STANDARD.md §8.1](../../02-standards/DOCUMENTATION-STANDARD.md)). When the host reports
`ProjectionFreshnessStatus: stale` ([ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)), the surface
wraps the table region in a `StaleBadge`. None of these blocks knows what a capability is; the surface supplies the
meaning, the blocks supply the behaviour.

## References & standards

_Informative:_

- Frost — **Atomic Design**, 2016. Blocks as organisms composed from primitives.
- Wertheimer — **Gestalt principles**. Visual grouping in the inspector and dense surfaces.

## Related documents

| Document                                                   | What it covers                                   |
| ---------------------------------------------------------- | ------------------------------------------------ |
| [README.md](./README.md)                                   | The layer model and the domain-free boundary.    |
| [primitives.md](./primitives.md)                           | The controls blocks compose.                     |
| [surfaces.md](./surfaces.md)                               | What surfaces may and may not do with blocks.    |
| [honest-state-treatments.md](./honest-state-treatments.md) | The honest-state blocks in full.                 |
| [the-shell.md](../the-shell.md)                            | The four shell regions the shell blocks realise. |
