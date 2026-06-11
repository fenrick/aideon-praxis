# Algorithms and bounds

The named algorithms Metis uses, their complexity, the iteration and convergence limits that keep them bounded, and how algorithm selection is decided. For a reader who needs to know what runs, how expensive it is, and where it stops.

This describes **design intent**: the algorithm selection and bounds are specified here as the contract the engine is built to; the implementation is not yet in the `metis` crate ([README](./README.md)). Metis names established algorithms and does not invent its own; the citations are normative for selection ([STANDARDS-REGISTER.md](../../02-standards/STANDARDS-REGISTER.md)).

---

## Named algorithms and complexity

For a graph with `n` nodes and `m` edges:

| Job                                                      | Algorithm                                      | Complexity                                        | Source                                                     |
| -------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| Node importance ranking                                  | **PageRank**                                   | `O(k·m)` for `k` power-iteration steps            | Page & Brin, PageRank, 1998                                |
| Betweenness centrality                                   | **Brandes' algorithm**                         | `O(n·m)` unweighted; `O(n·m + n²·log n)` weighted | Freeman 1977 (definition); Brandes 2001 (fast computation) |
| Shortest path / reachability (non-negative weights)      | **Dijkstra**                                   | `O(m + n·log n)` with a binary/Fibonacci heap     | Dijkstra, 1959                                             |
| Shortest path with negative weights or constraint checks | **Bellman–Ford**                               | `O(n·m)`                                          | Bellman–Ford                                               |
| Impact set (bounded traversal)                           | Breadth-first traversal with depth/fanout caps | `O(n + m)` within the bound                       | Newman, _Networks_, 2018                                   |

Centrality definitions and their interpretation follow Newman, _Networks_, 2018. The choice between Dijkstra and Bellman–Ford is a selection rule, below.

---

## Algorithm selection

Selection is deterministic and decided by the shape of the input, not by convenience or raw speed ([README](./README.md)):

- **Shortest path** uses **Dijkstra** when all relevant edge weights are non-negative (the common case — `serves.confidence`, `realises.criticality` mapped to non-negative weights). It falls back to **Bellman–Ford** only when negative weights or a constraint that can produce them is in scope, accepting the higher `O(n·m)` cost for correctness.
- **Centrality** uses **PageRank** for importance/influence ranking and **Brandes' betweenness** for brokerage/chokepoint analysis; the two answer different questions and are not interchangeable.
- **Impact** uses bounded breadth-first traversal rather than a full transitive closure, because the result is capped by depth and fanout anyway ([impact and change magnitude](./impact-and-change-magnitude.md)).

The selected algorithm and its parameters are recorded with the result, so a re-run reproduces the choice ([determinism and bounds](./determinism-and-bounds.md)).

---

## Iteration, convergence, and approximation limits

Iterative and large-graph algorithms are bounded so they cannot run unbounded:

- **PageRank** iterates to a **convergence tolerance** (the change in scores between iterations falls below a threshold) **or** a **maximum iteration count**, whichever comes first. Hitting the iteration cap before convergence marks the result **approximated** ([determinism and bounds](./determinism-and-bounds.md)), not failed.
- **Betweenness** on a graph above a size threshold may use **sampled-source approximation** (Brandes-style sampling of source nodes) rather than exact all-pairs computation; a sampled result is marked **approximated** and records its sample size.
- **Traversal** algorithms stop at the declared **depth** and **fanout** caps and at the **time budget**; a capped result is **truncated** and states its coverage.

Numerical stability is part of the contract: PageRank uses a damping factor and normalises scores so they sum predictably; comparisons and tie-breaks use a stable ordering by identifier so floating-point ties do not produce non-deterministic order ([determinism and bounds](./determinism-and-bounds.md)).

---

## Why bounds, and the trade-off

Analytics is the highest-cost computation in the system. Unbounded centrality or all-pairs paths on a large twin would dominate latency and memory and could not run on a desktop within an interactive budget. The bounds close a door: an exact answer over a very large graph is not always available — Metis returns an approximated or truncated answer with the fact stated, rather than blocking or running unbounded. The architecture accepts a marked-approximate result over an unbounded exact one, because an honest approximation is usable and an unbounded job is not.

---

## Worked example — bounded impact from Automation Orchestrator

A downstream impact job seeded at `n:application:automation-orchestrator` ([baseline](../../data/base/baseline.yaml)) runs bounded breadth-first traversal: from the application along `realises` to `Automation Fabric`, along `accesses` to `Engagement Event`, and along inbound `hosts` from `Stream Processor`. With a depth cap of 3 and a generous fanout, the traversal completes within the bound and the result is **not** truncated. Were the same job run from a hub realised by thousands of applications, the traversal would stop at the fanout cap and return a **truncated** impact set stating the coverage it reached, with complexity held at `O(n + m)` within the bound rather than exploding.

---

## References & standards

_Normative (algorithm selection):_

- Page & Brin — **PageRank**, 1998.
- Freeman — **betweenness centrality**, 1977; Brandes — fast betweenness, 2001.
- Dijkstra, 1959; Bellman–Ford — shortest paths.
- Newman — _Networks_, 2nd ed., 2018. Centrality definitions and interpretation.

## Related documents

| Document                                                          | What it covers                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------- |
| [Determinism and bounds](./determinism-and-bounds.md)             | The deterministic input scope and how flags are serialised. |
| [What Metis computes](./what-metis-computes.md)                   | The families these algorithms serve.                        |
| [Impact and change magnitude](./impact-and-change-magnitude.md)   | The bounded impact traversal in detail.                     |
| [STANDARDS-REGISTER.md](../../02-standards/STANDARDS-REGISTER.md) | The full bibliography for the cited sources.                |
