# Why a Database File Is Not the Project

Why an embedded database file cannot be the canonical record, even though one sits inside the **workspace** as derived
runtime. This file answers the recurring question "couldn't the project be a single `.db` file?" with the reasons it
cannot.

## The principle

A database file is not portable in the way the product needs, for four reasons that compound.

- **Writes serialise.** SQLite serialises writes against a database file; concurrent writers contend for the same file
  rather than composing independent intent _(SQLite documentation)_. The product's authoring model is many independent
  edits that must later reconcile, which a single serialised file does not express.
- **WAL adds host-bound sidecars.** In write-ahead-logging mode, SQLite maintains `-wal` and `-shm` companion files, and
  those carry same-host constraints: the shared-memory file and the WAL are tied to the machine and processes accessing
  them, and a database copied mid-transaction without its sidecars is incomplete _(SQLite documentation, WAL mode)_. A
  folder copied with an open WAL is not a clean, portable unit.
- **Pages do not carry semantic intent.** Database pages and WAL frames encode storage layout — B-tree pages, free
  lists, page numbers — not the portable semantic intent of an authoring action. A diff of two database files is a diff
  of pages, which does not map to "this user linked this application to this capability."
- **Two divergent files cannot be merged by meaning.** Because pages encode layout rather than intent, two database
  files that diverged on different machines cannot be merged at the level of meaning. Page-level reconciliation produces
  a corrupt file, not a merged model.

A folder of **operations**, schema-as-data, and content-addressed blobs avoids each of these. It can be copied as
ordinary files, diffed at the level of operations, synced by exchanging missing operations and blob hashes, and **merged
by meaning**: because each operation is an independent statement of intent, divergent histories reconcile as a set of
operations rather than as conflicting bytes. This is the convergence property that conflict-free replicated data types
formalise — independent updates that commute and converge without coordination _(Shapiro et al., Conflict-free
Replicated Data Types, 2011)_. The product reconciles operations and semantic **facts**, not file diffs.

The trade-off is named: a folder of operations cannot be queried as directly as a database can. That is exactly why the
product keeps a database — but as **derived** runtime, rebuildable from the canonical folder, never as the authority.
The decision that makes the storage engine replaceable behind a trait, with a single-writer queue per workspace, is
[ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md). The database file lives under `.aideon/runtime/`
precisely because it is derived; the canonical-versus-derived rule is in [the authority split](./authority-split.md).

## References & standards

_Normative:_

- **SQLite** official documentation (WAL mode, pragmas). The write-serialisation behaviour, the `-wal`/`-shm` sidecars,
  and their same-host constraints.

_Informative:_

- Shapiro et al. — **Conflict-free Replicated Data Types**, 2011. The convergence property behind merging divergent
  histories by meaning rather than by bytes.

## Related documents

| Document                                                                                  | What it covers                                          |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [`./README.md`](./README.md)                                                              | The folder layout and the thesis index.                 |
| [The authority split](./authority-split.md)                                               | Why the database file is derived, not canonical.        |
| [ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)                          | The replaceable storage engine and single-writer queue. |
| [`mneme/storage-trait-and-engine.md`](../../05-modules/mneme/storage-trait-and-engine.md) | The storage trait the engine sits behind.               |
| [`mneme/SQLITE.md`](../../05-modules/mneme/SQLITE.md)                                     | The embedded-store specification.                       |
| [The load-bearing decisions](./load-bearing-decisions.md)                                 | The full ADR set that fixes these invariants.           |
| [`CONTEXT.md`](../../../CONTEXT.md)                                                       | The canonical domain glossary.                          |
