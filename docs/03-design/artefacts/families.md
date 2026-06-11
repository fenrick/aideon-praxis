# Artefact Families

An **artefact family** is a named grouping of artefacts that corresponds to a recognisable business question or starting shape — business motivation, capability map, service blueprint, operating model, roadmap ([`CONTEXT.md`](../../../CONTEXT.md)). A family guides the initial structure and interpretation of an artefact; it is **not** a temporal, scenario, layer, or scope frame, and it is **not** a [Viewpoint](../vocabulary.md) (which in this project is the bitemporal query frame).

Families are organised by the **question they answer**, not by the diagram they draw (Christensen; Ulwick, Jobs-to-be-Done). A user who recognises a family name already knows what question they are answering before they open the artefact — the family is the antidote to blank-canvas thinking.

## The families

| Family                        | Question it answers                                                      | TOGAF/ArchiMate alignment                                             |
| ----------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| **Business motivation**       | Why does this organisation exist and what drives its choices?            | ArchiMate Motivation layer; TOGAF Architecture Vision.                |
| **Value creation**            | How does the organisation create and deliver value?                      | ArchiMate Strategy/Business; TOGAF Business Architecture.             |
| **Business concept**          | What are the fundamental business entities and their relationships?      | ArchiMate Business layer (objects).                                   |
| **Service portfolio**         | What services does the organisation offer, and to whom?                  | ArchiMate Business/Application Services; TOGAF Business Architecture. |
| **Service concept**           | How is a specific service designed to work?                              | ArchiMate Business Service + realising elements.                      |
| **Service blueprint**         | What happens operationally when a service is delivered?                  | Shostack service blueprinting; BPMN 2.0 where detail is rendered.     |
| **Operating model**           | How are people, process, and technology organised to do the work?        | TOGAF Business Architecture; ArchiMate Business/Application.          |
| **Information dissemination** | What information is created, consumed, and shared — and by whom?         | ArchiMate Business/Application (data access).                         |
| **Application interaction**   | How do applications exchange data and coordinate behaviour?              | ArchiMate Application layer (Serving, Flow).                          |
| **Application portfolio**     | What applications exist, what do they support, and how healthy are they? | ArchiMate Application Components; TOGAF Application Architecture.     |
| **Technology portfolio**      | What technology underpins the applications and operations?               | ArchiMate Technology layer; Wardley Mapping for evolution.            |
| **Transition roadmap**        | How does the estate move from today to the target, and when?             | ArchiMate Implementation & Migration (Plateau, Gap); TOGAF Phase E/F. |

Families are reusable, comparable, and explainable. The product prefers them over one-off canvases. The Zachman six interrogatives (What/How/Where/Who/When/Why) are a useful coverage check across the set (Zachman Framework).

## Families and the seed

The seed metamodel ([`core-v1.json`](../../data/meta/core-v1.json)) realises the middle and lower families directly:

- **Application portfolio** and **Technology portfolio** are fully expressible today: `Application` and `TechnologyComponent` entities, with `realises`, `accesses`, and `hosts` relationships.
- **Value creation** maps to the `ValueStreamStage` entities (`Discover`, `Design`, `Deliver`) and the `serves` relationships from `Capability`.
- **Transition roadmap** is expressible through `PlanEvent` entities and `plan_effect` relationships (the FY26 plan events in the seed).
- **Business motivation** depends on Intent/Value roles that are **PLANNED**, not yet in the seed ([semantic-spine/spine-to-seed-types.md](../semantic-spine/spine-to-seed-types.md)). Until those types exist, the business-motivation family is design intent.

## Families sit across abstraction levels

The same family can be answered at different [abstraction levels](./abstraction-levels.md): an application-portfolio question can be conceptual (which capabilities are supported) or implementation-aware (which versions run on which technology). The family fixes the question; the level fixes how concrete the answer is.

## Worked example

The **Application portfolio** family, executed over the seed at `{valid: 2026-06-11, layer: actual, scope: type=Application}`, answers _what applications exist and how healthy they are_: `Insight Hub` (`disposition: Invest`, `lifecycle: Run`), `Journey Studio` (`Invest`, `Build`), `Automation Orchestrator` (`Migrate`, `Plan`). The family tells the user the question; the [form](./forms.md) (catalogue) and the viewpoint shape the answer.

## References & standards

_Normative:_

- The Open Group — **TOGAF Standard, 10th Edition** and **ArchiMate 3.2 Specification**. The layer and deliverable alignment.

_Informative:_

- Christensen; Ulwick — **Jobs-to-be-Done**. Framing families by question.
- Zachman — **Zachman Framework**. The interrogatives as a coverage check.
- Shostack — _Designing Services That Deliver_, HBR, 1984. Service blueprinting.
- Wardley — **Wardley Mapping**. Technology-portfolio evolution.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                | What it covers                      |
| ------------------------------------------------------- | ----------------------------------- |
| [forms.md](./forms.md)                                  | The shapes a family's results take. |
| [abstraction-levels.md](./abstraction-levels.md)        | The levels a family is answered at. |
| [metamodel/README.md](../metamodel/README.md)           | The types families draw on.         |
| [semantic-spine/README.md](../semantic-spine/README.md) | The lineage families trace.         |
