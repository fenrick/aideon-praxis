# Chrona Time — Internal Design

The `useChrona` hook contract and the diff/merge UX. This file is for anyone building or reusing the viewpoint controls. The package contract is in [README.md](./README.md).

---

## Scope

Chrona time UX is the renderer-facing contract for selecting a scenario/branch and a commit reference, choosing a layer (plan/actual), viewing a bounded diff preview, handling merges including conflicts, and surfacing a time-context summary that applies to every artefact. It is a shell-level pattern: the renderer keeps a single golden implementation and reuses it across workspaces ([shell.md](../shell.md)).

## Explicit intent

- Time is never ambient; the UI always shows and propagates explicit time context.
- The UI never fakes state by locally diffing or mutating artefact results ([state-architecture.md](../state-architecture.md)).
- Time navigation is safe: bounded results, explainable output, clear error states, no silent fallbacks.
- Scenario is a product overlay, not a VCS concept; the UI must not imply Git semantics.

## Vocabulary

- `branch` — a scenario branch identifier.
- `commitId` — an immutable commit reference.
- `asOf` — the read reference: a selected `commitId`, or the latest commit on the selected `branch`.
- `layer` — plan/actual (the shared `Layer` DTO).
- time context — `{ branch?, commitId?, layer }` plus any workspace-scoped scenario id; the renderer-facing projection of the full `Viewpoint` ([TEMPORAL-AND-SCENARIO-CONTEXT.md](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)).

## The `useChrona` hook contract

The golden implementation is the `useChrona` hook returning `[state, actions]` ([state-architecture.md](../state-architecture.md)). The code location may change; this contract is the source of truth.

### State (required)

- `branches[]` and the active `branch`.
- `commits[]` and the active `commitId`.
- `layer` (plan/actual).
- `snapshot` summary for the selected reference (bounded, UI-friendly).
- `diff` preview between recent references (bounded).
- `loading` / `snapshotLoading` flags.
- `error` (human-readable, mapped from the envelope, [error-loading-empty.md](../error-loading-empty.md)).
- merge flow state (`merging`, `mergeConflicts`).

### State (derived, recommended)

- `timeContextSummary` — a short human-readable string, e.g. "Plan · Scenario: CX Redesign · Commit: c42" or "Actual · Scenario: baseline · Latest".
- `isDirtyContext` — whether there are pending changes that would be committed (workspace-owned).
- `canMerge` — merge prerequisites satisfied and capability allows it.
- `canCommit` — staged changes exist and capability allows it (workspace-owned).

### Actions (required)

- select branch; select commit (including clearing); select layer; refresh branches; merge branch into baseline or a selected target.

## Behaviour rules

**Branch and commit selection.** Selecting a branch refreshes the commit list, the snapshot for the latest commit, and the bounded diff. Selecting a commit refreshes its snapshot. A branch with no commits shows a clear empty state, not a silent failure. Switching branches never keeps a stale `commitId` from the previous branch. A snapshot load failure does not erase the prior snapshot unless the UI explicitly transitions to an error state that explains why.

**Layer switching.** Switching layer refreshes the snapshot for the active reference and applies consistently to every artefact execution. It does not change the selected branch/commit, and it **must** update any persistence key that includes layer — including the canvas layout snapshot key ([praxis-workspace](../praxis-workspace/DESIGN.md)).

**Diff preview.** The diff is bounded and shows the reference pair (`from`, `to`), summary counts (adds/mods/dels), and a truncation warning when limited. It defaults to the most recent two commits in the active branch and labels what it represents (e.g. "Diff: previous → latest"). The diff kind is derived from which viewpoint coordinates differ, not chosen up front ([CONTEXT.md](../../../CONTEXT.md)).

**Merge flow.** Merge is a host-managed operation; the renderer never auto-resolves. Conflicts are first-class: the UI shows a conflict list with stable identifiers and messages, offers "view conflicts" as the primary next action, keeps the user in the same time context, and offers a return-to-safe-state path with no partial merges ([ux/multi-user-conflict-ux.md](../../03-design/ux/multi-user-conflict-ux.md)). The merge CTA is disabled when there is no active branch, the branch is already baseline, capability disallows merge, or a merge is in progress. A copy-to-clipboard diagnostic summary is provided for support.

## Loading, error, empty

A loading state does not block the workspace; artefacts keep rendering against the last known good context where safe ([error-loading-empty.md](../error-loading-empty.md)). Errors map by code to a human-readable message and a next action — not-permitted → "request access"; not-found → refresh; invalid input → explain the input; internal → "open Status / copy diagnostics" ([error-loading-empty.md](../error-loading-empty.md)). Empty states (no branches/commits) explain how to create initial state.

## Accessibility

All controls are keyboard reachable; branch/commit lists carry accessible labels and announce selection changes; a time-context change announces via an `aria-live` region ("Time context updated…") ([accessibility.md](../accessibility.md)). Plan/actual and scenario state are never colour-only.

## Testing

Hook tests cover the state transitions — branch select, commit select, layer change, merge-conflict handling — and assert the viewpoint is part of the cache key ([testing.md](../testing.md)). Component tests cover loading/error/empty rendering. IPC is mocked at the boundary. Minimum fixtures: branch list empty/single/multiple; commits none/one/many; snapshot present/absent/loading/error; merge success/conflicts/failure.

## Related documents

| Document                                                                                | What it covers                                    |
| --------------------------------------------------------------------------------------- | ------------------------------------------------- |
| [README.md](./README.md)                                                                | The package contract.                             |
| [TEMPORAL-AND-SCENARIO-CONTEXT.md](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The viewpoint contract the time context projects. |
| [ux/time-and-scenario-ux.md](../../03-design/ux/time-and-scenario-ux.md)                | The behaviour-level time-and-scenario rules.      |
| [ux/multi-user-conflict-ux.md](../../03-design/ux/multi-user-conflict-ux.md)            | The conflict-resolution UX merges follow.         |
| [state-architecture.md](../state-architecture.md)                                       | The viewpoint as a first-class state coordinate.  |
