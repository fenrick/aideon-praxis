# Investment — the force that does

Investment is the economic form of [action](./action.md): action that is planned, resourced, and funded — broken into
work with roles, rates, and durations and scheduled toward a target date. Action moves the twin; investment is what it
costs to do so deliberately and at scale. In Aideon investment is never free-floating: **an investment is attached to a
change in the twin**, and the change is what gives the investment its size, its shape, and its strategic weight.

This is the central claim of the [Kairos](../../05-modules/kairos/README.md) module. A budget line with no modelled
change behind it is an unfounded number; a modelled change with no investment behind it is a wish. Aideon binds them.

## Investment is attached to change

Every investment in Aideon points at a change: an `Application` being retired, a `Capability` being built up to
_Target_, a `TechnologyComponent` being replaced, a `DataEntity`'s controls being uplifted. The change is authored as
one or more [Plan Events](../../../CONTEXT.md) on the `plan` layer within a [scenario](../../../CONTEXT.md); the
investment is the funded plan of work that makes that change real by its target date.

Because the change lives in the twin, the investment inherits the twin's properties:

- It is **time-first**: it has a target date and a worked-back schedule on the valid-time axis (see
  [backward planning](./backward-planning.md)).
- It is **scenario-scoped**: alternative investments are alternative scenarios, compared as
  [diffs](../../../CONTEXT.md), and committed by scenario promotion.
- It is **traceable**: the investment's justification is the entropy or opportunity signal it answers, and the spine
  lineage it protects (Intent → Value → Capability → … → **Change**).

## Two kinds of opportunity

When Kairos detects a change, it classifies the investment opportunity:

| Opportunity  | Trigger                                                                                                    | Typical investment shape                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **New**      | A capability gap, a green-field demand, an application being replaced by something that does not yet exist | Build / acquire / implement the new, plus rollout, hypercare, and run handover |
| **Existing** | An in-place asset under entropy pressure — extend its life, uplift it, or wind it down                     | Maintain / uplift, or decommission, of an existing element                     |

A single change usually generates **both**: retiring an application (existing, decommission) almost always implies
acquiring or building its replacement (new, larger). Kairos models the related investments together as a
[programme](../metamodel/proposed-investment-extension.md), not as isolated projects, because their schedules are
coupled — the new must reach _Run_ before the old reaches _Retire_.

## Strategic weight follows change magnitude

The larger the change, the more strategic the investment, and the larger it is. A configuration tweak is operational;
replacing a core platform that a dozen capabilities depend on is strategic. Aideon makes this explicit rather than
leaving it to intuition: the **magnitude of the change** — its blast radius along the spine, the criticality and
sensitivity of what it touches, the breadth of dependencies — is computed and used to size the investment and set its
governance tier. This is the subject of
[change magnitude and investment sizing](./change-magnitude-and-investment-sizing.md).

## What investment is composed of

An investment decomposes into funded work, with resources, rates, and durations:

- **Work packages** (ArchiMate) — phases of work such as procurement, build/acquire, migration, rollout, hypercare,
  decommission. Each realises **deliverables** and consumes **resources** at a **rate** over a **duration**.
- **Project-type patterns** — reusable work-breakdown templates (e.g. _package implementation_, _SaaS migration_,
  _custom build_, _decommission_) that give a credible default shape instead of a blank plan.
- **Resources and rates** — roles with day-rates and availability; the cost of an investment is the sum of its work
  packages' resource consumption plus non-labour cost.

These are modelled types, defined in the [proposed investment extension](../metamodel/proposed-investment-extension.md)
and aligned to ArchiMate's Implementation & Migration and Strategy layers.

## The trade-off

Binding investment to modelled change makes the spend defensible and the plan honest — but it means Aideon will not let
a user record a budget without a change to justify it, which is more discipline than a spreadsheet demands. That
discipline is the point: it is what lets an executive briefing answer "why are we spending this?" by drilling from the
number to the change to the entropy signal that forced it.

## References & standards

- TOGAF Standard, 10th Edition — Phase E (Opportunities & Solutions) and Phase F (Migration Planning). _(normative)_
- ArchiMate 3.2 — Implementation & Migration layer; Strategy layer (Resource, Course of Action). _(normative)_
- Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                 | What it covers                                                          |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [entropy.md](./entropy.md)                                                               | The force investment answers.                                           |
| [backward-planning.md](./backward-planning.md)                                           | How an investment's schedule is derived from the change date.           |
| [change-magnitude-and-investment-sizing.md](./change-magnitude-and-investment-sizing.md) | How change magnitude sets investment size and tier.                     |
| [proposed investment extension](../metamodel/proposed-investment-extension.md)           | The entity and relationship types for investments, work, and resources. |
