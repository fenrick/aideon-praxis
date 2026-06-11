# ADR-0016: IPC Error Envelope — RFC 9457 Problem Details

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0006
- Relates-To: ADR-0017, ADR-0019

## Context

The IPC boundary already carries a stable error envelope: `IpcError { code, message, details }` with machine-readable `code` values ([CONTRACTS-AND-SCHEMAS.md](../04-contracts/CONTRACTS-AND-SCHEMAS.md)). The codes (`WORKSPACE_NOT_FOUND`, `WORKSPACE_LOCKED`, `SCHEMA_TOO_NEW`, `CONFLICT_RECORDED`, `BACKPRESSURE`, `TEMPORAL_CONTEXT_INVALID`, …) are stable contract identifiers, but the envelope has no shared shape vocabulary, no category taxonomy, and no machine-readable recovery hint. The renderer cannot tell, from the envelope alone, whether an error is worth retrying (`BACKPRESSURE`) or terminal (`SCHEMA_TOO_NEW`) without hard-coding knowledge of each code.

RFC 9457 (Problem Details for HTTP APIs, obsoleting RFC 7807) defines exactly this: a typed, extensible problem object with a stable `type`, a human `title`, `detail`, and member extensions. Adopting its shape — not its HTTP transport — gives the envelope a recognised structure and room for categories and hints without inventing a bespoke format.

## Governance Framing

- **Decision type:** Stable seam (the error envelope is a public IPC contract) + invariant (every IPC error is a typed Problem Detail with a category).
- **Known future pressure:** more error codes; richer recovery guidance; localisation of messages; mapping engine errors uniformly.
- **What stays stable:** the existing stable codes; the RFC 9457 member shape; the five-category taxonomy; the recovery-hint field.
- **What is provisional:** the exact set of recovery-hint values and the URI scheme used for `type`.
- **What is deferred:** localised `title`/`detail`; per-locale message catalogues.
- **Why hard to reverse:** the envelope is consumed across the Rust↔TS boundary and stored in logs; changing the shape or a code is a breaking contract change ([ADR-0017](./ADR-0017-contract-and-dto-versioning.md)).

## Decision

- **The IPC error envelope adopts RFC 9457 Problem Details** (RFC 9457). The wire object carries `type` (a stable URI reference identifying the problem kind), `title` (a short human summary, safe for UI), `detail` (a human-readable explanation of this occurrence), and member extensions, transported over IPC rather than HTTP. The existing `code`, `message`, and `details` map onto this shape: `code` becomes the stable identifier behind `type`, `message` becomes `title`/`detail`, and `details` remains a structured extension.

- **Every error carries a category from a fixed taxonomy.** Each stable code maps to exactly one category, so the renderer can react generically:

  | Category       | Meaning                                                         | Renderer default reaction                    | Example codes                                                                                        |
  | -------------- | --------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
  | **validation** | The request was malformed or violated a contract precondition   | Surface the problem; do not retry unchanged  | `INVALID_INPUT`, `TEMPORAL_CONTEXT_INVALID`, `TEMPORAL_INTERVAL_INVALID`, `SCENARIO_CONTEXT_INVALID` |
  | **permission** | The caller lacks the capability or the target is not accessible | Surface; do not retry                        | `WORKSPACE_NOT_FOUND`, capability-denied codes                                                       |
  | **conflict**   | A concurrent or recorded conflict blocked the operation         | Surface; offer reconcile/refresh             | `CONFLICT_RECORDED`, `WORKSPACE_LOCKED`                                                              |
  | **transient**  | A temporary condition; the same request may succeed later       | Retry with backoff                           | `BACKPRESSURE`                                                                                       |
  | **internal**   | An unexpected host-side failure                                 | Surface generically; capture for diagnostics | `INTERNAL_ERROR`, `SCHEMA_TOO_NEW` (compatibility-fatal)                                             |

- **Every error carries a recovery hint.** A machine-readable `recovery` member tells the renderer what to do without hard-coding per-code logic: `retry` (with a suggested backoff for transient), `reconcile`, `refresh`, `none`, or `report`. `BACKPRESSURE` carries `retry`; `SCHEMA_TOO_NEW` carries `report`; `TEMPORAL_CONTEXT_INVALID` carries `none`.

- **Codes remain stable; categories and hints are additive.** Changing a code is a breaking change ([ADR-0017](./ADR-0017-contract-and-dto-versioning.md)). Adding a code, or refining a hint, is additive. `detail` and the `details` extension must not leak secrets or stack traces, consistent with the privacy rules of [LOGGING_FRAMEWORK.md §10](../LOGGING_FRAMEWORK.md).

- **The `type` URI and `correlation_id` join errors to traces.** The error carries the `correlation_id` of the failing command so an error surfaced in the UI joins to the host logs and trace ([ADR-0019](./ADR-0019-observability-and-trace-context.md)).

## Considered Options

- **A bespoke envelope (rejected):** the current shape works, but reinvents a solved problem and lacks a recognised category/hint vocabulary; RFC 9457 supplies both and is understood by tooling.
- **gRPC/status-code taxonomy (rejected):** a reasonable category set, but tied to a transport the product does not use and less expressive than Problem Details extensions.
- **Categories inferred by the renderer from codes (rejected):** forces the renderer to hard-code per-code knowledge; carrying the category and hint on the envelope keeps the renderer generic.

## Consequences

- The renderer reacts by category and hint: `transient`+`retry` shows a queued state and retries with backoff (the existing `BACKPRESSURE` behaviour, now generalised); `validation` shows the problem inline; `internal` shows a generic failure and captures diagnostics.
- The existing stable codes are preserved; this ADR adds structure around them, it does not rename them.
- Errors are joinable to traces and logs through `correlation_id`, closing the loop from UI error to host diagnostics.
- A worked example: a saturated write queue returns `{ "type": ".../backpressure", "title": "Host busy", "detail": "The write queue is saturated.", "category": "transient", "recovery": "retry", "correlationId": "…" }`; the renderer retries with backoff and shows a queued indicator.

## Follow-ups / Open Questions

- The full code→category→hint mapping table, maintained alongside the IPC manifest.
- The `type` URI scheme (a stable non-dereferenceable namespace, per RFC 9457's allowance).
- Localisation of `title`/`detail` (deferred).

## References & standards

- **RFC 9457** — Problem Details for HTTP APIs (obsoletes RFC 7807) _(normative: error-envelope shape)_.

## Related documents

| Document                                                             | What it covers                                  |
| -------------------------------------------------------------------- | ----------------------------------------------- |
| [CONTRACTS-AND-SCHEMAS.md](../04-contracts/CONTRACTS-AND-SCHEMAS.md) | The current envelope and the stable code list.  |
| [ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)         | The IPC seam the envelope rides on.             |
| [ADR-0019](./ADR-0019-observability-and-trace-context.md)            | The correlation IDs that join errors to traces. |
