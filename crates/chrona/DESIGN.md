# Chrona Visualisation – Design

## Purpose & scope

Chrona Visualisation produces **time-aware views** over the Praxis digital twin. In practice, this
crate is a thin, IPC-friendly façade over the Praxis commit/time model, plus small helpers that
support time-centric UI (time cursor, diffs, topology deltas, layout helpers).

Chrona exists to:

- keep the host-facing temporal API stable (so the renderer contract does not churn),
- centralize time/scenario UX computations behind typed Rust ports,
- enforce “time-first” invariants at the engine boundary.

Chrona does **not** own persistence or semantics. It delegates:

- persistence and commit graph storage to Praxis/Mneme,
- domain semantics and artefact meaning to Praxis.

## Allowed dependencies / frameworks

- Rust 2024 with workspace defaults.
- Core deps: `tokio` for async, `serde`/`serde_json` for (de)serialisation, `thiserror` for errors,
  `tracing` + `log` facade for logging.
- Twin access via `praxis` and persistence through `mneme` traits only;
  no direct DB drivers here.

## Anti-goals

- No renderer/UI, Tauri, or HTTP servers.
- No direct database access; persistence must flow through Mneme traits.
- No bespoke async runtimes or logging frameworks.

## Architecture

### Position in the stack

- Renderer: renders artefacts and time controls; calls host via typed IPC.
- Host (`crates/desktop`): exposes `chrona_temporal_*` commands and owns capabilities/events.
- Chrona: provides temporal ports and small helpers.
- Praxis: owns commit model, time context resolution, diff semantics, metamodel.
- Mneme: persists ops/facts/projections and enforces time-first storage rules.

### Determinism and boundedness

All Chrona outputs must be:

- deterministic for a given input (same workspace + same references ⇒ same result),
- bounded (limits are explicit; no unbounded traversal),
- explainable (results can be traced to input refs and parameters).

## Public surface (Rust)

- Traits/functions that expose temporal summaries: `state_at`, `diff`, `topology_delta`, and
  timeline-friendly aggregates.
- Data transfer structs tuned for canvas widgets (timeline segments, plateau/gap markers,
  selection overlays).

### TemporalEngine façade (current)

Chrona exports `TemporalEngine` as a stable name used by the host. It wraps a `PraxisEngine` and
delegates to Praxis time/commit primitives:

- `state_at(args)` → state-at summary for a reference and optional scenario
- `commit(request)` → commit a change set
- `create_branch(name, from?)` → branch creation
- `list_commits(branch)` / `list_branches()`
- `diff_summary(args)` → bounded diff stats between two refs
- `merge(request)` → merge source into target with conflict reporting
- `topology_delta(args)` → topology-only delta between refs
- `meta_model()` → active metamodel document
- `resolve_snapshot(reference, scenario?)` → (ref_id, snapshot, resolved_branch) triple for downstream use

## Temporal semantics (contract-level)

Chrona must preserve the suite-wide time-first semantics:

- **Valid time**: what is true in the modeled world.
- **Asserted time**: what we knew and when.
- **Layer**: plan vs actual precedence.
- **Scenario**: what-if overlays.

Chrona does not invent semantics; it enforces that every temporal operation carries explicit
context and delegates the meaning to Praxis.

### Diff semantics (bounded)

Chrona diff outputs are designed for UI affordances (counts, warnings, and “go deeper” actions),
not for shipping entire change graphs.

Minimum expectations:

- diff is computed between two explicit references (`from`, `to`)
- output includes summary counts for adds/mods/dels
- output is bounded by scope/limits (no accidental full graph scan)
- output is explainable (references + parameters are surfaced)

### Topology delta semantics

Topology delta is a structure-only view:

- node add/delete counts and identifiers (when bounded)
- edge add/delete counts and identifiers (when bounded)
- no property diffs unless explicitly requested by a separate artefact

## UI-facing helpers

### Layout helpers

Chrona includes small deterministic layout helpers intended for “good enough” defaults and test
scaffolding (e.g., rectangle packing to mimic ELK defaults). These helpers:

- never mutate model semantics,
- are user-triggered when applied to persisted layouts,
- are deterministic and testable.

### Demo scenes

Chrona may include small synthetic scenes used for UI development and smoke tests. These must be:

- deterministic,
- stable over time unless intentionally changed,
- clearly marked as demo/test scaffolding.

## Performance and SLO alignment

Chrona outputs are often on the interactive path for time controls. Expectations:

- state-at summary should be fast enough for “scrubbing” (prefer summary stats over full payloads)
- diff/topology_delta should return bounded results with warnings when limits are hit
- heavy temporal comparisons should run as jobs, not synchronous calls

Refer to `docs/ROADMAP.md` SLO targets and treat them as outcome constraints on temporal UI APIs.

## Testing strategy

Chrona must be testable without UI and without external services:

- unit tests for deterministic layout helpers and scene generation
- unit/integration tests for `TemporalEngine` delegation and stable outputs
- contract-style tests to ensure DTO field names and invariants remain stable

Prefer small synthetic graphs and deterministic seeds.

## Evergreen notes

- Migrate any legacy, untyped JSON helpers to typed structs + serde.
- Replace ad-hoc diff logic with shared semantics defined in Praxis engine design docs.
