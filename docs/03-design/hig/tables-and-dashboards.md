# HIG: Tables and Dashboards

How Aideon presents dense analytical views built from tables, dashboards, and mixed data surfaces. These are among the
product's most heavily used patterns, so they need more discipline than a generic component library supplies. Apply this
page when designing or reviewing tables, dense lists, pivot-like views, dashboard canvases, widget frames,
cross-filtering, or saved views.

It does not cover freeform graph modelling ([canvas-and-graph-work.md](./canvas-and-graph-work.md)) or document review —
those need different defaults.

---

## The principle

Tables and dashboards are decision surfaces: they help users compare, narrow, inspect, and act without losing track of
scope or context. The design problem is not only visual density — it is density combined with trust. These surfaces need
a strong sense of order: the user can always explain what they are looking at, what subset is in scope, what
transformations are active, and how to reach detail without destroying the context they built. They are realised by the
artefact-frame and dashboard blocks ([design-system/blocks.md](../design-system/blocks.md)).

## Tables and dense lists

Users **must** always be able to tell sort order, active filters, pinned columns, grouping state, selection scope, and
freshness. Hidden state is one of the fastest ways to damage trust in analytical software: it makes correct results look
suspicious and suspicious results look plausible. The in-scope subset is the viewpoint's **scope**
([CONTEXT.md](../../../CONTEXT.md)); the surface keeps it visible
([shell-and-navigation.md](./shell-and-navigation.md)).

Virtualisation is acceptable and often necessary, but it **must not** break keyboard navigation, selection, or assistive
semantics ([design-system/accessibility.md](../design-system/accessibility.md)). Performance work that makes the table
stop feeling coherent has saved milliseconds at the wrong layer.

## Detail and drill-down

Detail access **should** preserve orientation: moving from list to detail, or aggregate to underlying record, without
throwing away built-up context. That usually means side inspection, split views, or predictable drill-down rather than a
hard navigation jump for every deeper question
([Pirolli & Card, Information Foraging, 1999](../../02-standards/STANDARDS-REGISTER.md)). The inspector reframes around
the selection ([interaction-model.md](./interaction-model.md)).

Bulk actions describe the scope they affect. If the product is about to change fifty rows, the surface says so plainly
rather than relying on the user to infer it from residual selection — and a batch change is staged and reviewed before
commitment ([interaction-model.md](./interaction-model.md)).

## Dashboards

Dashboard editing mode is explicit and visibly distinct from viewing mode; users need to know when they are rearranging,
configuring, or inspecting, or the surface becomes fragile and invites accidental edits. Widgets have clear ownership of
title, measure, status, empty state, and error state — built from `WidgetFrame`
([design-system/blocks.md](../design-system/blocks.md)). Cross-filtering and drill-down only help when the user can tell
they happened and can reverse them. The question for a dashboard is not whether it feels alive; it is whether the user
can explain what each widget says and why.

## Saved views and repeatability

When a table or dashboard can be saved, the product preserves enough state that the saved view is meaningful on return:
filters, ordering, visible dimensions, and the time/scenario context (the viewpoint) **should not** evaporate without
explanation. Saved views stay inspectable — the user should not have to open one and guess why it shows what it shows. A
saved view is persistent UI state, not workspace truth
([ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)).

## Freshness and analytical honesty

Analytical figures may be Inferred content and may be bounded; the surface shows the content classification and any
result state on the figure ([design-system/honest-state-treatments.md](../design-system/honest-state-treatments.md)). An
analytic from [Metis](../../05-modules/metis/README.md) that was capped declares itself bounded
([DOCUMENTATION-STANDARD.md §9](../../02-standards/DOCUMENTATION-STANDARD.md)); a figure with a confidence band shows it
([DOCUMENTATION-STANDARD.md §8.2](../../02-standards/DOCUMENTATION-STANDARD.md)). Empty and partial states explain
whether the issue is absence, filtering, or failure.

## Accessibility

Tables and dashboards need explicit keyboard models, meaningful headers, correct relationships between summary and
detail, and colour-independent meaning ([design-system/accessibility.md](../design-system/accessibility.md)). A chart
without an accessible summary, or a table without understandable focus movement, is not finished.

## Worked example

A capability-coverage table is in scope for one scenario at an as-of date. The header states the viewpoint; the column
showing an Inferred integrity score carries an `inferred` provenance badge
([design-system/honest-state-treatments.md](../design-system/honest-state-treatments.md)); a host `stale` status flips
the table region to a `StaleBadge` and triggers refetch
([ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)). Selecting five rows and choosing "review" states
"this affects 5 capabilities" before the batch is staged.

## References & standards

_Informative:_

- Pirolli & Card — **Information Foraging**, 1999. Information scent for drill-down.
- Wertheimer — **Gestalt principles**. Grouping in dense surfaces.

## Related documents

| Document                                                                                | What it covers                                  |
| --------------------------------------------------------------------------------------- | ----------------------------------------------- |
| [design-system/blocks.md](../design-system/blocks.md)                                   | The table, matrix, chart, and widget blocks.    |
| [Metis](../../05-modules/metis/README.md)                                               | The bounded analytics behind dashboard figures. |
| [design-system/honest-state-treatments.md](../design-system/honest-state-treatments.md) | The freshness and classification treatments.    |
| [interaction-model.md](./interaction-model.md)                                          | Selection, drill-down, and batch review.        |
