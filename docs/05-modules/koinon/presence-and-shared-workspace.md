# Presence and the shared workspace

Why presence and shared-workspace signals are derived and ephemeral, never canonical truth. For practitioners reasoning about what a dropped peer loses and why presence never touches the op log.

> **PLANNED.** No `koinon` crate exists; this is design intent per [ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md).

## Presence is a session signal, not truth

Who is connected, what they are viewing, and their cursor and selection state are **ephemeral session signals** Koinon broadcasts. They are **never written to the op log and never define truth** ([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)). Presence is derived, like a projection: it describes the live session, not the twin. The clean consequence is that **a peer that drops loses presence, not data** — its operations are already in the op log (or will sync when it reconnects), while its cursor and "currently viewing" state disappear ([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)).

This keeps the canonical/derived boundary intact ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)): the op log is truth and is durable; presence is a live signal and is disposable. Mixing them — writing "user X is viewing entity Y" as an operation — would pollute the canonical history with session noise that replays meaninglessly and bloats the log.

## The shared workspace

The shared workspace is the same twin seen by several peers, kept consistent by the operations-only exchange ([sync and conflict](./sync-and-conflict.md)), with presence layered on top so collaborators can see one another. Because each peer rebuilds derived state locally from the synced operations, "shared" does not mean a shared live database — it means a shared canonical history that each peer resolves through its own viewpoint. Two peers can therefore view the _same_ shared workspace through _different_ viewpoints at the same time, and each sees the snapshot their viewpoint resolves.

## Provisional, and an open boundary question

The presence model is **provisional** ([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)). Two questions are open ([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)):

- **Where presence belongs** — in Koinon, or in the Host event bus — since presence is transport-adjacent and the Host already owns the event bus and the trust boundary ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).
- **Whether real-time co-editing needs selective coordination** beyond the converging op exchange — some invariants may not converge purely and could need a coordinated path ([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md) defers this).

Either way, the invariant holds: presence stays ephemeral and never becomes canonical truth.

## Worked example

Two architects open the same shared workspace. Architect A views the seed twin at the actual-layer base case; architect B views it through a planning scenario. Koinon broadcasts each one's presence — A's cursor on the `Capability` `n:capability:customer-insight`, B's on the `Application` `n:application:automation-orchestrator` — so each sees where the other is working. Neither presence signal is written to the op log. When B edits the application, that edit is an operation and syncs to A; when B closes the laptop, B's presence vanishes from A's view but B's edit remains, because the edit was canonical and the presence was not.

## References & standards

_Informative:_

- Shapiro et al. — **Conflict-free Replicated Data Types**, 2011. The converging op exchange presence layers on top of.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                 | What it covers                                              |
| ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| [Koinon README](./README.md)                                             | The module index and invariants.                            |
| [Sync and conflict](./sync-and-conflict.md)                              | The operations-only exchange beneath the shared workspace.  |
| [ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)      | The decision that fixes presence as derived, not canonical. |
| [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) | The Host event bus presence may belong to.                  |
