# Data Fetching and Caching

The renderer's strategy for reading server-state: the cache key, invalidation from host events, refetch, and optimistic mutation. This file is for anyone fetching data in a surface. It builds on the state separation in [state-architecture.md](./state-architecture.md).

---

## The principle

Server-state is read through the typed adapters, cached, and treated as derived from host truth ([ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md)). The renderer uses a server-state cache library in the React Query / TanStack Query model — query keys, staleness, background refetch, and invalidation — which is the standard pattern for caching, invalidating, and refetching remote reads. The specific library is provisional ([ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md) open question); the _contract_ below is fixed regardless of library.

## The cache key

A query key **must** identify the read fully, and the read is taken at a viewpoint, so the key includes the viewpoint ([state-architecture.md](./state-architecture.md)). The canonical key shape is:

```
[ <surface>, <resource>, <params>, viewpoint ]
```

where `viewpoint` carries as-of valid time, as-of asserted time, layer or layer policy, scenario, and scope ([TEMPORAL-AND-SCENARIO-CONTEXT.md](../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)). A read cached under one viewpoint is never reused for another; changing the viewpoint changes the key, so the surface refetches rather than reusing stale data ([ADR-0009](../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)).

Keys are stable and serialisable so the cache survives re-renders and so two surfaces requesting the same projection at the same viewpoint share one cache entry. Identifiers in keys are real seed identifiers — a scenario key is the workspace's scenario id (e.g. `scn_plan_q3`), an entity read keys on its stable id, never a positional index.

## Invalidation from host events

Server-state is invalidated by the host, never guessed by the renderer:

- A host invalidation event, or a `ProjectionFreshnessStatus` of `stale`/`rebuilding` ([PROJECTION-AND-INVALIDATION.md](../04-contracts/PROJECTION-AND-INVALIDATION.md)), marks the matching cache entries stale and triggers a refetch.
- Typed events drive surface-specific invalidation: `job_updated` / `job_completed` for job lists and accepted work, `analytics_updated` for Metis results, `sync_updated` for connector status ([metis-workspace](./metis-workspace/README.md), [continuum-automation](./continuum-automation/README.md)).
- A mutation's response and its follow-on events invalidate the affected keys; the surface refetches the canonical result rather than trusting the optimistic guess once the host has answered.

The renderer treats freshness as host-reported. While an entry is `stale` or `rebuilding`, the surface shows the matching §9 result-state badge ([error-loading-empty.md](./error-loading-empty.md)) and may keep showing the last known good data until the refetch lands, rather than blanking the surface.

## Where fetching lives

Data fetching lives in hooks, not components, and IPC mapping lives in the adapter layer, not the hook ([state-architecture.md](./state-architecture.md), [ipc-adapters-and-dtos.md](./ipc-adapters-and-dtos.md)):

- The hook owns the query key, calls the adapter, derives UI-ready state from the returned DTO, and exposes `loading` / `error` / `empty` hints.
- The adapter wraps the Tauri IPC command with consistent error mapping and zod validation of the payload ([ipc-adapters-and-dtos.md](./ipc-adapters-and-dtos.md)).
- A component receives derived state and renders; it does not call IPC or hold a query key.

## Mutations

A mutation is an IPC command, not an in-place cache edit ([state-architecture.md](./state-architecture.md)). The flow:

1. The hook calls the adapter's mutating command with an idempotency key ([ADR-0018](../06-adrs/ADR-0018-idempotency-and-deduplication.md)).
2. Optionally, the cache is updated optimistically for immediate feedback; the optimistic value is clearly provisional and is reconciled against the host's response ([praxis-adapters](./praxis-adapters/README.md)).
3. The host returns a result or an `AcceptedJob` ([ACCEPTED-WORK-AND-EVENTS.md](../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)); a `BACKPRESSURE` reply is shown as a **queued** state ([ux/backpressure-ux.md](../03-design/ux/backpressure-ux.md)), not as success.
4. The affected query keys are invalidated; the surface refetches the canonical state.

Optimistic-update reconciliation against `CONFLICT_RECORDED` is an open question carried by [ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md); until it is settled, a surface that cannot safely reconcile an optimistic write waits for the host result before reflecting the change.

## Bounded reads

Reads are bounded; a surface never issues an unbounded query ([metis-workspace](./metis-workspace/README.md)). When a host read is capped by fanout, depth, size, or time, the result carries the §9 Partial/Bounded state and the surface shows the bound honestly ([canvas-and-graph.md](../03-design/design-system/canvas-and-graph.md), [error-loading-empty.md](./error-loading-empty.md)). Large result sets are virtualised or paged; no surface renders an unbounded list.

## Testing data fetching

IPC is mocked at the adapter boundary ([testing.md](./testing.md)): a Tauri-mock or MSW-style fake stands in for the host, returning DTO fixtures and emitting the invalidation events a test exercises. Hook tests assert the query key includes the viewpoint and that a viewpoint change refetches; component tests assert the loading/error/empty/partial states render.

## References & standards

_Informative — recorded in the [standards register](../02-standards/STANDARDS-REGISTER.md):_

- Nielsen — **10 Usability Heuristics**, 1994. Visibility of system status, behind the freshness badges.

## Related documents

| Document                                                                         | What it covers                                           |
| -------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [state-architecture.md](./state-architecture.md)                                 | The three-state separation and the viewpoint coordinate. |
| [ipc-adapters-and-dtos.md](./ipc-adapters-and-dtos.md)                           | The adapter boundary where IPC and validation live.      |
| [PROJECTION-AND-INVALIDATION.md](../04-contracts/PROJECTION-AND-INVALIDATION.md) | The freshness and invalidation contract.                 |
| [ACCEPTED-WORK-AND-EVENTS.md](../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)       | The accepted-work lifecycle and events.                  |
| [ADR-0018](../06-adrs/ADR-0018-idempotency-and-deduplication.md)                 | The idempotency key on mutations.                        |
