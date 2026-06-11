# The Thesis

The single thesis the product rests on, stated in full: the thing a user handles is a normal workspace folder, and the fast structures Mneme builds from it are disposable. This file is for a reader deciding whether the product's shape holds together.

## The principle

Aideon Desktop is a **file-first canonical workspace** plus a **derived local index engine**. What the user opens, copies, zips, shares, syncs, or backs up is a normal **workspace** folder: append-only **operation** segments, the **metamodel** as schema-as-data, and immutable content-addressed blobs. Mneme reads that workspace and builds fast local structures — tuple indexes, **effective graph** projections, search indexes, vector sidecars, runtime checkpoints. Those structures are disposable.

Authority lives in the workspace, not in a database file and not in a local service. **Operations** and temporal **facts** are canonical; everything Mneme computes from them is derived. This mirrors event sourcing: the append-only log is the truth, and read models are projections rebuilt from it _(Fowler; Young, Event Sourcing & CQRS)_. The authority rule itself is stated once in [the authority split](./authority-split.md); this file states why the product is shaped that way, not where each thing lives.

The trade-off is explicit. Treating the folder as canonical means the product carries the cost of rebuilding derived structures on open and of keeping projections honest about staleness, rather than reading a single ready-made database. The product accepts that cost to gain portability, offline authoring, and merge by meaning. The decision that fixes this is [ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md).

## How the constraints map to the design

Each product constraint forces a design consequence. The canonical-folder shape is the choice that satisfies all of them at once.

| Constraint                       | Design consequence                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| Desktop-first, no server install | The canonical workspace opens locally without a service.                                   |
| Portability and sharing          | Canonical data is a folder/package, not an opaque runtime database.                        |
| Offline operation                | Writes append locally first; any sync is asynchronous.                                     |
| Multi-user merge                 | Reconcile operations and semantic facts, not file diffs.                                   |
| Binary handling                  | Blobs live outside the fact log, referenced by hash.                                       |
| Optional hosted mode             | A hosted store materialises the same workspace semantics behind the persistence interface. |

Read the table as a chain: the constraint on the left can only be met by the consequence on the right, and the consequence on the right is only coherent if operations and facts — not files or pages — are the unit of truth. The portability consequences are quantified as design-intent targets in [portability](./portability.md). The merge consequence rests on reconciling operations rather than bytes, examined in [why a database file is not the project](./why-a-db-file-is-not-the-project.md).

## References & standards

_Normative — the storage shape this thesis adopts:_

- Fowler; Young — **Event Sourcing & CQRS**. The append-only operation log is the canonical truth; derived read models are rebuilt from it. This is the pattern the canonical-versus-derived split realises.

_Informative:_

- Merkle, 1987; **Git internals**; **IPFS** content-addressable storage. The hash-addressed blob handling behind the binary-handling constraint.

## Related documents

| Document                                                                                  | What it covers                                                         |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`./README.md`](./README.md)                                                              | The folder layout and the index to this thesis.                        |
| [The authority split](./authority-split.md)                                               | The canonical-versus-derived rule, stated once.                        |
| [Portability](./portability.md)                                                           | The portability consequences as design-intent targets.                 |
| [Why a database file is not the project](./why-a-db-file-is-not-the-project.md)           | Why a folder, not a database file, is canonical.                       |
| [ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)                    | The decision that the portable workspace is the canonical authority.   |
| [`mneme/README.md`](../../05-modules/mneme/README.md)                                     | The module that reads the workspace and builds the derived structures. |
| [`TEMPORAL-AND-SCENARIO-CONTEXT.md`](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The temporal model the facts carry.                                    |
| [`CONTEXT.md`](../../../CONTEXT.md)                                                       | The canonical domain glossary.                                         |
