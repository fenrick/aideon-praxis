# ADR-0005: Sync and Conflict Model

- Status: Proposed
- Date: 2026-06-10
- Depends-On: ADR-0001, ADR-0002, ADR-0003

## Context

Multi-user and multi-device collaboration is a product goal but is deferred in implementation. The design must be fixed now because it constrains the workspace format and the op envelope (HLC, `parents`, `conflict.recorded`). Local-first research is clear: collaboration over unreliable networks is valuable, but correctness is hard and some invariants need selective coordination.

Deferring the transport and UX does not mean deferring the data model. The op envelope and workspace format must carry the necessary fields from the start, or retrofitting sync requires a breaking change to the on-disk format.

## Governance Framing

- **Decision type:** Stable seam (exchange unit + conflict record) + deferred (implementation, transport, encryption).
- **Known future pressure:** real concurrent editing; binary replacement races; schema changes mid-flight.
- **What stays stable:** sync exchanges **ops and missing blob hashes**, never runtime DB files; conflicts are first-class `conflict.recorded` ops; merge is semantic and typed.
- **What is provisional:** the inventory/handshake format.
- **What is deferred:** the network transport, encryption envelopes, the conflict resolution UX, and the run/accepted-work ledger persistence for hosted deployments.
- **Why hard to reverse:** the op envelope and workspace format must already carry HLC, parents, and conflict ops for any of this to work later.

## Decision

- **The exchange unit is operations + missing blob hashes.** Each side advertises an inventory (workspace format version, schema version, sealed segment ids + hashes, current loose-segment head, known blob hashes); peers transfer missing sealed segments, optionally seal and send the loose segment, then fetch missing blobs by hash. Runtime database files are never synced (WAL is same-host only).
- **Merge is semantic and typed:**
  - Additive relations union safely; identical ops are idempotent by `opId`.
  - Temporal facts resolve deterministically: valid-time containment, layer precedence, interval specificity, then stable tie-break by asserted time and `opId` — consistent with the temporal-truth invariants documented in [`../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md`](../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md).
  - **Explicit conflicts** (not silent overwrites) for: same subject/field/interval/ preference-level with incompatible values; delete-vs-edit races; schema changes that alter field meaning; and all binary replacements where two different cleartext blobs claim to be "the" new version.
- **Conflicts are recorded**, not hidden: a `conflict.recorded` op plus a user-visible conflict surface.
- **The run/accepted-work ledger persists in the workspace** (op stream / local store) for local and peer-to-peer deployments. An optional hosted adapter may back the ledger in hosted mode.

## Consequences

- The op envelope (ADR-0002) must carry HLC and `parents` from day one, even before sync ships — otherwise retrofitting sync requires a breaking change to the on-disk format.
- File-watching is treated as a hint, not authority (see [ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)): watch canonical roots, debounce, then re-read and re-validate.
- The inventory/handshake message schema is specified under [`../04-contracts/ACCEPTED-WORK-AND-EVENTS.md`](../04-contracts/ACCEPTED-WORK-AND-EVENTS.md).
