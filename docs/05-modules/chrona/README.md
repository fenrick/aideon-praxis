# Chrona

The time-and-scenario interpretation module for Aideon Desktop. Chrona turns the bitemporal facts Mneme stores into coherent, honest temporal answers: what is true at a viewpoint, what changed between two viewpoints, how scenarios compose, and how plateaus and transitions read. It refuses to fake the present tense — every result names its active time, scenario, and comparison basis, and a time or scenario change triggers real re-resolution through Mneme, never a silent local mutation.

Chrona is named for _chronos_ — sequential, measurable, chronological time. It owns chronological and resolution time. Its planned counterpart **Kairos** owns _kairos_ — opportune time, the moment to act: investment and portfolio/programme/project planning ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md), [DOCUMENTATION-STANDARD §10](../../02-standards/DOCUMENTATION-STANDARD.md)). The pairing is deliberate: Chrona answers _when is this true and what changed?_; Kairos answers _when must we act, and what will it cost?_

---

## Contents

1. [Viewpoint resolution](./viewpoint-resolution.md) — the precedence chain and how Chrona drives it through Mneme.
2. [Layer policy](./layer-policy.md) — single-layer reads, blends, and side-by-side variance.
3. [Scenario composition](./scenario-composition.md) — overlay, rebase, compare, promote, discard.
4. [Diff](./diff.md) — two viewpoints in, a derived delta out; the derived delta kinds.
5. [Plateau and transitions](./plateau-and-transitions.md) — plateau markers and transitions, and how they relate to ArchiMate Plateau and Kairos backward planning.
6. [The re-resolution rule](./re-resolution-rule.md) — why a context change is always a fresh resolution, never a local patch.
7. [UX obligations](./ux-obligations.md) — what every temporal payload must carry to stay honest.
8. [Bounds and failure modes](./bounds-and-failure-modes.md) — diff size bounds, tie-breaking under skew, topology-delta ordering.

---

## One-line responsibility

Chrona interprets the [viewpoint](../../../CONTEXT.md) — as-of valid time, as-of asserted time, layer (or policy), scenario, scope — into [snapshots](../../../CONTEXT.md), [diffs](../../../CONTEXT.md), scenario compositions, and timeline payloads the renderer can use directly, with every result honest about its context and its limits.

Without Chrona, time handling spreads into UI widgets, IPC handlers, semantic services, and storage callers — and the product ends up telling three different stories about the same "what changed?" question, which is fatal for a product built on explainability.

---

## Core invariants

