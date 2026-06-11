# ADR-0004: Storage-Engine Abstraction and Single-Writer Queue

- Status: Accepted
- Date: 2026-06-10
- Depends-On: ADR-0001

## Context

The runtime database is a **derived index engine** (ADR-0001): it ingests op segments, validates them, resolves facts at a time slice, maintains ordered tuple indexes and graph projections, feeds search/vector sidecars, survives crashes, and rebuilds from canonical files. The right question is not "SQL vs NoSQL" but whether an engine supports ordered tuple-style access paths, atomic multi-index updates, rebuildable projections, and predictable crash recovery.

The codebase contains a substantial SeaORM/SQLite store (`crates/mneme_store`). All candidate embedded engines serialise writes one way or another: SQLite serialises writes (WAL adds reader/writer overlap, not multi-writer); LMDB/MDBX allow many readers and one writer; redb gives MVCC readers plus one writer; RocksDB offers more write flexibility but still needs application-owned indexes and a controlled commit path.

Locking in a single engine before Aideon-specific benchmarks exist is premature. The right architecture exposes a narrow trait and keeps the engine pluggable.

## Governance Framing

- **Decision type:** Stable seam (the storage trait) + provisional (the chosen backend).
- **Known future pressure:** projection rebuilds and background indexing may become write-heavy; read-heavy traversal profiles may favour a different engine.
- **What stays stable:** a narrow Mneme storage trait; one single-writer queue per workspace; reads from snapshots; the keyspace/index layout (see [`../05-modules/mneme/RUNTIME-AND-ENGINE.md`](../05-modules/mneme/RUNTIME-AND-ENGINE.md)).
- **What is provisional:** SQLite as the only backend today; engine choice generally.
- **What is deferred:** committing to a single production engine before Aideon-specific benchmark data exists.
- **Why easy to reverse (mostly):** the workspace format is the contract; the engine sits behind the trait and can be swapped without changing callers or the canonical data.

## Decision

- **Define a storage-engine trait** (the Mneme store interface) and keep the backend pluggable. Engines never define truth; they accelerate it.
- **Sequence the engines:** SQLite is the **reference baseline and test oracle** (it is the current implementation); **redb** is the first serious Rust-native prototype candidate; **RocksDB** is the high-write fallback if projection rebuilds dominate; **LMDB/MDBX** is the read-heavy alternative. Decide with benchmark data, not in the abstract.
- **Embrace a single-writer queue per workspace.** UI commands post to one writer actor that batches small writes, writes blobs via temp-file-plus-rename, appends ops, updates primary indexes atomically, and only then queues longer-running projection work. Reads come from snapshots.
- **Treat the database as a cache, not the format or the sync unit.** SQLite WAL files (`-wal`/`-shm`) and any engine state live under `.aideon/runtime/`, are same-host only, and are never synced or exported.

## Consequences

- "Rebuild runtime from workspace" (delete `.aideon/runtime/`, reconstruct) is a supported, tested path — and a correctness oracle: a rebuilt runtime must yield the same effective graph.
- Backpressure is explicit: when the write queue saturates, the core returns a typed `BACKPRESSURE` error and the UI switches from optimistic to queued state ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).
- Per-read-class caching and event-driven invalidation apply to the local derived database; there is no HTTP/CDN tier. Cache discipline is documented in [`../05-modules/mneme/RUNTIME-AND-ENGINE.md`](../05-modules/mneme/RUNTIME-AND-ENGINE.md).
