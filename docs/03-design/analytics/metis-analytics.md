# Metis analytics

Metis is the engine that earns the right to show a score, a ranking, or an impact path. It runs deterministic, bounded graph computation over a snapshot of the twin and returns typed, evidence-bearing results that the rest of the product can present honestly. This document covers what Metis computes, the shapes it returns, and the work it deliberately does not do.

> **Implementation status.** The `metis` crate is a placeholder; the families, result shapes, and worked example here are **design intent** — the specification the engine is built to. The boundary and honesty obligations are normative now and constrain the implementation when it lands. See the [Metis module README](../../05-modules/metis/README.md).

---

## What Metis computes

Metis answers structural questions about the effective graph at an explicit viewpoint. Each family takes a bounded input — a workspace, a viewpoint (as-of valid time, as-of asserted time, layer policy, scenario, scope), and a declared algorithm — and produces the same answer for the same inputs.

| Family                      | Question it answers                                                                               | Named basis                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Centrality and ranking**  | Which entities are most structurally significant? What is the rank order over a relationship set? | PageRank _(Page & Brin, 1998)_; betweenness _(Freeman, 1977)_ computed by the fast algorithm _(Brandes, 2001)_; degree and other measures _(Newman, Networks, 2018)_ |
| **Impact and blast radius** | Which entities are affected, and how far, if this one changes?                                    | Bounded forward/reverse traversal over the dependency relations                                                                                                      |
| **Path and reachability**   | Is there a path from A to B, and what is the shortest one?                                        | Dijkstra _(1959)_ for weighted, Bellman–Ford where negative or signed weights apply                                                                                  |
| **Risk and concentration**  | Where is structural dependency concentrated? Which entities are single points of failure?         | Centrality and cut analysis over the same graph                                                                                                                      |
| **Cost and optimisation**   | What is the rolled-up cost of a configuration, and how do scenarios compare?                      | Aggregation over the cost-bearing slots along the spine (the folded **Oikos** FinOps concern)                                                                        |

Each family operates on the same projection — the resolved effective graph for the viewpoint — so a centrality run and an impact run over the same scope see the same nodes and edges.

---

## Typed result envelopes

Metis returns structured envelopes, not loose blobs. If the output shape is left open, every consuming layer invents its own, and the honest-state flags drift. The stable shapes are:

| Result kind           | Carries                                                                              |
| --------------------- | ------------------------------------------------------------------------------------ |
| **Ranked list**       | `items[]` (`id`, `score`, `rank`), `algorithm`, `bounds`, `computed_at`              |
| **Score**             | `value`, `confidence`, `contributing_ids[]`, `bounds`                                |
| **Impact set**        | `affected[]` (`id`, `relationship`, `depth`), `source_id`, `path_sample[]`, `bounds` |
| **Path bundle**       | `paths[]`, `source_id`, `target_id`, `algorithm`, `bounds`                           |
| **Execution summary** | `job_id`, `algorithm`, `input_snapshot`, `duration_ms`, `warnings[]`, `truncated`    |

Every envelope carries its `bounds` and the provenance that lets staleness be detected. How those bounds and provenance fields behave — and why the result is **Inferred**, never canonical — is set out in [determinism and bounds](./determinism-and-bounds.md). The wire-level types live in the [contracts](../../04-contracts/CONTRACTS-AND-SCHEMAS.md).

---

## Heavy jobs run as accepted work

Centrality runs, large impact calculations, and projection-bound refreshes are costly, so they run as **accepted work** rather than blocking a command. A client submits an analytics command through the host IPC surface; the host routes it through the [accepted-work contract](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md); [Continuum](../../05-modules/continuum/README.md) orchestrates the run; Metis executes and emits the standard progress events. There is no Metis-specific polling protocol — clients observe the shared job-status model, and completion, cancellation, and failure with a useful message all arrive on the shared event contract.

Lightweight queries — a single-node lookup, a small projection read — may run inline. The boundary is determined by execution cost, not by caller preference. Naming the trade-off: routing everything through accepted work would add latency and ceremony to cheap reads; routing nothing through it would block the UI on an expensive centrality run. The cost threshold is the line between the two.

---

## What Metis does not own

