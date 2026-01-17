# Aideon Suite - UX Contract

## Purpose

Define the **UX contract** for rendering Praxis artefacts in the desktop shell. This document
specifies interaction semantics and layout expectations, not pixel-level design.

---

## Artefacts as primary outputs

The UI renders **artefact results** produced by Praxis:

- Views
- Catalogues
- Matrices
- Maps
- Reports and Pages

All artefacts execute with explicit **time + scenario** context. The UI must surface these
parameters and pass them on every request.

---

## Diagram model

Artefact results include **diagram specs** that the UI renders without semantic inference:

- Visual nodes and edges
- Containers/groups
- Overlays and legends
- Layout hints (layered, hierarchy, swimlane, matrix)

---

## Core interaction rules

- **Selection is global**: node/edge/cell selection drives inspector and actions.
- **Drill-down is universal**: every artefact supports selection -> explain -> task.
- **Bounded results**: large artefacts return partial results with explicit warnings.

### Selection model (required)

- Selection kinds: `node`, `edge`, `cell`, `widget`, `none`.
- Single primary selection; multi-select is allowed but one item is primary.
- Selection includes the originating widget id for context.

### Editing flow (required)

1. Selection updates the global store.
2. Inspector renders fields for the selection kind.
3. Save triggers a Praxis task via adapters (no direct graph mutation).
4. Artefact caches are invalidated and re-run as needed.

---

## Time and scenario UX

- Time controls are always visible in the primary workspace.
- UI must show valid time, layer, and optional scenario.
- Time changes trigger re-execution or cache invalidation, not ad-hoc UI mutation.

### Time controls (required behaviours)

- Valid time is editable via a direct input and a convenient picker (no hidden “today” defaults).
- The UI clearly shows the active time context as a single, readable summary string.
- Layer switching (plan/actual) is always visible and is a one-click operation.
- Scenario switching is always visible when scenarios exist; default scenario is clearly marked.
- Changing any part of the time context triggers:
  - artefact invalidation and re-run,
  - layout key changes (when persistence is keyed by time context),
  - selection preservation where safe (or explicit clearing with explanation).
- Time context changes never mutate artefact results client-side (no ad-hoc diffing).
- If an artefact cannot be executed for the selected context, the UI surfaces a clear reason and a next action.

### Scenario UX (required behaviours)

- Scenarios are presented as named overlays; the UI must never imply “branches” or VCS metaphors.
- The UI distinguishes baseline vs overlay scenarios and shows the active scenario in the toolbar.
- Scenario creation/selection flows are task-driven; the renderer does not fabricate scenario state.
- Scenario compare and time-diff are expressed as artefacts; UI does not compute diffs locally.

---

## Jobs and status UX

The shell includes a footer/status region for long-running work and health surfaces.

### Job tray (required)

- A global job tray is always reachable from the shell (footer/status).
- Jobs are grouped by workspace and show:
  - `kind`,
  - current `status`,
  - `progress.percent` and `progress.stage` when running,
  - completion timestamp or error summary when finished.
- Users can cancel running jobs where supported and can retry failed jobs when a retry action exists.
- Job completion results produce user-visible notifications (non-intrusive) and deep links where applicable.
- If the renderer misses events, it can fall back to a manual refresh control (explicitly labeled).

### Failure handling (required)

- Job failures are surfaced as human-readable summaries, not raw objects.
- The UI provides the minimum diagnostic context needed to act (what failed, why, what to do next).
- Errors that block core navigation (e.g., workspace open/migration) route users to the Status window.

---

## Recovery UX (workspace and startup)

### Startup recovery

- If backend setup fails, the UI shows a stable error screen (no crash loop) and offers:
  - open Status window,
  - copy diagnostic summary,
  - retry setup (if safe).

### Workspace recovery

- If a workspace cannot be opened (missing/corrupt/incompatible), the UI offers:
  - open in read-only recovery mode (when possible),
  - restore from backup,
  - export diagnostics/logs,
  - safe delete/archive with explicit confirmation.

---

## Layout contract (desktop shell)

The shell owns chrome and layout. Workspaces fill slots:

- Navigation
- Toolbar
- Content surface
- Inspector
- Footer / status

See `app/AideonDesktop/DESIGN.md` for the shell layout contract.

---

## Module UX docs (desktop)

Detailed UX designs for specific desktop modules live under `app/AideonDesktop/docs/`:

- Praxis workspace: `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`
- Mneme workspace: `app/AideonDesktop/docs/mneme-workspace/DESIGN.md`
- Metis workspace: `app/AideonDesktop/docs/metis-workspace/DESIGN.md`
- Chrona time UX: `app/AideonDesktop/docs/chrona-time/DESIGN.md`
- Continuum automation UX: `app/AideonDesktop/docs/continuum-automation/DESIGN.md`

These documents define slot-level behaviour (navigation/toolbar/content/inspector/footer) and the
required loading/error/empty and job-driven interaction patterns.

---

## Accessibility and performance

- Keyboard navigation for artefacts and inspector.
- No color-only meaning; overlays must include legends.
- Virtualize large tables; use level-of-detail for diagrams.
