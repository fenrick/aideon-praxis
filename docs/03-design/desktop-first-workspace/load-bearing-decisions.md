# The Load-Bearing Decisions

The ADRs that hold the desktop-first thesis up, each in one line. These are the decisions that, if reversed, would change the product's shape. Each links to its full record; the full set lives in the [ADR index](../../06-adrs/ADRS.md).

## The decisions

- **[ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md) — Workspace is the canonical authority.** Operations and schema-as-data are canonical; facts and projections are derived from them.
- **[ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md) — Portable workspace format.** The canonical record is a folder of operation segments, schema-as-data, and blobs that a filesystem can copy and move.
- **[ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md) — Content-addressed object store.** Binaries are immutable blobs referenced by content hash, deduplicated by that hash.
- **[ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md) — Storage engine abstraction.** The runtime storage engine is replaceable behind a trait, with a single-writer queue per workspace.
- **[ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md) — Sync and conflict model.** Sync exchanges operations and missing blob hashes; conflicts are first-class records, not lost writes.
- **[ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) — Tauri trust boundary and typed IPC.** The renderer is untrusted; Rust owns all side effects through typed IPC.
- **[ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md) — Deterministic package export.** Export is deterministic and byte-reproducible.
- **[ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md) — Projection consistency model.** Derived projections declare their honest state — fresh, stale, or rebuilding — and refresh under defined correctness conditions.

The first seven fix the canonical-folder shape and its boundary; ADR-0027 fixes how the derived side stays honest about its freshness against the canonical side. Together they are the invariants the rest of this folder explains.

## References & standards

_Informative:_

- Fowler; Young — **Event Sourcing & CQRS**. The pattern ADR-0001 and ADR-0027 realise.
- Merkle, 1987; **Git internals**; **IPFS** content-addressable storage. The basis for ADR-0003.
- Shapiro et al. — **Conflict-free Replicated Data Types**, 2011. The convergence basis for ADR-0005.

## Related documents

| Document                                                                        | What it covers                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [`./README.md`](./README.md)                                                    | The folder layout and the thesis index.                 |
| [The thesis](./the-thesis.md)                                                   | The thesis these decisions fix.                         |
| [The authority split](./authority-split.md)                                     | The canonical-versus-derived rule (ADR-0001, ADR-0027). |
| [Why a database file is not the project](./why-a-db-file-is-not-the-project.md) | The reasoning behind ADR-0004 and ADR-0005.             |
| [`ADRS.md`](../../06-adrs/ADRS.md)                                              | The full ADR index.                                     |
| [`CONTEXT.md`](../../../CONTEXT.md)                                             | The canonical domain glossary.                          |
