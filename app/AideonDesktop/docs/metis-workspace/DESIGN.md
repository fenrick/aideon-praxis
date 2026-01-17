# Metis Workspace (Desktop) – Internal Design

## Purpose & scope

Metis Workspace is the user-facing surface for analytics outcomes. It provides:

- a place to configure and run analytics (bounded, explainable),
- a job-driven view of long-running analytics runs (progress, cancel, retry),
- result rendering (rankings, paths, impact summaries, TCO tables),
- explainability (why a score/path/result was produced).

This workspace does not implement analytics logic. It renders results produced by the host/engines.

## Explicit intent (non-negotiable)

- Analytics must be **bounded**: every run has explicit scope and limits.
- Analytics must be **explainable**: every result can answer “why?” without UI inference.
- Analytics must be **deterministic**: the same input context produces the same output ordering.
- Long-running analytics are **jobs**: observable, cancellable, and recoverable.
- The renderer never executes algorithms locally; it renders results and evidence only.

## Shell slots (required)

Metis integrates into the desktop shell via the standard slots.

### Navigation

- Saved analyses (recent/favorites).
- Runs history grouped by workspace + time context.
- Quick links: Centrality, Impact, Shortest path, TCO, Diagnostics.

Navigation details:

- Saved analyses are immutable definitions (stored requests with stable ids).
- Runs history entries are immutable results (tied to a `job_id` and timestamps).
- Filters:
  - by scenario/branch,
  - by layer,
  - by analysis kind,
  - by status (running/completed/failed).

### Toolbar

- Time context summary (valid time, layer, scenario) consistent with Praxis.
- Primary action: “Run analysis” (disabled when invalid).
- Secondary actions: “Save”, “Duplicate”, “Export”, “View job tray”.

Toolbar details:

- “Run analysis” must surface boundedness constraints (e.g., “limited to 500 results”).
- “Export” is capability-gated and PII-redacted by default.
- “Save” stores the request definition; it does not store results unless explicitly requested.

### Content surface

- Analysis configuration panel (form) and result panel (table/graph cards).
- Results must render with:
  - loading skeletons,
  - empty states (no results yet),
  - error states (human-readable + retry).
- Large results are virtualized and/or paged; no unbounded rendering.

Content screens (minimum)

1. Centrality
   - Inputs: algorithm, scope, limits.
   - Outputs: ranked list + distribution summary.
2. Impact
   - Inputs: seed refs, traversal bounds, filters.
   - Outputs: impacted items + evidence summary.
3. Shortest path
   - Inputs: from/to refs, constraints, max depth.
   - Outputs: path + evidence.
4. TCO
   - Inputs: scope, policies, time context.
   - Outputs: cost breakdown table + assumptions.
5. Diagnostics
   - Inputs: scope, ruleset selection.
   - Outputs: issues list with severity and “go to” links.

Result rendering contract:

- Always show:
  - input summary (time context + parameters),
  - bounds summary (limits applied, truncation flags),
  - “why” entrypoint (evidence panel).

### Inspector

- Selection-driven details for result items:
  - node/edge info (by id),
  - metric breakdown,
  - contributing paths/evidence.
- Inspector actions are task/job driven (no renderer-side mutation).

Inspector details:

- Primary inspector modes:
  - Result: metric/evidence for a selected row/path node.
  - Run: run metadata, bounds applied, warnings, job links.
- “Copy evidence” produces a safe, redacted summary by default.

### Footer / status

- Job tray entrypoint and last-run status (success/failure).

## Interaction contracts

### Run model

- Every run is executed either:
  - synchronously only when guaranteed fast and bounded, or
  - as a host-managed job with progress and cancellation.
- Runs are immutable records; reruns create new runs.

Required run metadata shown in UI:

- `job_id` (or run id)
- `kind` (analysis kind)
- time context summary (scenario/branch, commit/as_of, layer)
- bounds applied (limits, max depth, max duration)
- truncation/warnings
- engine version identifiers (when available)

### Explainability

- Every result includes explainability evidence sufficient for “why?”:
  - parameters + scope,
  - contributing nodes/edges (bounded),
  - paths or aggregates where applicable.
- The UI treats evidence as read-only; it does not infer additional semantics.

Explainability UX requirements:

- Evidence is navigable:
  - selecting an evidence node/edge highlights it in the result view (when applicable),
  - evidence links back to underlying twin ids.
- Evidence is bounded and labeled when partial.
- Evidence is exportable in a redacted form (capability-gated).

### Time-first propagation

- All analytics runs are scoped by explicit time context and optional scenario.
- Changing time context invalidates cached results and makes the active run context explicit.

## Data model and APIs

Renderer/host contract (target end state):

- Renderer uses typed IPC only; no renderer HTTP.
- Metis workspace DTOs live in `app/AideonDesktop/src/dtos/metis.ts` and are re-exported from
  `app/AideonDesktop/src/dtos/index.ts`.
- The workspace calls the host exclusively via an adapter surface under
  `app/AideonDesktop/src/workspaces/metis/` (no ad-hoc invokes).
- Event consumption:
  - `job_updated` / `job_completed` for analytics runs and job tray updates,
  - `analytics_updated` for invalidation and refresh hints.

Required DTOs (target)

- `analytics_run_request` (definition id, time context, parameters, bounds)
- `analytics_run_result` (metadata + bounded result payload)
- `analytics_saved_definition` (id, name, kind, parameters, created_at)
- `analytics_evidence` (paths/edges/aggregates with stable ids)

## UX quality gates

- Deterministic result ordering and stable identifiers (no flicker between refreshes).
- Clear boundedness warnings when limits are applied or results are truncated.
- Export respects PII redaction and capabilities; default is safe.

## Constraints

- No bespoke graph/algorithm execution in the renderer.
- No unbounded queries; every run has explicit limits.
- No leaking raw engine errors; map to user-readable messages with optional diagnostics.

## Testing expectations

- Component tests:
  - empty states for each analysis type,
  - boundedness warning states,
  - error states with retry,
  - job progress and completion notifications.
- Store/hook tests:
  - request validation (bounds required),
  - time context propagation into run requests,
  - stable ordering expectations (engine tie-breakers asserted in UI fixtures).
