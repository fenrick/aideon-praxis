# Proposed metamodel extension — investment and planning

> **Status: PROPOSED.** This is a design-level metamodel extension package, not wired into the implemented seed [`core-v1.json`](../../data/meta/core-v1.json). It defines the entity and relationship types the [Kairos](../../05-modules/kairos/README.md) module needs to model [investment](../forces-of-change/investment.md) and portfolio/programme/project planning. Type, attribute, and relationship **UUIDs are deferred to the metamodel compiler** (UUIDv5 minted from the project namespace, per [packages and registry](./packages-and-registry.md)); none are invented here.

This package realises the planning vocabulary called for by [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md), aligned to ArchiMate 3.2's **Implementation & Migration** and **Strategy** layers and to TOGAF 10 Phases E/F. It extends — never edits — the seed types in [entity-types.md](./entity-types.md).

## Why these types

Backward planning ([backward-planning.md](../forces-of-change/backward-planning.md)) needs to express: a stable architecture state at a date (Plateau), the difference to be closed (Gap), the funded work that closes it (Work Package), what that work produces (Deliverable) and consumes (Resource), and the financial and governance envelope over it all (Investment, Programme, Portfolio). ArchiMate already names most of these; Aideon adds the economic types (Investment, Resource rate, Project-Type Pattern) that ArchiMate leaves to tooling.

## Proposed entity types

