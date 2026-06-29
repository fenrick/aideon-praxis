# Chrona Time

The renderer's viewpoint controls, facing [Chrona](../../05-modules/chrona/README.md): selecting as-of time, layer, scenario, viewing a bounded diff, and handling merges. This is a shell-level shared surface every workspace adopts so time-first behaviour is consistent ([shell.md](../shell.md)); it is used most heavily inside [praxis-contributions](../praxis-contributions/README.md).

This README is the contract; [DESIGN.md](./DESIGN.md) carries the `useChrona` hook contract and the diff/merge UX detail.

## What it provides

- The viewpoint controls in the toolbar region — as-of time, layer, scenario/branch — always visible ([ux/time-and-scenario-ux.md](../../03-design/ux/time-and-scenario-ux.md)).
- The `useChrona` hook: the single golden `[state, actions]` contract for time context, reused across workspaces ([DESIGN.md](./DESIGN.md)).
- A bounded diff preview and a first-class merge/conflict UX.
- A human-readable time-context summary that propagates to every artefact execution.

## Faces

[Chrona](../../05-modules/chrona/README.md) — viewpoint resolution, layer policy, diff, and scenario composition. The renderer issues reads at a viewpoint and renders host-produced diffs and merge results; it never locally diffs or mutates a result ([state-architecture.md](../state-architecture.md)).

## State ownership

The `useChrona` hook owns the time-context UI-state (active branch, commit, layer, merge flow) and reads server-state (branches, commits, snapshot summary, diff) keyed by viewpoint ([data-fetching.md](../data-fetching.md)). The viewpoint is the cache coordinate for every workspace: changing it re-keys reads across the surface ([ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)).

## Boundaries

- Time is never ambient; the UI always shows and propagates explicit time context.
- The UI never fakes state by locally diffing or mutating artefact results.
- Scenario is a product overlay, not a VCS concept; the UI must not imply Git semantics.

## Running and testing

- Tests: `pnpm run node:test` — hook tests for state transitions (branch/commit/layer/merge-conflict), component tests for loading/error/empty, IPC mocked at the boundary ([testing.md](../testing.md)).

## Related documents

| Document                                                                                | What it covers                                   |
| --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| [DESIGN.md](./DESIGN.md)                                                                | The `useChrona` hook contract and diff/merge UX. |
| [Chrona](../../05-modules/chrona/README.md)                                             | The module this surface faces.                   |
| [TEMPORAL-AND-SCENARIO-CONTEXT.md](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The viewpoint contract the controls drive.       |
| [ux/time-and-scenario-ux.md](../../03-design/ux/time-and-scenario-ux.md)                | The behaviour-level time-and-scenario rules.     |
