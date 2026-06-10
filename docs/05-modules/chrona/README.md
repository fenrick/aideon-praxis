# Chrona

Chrona provides temporal interpretation and UX primitives: what is true at time T, diffs between times and scenarios, scenario overlays, plateau/compare payloads, and the temporal helpers the renderer consumes. It refuses to fake the present tense — every result names its active time, scenario, and comparison basis; time and scenario changes trigger real re-resolution through Mneme, never silent local mutation.

---

## Purpose

The Aideon model is time-first by design. Someone has to interpret time, scenario, and layer consistently enough that the product does not tell different stories from one surface to the next. Chrona keeps that work in one place.

Without this module, time handling spreads into UI widgets, API handlers, semantic services, and storage callers. That is how systems end up with three different answers to the same "what changed?" question — a bad look for a product built around explainability.

---

## Core invariants

| Invariant | What it means |
|---|---|
| **Explicit temporal context** | Every temporal result carries the active `TemporalContext` — `effective` time, `resolution.layer`, and `scenario_id` if set. No ambient time is assumed. |
| **Re-resolution on change** | A time or scenario change triggers real re-resolution through Mneme. Chrona never mutates a cached view in place and presents it as if the context had changed. |
| **Derived results** | Chrona outputs are derived from canonical facts in Mneme. Chrona does not hold authoritative storage. |
| **Honest partial states** | Where a result is bounded or partially resolved, the payload names the limit explicitly rather than silently collapsing it. |
| **No metamodel internals** | Chrona depends on contracts and DTO-level types from Praxis. It does not import metamodel or rule engine internals from other crates. |

---

## What Chrona owns

### 1. Time-slice resolution

Chrona answers bounded questions about the twin at a given context:

- state at a valid-time instant or interval
- state within a scenario overlay
- layer-aware reads (`actual` vs `plan`)
- state comparisons across time slices

This is not raw storage filtering. It is the module-level logic that turns the temporal resolution rules into coherent answers. The full resolution rule chain — valid-time containment, layer precedence, interval specificity, asserted-time ordering, op-id tie-break — is defined in [`docs/04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md`](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md).

### 2. Scenario and plateau views

Scenarios, plateaus, and what-if overlays are first-class product concepts. Chrona owns the shaping needed for:

- baseline vs overlay reads
- scenario-vs-baseline compare
- scenario-vs-scenario compare
- plateau markers and transitions
- time-aware overlays in visual surfaces

### 3. Temporal diffs and deltas

Chrona is the natural home for:

- state diffs between two effective instants
- topology deltas between commit references
- time-based summaries
- timeline-friendly aggregates

These are temporal products in their own right, not generic analytics and not plain storage reads.

### 4. UX-facing temporal payloads

Chrona shapes payloads that the renderer can use directly:

- timeline segments and gap indicators
- time-slider update data
- delta overlays and plateau markers
- scenario-aware highlights in workspaces
- compare widget data

Chrona is not the UI, but it returns data the UI does not have to reverse-engineer.

---

## What Chrona does not own

| Not Chrona's | Owned by |
|---|---|
| Durable storage and the op log | [Mneme](../mneme/README.md) |
| Semantic modelling rules | Praxis |
| Generic analytics algorithms | Metis |
| Workflow orchestration and accepted-work lifecycle | Continuum |
| Shell layout and design system | Host / renderer |
| Arbitrary UI component behaviour | Renderer |

Mneme stores time-aware facts. Praxis decides what the model means. Chrona interprets time and scenario in a way the rest of the system can use.

---

## Crate shape

The `chrona` crate lives at `crates/chrona/` and exposes three modules.

### `temporal`

The primary temporal engine façade. `TemporalEngine` wraps `PraxisEngine` and exposes the IPC-friendly surface the Tauri host invokes:

| Method | Description |
|---|---|
| `state_at(StateAtArgs)` | Snapshot statistics at a given commit reference. |
| `diff_summary(DiffArgs)` | Diff summary between two commit references. |
| `topology_delta(TopologyDeltaArgs)` | Topology delta between two commit references. |
| `resolve_snapshot(CommitRef, Option<String>)` | Resolve a `GraphSnapshot` for a reference and optional scenario. |
| `commit(CommitChangesRequest)` | Commit a change set to the underlying Praxis engine. |
| `create_branch(name, Option<CommitRef>)` | Create a branch from an optional base reference. |
| `list_commits(branch)` | List commits for a branch oldest-to-newest. |
| `list_branches()` | Enumerate branches with their current heads. |
| `merge(MergeRequest)` | Merge one branch into another. |
| `meta_model()` | Return the active meta-model document. |

