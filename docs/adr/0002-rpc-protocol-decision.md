# ADR-0002: RPC Protocol for Desktop Mode

Status: Proposed

Date: 2025-10-18

## Context

Desktop mode must be local‑first, offline, and secure by default:

- No open TCP ports; sidecar worker communicates over pipes/UDS.
- Renderer has no backend logic; all calls go via preload IPC → Host → Worker.
- We need a typed, evolvable protocol with predictable error handling.

## Options Considered

1. JSON‑RPC 2.0 over pipes (line‑delimited JSON)

- Pros: simple framing; human‑readable; mature pattern; easy to implement in Node/Python.
- Cons: text overhead; requires discipline for types/versioning.

2. gRPC over UDS (HTTP/2) in desktop mode

- Pros: rich schema/streaming; strong toolchain.
- Cons: heavier; pulls in HTTP/2 stack; higher complexity for local‑only; opens path to ports accidentally.

3. Ad‑hoc line protocol (current stub)

- Pros: minimal; already working.
- Cons: brittle; no ids/batching/errors; hard to evolve.

## Decision

Adopt JSON‑RPC 2.0 over pipes/UDS in desktop mode with these constraints:

- Framing: one JSON object per line (UTF‑8; newline terminated).
- Envelope: `{ "jsonrpc":"2.0", "id": <num|string>, "method": <string>, "params": <object> }`.
- Errors: standard JSON‑RPC error object `{ code, message, data? }`.
- Versioning: `method` names are stable; breaking changes require new method name.
- Auth: per‑launch token (future); desktop mode trusts same‑process spawn for now.

## Consequences

- Host and Worker must accept JSON‑RPC; legacy ad‑hoc commands remain temporarily for migration.
- Tests will cover JSON‑RPC for `ping` and `Temporal.StateAt`.
- Future server mode can migrate to gRPC/HTTP2 with the same method semantics.

## Implementation (this change)

- Worker: add JSON‑RPC request loop; support `ping` and `state_at` methods.
- Host: send JSON‑RPC envelopes; keep fallback to legacy `state_at {json}` during migration.
- Tests: add JSON‑RPC ping/state_at tests; keep legacy tests until cutover.

## Security

- No TCP ports; pipes/UDS only. Renderer never speaks to Worker directly.
- Input validation on Worker; JSON parse errors return JSON‑RPC error with code `-32700`.

## Rollout

1. Land JSON‑RPC support behind compatibility mode (both protocols accepted).
2. Flip Host to JSON‑RPC default; remove legacy commands after M1.
3. Add per‑launch token to envelope and enforce on Worker.

## References

- AGENTS.md boundaries and Security rules
- Architecture‑Boundary.md (IPC over pipes/UDS)
