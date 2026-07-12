# IPC envelope

The request and response wire shape every IPC command uses. Defined in `src-tauri/src/ipc.rs`; the renderer consumes the
generated TypeScript ([generated-schema-discipline.md](./generated-schema-discipline.md)). The error half of the
response is in [error-envelope.md](./error-envelope.md).

---

## IpcRequest

```rust
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IpcRequest<T> {
    pub request_id: String,
    pub payload: T,
}
```

JSON on the wire:

```json
{
  "requestId": "uuid-v4",
  "payload": { ... }
}
```

The envelope additionally carries, by contract, the cross-cutting fields documented in their own files: a `traceparent`
for [correlation and tracing](./correlation-and-tracing.md), and — on mutating commands — an `idempotencyKey` for
[idempotency](./idempotency.md). Their exact placement in the request is being finalised
([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md) open questions); they are recorded here as design
intent until the field positions are fixed in the generated manifest.

## IpcResponse

```rust
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IpcResponse<T> {
    pub request_id: String,
    pub status: &'static str,
    pub result: Option<T>,
    pub error: Option<IpcError>,
}
```

`status` is either `"ok"` or `"error"`. On success, `result` is present and `error` is absent. On error, `error` is
present and `result` is absent. The `requestId` echoes the request so the renderer can pair a response to its call.

## Worked example: a graph slice at a viewpoint

A renderer requests the effective graph for the seed `Application` `app_ledger` and its one-hop neighbours, resolved at
a viewpoint. Request:

```json
{
  "requestId": "f1e2d3c4-0000-4a5b-8c9d-000000000001",
  "payload": {
    "id": "view_arch_overview",
    "kind": "graph",
    "asOf": "2026-06-10T00:00:00Z",
    "scenario": "scn_plan_q3",
    "layer": null,
    "scope": { "seedRefs": ["app_ledger"], "hops": 1 }
  }
}
```

Response (success):

```json
{
  "requestId": "f1e2d3c4-0000-4a5b-8c9d-000000000001",
  "status": "ok",
  "result": {
    "metadata": {
      "id": "view_arch_overview",
      "asOf": "2026-06-10T00:00:00Z",
      "scenario": "scn_plan_q3",
      "fetchedAt": "2026-06-10T09:01:00Z",
      "source": "live"
    },
    "nodes": [
      { "id": "app_ledger", "type": "Application" },
      { "id": "de_invoices", "type": "DataEntity" }
    ],
    "edges": [{ "id": "rel_07", "from": "app_ledger", "to": "de_invoices", "type": "accesses" }],
    "freshness": { "projectionId": "effective_graph_workspace", "state": "fresh" }
  }
}
```

The result carries a [`ProjectionFreshnessStatus`](../projection-and-invalidation/freshness-states.md) because it is
projection-backed, and the temporal coordinates of the [viewpoint](../temporal-and-scenario/viewpoint-shape.md) it
resolved against. The types (`Application`, `DataEntity`, `accesses`) are real seed identifiers
([`core-v1.json`](../../data/meta/core-v1.json)).

## References & standards

- (System contract) [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) — the typed IPC seam.

## Related documents

| Document                                                                  | What it covers                                                 |
| ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [error-envelope.md](./error-envelope.md)                                  | The `IpcError` half of the response.                           |
| [correlation-and-tracing.md](./correlation-and-tracing.md)                | The `traceparent` and correlation fields the envelope carries. |
| [idempotency.md](./idempotency.md)                                        | The `idempotencyKey` on mutating commands.                     |
| [Host: IPC command surface](../../05-modules/host/ipc-command-surface.md) | The implementation.                                            |
