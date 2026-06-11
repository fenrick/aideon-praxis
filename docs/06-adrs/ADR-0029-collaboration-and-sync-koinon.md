# ADR-0029: Collaboration and Sync — Koinon

- Status: Proposed
- Date: 2026-06-11
- Depends-On: ADR-0005 (sync and conflict model), ADR-0011 (module taxonomy), ADR-0001 (workspace is canonical authority)
- Relates-To: ADR-0002 (workspace format), ADR-0022 (HLC clock), ADR-0006 (host trust boundary)

## Context

The sync and conflict model is decided ([ADR-0005](./ADR-0005-sync-and-conflict-model.md)) but has no module home. That ADR fixes the data shape — the op envelope carries HLC and `parents`, conflicts are first-class `conflict.recorded` operations, sync exchanges operations and missing blob hashes — and defers the transport, the conflict-resolution UX, and the operational machinery. A decision with no owning module is a decision no engine is accountable for; presence, the shared workspace, and the merge experience would otherwise accrete across Host and Mneme with no recorded boundary.

Multi-user and multi-device collaboration is a product goal. Per the "earns its own module" rule in [ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md), collaboration owns a distinct invariant (peers converge without a central authority and without silent overwrites), a distinct failure mode (divergent replicas, lost writes, a conflict shown as a crash), and a distinct seam (the inventory/handshake exchange and the conflict surface). It is therefore a module, not a feature bolted onto the Host.

## Governance Framing

- **Decision type:** Stable seam (the collaboration engine behind a typed trait, composed via the Host) + deferred (no crate exists yet; this is design intent that operationalises an already-deferred model).
- **Known future pressure:** real-time concurrent editing; presence at scale; network transport and encryption envelopes ([ADR-0005](./ADR-0005-sync-and-conflict-model.md) defers both); hosted multi-tenant deployment; schema changes mid-flight.
- **What stays stable:** sync exchanges **operations and missing blob hashes**, never derived state or runtime database files; conflicts are first-class `conflict.recorded` records, never silent overwrites; convergence is a property of the op log, not of a live wire protocol; Koinon writes only through Mneme and owns no canonical truth.
- **What is provisional:** the presence model; the inventory/handshake message format ([ADR-0005](./ADR-0005-sync-and-conflict-model.md) marks this provisional); the conflict-resolution UX affordances.
- **What is deferred:** the network transport and encryption envelopes; the hosted relay; selective real-time coordination for invariants that cannot converge purely.
- **Why hard to reverse:** the exchange unit and the conflict-record shape are interoperability commitments between peers built against the on-disk op envelope ([ADR-0002](./ADR-0002-portable-workspace-format.md)); once peers sync against them, changing them is a format migration, not an edit.

## Decision

Introduce **Koinon** (Greek _koinon_, "the common, the shared") as a planned engine module owning **multi-user and multi-device collaboration**: presence, the shared workspace, and the merge/conflict experience. Koinon **owns and operationalises** the sync and conflict model of [ADR-0005](./ADR-0005-sync-and-conflict-model.md).

1. **Sync exchanges operations, never derived state.** Each peer advertises an inventory (workspace-format version, schema version, sealed-segment ids and hashes, the loose-segment head, known blob hashes), transfers missing sealed segments, optionally seals and sends the loose segment, then fetches missing blobs by hash. Runtime database files and projections are never synced — they are rebuilt locally from operations ([ADR-0001](./ADR-0001-workspace-is-canonical-authority.md)). This is the load-bearing invariant: peers exchange the canonical mutation log, so each side rebuilds the same derived state independently.

2. **Convergence reasons from the op log.** Additive relations union safely; identical operations are idempotent by `opId`; temporal facts resolve deterministically within a layer (valid-time containment, interval specificity, then a stable tie-break by asserted time and `opId`) and combine across layers by the viewpoint's layer policy ([ADR-0009](./ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)). Where convergence is reasoned about, it cites conflict-free replicated data types (Shapiro et al., _Conflict-free Replicated Data Types_, 2011): the additive, commutative cases converge as a CRDT would, while the cases that cannot converge purely are surfaced rather than forced.

