# The `Viewpoint` shape

The `Viewpoint` is the complete frame every time-aware read and write carries. This file is its field-by-field reference; the resolution semantics that act on it are in [resolution-rules.md](./resolution-rules.md). The struct is defined in Rust and mirrored in generated TypeScript ([Rust owns the wire shape](../ipc/generated-schema-discipline.md)); both sides must stay in sync.

---

## The shape

```json
{
  "as_of_valid_time": {
    "instant": "2026-06-10T09:00:00Z",
    "interval": null
  },
  "as_of_asserted_at": 2767412345671680,
  "layer": "actual",
  "scenario": {
    "scenario_id": "scn_plan_q3",
    "mode": "overlay"
  },
  "scope": null,
  "workspace_id": "ws_local",
  "tenant_id": null
}
```

## Fields

| Field                       | Type                          | Required                       | Notes                                                                                                                                                   |
| --------------------------- | ----------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `as_of_valid_time.instant`  | UTC ISO-8601 string           | one of `instant` / `interval`  | point read on the valid-time axis (which instant of the world)                                                                                          |
| `as_of_valid_time.interval` | `{ start, end }` UTC ISO-8601 | one of `instant` / `interval`  | range read; both ends inclusive                                                                                                                         |
| `as_of_asserted_at`         | `i64` (packed HLC)            | write paths; optional on reads | which belief; on reads, omission resolves against the latest assertions — see [hlc-encoding.md](./hlc-encoding.md)                                      |
| `layer`                     | string \| `{ "policy": … }`   | yes                            | a single selected layer (e.g. `"actual"`) or a layer policy (e.g. `{ "policy": "actual_over_plan" }`); see [layer-and-policy.md](./layer-and-policy.md) |
| `scenario.scenario_id`      | string                        | no                             | omit for baseline view                                                                                                                                  |
| `scenario.mode`             | `"overlay"`                   | if `scenario_id` present       | only `overlay` is supported                                                                                                                             |
| `scope`                     | object \| null                | no                             | selection narrowing (by type, entity set, traversal from seed refs, or filter); `null` = whole twin                                                     |
| `workspace_id`              | string                        | yes                            | identifies the portable workspace folder                                                                                                                |
| `tenant_id`                 | string \| null                | no                             | optional; `null` on single-user desktop                                                                                                                 |

## Field rules

**Mutual exclusion.** Exactly one of `as_of_valid_time.instant` or `as_of_valid_time.interval` must be provided. Providing both or neither is a `TEMPORAL_CONTEXT_INVALID` error ([error-codes.md](./error-codes.md)).

**Asserted-time default.** On reads, omitting `as_of_asserted_at` resolves against the latest belief (current assertions). Pinning it replays the twin as the system believed it at that asserted instant — the basis for belief diffs ([diff.md](./diff.md)).

**Scenario default.** When `scenario_id` is present and `mode` is omitted it defaults to `"overlay"`. Omitting `scenario_id` entirely returns the baseline (canonical fact) view.

**`tenant_id`.** Optional on desktop. Single-user installs leave it `null`. It exists so the same contract can address multi-user workspaces without a schema break — an additive field, consistent with the forward-only evolution rule ([versioning and compatibility](../ipc/versioning-and-compatibility.md)).

## Viewpoint identity

Identity for a read is `workspace_id + as_of_valid_time + as_of_asserted_at + layer + scenario_id (or baseline) + scope`. Cache keys and projection identifiers must incorporate every viewpoint coordinate that can change the result — this is the precondition for the projection [consistency model](../projection-and-invalidation/consistency-model.md), which keys each projection instance by its context dimensions.

## How mutation payloads carry time

Reads carry the `Viewpoint`; mutations carry the three explicit stamps a fact is written with, with no hidden defaults in handler code:

- `assertedAt` — when the fact is being asserted (the append instant, an HLC).
- `validFrom` — when the fact begins being true in the world (valid time).
- `validTo` — when the fact ceases being true; absent means open-ended.

These appear on every Mneme store write payload ([Mneme module](../../05-modules/mneme/README.md)). The matching read fields (`at`, `asOfAssertedAt`, `scenarioId`, `layer`) appear on every store read payload.

## References & standards

- Snodgrass — _Developing Time-Oriented Database Applications in SQL_, 1999 _(normative: the valid-time/asserted-time pair)_.

## Related documents

| Document                                                                                   | What it covers                                                |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| [resolution-rules.md](./resolution-rules.md)                                               | How competing facts resolve to one value at this viewpoint.   |
| [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md) | The decision that makes the viewpoint the single query frame. |
| [Mneme: bitemporal and HLC](../../05-modules/mneme/bitemporal-and-hlc.md)                  | The stored fact shape the viewpoint resolves over.            |
