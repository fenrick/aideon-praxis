# Project-type patterns

The reusable work-breakdown templates Kairos matches a gap against, so a plan is derived rather than drawn from a blank page. For practitioners reasoning about how a kind of change maps to a standard chain of work.

> **PLANNED.** No `aideon_kairos` crate exists; this is design intent per [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md).

## What a pattern is

A **project-type pattern** is a reusable work-breakdown template: an ordered set of work packages with default roles, durations, and dependencies, fitted to a recognisable shape of change ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md); [backward planning](../../03-design/forces-of-change/backward-planning.md)). When Kairos has computed the Gap between baseline and the Target Plateau, it **matches the pattern whose shape fits the Gap** and instantiates its work packages, which the backward scheduler then places against the valid-time axis ([backward-planning engine](./backward-planning-engine.md)). The pattern is why backward planning derives a chain instead of asking the user to author one from nothing.

In the [proposed investment extension](../../03-design/metamodel/proposed-investment-extension.md), a pattern is the **ProjectTypePattern** entity (a reusable work-breakdown template, with a `payload` of ordered work packages and default roles and durations); a work package `instantiates` a pattern.

## The initial catalogue

The initial set of patterns is ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)):

| Pattern                     | Shape of change it fits                                      |
| --------------------------- | ------------------------------------------------------------ |
| **Application replacement** | Retire an existing application and stand up its replacement. |
| **SaaS migration**          | Move an application or workload onto a SaaS platform.        |
| **Custom build**            | Build a new capability from scratch.                         |
| **Package implementation**  | Implement a packaged/COTS product.                           |
| **Decommission**            | Retire an element with no replacement.                       |
| **Capability uplift**       | Extend or strengthen an existing capability.                 |

The **pattern catalogue is provisional** ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)). Where patterns are stored and versioned, and whether their payloads are authored as data (text/JSON) or as their own small metamodel, are open questions ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md); [proposed investment extension](../../03-design/metamodel/proposed-investment-extension.md)). The package types a pattern expands into — `Procure`, `Build`, `Acquire`, `Implement`, `Migrate`, `Rollout`, `Hypercare`, `RunHandover`, `Decommission` — are the `package_type` enum of the proposed **WorkPackage** type.

## The trade-off, stated

A pattern catalogue makes planning fast and consistent — a kind of change always expands to the same defensible chain — at the cost of fitting every change to a known template. A change whose shape matches no pattern is the cost: the design intent is that the user adjusts an instantiated pattern's durations, resources, and packages ([backward planning](../../03-design/forces-of-change/backward-planning.md)) rather than the catalogue pretending to cover every case. The patterns are starting templates, not a closed taxonomy.

## Worked example

The Gap for the seed `Application` `n:application:automation-orchestrator` is "retire an existing application and stand up its replacement realising `n:capability:automation-fabric`, migrating the `Confidential` `n:data-entity:engagement-event`." Kairos matches the **application replacement** pattern (here in its migration form). The pattern's payload expands, latest-finish-first, to: procure/select → build/acquire/implement → migrate & data handover → rollout → hypercare, with decommission of the old application and run handover scheduled to complete by the target date ([backward-planning engine](./backward-planning-engine.md)). Each expanded package is a `WorkPackage` that `instantiates` the pattern and `delivers_change` to the seed application. The user can then tune durations and resources and watch the schedule re-derive.

## References & standards

_Normative:_

- The Open Group — **TOGAF Standard, 10th Edition** (Phases E/F). The Opportunities & Solutions / Migration Planning shape patterns encode.
- The Open Group — **ArchiMate 3.2 Specification** (Work Package, Deliverable, Implementation Event). The package vocabulary.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                    | What it covers                                      |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [Kairos README](./README.md)                                                                | The module index and invariants.                    |
| [Backward-planning engine](./backward-planning-engine.md)                                   | How a matched pattern is scheduled.                 |
| [proposed investment extension](../../03-design/metamodel/proposed-investment-extension.md) | The ProjectTypePattern and WorkPackage types.       |
| [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)              | The decision that introduces the pattern catalogue. |
