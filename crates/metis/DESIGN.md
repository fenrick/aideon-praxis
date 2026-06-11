# Metis Analytics – Design

## Purpose & scope

Metis implements **analytics** over the Praxis digital twin. It is responsible for deterministic,
bounded algorithms and for shaping outputs into explainable, UI-consumable results.

Metis is not a UI layer and does not own persistence. It consumes time-context snapshots from
Praxis/Mneme and produces analytics outputs suitable for:

- on-demand artefacts (rankings, diagnostics, impact reports),
- background jobs (long-running analytics with progress),
- explainability surfaces (why a result is true).

This document defines the target end state.

## Allowed dependencies / frameworks

- Rust 2024 with workspace defaults.
- `tokio` for async where needed, `serde`/`serde_json` for payloads, `thiserror` for error types,
  `tracing` + `log` facade for metrics/observability.
- Graph/metrics helpers (e.g., `petgraph`) are acceptable; keep them behind crate-local abstractions.
- Depends on `praxis` for time-context reads and `mneme` for persistence traits.

## Anti-goals

- No UI, Tauri, or renderer logic.
- No direct DB access; use Mneme traits to obtain data when persistence is required.
- Avoid bespoke math/graph scaffolding when proven crates exist.

## Architecture

### Position in the stack

- Renderer: requests analytics via typed IPC; renders results (tables, badges, overlays).
- Host: runs analytics as jobs when heavy; enforces capability gating; emits `job_*` events.
- Metis: runs algorithms against snapshots and produces explainable outputs.
- Praxis/Mneme: provide time-context snapshots and projections; store durable results when needed.

### Determinism and explainability (non-negotiable)

Metis outputs must be:

- deterministic for a given input (same snapshot + same parameters ⇒ same output),
- bounded (fanout/size/time limits are explicit and enforced),
- explainable (results carry evidence: paths, counts, contributing edges).

### Data access model

Metis should prefer consuming **projection-friendly** graph views rather than raw storage:

- input is a snapshot or a bounded adjacency stream
- algorithms operate on stable node/edge ids
- outputs are stable ids + derived metrics (scores, ranks, deltas)

## Public surface (target)

- Traits and structs for analytics jobs (snake_case job kinds such as `analytics_centrality`,
  `analytics_impact`, `analytics_shortest_path`, `finance_tco`, and other temporal/diagnostic
  summaries as needed).
- Deterministic helpers to run algorithms against engine snapshots; testable without I/O.

### Analytics requests (conceptual)

Metis should expose an API shaped around **requests** and **results**, not around “run algorithm X
over raw DB”.

Examples of request categories (names shown here are conceptual; IPC/job identifiers should be
snake_case):

- centrality (degree, betweenness, closeness; optional scope)
- impact (seed refs + filters; bounded traversal)
- shortest path (from/to, constraints, max depth)
- tco (scope + policies, time context)
- diagnostics (connectivity gaps, integrity adjacency summaries)

### Result shaping rules

All results must include:

- `metadata` (time context, parameters, fetched_at/ran_at, source)
- boundedness indicators (limits applied, truncated flags, warning messages)
- stable ids (node_id/edge_id) rather than display strings where possible
- explainability evidence when applicable (paths, contributing edges, counts)

## Performance and scaling

Metis must handle “medium” workspaces interactively and “large” workspaces via jobs.

Guidelines:

- prefer streaming/iterator outputs for large result sets
- avoid materializing full adjacency for huge graphs when a bounded traversal suffices
- choose algorithms with predictable complexity and clear upper bounds
- support early termination when bounds are hit and return a warning + partial results

Align with `docs/ROADMAP.md` SLOs for interactive artefacts and background jobs.

## Testing strategy

Metis must be testable without external services and without UI:

- unit tests for each algorithm on small synthetic graphs
- determinism tests (stable ordering, stable tie-breakers)
- boundedness tests (limits applied; truncation flags set)
- explainability tests (returned paths/evidence match known fixtures)

Golden datasets:

- small graphs (10–200 nodes) for correctness
- medium graphs (5k/50k) for performance envelopes and regression detection

## Error model

Metis errors should be typed and map cleanly into host error envelopes:

- invalid_input (bad parameters, impossible constraints)
- not_found (seed refs missing)
- limit_exceeded (bounds hit in a way that prevents meaningful output)
- internal_error (unexpected failures)

## Delivery posture (evergreen)

Prefer landing Metis incrementally:

- start with one deterministic algorithm + full test coverage + explainability shape
- wire through host job orchestration only when the algorithm is heavy enough to require it
- keep the API stable; add parameters additively

## Evergreen notes

- Migrate any legacy JS/TS prototypes or ad-hoc Rust helpers to shared, typed Rust implementations.
- Prefer streaming/iterator-based outputs over large JSON blobs to meet performance targets.
