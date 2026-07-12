# Forces of Change

Why a digital twin of an organisation is never still, and how Aideon turns that movement into investment decisions. This
folder is the product thesis behind the **Kairos** module ([05-modules/kairos](../../05-modules/kairos/README.md)) and
behind much of how time, planning, and analytics work together.

A twin is a model of a living organisation. Every change to it has exactly one of two origins: it **happened**, or it
was **done**. Those are the two forces, and they pull in opposite directions:

- **Entropy** — systems age, support ends, fitness drifts, risk and debt accrue. Entropy is the default. It needs no
  decision; it happens. See [entropy.md](./entropy.md).
- **Action** — deliberate change that someone takes to counter entropy or seize an opportunity. Action is the only thing
  that moves a twin on purpose. See [action.md](./action.md).

Action that is planned, resourced, and funded — with roles, rates, and durations — is an **investment**. Investment is
the economic form of action, and it is what the [Kairos](../../05-modules/kairos/README.md) module plans. An investment
is always attached to a change in the twin, and the size of that change governs the size and strategic weight of the
investment. See [investment.md](./investment.md).

The product's job is to make both forces visible and connect them: detect where entropy is building, flag where action
is due or overdue, and let the user model that action as an investment — working backwards from the date the change must
land. See [change-magnitude-and-investment-sizing.md](./change-magnitude-and-investment-sizing.md) and
[backward-planning.md](./backward-planning.md).

This is the difference between an EA tool that _records_ an architecture and one that _plans the spend_ to change it.

---

## Contents

1. [Entropy — the force that needs no decision](./entropy.md)
2. [Action — the force that does](./action.md)
3. [Investment — action with resources attached](./investment.md)
4. [Change magnitude and investment sizing](./change-magnitude-and-investment-sizing.md)
5. [Backward planning from the change date](./backward-planning.md)

---

## Where this is realised

| Concern                                                                 | Owner                                                                                                                                  |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Detecting entropy and change; flagging investment opportunities         | **Kairos** ([05-modules/kairos](../../05-modules/kairos/README.md)), surfacing through [Signal Surfaces](../signal-surfaces/README.md) |
| Sizing change by impact (blast radius along the spine)                  | **Metis** ([05-modules/metis](../../05-modules/metis/README.md))                                                                       |
| Placing plans on the valid-time axis; baseline/transition/target states | **Chrona** ([05-modules/chrona](../../05-modules/chrona/README.md)) + the temporal model                                               |
| The entity types for plans, work, resources, and investments            | The metamodel ([proposed investment extension](../metamodel/proposed-investment-extension.md))                                         |
| Orchestrating the work once a plan is committed                         | **Continuum** ([05-modules/continuum](../../05-modules/continuum/README.md))                                                           |

## References & standards

- The Open Group — TOGAF Standard, 10th Edition: Phase E (Opportunities & Solutions), Phase F (Migration Planning),
  Transition Architectures. _(normative for the planning method)_
- The Open Group — ArchiMate 3.2: Implementation & Migration layer (Work Package, Deliverable, Implementation Event,
  Plateau, Gap) and Strategy layer (Resource, Capability, Course of Action). _(normative for the element vocabulary)_
- Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                       | What it covers                                                                                            |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| [05-modules/kairos](../../05-modules/kairos/README.md)                         | The engine that detects change and models investment.                                                     |
| [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md) | The decision to introduce Kairos and the planning model.                                                  |
| [semantic-spine](../semantic-spine/README.md)                                  | The Intent→Value→Capability→Execution→Technology→**Change** lineage that change events sit at the end of. |
| [signal-surfaces](../signal-surfaces/README.md)                                | How an investment opportunity is presented as a reviewable signal.                                        |
