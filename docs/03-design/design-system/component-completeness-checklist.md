# Component Completeness Checklist

The variants a block must ship before it is considered done. This file is for anyone building a block or reviewing one for merge. A block that renders only its happy path is not finished — Aideon surfaces live data with latency, partial results, and model output, and every block that touches that data ships the states for it.

---

## The rule

Every block that renders content **must** ship the loading, error, empty, and honest-state variants that content can be in ([honest-state-treatments.md](./honest-state-treatments.md)). These are not optional extras added later; they are part of the block, built from the shared honest-state blocks, not re-invented per surface.

## The checklist

A content-rendering block is complete only when every box holds:

- [ ] **Loading** — a `Skeleton` proportional to the expected content shape; no spinner-only default; no layout shift on arrival ([density-and-calm.md](./density-and-calm.md)).
- [ ] **Empty** — a purposeful `EmptyState` with a contextual message and suggested action; not a generic placeholder.
- [ ] **Error / Failed** — an `ErrorFrame` with a user-facing message, a retry action, and optional detail; never a blank surface; partial results, if any, shown with explicit coverage.
- [ ] **Partial / Bounded** — a `PartialBanner` stating coverage where a fanout, depth, size, or time limit can cap the result; never silent truncation.
- [ ] **Stale** — a `StaleBadge` driven by freshness status where the content can go stale ([ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)).
- [ ] **Rebuilding / In progress** — a `RebuildingIndicator` keeping prior values visible where a derived result can recompute.
- [ ] **Content classification** — a `ProvenanceBadge` where the content can be Asserted, Inferred, or Generated, satisfying the greyscale obligation ([honest-state-treatments.md](./honest-state-treatments.md)).
- [ ] **All interaction states** — hover, focus, active, disabled, and (where applicable) selected, per [interaction-states.md](./interaction-states.md).
- [ ] **Target size** — interactive targets meet `size.target.min` (24 px) ([interaction-states.md](./interaction-states.md)).
- [ ] **Keyboard + ARIA** — the relevant APG pattern, focus management, and announcement ([accessibility.md](./accessibility.md)).
- [ ] **Reduced motion** — any transition uses a motion token and degrades to instant ([motion.md](./motion.md)).
- [ ] **Tokens only** — no hard-coded colour, size, radius, or duration ([tokens.md](./tokens.md)).
- [ ] **Domain-free** — content arrives through slots; no domain type, layer, scenario, or status string in the block ([README.md §2](./README.md#2-the-domain-free-boundary)).

A block whose content genuinely cannot reach a state (a static separator has no loading state) records that the state is not applicable rather than silently omitting it, so a reviewer can tell the difference between "not applicable" and "forgotten".

## Why this is a hard rule

The honest-state obligations the product carries to its users ([trust-and-honesty.md](../trust-and-honesty.md)) only hold if every surface honours them, and surfaces only honour them cheaply if the blocks ship the states by default. A block that omits its empty or error state pushes that work onto every feature that uses it, where it drifts into ad-hoc loaders and one-off status colours — exactly what the design system exists to prevent ([README.md §4](./README.md#4-what-the-design-system-must-make-easy-and-prevent)).

## Related documents

| Document                                                   | What it covers                                       |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| [honest-state-treatments.md](./honest-state-treatments.md) | The honest-state blocks the variants are built from. |
| [blocks.md](./blocks.md)                                   | The blocks this checklist applies to.                |
| [interaction-states.md](./interaction-states.md)           | The interaction-state and target-size requirements.  |
| [accessibility.md](./accessibility.md)                     | The keyboard and ARIA requirements.                  |
| [trust-and-honesty.md](../trust-and-honesty.md)            | Why completeness is an honesty obligation.           |
