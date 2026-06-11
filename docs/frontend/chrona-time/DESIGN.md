# Chrona Time UX (Desktop) – Internal Design

## Purpose & scope

Chrona time UX is the renderer-facing contract for:

- selecting a scenario/branch and a specific commit reference,
- choosing layer (plan/actual),
- viewing a bounded diff preview,
- handling merges (including conflicts),
- surfacing a “time context summary” that applies to all artefacts.

This UX is used primarily inside the Praxis workspace today, but it is a shell-level pattern that
other workspaces should adopt for consistent time-first behaviour.

## Explicit intent (non-negotiable)

- Time is never ambient. The UI must always show and propagate explicit time context.
- The UI must never “fake” state by locally diffing or mutating artefact results.
- Time navigation must be safe:
  - bounded results,
  - explainable output,
  - clear error states,
  - no silent fallbacks.
- “Scenario” is a product concept (overlay), not a VCS concept; the UI must not imply Git semantics.

## Primary outcomes

- Users always know “what time/context am I looking at?”
- Users can change time context without losing safety (no implicit state).
- The UI remains responsive while loading time context data (branches, commits, snapshots).
- Diffs and merges are explainable and bounded.

## Surface placement (shell)

- Time context controls live in the primary workspace chrome (toolbar slot) and remain visible.
- The detailed temporal panel (branches/commits/diff/merge) may be presented as:
  - a persistent panel inside the workspace content, or
  - a popover/drawer triggered from the toolbar.

## Vocabulary and identifiers

- `branch`: a scenario branch identifier (string).
- `commit_id`: an immutable commit reference identifier (string).
- `as_of`: the reference used for reads. In UI, this is represented as either:
  - a selected `commit_id`, or
  - the latest commit on the selected `branch`.
- `layer`: plan/actual precedence (shared `dtos.Layer`).
- `time context`: `{ branch?, commit_id?, layer }` plus any workspace-scoped selection of scenario id if present.

## State and actions (hook contract)

The golden implementation pattern is a hook returning `[state, actions]`.

Reference implementation (non-authoritative):

- The desktop should keep a single “golden” implementation of this contract and reuse it across
  workspaces. Code location may change; the contract in this document is the source of truth.

### State (required)

- `branches[]` and active `branch`
- `commits[]` and active `commit_id`
- `layer` (plan/actual)
- `snapshot` summary for the selected reference (bounded, UI-friendly)
- `diff` preview between recent references (bounded)
- `loading`/`snapshot_loading` flags
- `error` (human-readable)
- merge flow state (`merging`, `merge_conflicts`)

### State (derived, recommended)

- `time_context_summary`: a short human-readable summary string, e.g.:
  - “Plan · Scenario: CX Redesign · Commit: c42”
  - “Actual · Scenario: baseline · Latest”
- `is_dirty_context`: whether the UI has pending changes that would be committed (workspace-owned).
- `can_merge`: true when merge prerequisites are satisfied and capability allows it.
- `can_commit`: true when there are staged changes and capability allows it (workspace-owned).

### Actions (required)

- select branch
- select commit (including clearing selection)
- select layer
- refresh branches
- merge branch into baseline (or selected target)

## Behaviour rules

### Branch and commit selection

- Branch selection triggers:
  - commit list refresh,
  - snapshot refresh for the latest commit (when available),
  - diff refresh (bounded).
- Commit selection triggers:
  - snapshot refresh for the selected commit,
  - selection preservation where safe; otherwise explicit clearing.

Additional rules:

- Selecting a branch that has no commits must show a clear empty state (not a silent failure).
- Switching branches must never keep a stale `commit_id` from the previous branch.
- Snapshot load failures must not erase prior snapshot unless the UI explicitly transitions to an error state that explains why.

### Layer switching

- Switching layer triggers snapshot refresh for the active reference.
- Layer must be applied to all artefact executions consistently.

Additional rules:

- Layer switching must not change the selected branch/commit.
- Layer switching must update any persistence keys that include layer (layout snapshots).

### Diff preview

- Diff preview is bounded and must display:
  - reference pair (`from`, `to`),
  - summary counts (adds/mods/dels),
  - warnings when truncated or limited.

Recommended behaviour:

- Diff preview defaults to the most recent two commits in the active branch when available.
- The UI must clearly label what the diff represents (e.g., “Diff: previous → latest”).

### Merge flow

- Merge is executed as a host-managed operation.
- Merge conflicts are first-class:
  - UI must show a conflict list with stable identifiers and messages,
  - UI must not auto-resolve without explicit user action,
  - UI must offer “return to safe state” (no partial merges).

Merge UX requirements:

- The merge CTA must be disabled when:
  - no active branch,
  - active branch is already baseline,
  - host capability disallows merge,
  - merge is already in progress.
- If conflicts occur, the UI must:
  - keep the user in the same time context (do not silently switch references),
  - offer “view conflicts” as the primary next action,
  - provide a copy-to-clipboard diagnostic summary for support/debugging.

## Loading/error/empty contract

- Loading states must not block the entire workspace; artefacts should continue rendering using the last known good context when safe.
- Errors must be human-readable and actionable (retry, open status window, copy diagnostics when available).
- Empty states (no branches/commits) must clearly indicate how to create initial state (seeded defaults or a safe “create branch” action when enabled).

Explicit error mapping expectations:

- Authentication/authorization failures: explain “not permitted” and provide next step (“request access” / “enable capability”).
- Not found: explain that a referenced branch/commit no longer exists and offer refresh.
- Invalid input: explain what input was invalid (e.g., unsupported layer string).
- Internal: provide a stable message plus “open status window / copy diagnostics”.

## Accessibility and interaction

- All controls are keyboard reachable.
- Branch/commit lists have accessible labels and announce selection changes.
- Time context changes should announce via aria-live region (“Time context updated…”).
- Do not use color-only indicators for plan/actual or scenario state.

## Test expectations

- Hook-level tests for state transitions (branch select, commit select, layer change, merge conflict handling).
- Component tests for basic rendering of loading/error/empty states.
- IPC mocked at the boundary; no renderer network calls.

Minimum test fixtures:

- branch list: empty, single, multiple
- commits: none, one, many
- snapshot: present, absent, loading, error
- merge: success, conflicts, failure
