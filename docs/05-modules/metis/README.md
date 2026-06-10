# Metis

Deterministic analytics engine for the Aideon Desktop twin: ranking, impact, path analysis, and cost jobs over bounded graph snapshots.

## Purpose

Metis is the analytical layer of Aideon Desktop. It computes scores, rankings, impact sets, paths, and cost-oriented results against the Praxis twin at an explicit time and scenario context. Every result is derived — never canonical — and reproducible for the same input snapshot. The human remains the authority; Metis produces signals and evidenced artefacts that support judgement, not decisions that replace it.

## What Metis Computes

| Capability family | Representative jobs |
|---|---|
| **Centrality and ranking** | PageRank-style node scoring, concentration analysis, hotspot identification |
| **Impact and blast radius** | Upstream/downstream impact sets, dependency spread |
| **Path and reachability** | Shortest paths, reachability queries, dependency chains |
| **Risk and diagnostics** | Concentration risk, structural weak points, result warnings |
| **Cost and optimisation** | TCO rollups, scenario-sensitive comparisons, cost-oriented metrics |
| **Temporal summaries** | Change summaries and comparison across time or scenario contexts |

Each family exposes typed Rust traits and structs: `Analytics.Centrality`, `Analytics.Impact`, `Analytics.ShortestPath`, `Finance.TCO`, and `Temporal.*` summaries as required by accepted-work consumers.

## Determinism and Reproducibility

Analytics in Metis are deterministic and reproducible. Every job runs against a declared input:

- a workspace or partition boundary
- an explicit point-in-time and optional scenario context
- a filtered graph projection or snapshot

Given the same input, the same algorithm produces the same output. This is a hard invariant. No analytics job reads ambient mutable state or derives results from a non-deterministic source.

See [PROJECTION-AND-INVALIDATION](../../04-contracts/PROJECTION-AND-INVALIDATION.md) for how snapshots and projection validity are managed.

## Derived, Not Canonical

Metis outputs are derived results — computed artefacts over a model owned by Praxis and persisted by Mneme. They are never the source of truth for any entity, relationship, or state. A result carries the time and scenario context at which it was computed. Consumers treat it as a view of the model at that instant, not as a durable fact about the world.

Results become stale when their underlying projection is invalidated. Metis does not update entity state; it produces analytical outputs that downstream surfaces present to the user.

## Accepted-Work Execution

Heavy analytical jobs — centrality runs, large impact calculations, path analysis over dense graphs — execute as accepted work. Clients submit an analytics command through the host; the platform issues an `AcceptedJob` and routes execution through the worker contract. Metis emits typed progress events as work proceeds and a completion envelope when the job finishes.

Clients observe the standard accepted-work status model. There is no Metis-specific polling protocol.

See [ACCEPTED-WORK-AND-EVENTS](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) for the job lifecycle and event contracts.

## Honest Execution Bounds

Every result envelope carries execution metadata:

- **Truncation flags** — when the output was bounded to stay within memory or time limits
- **Approximation markers** — when an algorithm used a bounded approximation rather than an exact computation
- **Warnings** — when input quality, coverage, or completeness affects confidence in the result
- **Algorithm parameters** — the declared parameters under which the job ran, for reproducibility

Metis does not suppress execution facts. A result that required truncation says so. A result computed under incomplete data carries a warning rather than silent overconfidence.

## Typed Analytical Evidence

Results are structured, not free-form blobs. Each output carries the evidence that supports it:

- ranked items with scores and contributing factors
- impact sets with supporting dependency paths
- path bundles with node and edge sequences
- top contributors and affected-entity sets
- algorithm metadata and execution timing

This evidence layer exists so that the rest of the product — artefacts, dashboards, inspector surfaces, report views — can present results with honest supporting detail. See [ANALYTICS](../../03-design/ANALYTICS.md) and [SIGNAL-SURFACES](../../03-design/SIGNAL-SURFACES.md) for how analytical outputs surface in the product.

## Performance-Aware Execution

Analytics is the highest-cost computation in the system. Metis manages this through:

- **Bounded execution** — jobs declare memory and time budgets; execution halts and reports when bounds are reached
- **Streaming and iterator-shaped outputs** — results flow as iterators rather than fully materialised blobs where the output size is large
- **Typed summaries with drill-down** — top-level result surfaces receive a typed summary; detailed evidence is available on demand
- **Deterministic algorithm selection** — algorithm variants are chosen for reproducibility, not just raw speed

Graph and metrics computation uses established crates (such as `petgraph`) behind crate-local abstractions. Metis does not re-implement proven graph primitives.

## Dependency Posture

Metis depends on Praxis and Mneme through narrow traits. It never accesses persistence internals directly and never imports Mneme or Praxis implementation details. Neither Praxis nor Mneme depends on Metis. The dependency graph is strictly one-directional: Metis → contracts → Praxis/Mneme.

```
Metis
  └─ reads snapshots and projections via Mneme traits
  └─ reads time-context via Praxis traits
  └─ emits results via accepted-work and event contracts
  └─ no Tauri, no UI, no direct DB access
```

See [MODULE-DEPENDENCY-MAP](../../01-architecture/MODULE-DEPENDENCY-MAP.md) for the full cross-module boundary diagram.

## Crate Structure

```
crates/metis/
├── src/
│   ├── analytics/         # Capability families: centrality, impact, path, risk, cost
│   ├── engine/            # Snapshot reader adapters, algorithm orchestration, bounded execution
│   ├── jobs/              # Accepted-work handlers, progress events, completion envelopes
│   ├── result/            # Typed result shapes, evidence structures, execution metadata
│   └── lib.rs
└── DESIGN.md
```

The crate exposes only traits, typed structs, and deterministic helpers. All algorithm implementations are testable without I/O. No UI, renderer, or Tauri dependency is permitted in this crate.

## Integration with the Platform

| Platform surface | Metis role |
|---|---|
| Accepted-work commands | Receives analytics job requests; emits progress and completion events |
| Projection contracts | Reads bounded, filtered graph snapshots for deterministic input |
| Artefacts and dashboards | Supplies typed result envelopes, ranked lists, impact graphs, and evidence payloads |
| Inspector and drill-down surfaces | Provides per-result evidence: contributors, paths, affected sets, warnings |
| Report surfaces | Delivers scored tables, risk views, and cost summaries |

Metis is the engine that gives these surfaces something defensible to show. It does not own layout, workflow status UX, or dashboard structure.

## Related Documents

- [Analytics design](../../03-design/ANALYTICS.md)
- [Signal surfaces](../../03-design/SIGNAL-SURFACES.md)
- [Accepted-work and events contract](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)
- [Projection and invalidation contract](../../04-contracts/PROJECTION-AND-INVALIDATION.md)
- [Module dependency map](../../01-architecture/MODULE-DEPENDENCY-MAP.md)
- [Praxis module](../praxis/README.md)
- [Mneme module](../mneme/README.md)