Metis is one engine in an acyclic graph ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)); its boundary is as load-bearing as its output.

- **Semantics** — what a relationship _means_, which slots a type carries, how a domain question maps to a graph computation — belong to [Praxis](../../05-modules/praxis/README.md). Metis computes over a graph; it does not interpret it. Praxis frames the question and translates the evidence into domain language.
- **Storage** — the op log, the resolved facts, the projection a run reads — belongs to Mneme. Metis reads snapshots and projections through Mneme traits; it issues no direct database queries.
- **Orchestration** — the accepted-work surface, retries, and schedules — belongs to the host and Continuum. Metis executes a job; it does not manage the queue.
- **Telemetry** — counting how often a ranking is requested is [usage telemetry](./usage-telemetry.md), a separate concern with its own owner and rules. A Metis result must never be duplicated into a telemetry payload.

---

## Worked example — blast radius of the Stream Processor

A user asks: _if the `Stream Processor` technology component changes, what is affected?_ The seed dataset ([`baseline.yaml`](../../data/base/baseline.yaml)) gives the graph; the viewpoint is the base case, actual layer, as-of now.

`Stream Processor` (`n:technology:stream-processor`) `hosts` `Insight Hub` (`n:application:insight-hub`); `Insight Hub` `realises` `Customer Insight` (`n:capability:customer-insight`); `Customer Insight` `serves` `Discover` (`n:valuestream-stage:discover`). `Insight Hub` also `accesses` `Customer Profile` (`n:data-entity:customer-profile`).

A forward impact run from `n:technology:stream-processor` over the `hosts`/`realises`/`serves`/`accesses` relations returns an **impact set**:

| `id`                             | `relationship` (incoming) | `depth` |
| -------------------------------- | ------------------------- | ------- |
| `n:application:insight-hub`      | `hosts`                   | 1       |
| `n:data-entity:customer-profile` | `accesses`                | 2       |
| `n:capability:customer-insight`  | `realises`                | 2       |
| `n:valuestream-stage:discover`   | `serves`                  | 3       |

`source_id` is `n:technology:stream-processor`; `path_sample[]` carries one representative chain (`Stream Processor → Insight Hub → Customer Insight → Discover`). If a fanout or depth limit caps the walk, `bounds` records it and the envelope's result state is **Partial / Bounded** ([§9](../../02-standards/DOCUMENTATION-STANDARD.md)). With four reachable nodes and no limit hit, the result is **Fresh** and complete.

A complementary centrality run over the same `serves`/`realises`/`accesses`/`hosts` graph ranks `n:application:insight-hub` highly: it is the single application both hosted by the `Stream Processor` and realising a Strategic-tier capability that serves `Discover`, so it sits on the only path from technology to value for that stream. That ranking is a **ranked list** envelope with `n:application:insight-hub` among the top `items[]`, each item's `contributing_ids[]` naming the relationships that lifted its score.

---

## References & standards

_Normative:_

- Newman — _Networks_, 2nd ed., 2018. Centrality definitions and their interpretation.
- Page & Brin — **PageRank**, 1998; Freeman — **betweenness centrality**, 1977; Brandes — fast betweenness, 2001. Named, bounded centrality algorithms with stated complexity.
- Dijkstra, 1959; Bellman–Ford — shortest paths with complexity bounds.

_Informative:_

- Mitchell et al. — **Model Cards for Model Reporting**, 2019. Per-output disclosure where a result is ML-derived.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                      | What it covers                                                                 |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [Metis module README](../../05-modules/metis/README.md)                       | The engine at module level — algorithm selection, complexity, crate structure. |
| [determinism-and-bounds.md](./determinism-and-bounds.md)                      | Why every result is reproducible and how bounds and staleness surface.         |
| [ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) | The job and event contract heavy analytics ride on.                            |
| [CONTRACTS-AND-SCHEMAS.md](../../04-contracts/CONTRACTS-AND-SCHEMAS.md)       | The typed shapes of the result envelopes.                                      |
| [Continuum module README](../../05-modules/continuum/README.md)               | The orchestration that runs heavy jobs.                                        |
| [signal-surfaces/README.md](../signal-surfaces/README.md)                     | How rankings and risk diagnostics are presented.                               |