3. **Conflicts are first-class records.** A genuine conflict — same subject/slot/interval/preference-level with incompatible values, a delete-versus-edit race, a schema change that alters a slot's meaning, or two distinct cleartext blobs both claiming to be "the" new version — is written as a `conflict.recorded` operation and shown on a user-visible conflict surface as `Awaiting review` ([DOCUMENTATION-STANDARD.md §9](../02-standards/DOCUMENTATION-STANDARD.md)). A conflict is never resolved by silent overwrite; resolution is an authored Change Event that supersedes, recorded like any other operation.

4. **Presence and the shared workspace are derived, not canonical.** Who is connected, what they are viewing, and cursor/selection state are ephemeral session signals Koinon broadcasts; they are never written to the op log and never define truth. A peer that drops loses presence, not data.

5. **Boundaries.** Koinon synchronises and presents collaboration; it does not define meaning (Praxis), does not store the op log (Mneme), does not resolve viewpoints (Chrona), and does not run durable jobs (Continuum). It composes with them through the Host, with no engine-to-engine cycle ([ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md)). The transport is mediated by the Host trust boundary ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)); a remote peer is untrusted input until its operations validate against the metamodel.

## Consequences

- The sync and conflict model gains an accountable owner: [ADR-0005](./ADR-0005-sync-and-conflict-model.md)'s deferred UX and transport become Koinon's roadmap, and its stable seams become Koinon's contract.
- A new module, crate (`koinon`), trait, and frontend workspace (`src/workspaces/koinon`) join the roadmap; the C4 model and module dependency map include Koinon as a planned component.
- Conflict records are part of the durable op stream, so they replay, audit, and rebuild like any operation; a conflict survives a crash because it was recorded, not held in memory.
- Because sync exchanges operations only, a peer on an older derived-runtime engine can still converge — the exchange unit is engine-independent ([ADR-0004](./ADR-0004-storage-engine-abstraction.md)).
- Encryption and the network transport remain deferred; the desktop default has no network trust boundary, so the hosted relay is a later deployment variant, not the primary model ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).

## Follow-ups / Open Questions

- Confirm the module name **Koinon** against alternatives, and whether presence belongs in Koinon or in the Host event bus.
- Specify the presence model and whether real-time co-editing needs selective coordination beyond the converging op exchange.
- Finalise the inventory/handshake message schema (provisional per [ADR-0005](./ADR-0005-sync-and-conflict-model.md)), recorded in [`../04-contracts/ACCEPTED-WORK-AND-EVENTS.md`](../04-contracts/ACCEPTED-WORK-AND-EVENTS.md).
- Decide the conflict-resolution UX: how a steward compares the two sides and authors the superseding Change Event.
- Define the encryption envelope and transport for the hosted relay, and how Themis identity ([ADR-0030](./ADR-0030-governance-themis.md)) gates a peer.

## References & standards

- Shapiro et al. — **Conflict-free Replicated Data Types**, 2011 _(informative: convergence properties for the additive/commutative cases)_.
- Lamport — _Time, Clocks, and the Ordering of Events_, 1978; Kulkarni et al. — **Hybrid Logical Clocks**, 2014 _(informative: causal ordering and asserted-time clock underneath the exchange)_.

## Related documents

| Document                                                 | What it covers                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [ADR-0005](./ADR-0005-sync-and-conflict-model.md)        | The sync and conflict model Koinon owns and operationalises.                   |
| [ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md) | The module taxonomy and the "earns its own module" test.                       |
| [ADR-0002](./ADR-0002-portable-workspace-format.md)      | The op envelope (HLC, `parents`, `conflict.recorded`) the exchange depends on. |
