# Plateau and transitions

How Chrona represents plateaus — stable states of the architecture at points in time — and the transitions between them,
and how those relate to the ArchiMate Plateau concept and to Kairos's backward planning. Plateau and transition handling
is **design intent** where it depends on the planned Kairos module; the temporal mechanics it rests on (viewpoints,
diffs) are implemented.

---

## What a plateau is

A **plateau** is the resolved state of the twin — a [snapshot](../../../CONTEXT.md) — at a marked point in time that the
product treats as a meaningful, stable waypoint rather than an arbitrary instant. A roadmap is a sequence of plateaus:
"where we are now", "where we are after the FY26 modernisation", "the target state". A **transition** is the change
between two adjacent plateaus — which is, mechanically, a [diff](./diff.md) of the two plateau viewpoints.

This maps directly onto the ArchiMate Implementation & Migration layer _(The Open Group, ArchiMate 3.2 Specification)_:
an ArchiMate **Plateau** is "a relatively stable state of the architecture that exists during a limited period of time",
and a **Gap** / transition is the difference between two plateaus. Chrona adopts the vocabulary so a plateau view
exports cleanly to ArchiMate and reads correctly to an enterprise architect
([standards register](../../02-standards/STANDARDS-REGISTER.md)).

---

## Plateau markers and transitions

Chrona shapes two payloads the renderer consumes directly:

- **Plateau markers** — a marked viewpoint (typically an as-of valid time, a layer policy, and optionally a scenario)
  with a label, so a timeline can render the waypoint and a user can resolve the twin _at_ it.
- **Transitions** — the derived delta between two adjacent plateau markers, expressed as a [topology delta](./diff.md)
  and a slot-level diff, deterministically ordered so the transition renders the same way every time.

A transition is not a stored object; it is derived from the two plateau viewpoints on demand, exactly like any diff.
This keeps a roadmap honest: change a plateau's date or layer policy and every transition touching it re-derives, rather
than drifting from a cached delta ([re-resolution-rule](./re-resolution-rule.md)).

### Plateau transition semantics (an explorer gap, addressed)

The semantics of a transition are the semantics of the diff between its two plateaus ([diff](./diff.md)). Two points
need stating:

- **A transition's delta kind is derived.** Two plateaus at different valid times yield a valid-time transition; a
  plateau in the base case versus a plateau in a scenario yields a scenario transition; a plan-layer target plateau
  against an actual-layer current plateau yields a layer (variance) transition. The transition does not carry a
  pre-chosen kind — it is read off the two plateau viewpoints
  ([ADR-0008](../../06-adrs/ADR-0008-diff-compares-two-viewpoints.md)).
- **Transitions are ordered and composable.** A roadmap of N plateaus has N−1 adjacent transitions, each
  deterministically ordered ([diff](./diff.md), topology-delta ordering). Composing two adjacent transitions (plateau
  A→B then B→C) must agree with the direct A→C diff on the net change — the transitions are differences of snapshots,
  and snapshot differences compose, so the design holds itself to that consistency.

---

## Relation to Kairos backward planning

Chrona owns chronological time — _what is true when, and what changed_. The planned **Kairos** module owns opportune
time — _when must we act, and what will it cost_
([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)). Plateaus are the shared seam:

- Kairos's **backward planning** anchors a **Target Plateau** at a target date `T`, computes the **Gap** from the
  baseline plateau, and schedules work packages backwards from `T` to fill the gap
  ([ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md),
  [backward-planning](../../03-design/forces-of-change/backward-planning.md)).
- Chrona supplies the temporal primitive: it resolves the baseline plateau and the (scenario, plan-layer) Target
  Plateau, and derives the transition between them — which _is_ the Gap, expressed as a diff.
- Kairos plans the work to close that Gap; **Continuum executes** the committed work
  ([Continuum README](../continuum/README.md)). Chrona neither plans nor executes — it renders the time the plan is laid
  out against.

The division is clean: Chrona resolves and diffs plateaus; Kairos sizes and schedules the transition between them;
Continuum runs it. Plateau and transition _rendering_ is Chrona's today; plateau _planning_ is Kairos's when it lands,
and is marked design intent until then.

---

## Worked example — a two-plateau roadmap for Automation Orchestrator

An architect builds a minimal roadmap for `Automation Orchestrator`:

- **Plateau "Now"** — viewpoint _{as-of valid time 2026-06-11, layer actual, base case}_. Resolves
  `disposition = Migrate`, hosted relationship intact, `realises` the `Automation Fabric` capability.
- **Plateau "Target FY27"** — viewpoint _{as-of valid time 2027-01-01, layer plan, scenario scn_consolidation}_.
  Resolves `disposition = Invest` (the consolidation intent).

The **transition** "Now → Target FY27" is the derived diff of the two plateau viewpoints. Because both the valid-time
and the layer-and-scenario coordinates differ, the derived delta kind is a **mixed delta**; it reports
`disposition: Migrate → Invest` and any topology change (e.g. a new `realises` relationship the plan adds),
deterministically ordered. This transition is the Gap that Kairos would size and schedule, and that Continuum would
execute on promotion — but the _rendering_ of the roadmap is Chrona's, derived live from the two viewpoints.

---

## References & standards

_Informative:_

- The Open Group — **ArchiMate 3.2 Specification**. The Plateau and Gap concepts in the Implementation & Migration
  layer.
- The Open Group — **TOGAF Standard, 10th Edition**. ADM Phases E/F (Opportunities & Solutions, Migration Planning) the
  plateau/transition view supports.

## Related documents

| Document                                                                       | What it covers                                                 |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| [Diff](./diff.md)                                                              | The derived-delta machinery a transition is built from.        |
| [Scenario composition](./scenario-composition.md)                              | Plateaus that live in scenarios.                               |
| [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md) | Kairos, backward planning, and the Target Plateau / Gap model. |
| [Backward planning](../../03-design/forces-of-change/backward-planning.md)     | How Kairos schedules from a target plateau.                    |
| [Continuum run and step lifecycle](../continuum/run-and-step-lifecycle.md)     | Execution of the work a transition implies.                    |
