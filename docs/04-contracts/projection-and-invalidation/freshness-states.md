# Freshness states

The state a projection instance is in at the moment it is read, and how it is reported to the UI. These four states map
onto the result-state axis of the honest-state vocabulary ([§9](../../02-standards/DOCUMENTATION-STANDARD.md)) — they
are not redefined here, they are the projection-layer expression of it.

---

## The four states

A projection instance at a given `(projection_id, projection_version, context_dimensions)` is in exactly one of four
freshness states. The right column is the honest-state result state ([§9](../../02-standards/DOCUMENTATION-STANDARD.md))
it expresses:

| State        | Meaning                                                                          | UI indicator                          | Honest-state (§9) |
| ------------ | -------------------------------------------------------------------------------- | ------------------------------------- | ----------------- |
| `fresh`      | Projection is current; no pending invalidation                                   | None (default)                        | **Fresh**         |
| `stale`      | An invalidation event has been emitted; delta-apply or rebuild has not completed | Staleness badge; age in seconds       | **Stale**         |
| `rebuilding` | A full rebuild workflow is in progress                                           | Rebuilding spinner                    | **Rebuilding**    |
| `failed`     | The last refresh or rebuild attempt failed                                       | Error indicator with retry affordance | **Failed**        |

## The reported type

The IPC layer exposes a `ProjectionFreshnessStatus` on every read response that involves a projection-backed surface:

```rust
pub struct ProjectionFreshnessStatus {
    pub projection_id: String,
    pub projection_version: String,
    pub state: ProjectionFreshnessState,
    pub stale_since: Option<SystemTime>,
    pub last_refreshed_at: Option<SystemTime>,
    pub failure_detail: Option<String>,
}

pub enum ProjectionFreshnessState {
    Fresh,
    Stale,
    Rebuilding,
    Failed,
}
```

The renderer renders contextual indicators from `ProjectionFreshnessState`: `Fresh` renders nothing; `Stale` renders an
age badge; `Rebuilding` renders a non-blocking spinner; `Failed` renders an error with a user-initiated retry control.
Staleness age is `now - stale_since`; when it exceeds the descriptor's
[`max_staleness_seconds`](./projection-descriptor.md), the [observability](./observability.md) layer emits
`PROJECTION_STALE_THRESHOLD_EXCEEDED`.

## Why a `stale` read is still served

A `stale` read is served, not blocked, but it is **labelled**. This is the honesty obligation of the
[consistency model](./consistency-model.md): eventual convergence is acceptable only because the staleness is surfaced.
A non-writer reader who sees `stale` knows the result is a prior snapshot converging, not a fresh truth.

## References & standards

- (System standard) [DOCUMENTATION-STANDARD.md §9](../../02-standards/DOCUMENTATION-STANDARD.md) — the result-state axis
  these map onto.

## Related documents

| Document                                       | What it covers                                |
| ---------------------------------------------- | --------------------------------------------- |
| [consistency-model.md](./consistency-model.md) | Why staleness must be surfaced, never hidden. |
| [observability.md](./observability.md)         | The staleness-threshold signal.               |
| [ipc/envelope.md](../ipc/envelope.md)          | The read response that carries this status.   |
