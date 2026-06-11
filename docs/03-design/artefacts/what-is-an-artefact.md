# What an Artefact Is

The principle behind the artefact — the unit users consume. An artefact is a named, versioned, self-describing product of the model, executed at an explicit viewpoint, whose meaning is bounded, explained, and traceable.

## The principle

An artefact is **not** a static document, **not** a manually drawn diagram, and **not** a data export. It is a declared, reusable definition over structured model content: it states the business question it answers and how to answer it from the twin — purpose, audience, [artefact family](./families.md), [form](./forms.md), default scope, inclusion rules, execution contract, and output expectations ([`CONTEXT.md`](../../../CONTEXT.md)).

The chain is exact:

> **Artefact + Viewpoint → Artefact result**

An _Artefact_ is the stored definition. An _Artefact result_ is one execution of that definition at one viewpoint — a bounded, content-classified, provenance-carrying projection derived from the resolved [snapshot](../../../CONTEXT.md) and shaped by the artefact's form and rules. One snapshot can back many results; one artefact yields different results at different viewpoints. The result is not the snapshot.

Because the viewpoint is part of the execution, **changing valid time, asserted time, layer, scenario, or scope produces a materially different result.** Two executions of the same artefact at different viewpoints are not the same result, and the surface must say which viewpoint produced what it shows ([the-contract.md](./the-contract.md)).

## Why this matters

Treating the artefact as a reusable, executable definition rather than a drawing is what lets the product compare, explain, and refresh outputs. A drawn diagram cannot tell you it has gone stale, cannot trace its evidence, and cannot be re-run against a different scenario. An artefact result can do all three because its meaning is declared, not implicit.

## Worked example

The seed dataset ([`baseline.yaml`](../../data/base/baseline.yaml)) defines an `Application` named **Insight Hub** that `realises` the `Capability` **Customer Insight**, and `accesses` the `DataEntity` **Customer Profile**.

An _Artefact_ "Application Portfolio Health" (family: [application portfolio](./families.md), form: [catalogue](./forms.md)) declares: _which applications exist, what they support, and how healthy they are._ Executed at the viewpoint `{valid: 2026-06-11, asserted: latest, layer: actual, scenario: base, scope: type=Application}`, it produces an _Artefact result_ listing `Insight Hub`, `Journey Studio`, and `Automation Orchestrator` with their `disposition` and `lifecycle` slots, each row carrying its content classification and freshness.

Re-execute the same artefact under the scenario that the `PlanEvent` **FY26 Insight Modernization** belongs to, and `Insight Hub`'s row changes — a different result from the same definition. The surface shows both the new viewpoint and a [difference](../ux/time-and-scenario-ux.md) against the base case.

## The trade-off

Defining artefacts up front is more work than letting users draw whatever they like on a blank canvas. The product accepts that cost: a one-off canvas only makes sense to the person who built it, while a family-shaped, executable artefact is something a colleague can open, trust, and re-run a year later.

## Related documents

| Document                                                                     | What it covers                                                  |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [the-contract.md](./the-contract.md)                                         | The four questions and contract fields every artefact declares. |
| [forms.md](./forms.md)                                                       | The six presentation shapes.                                    |
| [families.md](./families.md)                                                 | The question-shaped groupings.                                  |
| [Praxis — artefact execution](../../05-modules/praxis/artefact-execution.md) | The module that executes artefacts.                             |
