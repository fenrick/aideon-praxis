# Spine to ArchiMate mapping

Each semantic-spine role mapped to its ArchiMate 3.2 layer and element, and to the TOGAF ADM phase that produces it.
This is the standards anchor for the spine: it shows the lineage is not bespoke doctrine but a rendering of the two
primary enterprise-architecture references (The Open Group, ArchiMate 3.2 Specification; The Open Group, TOGAF Standard,
10th Edition).

---

## The mapping

| Spine role     | ArchiMate 3.2 layer        | ArchiMate 3.2 element(s)                                  | TOGAF ADM phase                                                   |
| -------------- | -------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------- |
| **Intent**     | Motivation                 | Driver, Goal                                              | Phase A — Architecture Vision; Phase B motivation inputs          |
| **Value**      | Motivation / Strategy      | Outcome, Value, Value Stream                              | Phase A / Phase B                                                 |
| **Capability** | Strategy                   | Capability                                                | Phase B — Business Architecture (capability-based planning)       |
| **Execution**  | Business / Strategy        | Business Process, Business Function, Course of Action     | Phase B — Business Architecture                                   |
| **Technology** | Application + Technology   | Application Component, Data Object; Node, System Software | Phase C — Information Systems; Phase D — Technology               |
| **Change**     | Implementation & Migration | Work Package, Plateau, Deliverable                        | Phase E — Opportunities & Solutions; Phase F — Migration Planning |

The spine therefore runs top-to-bottom through the ArchiMate layer stack (Motivation → Strategy → Business → Application
→ Technology) and then into the Implementation & Migration layer for Change — the same descent the TOGAF ADM makes from
Architecture Vision to Migration Planning.

---

## Why each link is a recognised ArchiMate relationship

The links between roles are not arbitrary; each is a defined ArchiMate 3.2 relationship, which is why the
[edge catalogue](../../05-modules/praxis/edge-catalogue/README.md) can adopt ArchiMate relationship names directly:

| Spine link                 | ArchiMate 3.2 relationship | Seed relationship that expresses it                                       |
| -------------------------- | -------------------------- | ------------------------------------------------------------------------- |
| Intent → Value             | Influence / Realization    | _(PLANNED — no seed relationship yet)_                                    |
| Value → Capability         | Serving                    | `serves` (Capability → ValueStreamStage), in the reverse reading          |
| Capability → Execution     | Realization / Serving      | `realises` (to BusinessProcess)                                           |
| Execution → Technology     | Realization / Access       | `realises` (Application → Capability/Process), `accesses` (to DataEntity) |
| Technology → (Application) | Assignment                 | `hosts` (TechnologyComponent → Application)                               |
| any → Change               | Implementation & Migration | `plan_effect` (PlanEvent → target)                                        |

The PLANNED row at Intent → Value reflects that the seed has no Motivation-layer relationship; the
[proposed spine-extension package](../metamodel/proposed-spine-extension.md) would add `influences` and `realises_goal`
to fill it.

---

## A note on direction

ArchiMate Serving and Realization have fixed directions, and the spine reads them in a consistent sense: Realization
points from concrete to abstract (Application _realises_ Capability), and the spine's "up" direction (toward Intent)
follows the abstract end. This is why an explainability "why does this matter?" query walks _toward_ the realised, more
abstract role, and an impact query walks the other way ([the spine](./the-spine.md)). The seed's relationship directions
are documented exactly in [relationship types](../metamodel/relationship-types.md).

---

## References & standards

_Normative:_

- The Open Group — **ArchiMate 3.2 Specification**. Motivation, Strategy, Business, Application, Technology, and
  Implementation & Migration layers and their relationships.
- The Open Group — **TOGAF Standard, 10th Edition**. ADM phases A–F.

## Related documents

| Document                                                             | What it covers                                         |
| -------------------------------------------------------------------- | ------------------------------------------------------ |
| [The spine](./the-spine.md)                                          | The lineage being mapped.                              |
| [Spine to seed types](./spine-to-seed-types.md)                      | Which of these elements the seed implements.           |
| [Relationship types](../metamodel/relationship-types.md)             | The seed relationships and their ArchiMate mapping.    |
| [Proposed spine extension](../metamodel/proposed-spine-extension.md) | The PROPOSED Motivation-layer types and relationships. |