| Invariant                   | What it means                                                                                                                                               | Backed by                                                                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Explicit viewpoint**      | Every temporal result carries the active viewpoint; no ambient "now" is assumed.                                                                            | [time-first-rule](../../01-architecture/boundary/time-first-rule.md), [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md) |
| **Re-resolution on change** | A time or scenario change triggers real re-resolution through Mneme; Chrona never mutates a cached view in place and presents it as if the context changed. | [re-resolution-rule](./re-resolution-rule.md)                                                                                                                    |
| **Derived results**         | Chrona outputs are derived from canonical facts in Mneme; Chrona holds no authoritative storage.                                                            | [boundaries](#what-chrona-does-not-own)                                                                                                                          |
| **Honest partial states**   | A bounded or partially-resolved result names its limit explicitly rather than collapsing it silently.                                                       | [bounds-and-failure-modes](./bounds-and-failure-modes.md), [DOCUMENTATION-STANDARD §9](../../02-standards/DOCUMENTATION-STANDARD.md)                             |
| **Derived delta kind**      | A diff's delta kind is read off which viewpoint coordinates differ, never chosen from a closed list.                                                        | [ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)                                                                                               |
| **No metamodel internals**  | Chrona depends on contracts and DTO types only; it imports no metamodel or rule-engine internals.                                                           | [dependency-rules](../../01-architecture/boundary/dependency-rules.md)                                                                                           |

---

## What Chrona owns

- **Viewpoint resolution as a product concern** — driving Mneme's resolution chain and shaping the result ([viewpoint-resolution](./viewpoint-resolution.md), [layer-policy](./layer-policy.md)).
- **Scenario and plateau views** — baseline-vs-overlay reads, scenario compare, plateau markers and transitions ([scenario-composition](./scenario-composition.md), [plateau-and-transitions](./plateau-and-transitions.md)).
- **Temporal diffs and deltas** — snapshot diffs, topology deltas, and time-based summaries ([diff](./diff.md)).
- **UX-facing temporal payloads** — timeline segments, gap indicators, time-slider data, delta overlays, compare widgets ([ux-obligations](./ux-obligations.md)).

## What Chrona does not own

| Not Chrona's                                                | Owned by                            |
| ----------------------------------------------------------- | ----------------------------------- |
| Durable storage, the op log, and mechanical fact resolution | [Mneme](../mneme/README.md)         |
| Semantic modelling rules and the metamodel                  | [Praxis](../praxis/README.md)       |
| Generic analytics algorithms                                | [Metis](../metis/README.md)         |
| Orchestration and accepted-work lifecycle                   | [Continuum](../continuum/README.md) |
| Investment, portfolio, and backward planning                | Kairos _(planned)_                  |
| Shell layout, design system, and component behaviour        | Host / renderer                     |

Mneme stores time-aware facts and answers which fact wins. Praxis decides what the model means. Chrona interprets time and scenario so the rest of the system tells one story. The precise Mneme/Chrona seam is in [Mneme boundaries](../mneme/boundaries.md).

---

## Crate shape

The `chrona` crate lives at `crates/chrona/` and exposes three modules:

- **`temporal`** — the primary engine façade. `TemporalEngine` wraps the Praxis engine and exposes the IPC-friendly surface the host invokes: `state_at`, `diff_summary`, `topology_delta`, `resolve_snapshot`, `commit`, `create_branch`, `list_commits`, `list_branches`, `merge`, `meta_model`. All argument and result types are DTO-level structs; the engine holds no storage state of its own.
- **`scene`** — deterministic scene generation for the canvas (`generate_demo_scene()`), so the renderer can test against a known layout without a live twin.
- **`layout`** — layout helpers. `apply_rect_packing(shapes, max_row_width, spacing)` implements a row-based rectangle-packing heuristic (NFDH, matching `org.eclipse.elk.rectpacking` defaults).

Chrona depends upward through stable contracts only — Mneme traits for fact access, the Praxis engine façade for the semantic twin, DTO types for temporal and canvas shapes. It imports no Tauri, HTTP, or database driver; errors use `thiserror`, logging uses `tracing`.

---

## References & standards

_Normative:_

- Snodgrass — _Developing Time-Oriented Database Applications in SQL_, 1999. The bitemporal model Chrona interprets.
- Allen — _Maintaining Knowledge about Temporal Intervals_, 1983. The interval relations behind resolution and overlap ([viewpoint-resolution](./viewpoint-resolution.md)).

_Informative:_

- The Open Group — **ArchiMate 3.2 Specification**. The Plateau and Implementation & Migration vocabulary plateaus map to ([plateau-and-transitions](./plateau-and-transitions.md)).

## Related documents

| Document                                                                             | What it covers                                                 |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| [Temporal and scenario context](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The authoritative resolution, layer-policy, and diff contract. |
| [Projection and invalidation](../../04-contracts/PROJECTION-AND-INVALIDATION.md)     | Cache invalidation and projection lifecycle.                   |
| [Mneme module](../mneme/README.md)                                                   | The storage and mechanical resolution Chrona builds on.        |
| [Time-first rule](../../01-architecture/boundary/time-first-rule.md)                 | Why every read and write carries a viewpoint.                  |
| [UX-DESIGN](../../03-design/UX-DESIGN.md)                                            | The full UX contract Chrona's payloads feed.                   |
| [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)       | Kairos, Chrona's opportune-time counterpart.                   |
