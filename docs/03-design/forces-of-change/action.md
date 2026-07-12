# Action — the force that does

The second force of change. Where [entropy](./entropy.md) is change that _happens_ to an organisation, action is change
that is _done_ to it. Action is deliberate: someone decides, and the twin moves. It is the only force that moves a twin
on purpose, and in Aideon it is always authored, never automatic — the model remains the authority, and automation
creates work rather than silently acting ([intelligence and automation](../artefacts/intelligence-and-automation.md)).

Every change in the twin resolves to one of the two forces. If no one chose it, it is entropy. If someone chose it, it
is action. Keeping that distinction sharp is what lets Aideon separate _decay to be managed_ from _decisions to be
funded_.

## How action enters the twin

Action is authored as a [Change Event](../../../CONTEXT.md) — the user-facing object that captures intent and context
(owner, rationale, source, approval state, dependencies) and compiles into one or more
[operations](../../../CONTEXT.md). The subtype that authors a future, non-actual state is a
[Plan Event](../../../CONTEXT.md): it writes facts on the `plan` layer (or `forecast`/`target`) within a
[scenario](../../../CONTEXT.md), dated by its `effective_at`. Actual-layer change — observation, import, reconciliation,
correction — is also action, but recorded rather than planned.

So action is visible in the twin as authored facts with a known author, a known reason, and a known date. That
visibility is what distinguishes it from entropy, which is visible only as drift and absence.

## From action to investment

A single deliberate edit is action. Action that is **planned, resourced, and funded** — broken into work with roles,
rates, and durations, scheduled toward a target date — is an **investment**. Investment is the economic form of action,
and it is the object the [Kairos](../../05-modules/kairos/README.md) module exists to plan. The progression is
deliberate:

```text
entropy signal  →  flagged opportunity  →  action (a Change Event / Plan Event)
                                              →  investment (resourced, scheduled, funded action)
```

Not all action becomes an investment — a small correction stays a plain Change Event. Action crosses into investment
when it is large enough to need a plan, a budget, and resources, which is exactly when its
[magnitude](./change-magnitude-and-investment-sizing.md) makes it worth governing.

## Why this framing matters

Treating "action" as a first-class force, distinct from investment, keeps two things honest:

1. **Not all action is funded.** Recording an observed retirement or correcting a wrong fact is action with no
   investment behind it. The model must represent it without forcing a budget.
2. **All investment is action.** A budget line that is not attached to a deliberate, modelled change in the twin is an
   unfounded number. Aideon binds every investment to the action it pays for, and the action to the entropy or
   opportunity it answers ([investment.md](./investment.md)).

The trade-off: insisting that change be classified as entropy or action — and that investment attach to action — is more
discipline than free-form planning. It is the discipline that makes a portfolio defensible.

## References & standards

- TOGAF Standard, 10th Edition — Phase E/F treat deliberate change as work packages and transition states. _(normative
  for the planning method)_
- ArchiMate 3.2 — Implementation & Migration layer represents deliberate change (Work Package, Implementation Event,
  Plateau, Gap). _(normative)_
- Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                               | What it covers                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| [entropy.md](./entropy.md)                             | The force action answers.                                              |
| [investment.md](./investment.md)                       | Action with resources, rates, and durations attached.                  |
| [05-modules/kairos](../../05-modules/kairos/README.md) | The engine that turns flagged opportunities into modelled investments. |
