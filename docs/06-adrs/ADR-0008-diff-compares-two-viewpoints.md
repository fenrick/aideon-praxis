# ADR-0008: Diffs Compare Two Viewpoints; Delta Kind Is Derived

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0001

## Context

Aideon Desktop is a bitemporal twin: every fact carries a valid-from (when it becomes true in the world) and an asserted
time (when the system was told). A **viewpoint** is the context a question is asked from — an as-of valid time, an as-of
asserted time, a layer (or layer policy, e.g. actual-only or actual-over-plan), and optionally a scenario and scope. A
**snapshot** is the twin's resolved state at one viewpoint. A **diff** compares two snapshots.

The earlier comparison contract assumed a **closed set of diff kinds** (`time_delta`, `scenario_delta`,
`scenario_vs_scenario`) and let each side carry only an as-of valid time plus a scenario. That shape cannot express the
asserted (belief) axis at all.

The consulting workflow makes the belief axis primary, not incidental. A consultant captures a client's state at the end
of Engagement 1 — asserted at that point, often including forward-dated projections — and later overlays new data
asserted more recently. The headline question is: _what did we believe at Engagement 1 versus what do we believe now_,
holding valid time constant or sweeping across it. A closed kind enum with no asserted coordinate has no way to ask it.

## Governance Framing

- **Decision type:** Stable seam — the shape of the comparison contract (what a diff takes as input and how its result
  is classified).
- **Known future pressure:** new comparison surfaces (plateau/diff exports, audit views, topology deltas); more
  viewpoint coordinates over time (scope refinements, future scenario modes).
- **What stays stable:** a diff is _always_ two viewpoints in, two snapshots resolved, one delta out; the delta's kind
  is read off the inputs.
- **What is provisional:** the exact enumeration of delta-kind labels and how scope is expressed.
- **Why hard to reverse:** the comparison shape is a contract consumed across the IPC boundary and by every diff/compare
  surface; changing it later breaks callers and stored requests.

## Decision

- **A diff compares two full viewpoints.** Each side carries the complete viewpoint — as-of valid time, as-of asserted
  time, layer (or layer policy), optional scenario, optional scope — not a reduced subset. There is no privileged
  coordinate.
- **The delta kind is derived, not chosen.** The system classifies a diff by inspecting which viewpoint coordinates
  differ between the two sides: valid-time delta, asserted/belief delta, layer delta (i.e. variance — plan vs actual),
  scenario delta, or a mixed delta when more than one differs. Callers do not pre-select a kind from a closed list.
- **The asserted and layer axes are first-class comparison dimensions**, equal to valid time and scenario. Comparing two
  beliefs at the same valid time, or plan against actual at the same valid time (variance), are supported ordinary diffs
  — not special cases bolted on.

This **supersedes the comparison section of
[`TEMPORAL-AND-SCENARIO-CONTEXT.md`](../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)** where it defines a closed
`kind` enum and omits the asserted coordinate from each side.

## Considered Options

- **Closed diff-kind enum (rejected).** Explicit and easy to validate, but closed: it cannot express belief-diffs
  without growing a new kind for every coordinate combination, and it had already omitted the asserted axis entirely.
  The taxonomy becomes a maintenance burden and still can't represent mixed deltas cleanly.
- **Two-viewpoint primitive with derived classification (chosen).** One concept — viewpoint in, delta out — that
  expresses every combination, including belief-diffs and mixed deltas, without enumerating them. The cost is that
  callers must supply a full viewpoint per side and the classification is implicit rather than declared; that cost is
  acceptable because the viewpoint is already the canonical query context everywhere else.

## Consequences

- Every comparison surface (plateau/diff exports, audit and topology-delta views, scenario comparison) is expressed as
  "two viewpoints in," and renders the derived delta kind rather than asking the caller to declare one.
- The comparison contract must carry the as-of asserted time on each side; the contract documentation and any generated
  request/response types are updated to drop the closed `kind` enum in favour of the derived classification.
- Belief-diffs (same valid time, two asserted times) are first-class and require no new contract surface beyond the
  viewpoint pair.
- Determinism is preserved: because a snapshot is a pure function of its viewpoint, a diff of two viewpoints is itself
  deterministic and cacheable, keyed on the two viewpoints.
