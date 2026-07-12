# Metis Workspace

The analytics surface, facing [Metis](../../05-modules/metis/README.md): configuring and running bounded, explainable
analytics over the twin and rendering their results and evidence. It renders inside the one shell
([shell.md](../shell.md)) and executes no algorithm itself — it renders host-produced results.

This README is the contract; [DESIGN.md](./DESIGN.md) carries the screen, run-model, and explainability detail.

## What it provides

- A place to configure and run analytics — centrality, impact, shortest path, TCO, diagnostics — each bounded with
  explicit scope and limits.
- A job-driven view of long-running runs: progress, cancel, retry.
- Result rendering: rankings, paths, impact summaries, TCO tables, with input and bounds summaries.
- Explainability: every result answers "why?" from host-provided evidence the UI treats as read-only.

## Faces

[Metis](../../05-modules/metis/README.md) — deterministic, bounded graph analytics. The renderer issues run requests at
a viewpoint, observes the job lifecycle, and renders results and evidence; it never executes an algorithm locally and
never leaks raw engine errors.

## State ownership

Server-state (saved definitions, run results, evidence) is a viewpoint-keyed cache invalidated by `job_updated` /
`job_completed` and `analytics_updated` ([data-fetching.md](../data-fetching.md)); a run definition and the active
selection are UI-state. Saved analyses are immutable definitions; runs are immutable results tied to a `jobId`
([state-architecture.md](../state-architecture.md)).

## Boundaries

- Analytics are bounded (explicit scope and limits), explainable (every result carries evidence), and deterministic
  (same input context, same ordering).
- Long-running analytics are jobs — observable, cancellable, recoverable; the renderer never runs algorithms.
- Reads are bounded; large results are virtualised or paged; export is capability-gated and PII-redacted by default.

## Running and testing

- Tests: `pnpm run node:test` — component tests for empty/boundedness-warning/error-with-retry states and job progress;
  hook tests for request validation, viewpoint propagation, and stable ordering ([testing.md](../testing.md)).

## Related documents

| Document                                            | What it covers                                         |
| --------------------------------------------------- | ------------------------------------------------------ |
| [DESIGN.md](./DESIGN.md)                            | The screens, run model, and explainability UX.         |
| [Metis](../../05-modules/metis/README.md)           | The module this surface faces.                         |
| [data-fetching.md](../data-fetching.md)             | Bounded reads, viewpoint keys, and invalidation.       |
| [error-loading-empty.md](../error-loading-empty.md) | The bounded/error/empty contract this surface renders. |
