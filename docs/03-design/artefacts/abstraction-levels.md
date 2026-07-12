# Abstraction Levels

Aideon respects levels of abstraction rather than flattening them into one overstuffed surface. Different audiences are
not simply asking for more or less detail — they are asking **different questions**. Forcing every user through one
surface makes each process material that does not answer their question.

## The three levels

| Level                    | Scope                                       | Typical question                                          |
| ------------------------ | ------------------------------------------- | --------------------------------------------------------- |
| **Conceptual**           | Business meaning and scope.                 | What is this organisation trying to do?                   |
| **Logical**              | Design-level structure and relationship.    | How are the parts designed to work together?              |
| **Implementation-aware** | Concrete systems, components, and delivery. | What are the specific systems and how are they connected? |

A user moves between levels **deliberately**. A strategy discussion does not need the implementation detail surface; an
impact analysis should not have to disguise itself as a conceptual overview. The level is a choice the user makes,
expressed through the artefact's [scope](../vocabulary.md) and chosen [form](./forms.md) — not a quality the data forces
on them.

## Levels and families

The same [artefact family](./families.md) is answered at different levels. The family fixes the _question_; the level
fixes _how concrete the answer is_:

- An **application portfolio** question at the conceptual level asks which capabilities are supported; at the
  implementation-aware level it asks which applications run on which technology components.
- A **value creation** question at the conceptual level traces value streams; at the logical level it relates
  capabilities to those streams; at the implementation-aware level it reaches the applications realising them.

## Levels and the semantic spine

The levels run along the [semantic spine](../semantic-spine/README.md) (Intent → Value → Capability → Execution →
Technology → Change). Conceptual questions sit at the Intent/Value/Capability reaches; implementation-aware questions
sit at the Execution/Technology reaches. This is why drill-down and explanation move _along the spine_
([explanation-surfaces.md](./explanation-surfaces.md)) — moving down a level is moving down the spine.

## Worked example

Over the seed ([`baseline.yaml`](../../data/base/baseline.yaml)), the value-creation question takes three forms by
level:

- **Conceptual:** the three `ValueStreamStage` entities — `Discover`, `Design`, `Deliver`.
- **Logical:** each stage with the `Capability` that `serves` it — `Customer Insight → Discover`,
  `Journey Orchestration → Design`, `Automation Fabric → Deliver`.
- **Implementation-aware:** each capability with the `Application` that `realises` it and the `TechnologyComponent` that
  `hosts` that application — e.g. `Customer Insight ← Insight Hub ← Stream Processor`.

Same family, same twin, three deliberate levels of concreteness. The conceptual view does not carry the technology
detail, and the implementation-aware view does not pretend to be a strategy overview.

## Related documents

| Document                                                | What it covers                         |
| ------------------------------------------------------- | -------------------------------------- |
| [families.md](./families.md)                            | The questions answered at each level.  |
| [forms.md](./forms.md)                                  | The shapes a level's answer takes.     |
| [explanation-surfaces.md](./explanation-surfaces.md)    | Drill-down as movement between levels. |
| [semantic-spine/README.md](../semantic-spine/README.md) | The lineage the levels run along.      |
