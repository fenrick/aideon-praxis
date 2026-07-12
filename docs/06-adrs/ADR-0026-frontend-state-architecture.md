# ADR-0026: Frontend State Architecture

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0006, ADR-0009
- Relates-To: ADR-0025, ADR-0027

## Context

The renderer is a presentation layer that owns no durable data
([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)): it consumes read projections over IPC and dispatches
commands. Frontend state nonetheless comes in three kinds that are routinely conflated, and conflating them produces
stale reads, lost local interaction state, and cache bugs. Server-state (data fetched from the host) needs caching and
invalidation; UI-state (a hover, a drag in progress) is ephemeral and local; persistent UI state (the open panel, the
active theme) must survive a reload. A fourth complication is specific to this product: every server read is taken at a
`Viewpoint` ([ADR-0009](./ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)), so the viewpoint is part
of every cache key, not a global ambient setting.

## Governance Framing

- **Decision type:** Stable seam (the three-way state separation and the viewpoint-as-cache-key rule) + invariant (the
  renderer owns no canonical data; server-state is cache, not truth).
- **Known future pressure:** more surfaces; offline edits queued under backpressure; multiple windows sharing state;
  richer optimistic updates.
- **What stays stable:** the server / UI / persistent-UI separation; the viewpoint as a first-class cache coordinate;
  server-state is derived and invalidatable.
- **What is provisional:** the specific state libraries and the persistence mechanism for persistent UI state.
- **What is deferred:** cross-window state sharing; optimistic-update conflict reconciliation beyond
  `CONFLICT_RECORDED`.
- **Why hard to reverse:** the separation shapes how every feature reads and writes; the viewpoint-keying is relied on
  for cache correctness across the app.

## Decision

- **Three kinds of frontend state are kept separate.**

  | Kind                    | What it is                                                       | Lifetime                           | Discipline                                                                            |
  | ----------------------- | ---------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------- |
  | **Server-state**        | Data read from the host over IPC (projections, artefact results) | Cached; invalidated on host events | A cache of host truth, never canonical; invalidated, refetched, never edited in place |
  | **UI-state**            | Ephemeral local interaction (hover, drag, transient selection)   | The interaction                    | Local component state; not persisted, not shared                                      |
  | **Persistent UI state** | User-chosen layout (open panels, active theme, column widths)    | Across reloads                     | Persisted locally; not server truth                                                   |

  Conflating these is the source of stale reads and lost interaction state; the separation is the rule.

- **Server-state is a cache of host truth, not truth.** The renderer caches projections and artefact results and treats
  them as derived ([PROJECTION-AND-INVALIDATION.md](../04-contracts/PROJECTION-AND-INVALIDATION.md)): a host
  invalidation or `ProjectionFreshnessStatus` of `stale`/`rebuilding` drives refetch and the corresponding result-state
  badge ([DOCUMENTATION-STANDARD.md §9](../02-standards/DOCUMENTATION-STANDARD.md)). Server-state is never edited in
  place; a mutation is a command, and the cache is invalidated by the host's response and events.

- **The viewpoint is a first-class state coordinate.** Every server-state cache key includes the full `Viewpoint` (as-of
  valid time, as-of asserted time, layer or layer policy, scenario, scope), exactly as projection identity requires
  ([TEMPORAL-AND-SCENARIO-CONTEXT.md](../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)). Changing the viewpoint is not
  a refetch of the same key — it is a different key. A read cached at one viewpoint is never served for another,
  mirroring the host's projection-context rule.

- **Persistent UI state is local, not server truth.** Layout and theme choices persist locally across reloads but are
  not workspace canonical material; they are not written to the op log and not synced as twin content. The active theme
  is the semantic-token rebinding from [ADR-0025](./ADR-0025-design-token-architecture.md).

- **Mutations flow through commands and respect backpressure.** A write is an IPC command returning a result or an
  `AcceptedJob`; the renderer reflects `transient`/`retry` backpressure
  ([ADR-0016](./ADR-0016-error-envelope-rfc9457.md)) as a queued state rather than pretending the write landed, and
  carries an idempotency key so a retry is safe ([ADR-0018](./ADR-0018-idempotency-and-deduplication.md)).

## Considered Options

- **One global store for everything (rejected):** conflates server, UI, and persistent state; produces stale reads when
  cache invalidation and ephemeral UI updates share a mechanism.
- **Viewpoint as an ambient global (rejected):** convenient, but breaks cache correctness — a cached read would be
  wrongly reused when the viewpoint changes; keying every read by viewpoint is the correct, if more verbose, model.
- **Editing server-state in place (rejected):** treats the cache as truth and diverges from the host; mutations must go
  through commands and re-derive the cache.

## Consequences

- Changing the as-of valid time, layer, or scenario refetches because the cache key changed, so the UI never shows
  another viewpoint's data.
- Freshness badges follow directly from `ProjectionFreshnessStatus`, tying the renderer to the projection contract.
- Persistent UI state survives reloads without becoming workspace truth, keeping the renderer-owns-no-data invariant
  intact.
- A worked example: a graph surface cached at `{as_of: 2026-06-10, layer: actual, scenario: null}` is a distinct cache
  entry from the same surface at `{scenario: scn_plan_q3}`; switching scenario refetches rather than reusing; a host
  `stale` status flips the surface to a staleness badge and triggers refetch.

## Follow-ups / Open Questions

- The specific server-state and UI-state libraries and the persistence store for persistent UI state.
- Optimistic updates and their reconciliation against `CONFLICT_RECORDED`
  ([ADR-0016](./ADR-0016-error-envelope-rfc9457.md)).
- Cross-window state sharing in multi-window layouts.

## References & standards

- Nielsen — **10 Usability Heuristics**, 1994 _(informative: visibility of system status, drives the freshness badges)_.

## Related documents

| Document                                                                         | What it covers                                                  |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [PROJECTION-AND-INVALIDATION.md](../04-contracts/PROJECTION-AND-INVALIDATION.md) | The projection freshness and invalidation server-state mirrors. |
| [ADR-0009](./ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)   | The viewpoint that keys every server read.                      |
| [ADR-0025](./ADR-0025-design-token-architecture.md)                              | The active theme held as persistent UI state.                   |
