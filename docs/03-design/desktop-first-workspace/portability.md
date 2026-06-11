# Portability

The portability properties the workspace format aims to hold, stated as design-intent **targets** to be validated — not as measured results. This file fixes the gap left by earlier prose that asserted portability without quantifying it. Every number below is a target the implementation must be measured against; none is a guarantee until a benchmark confirms it.

## The properties the format targets

Portability is the constraint that the canonical data is a folder or package, not an opaque runtime database. The following are the properties the format is designed to meet. They are framed as targets so that a reviewer can write a test against each one.

| Property                                    | Design-intent target                                                                                                                                                                                               | Status                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Open without a service                      | A workspace should open by selecting its folder, with no service or server install required.                                                                                                                       | Design intent (must be validated against a clean machine).                                                          |
| Copy / zip / move is a filesystem operation | Copying, zipping, or moving a workspace should be an ordinary filesystem operation, requiring no export step and no running process.                                                                               | Design intent.                                                                                                      |
| Workspace-open time                         | A workspace of a stated reference size should reach an interactive **effective graph** within a stated target open time. The reference size and the target are owned by the performance budget, not asserted here. | Target — to be set and measured; see [`mneme/performance-budget.md`](../../05-modules/mneme/performance-budget.md). |
| Derived-runtime rebuild                     | After deleting `.aideon/runtime/`, a rebuild from canonical material alone should reproduce the same effective graph within a stated target rebuild time and with a bounded, characterised cost.                   | Target — to be set and measured.                                                                                    |
| Binaries dedup by hash                      | Identical blob bytes should be stored once and referenced by their content hash, so copies and shared content do not multiply storage.                                                                             | Design intent; the addressing scheme is fixed (see below).                                                          |

The targets for open time and rebuild time are deliberately not given as fixed numbers in this file, because a number stated without its reference workload and its measurement method teaches the reader something false. The performance budget owns those numbers and the workload that defines them. This file's obligation is to name _which_ properties must be measured and to mark them as unvalidated until they are.

The trade-off is named: rebuildable derived structures mean the first open after a copy may pay a rebuild cost that a ready-made database file would not. The format accepts that cost as the price of the other portability properties.

## What fixes these properties

The portability properties rest on two decisions:

- The **portable workspace format** — that the canonical record is a folder of operation segments, schema-as-data, and content-addressed blobs that a filesystem can copy and move — is fixed by [ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md). The open-without-a-service and copy-is-a-filesystem-operation targets derive from it.
- **Deterministic export** — that exporting a workspace or package produces byte-reproducible output — is fixed by [ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md). Reproducible export is what lets a copy be compared and verified, and what makes the dedup-by-hash property checkable.

Content-addressed dedup itself is fixed by the object store ([ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md)); this file references that property rather than redefining it.

## References & standards

_Normative:_

- Merkle, 1987; **Git internals**; **IPFS** content-addressable storage. The hash-addressed, deduplicated blob handling behind the dedup-by-hash target.

## Related documents

| Document                                                                          | What it covers                                         |
| --------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [`./README.md`](./README.md)                                                      | The folder layout and the thesis index.                |
| [The thesis](./the-thesis.md)                                                     | The portability constraint and its design consequence. |
| [ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md)                   | The portable workspace format.                         |
| [ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)                | Deterministic, reproducible export.                    |
| [ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md)              | Content-addressed blob storage and dedup.              |
| [`mneme/performance-budget.md`](../../05-modules/mneme/performance-budget.md)     | The owner of the open-time and rebuild-time numbers.   |
| [`mneme/export-import-replay.md`](../../05-modules/mneme/export-import-replay.md) | Export, import, and replay of the canonical material.  |
| [`CONTEXT.md`](../../../CONTEXT.md)                                               | The canonical domain glossary.                         |