All argument and result types are DTO-level structs from `aideon_praxis::temporal`. The engine holds no storage state of its own; persistence flows through `PraxisEngine` and ultimately through Mneme traits.

### `scene`

Scene generation utilities for the canvas. `generate_demo_scene()` produces a stable, deterministic set of `CanvasShape` values so the renderer can test against a known layout without a live twin connection.

### `layout`

Layout helpers. `apply_rect_packing(shapes, max_row_width, spacing)` implements a row-based rectangle-packing algorithm (NFDH heuristic, matching `org.eclipse.elk.rectpacking` defaults). Shapes are sorted by height descending and packed left-to-right into rows; a new row starts when the next shape would overflow `max_row_width`.

---

## Temporal result families

Chrona's public outputs group into four families. Every response in each family carries enough context to stay interpretable without inspecting the request:

| Family | Key fields |
|---|---|
| `state_at` | effective time, scenario identity, resolution layer, fact count |
| `diff` | left ref, right ref, added/removed/changed counts, scenario if set |
| `topology_delta` | left ref, right ref, node and edge deltas, scenario if set |
| timeline aggregates | segments, plateau markers, gap indicators, active effective range |

Where a result is partial or bounded, a `warnings` field names the limit.

---

## Comparison context

Range and diff reads carry an explicit `ComparisonContext` rather than a single `effective`:

```json
{
  "kind": "scenario_delta",
  "left":  { "as_of": "2026-06-10T00:00:00Z", "scenario_id": null },
  "right": { "as_of": "2026-06-10T00:00:00Z", "scenario_id": "scn_plan_q3" }
}
```

Allowed `kind` values are `time_delta`, `scenario_delta`, and `scenario_vs_scenario`. The full contract is in [`docs/04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md`](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md).

---

## Re-resolution rule

When the renderer changes the active time or scenario, it must request a fresh resolution — it must not apply a delta to the previous payload or mutate visible state locally. The sequence is:

1. Renderer dispatches a Tauri command carrying the new `TemporalContext`.
2. `TemporalEngine` resolves against Mneme with the updated context.
3. The full result payload is returned and replaces the previous view.

This rule is unconditional. There is no "small change" optimisation that bypasses re-resolution. Cache invalidation and projection lifecycle are governed by [`docs/04-contracts/PROJECTION-AND-INVALIDATION.md`](../../04-contracts/PROJECTION-AND-INVALIDATION.md).

---

## Dependency posture

Chrona depends upward through stable contracts only:

| Dependency | Via |
|---|---|
| Time-aware fact access | Mneme traits (`aideon_mneme`) |
| Semantic twin and commit model | Praxis engine façade (`aideon_praxis`) |
| Temporal DTO types | `aideon_praxis::temporal` |
| Canvas shape types | `aideon_praxis::canvas` |

Chrona does not import Tauri, HTTP servers, or database drivers directly. No bespoke async runtimes beyond the workspace `tokio` default. Errors use `thiserror`; logging uses the `tracing` + `log` façade.

---

## UX obligations

Because Chrona feeds every temporal surface in the renderer, the UX contract it must satisfy is:

- Every temporal result names the active time, scenario, and comparison context explicitly.
- Temporal diffs stay explainable: the result must be traceable to what changed, between which contexts, and which scenario or layer contributed.
- Plateau, compare, and overlay payloads fit the shared shell and inspector model.
- Bounded or simplified temporal views expose their limits honestly via `warnings`.
- The active time and scenario are always visible in the primary workspace — Chrona supplies the data that makes those controls truthful.

See [`docs/03-design/UX-DESIGN.md`](../../03-design/UX-DESIGN.md) for the full UX contract.

---

## References

- [Temporal and Scenario Context contract](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)
- [Projection and Invalidation](../../04-contracts/PROJECTION-AND-INVALIDATION.md)
- [UX Design](../../03-design/UX-DESIGN.md)
- [Mneme module](../mneme/README.md)
- [Module Dependency Map](../../01-architecture/MODULE-DEPENDENCY-MAP.md)
- [Crate design notes](../../../crates/chrona/DESIGN.md)
