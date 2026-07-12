# Impact and change magnitude

How Metis computes the blast radius of a change and the magnitude vector that Kairos sizes an investment from. For a
reader who needs the impact family in detail and its downstream use.

This describes **design intent** ([README](./README.md)). The change-magnitude product framing — how magnitude becomes a
governance tier and an indicative size — is
[change magnitude and investment sizing](../../03-design/forces-of-change/change-magnitude-and-investment-sizing.md);
this file is the Metis computation behind it.

---

## Blast radius

Blast radius is the impact set of a change: the entities reachable from the changing element along the canonical
relationships, bounded by depth and fanout ([algorithms and bounds](./algorithms-and-bounds.md)). It is computed by
bounded breadth-first traversal — downstream along `realises`/`accesses`/`hosts` for "what does this affect", upstream
for "what does this depend on". The traversal respects the viewpoint's temporal frame, so only relationships in effect
at the as-of valid time are edges ([determinism and bounds](./determinism-and-bounds.md)).

A blast radius that hits a fanout, depth, or time bound is **truncated** and reported **Partial / Bounded** with its
coverage — the magnitude that consumes it then says so rather than overstating reach.

---

## The magnitude vector

Magnitude is not one number; it is a small, explainable vector, each component read from the twin using the seed
relationship types. Metis computes the components; Kairos composes them
([change magnitude and investment sizing](../../03-design/forces-of-change/change-magnitude-and-investment-sizing.md)):

| Component              | What it measures                        | How Metis reads it                                                                                                           |
| ---------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Blast radius**       | How much of the twin the change touches | The bounded impact set along `realises`/`accesses`/`hosts`                                                                   |
| **Criticality**        | How important the touched entities are  | `BusinessProcess.criticality`, `Capability.tier`, and how many strategic capabilities sit upstream via `realises` → `serves` |
| **Sensitivity**        | The data exposure the change moves      | `DataEntity.sensitivity` on entities reached by `accesses`                                                                   |
| **Dependency breadth** | How coupled the element is              | In-degree and out-degree across `realises`/`accesses`/`hosts`                                                                |
| **Lifecycle distance** | How far the asset must travel           | The `lifecycle`/`disposition` transitions implied                                                                            |
| **Time pressure**      | How little runway remains               | Valid-time distance from now to the change date                                                                              |

Each component is bounded and carries its honest-state flags
([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)); a truncated blast radius makes the whole
vector say so.

---

## Impact truncation

Truncation is the load-bearing honesty rule for impact. A large blast radius is exactly the case where an unbounded
traversal would be most expensive, so it is exactly where the bound bites. Metis does not silently cap an impact set: it
returns the bounded set, the truncation flag, and the coverage reached (how deep it got, how many neighbours it stopped
short of). A downstream sizing that reads a truncated blast radius treats the magnitude as a lower bound, which is the
honest reading of an incomplete traversal.

---

## Worked example — impact set from Automation Orchestrator

The `Application` **Automation Orchestrator** (`n:application:automation-orchestrator`, `disposition = Migrate`,
`lifecycle = Plan`) from the [baseline](../../data/base/baseline.yaml). Its downstream impact set at today's viewpoint,
depth 3:

- along `realises` → **Automation Fabric** (`Capability`, `tier = Supporting`);
- along `accesses` → **Engagement Event** (`DataEntity`, `sensitivity = Confidential`);
- along inbound `hosts` ← **Stream Processor** (`TechnologyComponent`).

The magnitude vector reads: **moderate blast radius** (one capability, one data entity, one technology component, within
bound — not truncated); **supporting criticality** (not a strategic capability); **elevated sensitivity** (Confidential
data moves via `accesses`); **near time pressure** (a `PlanEvent`, FY26 Q2 Channel Cutover, dates a related cutover).
The result is returned with each component's contributing entities and paths as evidence
([explainable evidence](./explainable-evidence.md)). Kairos composes this into a **tactical** tier and a Low-confidence
indicative size
([change magnitude and investment sizing](../../03-design/forces-of-change/change-magnitude-and-investment-sizing.md)).
Had Automation Orchestrator realised a _Strategic_ capability that several value-stream stages `serves`, the blast
radius and criticality would rise and the same migration would size materially larger.

---

## References & standards

_Normative (the measure):_

- Newman — _Networks_, 2018; the centrality/impact definitions the blast-radius computation rests on.

_Informative:_

- The Open Group — **ArchiMate 3.2 Specification**. Impact and dependency analysis over the layered model.

## Related documents

| Document                                                                                                             | What it covers                                                   |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [Change magnitude and investment sizing](../../03-design/forces-of-change/change-magnitude-and-investment-sizing.md) | How the vector becomes a governance tier and an indicative size. |
| [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)                                       | Kairos — the planned engine that consumes the magnitude.         |
| [Algorithms and bounds](./algorithms-and-bounds.md)                                                                  | The bounded traversal blast radius uses.                         |
| [Explainable evidence](./explainable-evidence.md)                                                                    | The contributing entities and paths the impact set carries.      |
| [`baseline.yaml`](../../data/base/baseline.yaml)                                                                     | The seed dataset the example uses.                               |
