# Transport variants

The transports the sync protocol runs over — shared filesystem, cloud relay, and peer-to-peer — and what each assumes and trades off. For practitioners reasoning about how peers reach one another, as distinct from what they exchange.

> **PLANNED.** No `koinon` crate exists; this is design intent per [ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md). The network transport and encryption envelopes are **deferred** ([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)); the desktop default has no network trust boundary ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).

## The protocol is transport-independent

The [sync protocol](./sync-protocol.md) — advertise an inventory, diff it, transfer the missing operations and blobs by hash, ingest idempotently — does not name a transport. Because the exchange unit is immutable, hash-identified operations and blobs, and ingestion is idempotent and order-robust ([ADR-0034](../../06-adrs/ADR-0034-merge-correctness-and-convergence.md)), the same protocol runs over any channel that can move bytes from one peer to another. A transport is only required to deliver an inventory and then deliver requested segments and blobs; it is **not** required to be ordered, exactly-once, or even reliable, because idempotency and set-union merge absorb redelivery and partial transfer. This is what lets the transport be a deferred, swappable choice rather than part of the convergence guarantee.

Every transport sits behind the Host trust boundary: a remote peer is untrusted input until its operations validate against the metamodel, and the Host mediates the channel ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). No transport grants the renderer network access; sync is a Host capability ([Koinon README](./README.md)).

## The three variants

| Transport             | How peers reach each other                                                           | What it assumes                                                                    | What it trades off                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shared filesystem** | Both peers can read and write a common directory (a synced folder, a network share). | A filesystem both can see; no live network session; no peer-discovery service.     | No real-time presence — peers exchange whenever each next visits the folder; conflicting blob writes rely on the same atomic rename Mneme uses locally. |
| **Cloud relay**       | A hosted service stores and forwards inventories, segments, and blobs between peers. | A reachable relay endpoint and an encryption envelope; Themis-gated peer identity. | A second trust boundary and an operator; introduces a network port and an availability dependency the desktop default avoids.                           |
| **Peer-to-peer**      | Peers connect directly (LAN discovery or a brokered direct connection).              | Mutual reachability and a session key; a discovery or rendezvous mechanism.        | Liveness — both peers online at once; NAT/firewall traversal; no durable store-and-forward, so an offline peer syncs only on reconnection.              |

### Shared filesystem

The closest to the desktop-first default: no network trust boundary, no port, no operator. The workspace's canonical files already live on disk in a portable, segment-structured format ([ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md)); a shared folder lets two peers see each other's sealed segments and blobs directly, and the inventory diff is computed over the files present. File-watching is a hint, not authority — the Host watches the canonical roots, debounces, and re-validates before ingesting ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). The trade-off named: there is no live session, so presence is at best "last seen" rather than real-time, and convergence latency is the cadence at which each peer revisits the folder.

### Cloud relay

The variant for peers who are never online at the same time or cannot reach each other directly. A relay stores inventories, segments, and blobs and forwards them; because the payload is the same hash-identified operations and blobs, the relay need not understand the model — it stores and forwards opaque, content-addressed bytes. This is the deployment that needs the deferred pieces: an encryption envelope so the relay never sees cleartext, and Themis identity to gate which peer may push or pull ([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md); [ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). The trade-off named: it reintroduces the network trust boundary and operator the desktop default exists without, so it is a later deployment variant, not the primary model ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).

### Peer-to-peer

A direct channel between two reachable peers — useful on a LAN or via a brokered direct connection. It needs no central store, so there is no operator and no third party holding bytes, but it assumes liveness: both peers online at once, and a way to discover or rendezvous. The trade-off named: an offline peer cannot be synced to until it reconnects, so peer-to-peer pairs naturally with one of the store-and-forward variants for asynchronous collaboration.

## Why the choice is open

These are alternatives over the same protocol, not forks of it. The convergence guarantee ([ADR-0034](../../06-adrs/ADR-0034-merge-correctness-and-convergence.md)) holds identically on all three, because none of them changes the exchange unit or the merge. A deployment may use more than one — for example, peer-to-peer on a LAN for low-latency exchange and a cloud relay for asynchronous catch-up — and a peer does not need to know, when it ingests an operation, which transport delivered it. The transport, the encryption envelope, and the relay all remain deferred ([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)); this file records the option space, not a chosen default beyond the local-first, no-network posture of the desktop build.

## Worked example

A two-person team collaborates on the seed workspace from two laptops.

- **At the office**, both laptops are on the same LAN. They use the **peer-to-peer** transport: laptop A discovers laptop B, they exchange inventories, and A's new `realises` relationship on `n:capability:customer-insight` transfers directly to B within seconds — low latency, no third party.
- **Working remotely**, the laptops are rarely online together. They switch to a **cloud relay**: each laptop pushes its sealed segments and blobs to the relay when online, and pulls the other's when it next connects. The relay forwards encrypted, hash-identified bytes it cannot read.
- **For an air-gapped review**, an architect drops the exported segments into a **shared folder** on a secure file server; a colleague's laptop ingests them on its next visit.

In all three, the operations and the convergence are identical — the same `realises` relationship lands on B's twin and resolves the same way — because only the channel differs, never the exchange unit ([ADR-0034](../../06-adrs/ADR-0034-merge-correctness-and-convergence.md)).

## References & standards

_Informative:_

- Shapiro et al. — **Conflict-free Replicated Data Types**, 2011. The set-union merge that makes an unreliable transport sufficient.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                 | What it covers                                                     |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| [Koinon README](./README.md)                                             | The module index and invariants.                                   |
| [Sync protocol](./sync-protocol.md)                                      | The transport-independent handshake and transfer.                  |
| [Offline and reconnection](./offline-and-reconnection.md)                | Offline editing and reconciliation, which each transport realises. |
| [ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)            | The deferred transport and encryption envelopes.                   |
| [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) | The Host trust boundary every transport sits behind.               |
