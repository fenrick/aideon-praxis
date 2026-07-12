# Crate structure

The layout of the `praxis` crate (`aideon_praxis`), file by file, so a reader can locate where each responsibility is
implemented. For a reader navigating the source.

---

## Layout

```text
crates/praxis/src/
├── engine/          # PraxisEngine — commit, branch, diff, merge, snapshot resolution
│   ├── mod.rs       # Public surface: commit, create_branch, state_at, diff_summary, …
│   ├── config.rs    # PraxisEngineConfig
│   ├── init.rs      # Engine initialisation
│   ├── ops.rs       # Core operations (commit, merge, diff, topology_delta)
│   ├── seed.rs      # Baseline seed loading
│   ├── state.rs     # Inner mutable state (branches, registry, snapshot cache)
│   └── util.rs      # Snapshot resolution helpers
├── meta/            # Metamodel loading, compilation, and validation
│   ├── mod.rs       # Public re-exports
│   ├── config.rs    # MetaModelConfig — source (file / inline / default)
│   ├── loader.rs    # JSON/YAML document loading
│   ├── model.rs     # Type and relationship descriptors; inheritance resolution
│   ├── registry.rs  # MetaModelRegistry — validate_node, validate_edge, allows_duplicate
│   ├── types.rs     # MetaModelDocument, MetaType, MetaRelationship, MetaAttribute, …
│   └── validation.rs
├── graph.rs         # GraphSnapshot — immutable apply/diff, endpoint integrity
├── store.rs         # Store trait, MemoryStore, SqliteDb
├── temporal.rs      # ChangeSet, CommitRef, StateAtArgs, DiffSummary, MergeRequest, …
├── canvas.rs        # Canvas layout persistence
├── dataset.rs       # Dataset helpers
├── graph_layout.rs  # Graph layout types
├── meta_seed.rs     # Core metamodel seed payload
├── error.rs         # PraxisError, PraxisResult
└── lib.rs
```

---

## How the modules map to responsibilities

| Module                         | Responsibility it implements                                                                                                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `engine/`                      | The `PraxisEngine` surface: commit, branch, diff, merge, and snapshot resolution ([tasks and Change Events](./tasks-and-change-events.md), [merge and conflict](./merge-and-conflict.md)).                                         |
| `meta/`                        | Metamodel loading, inheritance resolution, and the registry's `validate_node` / `validate_edge`, which the snapshot engine calls on every write ([metamodel ownership](./metamodel-ownership.md)).                                 |
| `graph.rs`                     | The immutable `GraphSnapshot` — apply, diff, and endpoint integrity.                                                                                                                                                               |
| `temporal.rs`                  | The commit-based temporal types (`ChangeSet`, `CommitRef`, `StateAtArgs`, `DiffSummary`, `MergeRequest`) shared with the temporal contract ([temporal and scenario context](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)). |
| `store.rs`                     | The `Store` trait and its two implementations — `MemoryStore` for tests, `SqliteDb` for the local runtime; the schema auto-migrates on open.                                                                                       |
| `canvas.rs`, `graph_layout.rs` | Canvas and graph-layout persistence for artefact presentation.                                                                                                                                                                     |
| `error.rs`                     | `PraxisError` and `PraxisResult` — the crate's failure surface ([failure modes](./failure-modes.md)).                                                                                                                              |

The crate exposes capability traits and typed structs; consuming modules depend on those traits, not on these concrete
types ([boundaries](./boundaries.md)).

---

## Related documents

| Document                                                                | What it covers                                     |
| ----------------------------------------------------------------------- | -------------------------------------------------- |
| [Boundaries](./boundaries.md)                                           | What this crate depends on and what depends on it. |
| [Failure modes](./failure-modes.md)                                     | The `PraxisError` taxonomy.                        |
| [Module dependency map](../../01-architecture/module-dependency-map.md) | The crate's place in the dependency graph.         |
