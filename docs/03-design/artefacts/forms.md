# Forms

A **form** is the presentation shape of an artefact result — how the result is structured and rendered. The set is
controlled but extensible: **view, catalogue, matrix, map, report, page** ([`CONTEXT.md`](../../../CONTEXT.md)). A form
shapes the result contract; it does not change the underlying twin, viewpoint, facts, or
[artefact family](./families.md).

## The six forms

| Form          | Shape                                            | What it shapes the result into                                                       |
| ------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **View**      | A focused graph or diagram over a bounded slice. | Nodes and relationships at a viewpoint, laid out for direct inspection.              |
| **Catalogue** | A structured inventory.                          | Rows of entities of one or more types, with their slots, filtered by scope.          |
| **Matrix**    | A relationship or comparison grid.               | Rows × columns between two populations, cells carrying the relationship or a metric. |
| **Map**       | A spatial or topological rendering.              | A positioned layout (e.g. capability map, technology map) over structure.            |
| **Report**    | A composed analytical output.                    | Sections of narrative, tables, and signals.                                          |
| **Page**      | A packaged briefing surface.                     | A composed surface for a specific audience and decision.                             |

All six share the same [contract](./the-contract.md) and the same [explanation surfaces](./explanation-surfaces.md). The
form changes the rendering; the obligations do not change. Using one outer frame across all forms means a user reads
them as related products, not as unrelated custom screens ([the-shell.md](../the-shell.md)).

## Form is not the question

A form is a shape, not a business question — the question belongs to the [artefact family](./families.md). The same
family can take different forms: a capability map family can render as a **map** (the positioned capability hierarchy)
or a **catalogue** (the same capabilities as an inventory). Choosing a form does not change which question is being
answered.

The reserved-name rule applies: a _Form_ is not an "artefact type" (Type means the metamodel kind of an entity or
relationship), and a diagram is only one form among several.

## Worked example

The relationship between `Application` and `Capability` in the seed — `realises` — can be rendered as different forms of
the same underlying content:

- As a **matrix**: rows = `Application` (`Insight Hub`, `Journey Studio`, `Automation Orchestrator`), columns =
  `Capability` (`Customer Insight`, `Journey Orchestration`, `Automation Fabric`), cells = the `realises` relationship
  with its `criticality` slot (`High`, `High`, `Medium`).
- As a **view**: the same three applications and three capabilities as a small graph, with `realises` edges drawn
  between them.
- As a **catalogue**: the three applications listed with a derived "capabilities realised" column.

Each is a different form of results derived from the same snapshot at the same viewpoint. The matrix has rows and
columns; the view has nodes and relationships; the catalogue has rows — but none changes the facts.

## Related documents

| Document                                | What it covers                                    |
| --------------------------------------- | ------------------------------------------------- |
| [families.md](./families.md)            | The questions forms render.                       |
| [the-contract.md](./the-contract.md)    | The shared contract across forms.                 |
| [ux/README.md](../ux/README.md)         | The interaction contract for each form's surface. |
| [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | The artefact-frame primitives that render forms.  |
