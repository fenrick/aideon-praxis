# Explainability

How Praxis explains a result: by tracing along the semantic spine and returning the evidence that supports the answer.
For a reader implementing or consuming explanation surfaces.

The spine itself — the lineage and how it drives integrity — is the
[semantic spine](../../03-design/semantic-spine/README.md) design record. This file is how Praxis turns that lineage
into an explanation a user can read and drill into.

---

## Explanations trace the spine

An explanation in Praxis is not free text; it is a traced path along the semantic spine —
`Intent → Value → Capability → Execution → Technology → Change`
([the spine](../../03-design/semantic-spine/the-spine.md)). The spine is the _expected_ line of reasoning, so an
explanation follows it in one of two canonical directions:

- **"Why does this matter?"** walks _up_ the spine, toward the more abstract role: from an `Application`, along
  `realises`, to the `Capability` it realises, and onward toward the value and intent it serves.
- **"What does this affect?"** walks _down_: from a `Capability`, along inbound `realises` to the `Application`s
  realising it, then `hosts` to the `TechnologyComponent`s beneath, then `accesses` to the `DataEntity`s touched.

Both are bounded traversals with explicit fanout, depth, and size limits
([artefact execution](./artefact-execution.md)); a result that hits a limit is marked **Partial / Bounded**
([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)). An explanation that stopped at a bound says
so rather than implying it is complete.

---

## What an explanation carries

Praxis returns structured evidence, not a verdict. An explanation surfaces:

- the **path** taken through the spine — the ordered entities and relationships, each with its slots (a `serves`
  relationship carries its `confidence`, a `realises` its `criticality`);
- the **content classification** of each element — Asserted, Inferred, or Generated
  ([`CONTEXT.md`](../../../CONTEXT.md)) — so the reader sees what kind of claim each step rests on;
- the **honest-state flags** — whether the trace is Fresh, Stale, or Bounded;
- a **coverage note** where a spine role cannot be reached because it is not modelled (today, Intent).

Where the explanation accompanies an analytic result, the contributing evidence comes from Metis — top inbound
contributors, top dependency paths, affected-entity sets
([Metis explainable evidence](../metis/explainable-evidence.md)). Praxis frames the domain question and presents the
explanation; Metis supplies the computed contributors. Praxis does not reimplement the graph computation.

---

## Honest stopping at an unmodelled role

Because the upper spine (Intent, most of Value) is PLANNED in the seed
([spine-to-seed types](../../03-design/semantic-spine/spine-to-seed-types.md)), an upward explanation stops where the
model ends and records a Bounded coverage note rather than fabricating a higher reason. This is deliberate: an
explanation that invented an Intent above a value-stream stage would teach the reader something false. The trade-off is
that today's "why does this matter?" explanations terminate one role short of intent; when the
[proposed spine-extension package](../../03-design/metamodel/proposed-spine-extension.md) lands, they extend upward and
the note is removed.

---

## Worked example — explaining Customer Insight

Using the [baseline](../../data/base/baseline.yaml): ask **"Why does Customer Insight matter?"** of
`n:capability:customer-insight`, at the viewpoint as-of valid time `2026-06-11`, layer `actual`, base case.

1. **Customer Insight serves Discover** (a `ValueStreamStage`), via `e:capability-serves-discover` (`confidence: 0.95`)
   — the Value role it supports. The step is **Asserted** and **Fresh**.
2. The **Intent** role behind `Discover` is **PLANNED**, so the trace stops here with a Bounded coverage note: _"upper
   spine (Intent) not modelled in this workspace."_

Asking instead **"What does Customer Insight affect?"** walks down: it is realised by `Insight Hub`
(`e:insight-realises-insight`, `criticality: High`), which `accesses` `Customer Profile` (`mode: readwrite`) and is
`hosts`-linked from `Stream Processor`. The explanation returns that ordered path, each step's slots and classification,
and — being five entities within the bounds — no Bounded flag.

The same subgraph's integrity reading is walked in [integrity scoring](./integrity-scoring.md); the two surfaces share
the trace but answer different questions — explainability says _how the answer was reached_, integrity says _how
well-founded the content is_.

---

## References & standards

_Informative:_

- Pirolli & Card — **Information Foraging**, 1999. Information scent for the drill-down direction of explanations.

## Related documents

| Document                                                                                                                                 | What it covers                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [The semantic spine](../../03-design/semantic-spine/README.md)                                                                           | The lineage explanations trace along.                      |
| [How the spine drives integrity and explainability](../../03-design/semantic-spine/how-the-spine-drives-integrity-and-explainability.md) | The shared spine basis for scoring and explanation.        |
| [Metis — explainable evidence](../metis/explainable-evidence.md)                                                                         | The computed contributors an analytic explanation carries. |
| [Integrity scoring](./integrity-scoring.md)                                                                                              | The score the explanation accompanies.                     |
| [Artefact execution](./artefact-execution.md)                                                                                            | The bounded traversal an explanation uses.                 |
| [`baseline.yaml`](../../data/base/baseline.yaml)                                                                                         | The seed dataset the example uses.                         |
