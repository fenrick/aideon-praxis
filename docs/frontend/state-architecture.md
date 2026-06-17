# State Architecture

How the renderer holds state, and the one rule that keeps it correct: three kinds of state, kept separate, with the viewpoint as a first-class coordinate. This file is for anyone storing, reading, or mutating state in a surface. It applies [ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md); the ADR records the decision, this file is the working contract.

---

## The principle

Frontend state comes in three kinds that are routinely conflated, and conflating them produces stale reads, lost interaction state, and cache bugs ([ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md)). They are kept separate by design:

| Kind                    | What it is                                                                  | Lifetime                           | Where it lives                                                            |
| ----------------------- | --------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------- |
| **Server-state**        | Data read from the host over IPC — projections, artefact results, job lists | Cached; invalidated on host events | A query cache keyed by viewpoint ([data-fetching.md](./data-fetching.md)) |
| **UI-state**            | Ephemeral interaction — hover, a drag in progress, a transient selection    | The interaction                    | Local component state inside hooks                                        |
| **Persistent UI state** | User-chosen layout — open panels, active theme, column widths               | Across reloads                     | Persisted locally; never op-log truth                                     |

The separation is the rule, not a suggestion. Server-state is a cache, never edited in place; UI-state is local and unshared; persistent UI state survives a reload without becoming workspace truth.

## Server-state is a cache, not truth

The renderer owns no canonical data ([ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). Server-state is a cache of host truth and is treated as derived ([PROJECTION-AND-INVALIDATION.md](../04-contracts/PROJECTION-AND-INVALIDATION.md)):

- A read is cached; a host invalidation event, or a `ProjectionFreshnessStatus` of `stale` or `rebuilding`, drives a refetch and the matching result-state badge ([error-loading-empty.md](./error-loading-empty.md)).
- Server-state is **never** edited in place. A mutation is an IPC command; the cache is invalidated by the host's response and events, then refetched ([data-fetching.md](./data-fetching.md)).
- The twin is the source of truth; React state mirrors it but never replaces it.

The renderer never locally diffs two cached reads to fake a result the host did not produce — a diff is a host read at a different viewpoint, not a renderer computation ([chrona-time](./chrona-time/README.md)).

## The viewpoint is a first-class state coordinate

Every server-state cache key includes the full [`Viewpoint`](../../CONTEXT.md) — as-of valid time, as-of asserted time, layer or layer policy, scenario, and scope ([ADR-0009](../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md), [TEMPORAL-AND-SCENARIO-CONTEXT.md](../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)). The viewpoint is **not** an ambient global:

- Changing the viewpoint is not a refetch of the same key — it is a **different key**.
- A read cached at one viewpoint is **never** served for another, mirroring the host's projection-identity rule.
- This applies to **server-state** (data read at a viewpoint). **Surface layout is persistent UI state and is _not_ keyed by the viewpoint** — changing valid time, layer, or scenario changes the data shown, never the arrangement. The layout key is `workspace_id + local user/profile + surface_id + surface_instance/destination_id + layout_preset_id` ([shell.md](./shell.md), composition). A **saved structure** may bundle a saved layout _and_ an optional recorded viewpoint as **distinct fields**; opening it can visibly apply both, but changing the live viewpoint afterwards never silently forks a new layout ([praxis-workspace](./praxis-workspace/README.md)).

A worked example: a graph surface cached at `{ asOf: 2026-06-10, layer: actual, scenario: null }` is a distinct cache entry from the same surface at `{ scenario: scn_plan_q3 }`. Switching scenario refetches rather than reusing; a host `stale` status flips the surface to a staleness badge and triggers a refetch.

## UI-state is local

Ephemeral interaction — a hover, a drag mid-flight, a transient highlight — is local component state inside the hook that owns the interaction. It is not persisted and not shared across slots beyond the module's single state provider. UI-state and server-state never share a mechanism, because a cache invalidation and a hover update on the same store is the classic source of a stale read ([ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md)).

## Persistent UI state is local, not server truth

Layout and theme choices persist locally across reloads but are not workspace canonical material: they are not written to the op log and not synced as twin content ([ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md)). The active theme is the semantic-token rebinding of [ADR-0025](../06-adrs/ADR-0025-design-token-architecture.md), held as persistent UI state. The persistence mechanism itself is provisional ([ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md) open question).

## State ownership in the platform

The platform owns a single state provider (`HostPlatformProvider`, consumed via `useHostPlatform()`) shared across the shell's four regions ([shell.md](./shell.md)); state is owned once, not duplicated per engine. The golden pattern is a hook returning `[state, actions]`, with async side effects inside the hook and UI-ready state derived from DTOs ([praxis-workspace](./praxis-workspace/README.md), [chrona-time](./chrona-time/README.md)):

- Co-locate state in hooks (e.g. `useTemporalPanel`, `useChrona`); avoid global singletons.
- Derive UI-ready state from DTOs in the hook; keep IPC mapping in the adapter layer, not the component.
- Components receive `loading`, `error`, and optional `empty` hints from the hook and render the shared honest-state treatments ([error-loading-empty.md](./error-loading-empty.md)).

## Mutations and backpressure

A write is an IPC command returning a result or an `AcceptedJob` ([ACCEPTED-WORK-AND-EVENTS.md](../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)). The renderer reflects `transient`/`retry` backpressure (`BACKPRESSURE`, [ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md)) as a **queued** state rather than pretending the write landed ([ux/backpressure-ux.md](../03-design/ux/backpressure-ux.md)), and carries an idempotency key so a retry is safe ([ADR-0018](../06-adrs/ADR-0018-idempotency-and-deduplication.md)). Optimistic updates and their reconciliation against `CONFLICT_RECORDED` are an open question ([ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md)); see [praxis-adapters](./praxis-adapters/README.md) for the optimistic-UI contract as it stands.

## Related documents

| Document                                                                             | What it covers                                       |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| [ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md)                       | The decision this file applies.                      |
| [data-fetching.md](./data-fetching.md)                                               | The cache key, invalidation, and refetch mechanics.  |
| [TEMPORAL-AND-SCENARIO-CONTEXT.md](../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The viewpoint that keys every read.                  |
| [PROJECTION-AND-INVALIDATION.md](../04-contracts/PROJECTION-AND-INVALIDATION.md)     | The freshness and invalidation server-state mirrors. |
| [ADR-0025](../06-adrs/ADR-0025-design-token-architecture.md)                         | The active theme held as persistent UI state.        |
