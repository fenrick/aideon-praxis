## ADR-0003: Adapter Boundaries (Graph, Storage, Worker)

- Status: Accepted
- Date: 2025-10-28
- Issues: #95 (parent), #101

### Context

We require strict boundaries so the renderer contains no backend logic and the host/worker remain
swappable. The UI must talk through narrow interfaces that keep contracts stable across local and
server modes.

### Decision

Adopt interface-driven adapters with these responsibilities and constraints:

- `GraphAdapter` — read-only time-sliced graph access (`stateAt`, `diff`). No persistence or
  backend-specific queries. Returns DTOs defined in `mneme` (camelCase JSON).
- `StorageAdapter` — snapshot persistence by reference (local file or remote). Deny-by-default on
  PII for exports; redaction enforced by tests.
- `WorkerClient` — runs analytics/time jobs via the host (desktop) or remote service (server).
  Transport is opaque to the UI; errors are normalized.

Constraints:

- Renderer never imports DB/HTTP clients; the host exposes typed commands only.
- Desktop mode opens no TCP ports. Host ↔ Worker use in-process modules now; later UDS/Named Pipes
  with JSON-RPC. Contracts unchanged across modes.
- DTOs live in `crates/aideon_mneme_core` and are shared across host and worker crates.

### Consequences

- The UI can switch LocalAdapter ↔ RemoteAdapter without code changes.
- Testing focuses on contract-level behavior; adapters can be mocked.
- Clear refactoring path as we move to server mode.

### Verification

- Interfaces live at `app/PraxisAdapters/src/index.ts` with unit tests.
- Boundary tests ensure renderer imports remain safe (`ipc-boundary.test.ts`).
- Host commands remain thin wrappers delegating to worker engines.
