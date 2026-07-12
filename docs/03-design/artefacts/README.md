# Artefacts

The **artefact** is the primary product of Aideon Desktop. Every view, catalogue, matrix, map, report, and page is an
artefact result: a bounded, content-classified, provenance-carrying projection executed at an explicit viewpoint. This
folder is the intellectual core of the product design — what an artefact is, the contract it carries, its forms and
families, and how intelligence, explanation, and classification attach to it.

The vocabulary here is exact: an **Artefact** is a reusable definition, an **Artefact result** is one execution, an
**Artefact family** is the question-shaped grouping, and a **Form** is the presentation shape — **Artefact + Viewpoint →
Artefact result** ([`CONTEXT.md`](../../../CONTEXT.md)). [Praxis](../../05-modules/praxis/README.md) owns artefact
identity and execution; [Mneme](../../05-modules/mneme/README.md) owns the storage execution reads; the renderer is a
thin display surface holding no traversal logic, analytics, or semantics.

---

## Contents

1. [What an artefact is](./what-is-an-artefact.md) — the principle, and why an artefact is not a document, a drawn
   diagram, or an export.
2. [The contract](./the-contract.md) — the four questions every artefact answers and the contract fields it declares.
3. [Forms](./forms.md) — the six forms (view, catalogue, matrix, map, report, page) and what each shapes.
4. [Families](./families.md) — the question-shaped families, mapped to JTBD and TOGAF/ArchiMate.
5. [Content classification](./content-classification.md) — Asserted/Inferred/Generated and the display rules.
6. [Explanation surfaces](./explanation-surfaces.md) — inspector, inline, companion; drill-down; information scent.
7. [Intelligence and automation](./intelligence-and-automation.md) — the model-is-authority rule; LLM via Sophia; ML
   signals via Metis; automation creates work, not silent edits.
8. [Abstraction levels](./abstraction-levels.md) — conceptual, logical, implementation-aware, and how families sit
   across them.

---

## How to read this folder

A reader who wants the principle reads [what an artefact is](./what-is-an-artefact.md) and
[the contract](./the-contract.md). A reader building a renderer reads [forms](./forms.md) and
[explanation surfaces](./explanation-surfaces.md). A reader implementing intelligence reads
[intelligence and automation](./intelligence-and-automation.md). The honest-state and confidence/integrity vocabulary is
referenced, never redefined, from the [Documentation Standard](../../02-standards/DOCUMENTATION-STANDARD.md) (§8, §9)
and [trust-and-honesty.md](../trust-and-honesty.md).

Worked examples throughout use the seed metamodel ([`core-v1.json`](../../data/meta/core-v1.json)) and seed dataset
([`baseline.yaml`](../../data/base/baseline.yaml)) — real types (`Capability`, `Application`, `serves`, `realises`,
`accesses`) and real entities (`Insight Hub`, `Customer Insight`).

---

## References & standards

_Normative:_

- The Open Group — **TOGAF Standard, 10th Edition** and **ArchiMate 3.2 Specification**. Family alignment
  ([families.md](./families.md)).

_Informative:_

- Christensen; Ulwick — **Jobs-to-be-Done**. Framing families by the question they answer.
- Pirolli & Card — **Information Foraging**, 1999. Drill-down and explanation placement.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                | What it covers                                     |
| --------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [Praxis — artefact execution](../../05-modules/praxis/artefact-execution.md)            | How artefacts execute at the module level.         |
| [ux/README.md](../ux/README.md)                                                         | The interaction contract artefacts render through. |
| [signal-surfaces/README.md](../signal-surfaces/README.md)                               | How signals attach to artefacts.                   |
| [TEMPORAL-AND-SCENARIO-CONTEXT.md](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The viewpoint every artefact executes at.          |
