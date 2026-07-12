# Runtime and engine layout

The keyspace and index design that turns a key-value or relational engine into a fast tuple-space store, the query path,
and the engine bake-off behind [ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md). The storage _seam_ is
in [storage-trait-and-engine](./storage-trait-and-engine.md); the default SQLite _schema_ is in
[SQLITE.md](./SQLITE.md). This file is the engine-agnostic layout.

> **Filename note.** This file is referenced as `RUNTIME-AND-ENGINE.md` (uppercase) because the repository host's
> filesystem is case-insensitive: a lowercase `runtime-and-engine.md` would collide with this name. Incoming cross-links
> across the corpus point here, and this file carries the full content rather than a stub.

---

## What the runtime is for

Mneme's local runtime is a derived index engine. It ingests new operation segments, validates them, resolves facts at a
viewpoint, maintains ordered indexes and graph projections, feeds search and vector sidecars, exposes the narrow trait
to the host, survives crashes, and rebuilds itself from canonical files on demand.

The design insight: a key-value engine is not inherently good at tuple-space questions; it becomes good when the
application writes the access paths it needs. The model lives in the **key design and the write discipline**, not in the
bare existence of a key-value API. The same is true of a relational engine — the index layout, not the table existence,
is what makes the temporal questions cheap.

---

## Keyspace and index layout

Expressed as ordered keys (the engine-neutral form; the SQLite table-and-index realisation is in
[SQLITE.md](./SQLITE.md)):

```text
op/{ws}/{segment}/{offset}
op_dep/{ws}/{op_id}/{parent_op_id}

entity/{ws}/{entity_id}
edge/{ws}/{edge_id}

fact/spo/{ws}/{scenario}/{subject}/{predicate}/{object}/{valid_from}/{op_id}
fact/pos/{ws}/{scenario}/{predicate}/{object}/{subject}/{valid_from}/{op_id}
fact/osp/{ws}/{scenario}/{object}/{subject}/{predicate}/{valid_from}/{op_id}

prop/{ws}/{entity_id}/{field_id}/{valid_from}/{op_id}
schema/type/{ws}/{type_id}   schema/field/{ws}/{field_id}   schema/rule/{ws}/{rule_id}

blob/ref/{ws}/{entity_id}/{blob_hash}

proj/adj/out/{ws}/{scenario}/{entity_id}/{edge_type}/{to_id}
proj/adj/in/{ws}/{scenario}/{entity_id}/{edge_type}/{from_id}
proj/status/{ws}/{projection_name}

search/doc/{ws}/{doc_id}     vector/doc/{ws}/{doc_id}
```

The `spo / pos / osp` families are the three access paths for tuple-space reads — "all facts for subject X", "all
subjects satisfying predicate P and object O", and reverse-traversal reads — each maintained so the common queries are
an ordered range scan rather than a full table scan. The `scenario` segment lets an overlay be read without rewriting
base facts; the `valid_from` segment orders facts within a slot for the resolution chain
([bitemporal-and-hlc](./bitemporal-and-hlc.md)).

---

## The query path

A read resolves in a small number of bounded steps:

1. **Containment range scan.** For a `(subject, predicate)` slot at an as-of valid time, scan the `spo` (or `prop`)
   range and keep facts whose `[valid_from, valid_to)` contains the instant — an ordered scan bounded by the facts on
   that slot, not the store.
2. **Precedence selection.** Apply specificity → latest asserted time (bounded by the viewpoint's `as_of_asserted_at`) →
   op-id to pick the per-layer winner ([bitemporal-and-hlc](./bitemporal-and-hlc.md)).
3. **Layer combination.** Combine per-layer winners under the viewpoint's layer policy
   ([scenarios-and-layers](./scenarios-and-layers.md)).
4. **Scenario overlay.** If a scenario is set, overlay scenario facts on the baseline result.

There is no general cost-based query optimiser; the access paths are designed so the resolver picks the right index by
the shape of the question, and the planner is the resolver's fixed strategy. Traversal reads (`graph_slice`) use the
`proj/adj/*` adjacency projection rather than re-resolving every relationship, so a bounded N-hop traversal is
`O(edges visited)` against the projection, not against the fact log. The complexity bound matters: an analytic over the
graph reads the projection ([Metis](../metis/README.md) owns the algorithms over it), never the raw op log.

---

## The engine bake-off

The runtime engine sits behind the storage trait, so it is replaceable without touching the workspace format or any
caller ([ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)). The candidates and their trade-offs:

| Engine          | Properties                                                         | Fit                                                            | Cost it carries                                                                                                          |
| --------------- | ------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **SQLite**      | Embedded, single-file, ordered, transactional, WAL, inspectable    | The current default **and** the correctness oracle for rebuild | B-tree write amplification under heavy random insert; single-writer.                                                     |
| **redb**        | Pure-Rust, ACID, MVCC, crash-safe, low packaging friction          | Rust-native alternative behind the same trait                  | Younger, smaller ecosystem; fewer inspection tools.                                                                      |
| **RocksDB**     | Ordered LSM key-value, transactions, multithreaded compaction      | Candidate for write-heavy projection rebuilds                  | LSM write amplification and compaction-driven read-latency tails _(O'Neil et al., The Log-Structured Merge-Tree, 1996)_. |
| **LMDB / MDBX** | Memory-mapped B+tree, cheap range scans, many readers + one writer | Candidate for read-heavy traversal profiles                    | Fixed-size memory map; write throughput bounded by the single writer.                                                    |

The LSM trade-off is the one to name explicitly: a log-structured merge-tree turns random writes into sequential ones at
the cost of read amplification and background compaction _(O'Neil et al., 1996)_ — attractive if projection rebuilds
dominate, less so for the read-heavy, range-scan profile the resolver actually exhibits. SQLite's B-tree is the
conservative default because it is single-file (portable), inspectable (the oracle property — a human can open the file
and check a rebuild), and transactional. The bake-off is decided by _measured_ write/read profiles, not by the table
above; the table records the hypotheses. The current decision — SQLite as default behind the trait — is design intent
for the alternatives, which are candidates, not yet implemented.

Whichever engine backs the runtime, the canonical workspace semantics are identical, the trait is identical, and the
rebuild guarantee holds ([storage-trait-and-engine](./storage-trait-and-engine.md)).

---

## Invariants

- The runtime holds nothing not reconstructible from canonical files
  ([derived-runtime-and-projections](./derived-runtime-and-projections.md)).
- Deleting `.aideon/runtime/` and rebuilding produces the same effective graph — a tested correctness property
  ([TESTING-STRATEGY](../../02-standards/TESTING-STRATEGY.md)).
- One writer per workspace; reads from snapshots; explicit backpressure on saturation.

---

## References & standards

_Informative:_

- O'Neil et al. — _The Log-Structured Merge-Tree_, 1996. The write-amplification trade-off in the LSM candidate engines.
- Berenson et al. — _A Critique of ANSI SQL Isolation Levels_, 1995. The MVCC read semantics redb and the others
  provide.

## Related documents

| Document                                                         | What it covers                                                   |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| [ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md) | The storage-engine abstraction that makes the bake-off possible. |
| [The storage trait and engine](./storage-trait-and-engine.md)    | The seam and the single-writer queue.                            |
| [SQLite specification](./SQLITE.md)                              | The default engine's concrete table and index realisation.       |
| [Bitemporal model and the HLC](./bitemporal-and-hlc.md)          | The resolution chain the query path implements.                  |
| [Metis module](../metis/README.md)                               | The analytics that read the adjacency projection.                |
| [Mneme README](./README.md)                                      | The module index.                                                |