| Type                    | Category | ArchiMate 3.2 alignment                                            | Key attributes (proposed)                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | -------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Plateau**             | Planning | Plateau (Implementation & Migration)                               | `name`; `as_at` (datetime — the valid time the state holds); `kind` (enum: `Baseline`, `Transition`, `Target`)                                                                                                                                                                                                                                                               |
| **Gap**                 | Planning | Gap (Implementation & Migration)                                   | `name`; `description`; `from_plateau_ref`; `to_plateau_ref`                                                                                                                                                                                                                                                                                                                  |
| **WorkPackage**         | Planning | Work Package (Implementation & Migration)                          | `name`; `package_type` (enum: `Procure`, `Build`, `Acquire`, `Implement`, `Migrate`, `Rollout`, `Hypercare`, `RunHandover`, `Decommission`); `duration_days` (number); `earliest_start`/`latest_finish` (datetime, derived); `status` (enum: `Planned`, `Committed`, `InProgress`, `Done`)                                                                                   |
| **Deliverable**         | Planning | Deliverable (Implementation & Migration)                           | `name`; `acceptance` (text)                                                                                                                                                                                                                                                                                                                                                  |
| **ImplementationEvent** | Planning | Implementation Event (Implementation & Migration)                  | `name`; `occurs_at` (datetime) — e.g. a go-live or cutover                                                                                                                                                                                                                                                                                                                   |
| **Resource**            | Planning | Resource (Strategy)                                                | `name`; `role`; `day_rate` (number); `currency` (enum); `availability` (number, FTE)                                                                                                                                                                                                                                                                                         |
| **Investment**          | Planning | _(Aideon economic overlay)_ — a funded envelope over Work Packages | `name`; `tier` (enum: `Operational`, `Tactical`, `Strategic` — set by [magnitude](../forces-of-change/change-magnitude-and-investment-sizing.md)); `indicative_cost` (number, Inferred); `cost_confidence` (enum: the [confidence](../../02-standards/DOCUMENTATION-STANDARD.md#82-confidence) scale); `funding_state` (enum: `Candidate`, `Proposed`, `Approved`, `Funded`) |
| **ProjectTypePattern**  | Design   | _(Aideon)_ — a reusable work-breakdown template                    | `name`; `payload` (text — the ordered work packages with default roles and durations)                                                                                                                                                                                                                                                                                        |
| **Programme**           | Planning | Grouping (Aggregation of Work Packages / Investments)              | `name`; `objective` (text)                                                                                                                                                                                                                                                                                                                                                   |
| **Portfolio**           | Planning | Grouping (Aggregation of Programmes / Investments)                 | `name`; `horizon` (enum: `Near`, `Mid`, `Long`)                                                                                                                                                                                                                                                                                                                              |

`Course of Action` (ArchiMate Strategy) is supplied by the [proposed spine extension](./proposed-spine-extension.md) and reused here rather than duplicated.

## Proposed relationship types

| Relationship      | From → To                                                                      | ArchiMate alignment | Notes                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `closes_gap`      | WorkPackage → Gap                                                              | Realization         | The work that closes a gap between plateaus.                                                                                                                    |
| `produces`        | WorkPackage → Deliverable                                                      | Realization         | A work package realises its deliverables.                                                                                                                       |
| `consumes`        | WorkPackage → Resource                                                         | Assignment          | A work package consumes resources at their rate over its duration; the edge carries `allocation` (FTE) and `duration_days`.                                     |
| `precedes`        | WorkPackage → WorkPackage                                                      | Triggering          | Schedule dependency; drives latest-finish scheduling.                                                                                                           |
| `delivers_change` | WorkPackage → Application / TechnologyComponent / Capability / BusinessProcess | Association         | The seed element the work package changes; the bridge from plan to twin.                                                                                        |
| `targets_plateau` | Gap → Plateau                                                                  | Association         | The Target Plateau a gap moves toward.                                                                                                                          |
| `funds`           | Investment → WorkPackage                                                       | Aggregation         | The funded envelope over the work.                                                                                                                              |
| `answers`         | Investment → PlanEvent                                                         | Association         | The change (Plan Event) the investment delivers — the mandatory attachment from [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md). |
| `groups`          | Programme → Investment, Portfolio → Programme                                  | Aggregation         | Portfolio/programme roll-up.                                                                                                                                    |
| `instantiates`    | WorkPackage → ProjectTypePattern                                               | Specialization      | A work package instantiated from a pattern template.                                                                                                            |

All planning relationships are first-class temporal facts with valid-time intervals, exactly like the seed [relationship types](./relationship-types.md): a work package's schedule is a `plan`-layer fact in a scenario, and re-planning closes one interval and opens another rather than mutating in place.

## How it integrates with the seed

- A detected change on a seed `Application` (e.g. `disposition = Migrate`) and its `PlanEvent` are the **anchor**: an `Investment` `answers` that `PlanEvent`, and its `WorkPackage`s `delivers_change` to that `Application`.
- The **Gap** is computed against the seed effective graph by [Metis](../../05-modules/metis/README.md); the **magnitude** that tiers the `Investment` is read from seed `criticality`/`sensitivity`/`tier` and the `realises`/`accesses`/`hosts` dependency breadth.
- Promotion of the planning scenario writes the committed plan to the `plan` layer; execution and actuals are owned by [Continuum](../../05-modules/continuum/README.md).

## Open questions (for the package, not this document)

- Whether `Investment` is best modelled as an entity or as a slot-bearing relationship over the Work Packages it funds.
- The first-version cost model: `day_rate × allocation × duration_days` plus a non-labour line, single currency, no capitalisation.
- Whether `ProjectTypePattern` payloads are authored as data (text/JSON) or as their own small metamodel.

## References & standards

- ArchiMate 3.2 — Implementation & Migration layer (Plateau, Gap, Work Package, Deliverable, Implementation Event) and Strategy layer (Resource, Course of Action). _(normative)_
- TOGAF Standard, 10th Edition — Phases E and F. _(normative for the planning method)_
- Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                       | What it covers                                                                      |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [Forces of Change](../forces-of-change/README.md)                              | The entropy/action thesis these types serve.                                        |
| [proposed-spine-extension.md](./proposed-spine-extension.md)                   | The Motivation/Strategy types (Driver, Goal, Course of Action) this package reuses. |
| [05-modules/kairos](../../05-modules/kairos/README.md)                         | The engine that authors and reads these types.                                      |
| [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md) | The decision that introduces this package.                                          |
