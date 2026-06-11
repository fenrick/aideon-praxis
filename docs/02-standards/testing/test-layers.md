# Test Layers

The six test layers, their tooling and scope, and the commands that run them. Each layer aims at a seam, not just the interior. The [index](./README.md) gives the cross-cutting posture; this file is the layer reference.

## The six layers

| Layer                   | Tooling                                                    | Scope                                                                                                                              |
| ----------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**                | Vitest (TS), `cargo test` (Rust)                           | Pure functions, utilities, adapters in isolation                                                                                   |
| **Contract / boundary** | Vitest + `@tauri-apps/api/mocks` (TS), `cargo test` (Rust) | IPC command envelopes, DTO shape parity, typed trait surfaces ([boundary-and-contract-tests.md](./boundary-and-contract-tests.md)) |
| **Integration**         | `cargo test --all-targets`                                 | Engine-to-engine flows, host ↔ engine trait calls, storage round-trips                                                             |
| **Replay / rebuild**    | `cargo test` (dedicated test binary)                       | Rebuild derived state from the canonical op log; verify graph equivalence                                                          |
| **Crash recovery**      | `cargo test` (with controlled process termination)         | Kill-during-append, kill-during-blob-attach, kill-during-projection-rebuild                                                        |
| **E2E / smoke**         | Tauri WebDriver (`tauri-driver`)                           | Packaged binary; critical user flows end to end                                                                                    |

## Common commands

```sh
# TypeScript / React
pnpm run node:test                     # unit + contract
pnpm run node:test:coverage            # with coverage report
pnpm run node:typecheck

# Rust
cargo test --all --all-targets         # unit + integration
pnpm run host:coverage                 # requires cargo-llvm-cov

# Lint / format
pnpm run host:lint && pnpm run host:check
pnpm run ci                            # full TS + Rust lint/typecheck/test/format gate

# E2E (Tauri WebDriver)
pnpm run node:e2e                      # skips macOS by default
pnpm run webdriver:test                # Tauri WebDriver smoke tests
pnpm run webdriver:test:headless       # Linux headless via xvfb-run
```

### E2E prerequisites

- Install the driver: `cargo install tauri-driver` (or set `TAURI_E2E_DRIVER_PATH`).
- Linux (Ubuntu 24.04): `sudo apt install webkit2gtk-driver` on `PATH`.
- E2E specs live under `tests/e2e/specs/`.

## Layer detail

### Unit tests

- Cover pure functions, utilities, store reducers, and adapter helpers in isolation.
- Use **fixed seeds** for graph-data generators; never rely on wall-clock time.
- React component unit tests use Vitest + Testing Library; assert behaviour and state, not markup structure.
- Rust unit tests use `#[cfg(test)]` modules inline or under `tests/` per crate.

### Contract / boundary tests

The full discipline — IPC envelopes, DTO parity, trait surfaces, and the contract-coverage matrix against the IPC manifest — is in [boundary-and-contract-tests.md](./boundary-and-contract-tests.md).

### Integration tests

- Test engine-to-engine flows through typed traits, not through Tauri commands.
- Test host ↔ engine wiring: verify that a `WorkerState` dispatch reaches the correct engine trait method and the response flows back correctly.
- Test storage round-trips: write an op, read it back, assert the canonical form matches.
- Use the patterns in `src-tauri/src/temporal.rs` and `crates/praxis/tests/merge_flow.rs` as golden paths.

### Replay / rebuild tests

The workspace splits into a **canonical portable folder** (op log, blobs, metadata) and a **derived runtime database** (`.aideon/runtime`). Rebuild tests verify the invariant: deleting the runtime and rebuilding from canonical files yields an equivalent effective graph ([blobs-and-integrity.md](../security/blobs-and-integrity.md), [ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)).

Each replay test must:

1. Build a synthetic graph by appending ops to the canonical op log.
2. Flush and close the runtime database.
3. Delete the runtime directory.
4. Trigger a full rebuild from the canonical op log.
5. Assert the rebuilt graph is identical (node count, edge count, temporal state) to the pre-delete snapshot.

```rust
#[test]
fn rebuild_from_ops_log_yields_identical_graph() {
    let ws = TempWorkspace::new();
    ws.append_ops(synthetic_ops(200));
    let snapshot_before = ws.graph_snapshot();
    ws.delete_runtime();
    ws.rebuild_from_canonical();
    let snapshot_after = ws.graph_snapshot();
    assert_eq!(snapshot_before, snapshot_after);
}
```

Replay tests run in the workspace integration suite (`cargo test -p aideon_desktop -- replay`).

### Crash recovery tests

Crash recovery tests simulate an unclean shutdown at each critical write boundary and verify that a subsequent cold start leaves the system consistent with no data loss beyond the interrupted operation.

| Scenario                       | Injection point                                              | Expected post-recovery state                                               |
| ------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Kill during op append          | After write begins, before fsync                             | Op fully present or fully absent; no partial write                         |
| Kill during blob attach        | After blob write begins, before content-address index update | Blob indexed and retrievable or fully absent; no dangling reference        |
| Kill during projection rebuild | After the runtime DB is partially written                    | Runtime discarded; next cold start triggers a clean rebuild from canonical |

Each test uses a controllable fault-injection wrapper that panics (or signals) at the designated point, then relaunches a fresh host process against the same workspace directory.

```rust
#[test]
fn crash_during_op_append_leaves_consistent_state() {
    let ws = TempWorkspace::new();
    ws.fault_inject_after(FaultPoint::OpAppendWrite);
    let _ = std::panic::catch_unwind(|| ws.append_op(synthetic_op()));
    ws.clear_fault();
    ws.cold_start();
    let ops = ws.read_canonical_ops();
    assert!(ops.is_empty() || ops.last().unwrap().is_complete());
}
```

### E2E / smoke tests

E2E tests run against the packaged Tauri binary via Tauri WebDriver. They cover critical user flows only; edge-case coverage belongs in lower layers.

Required smoke flows:

- Launch and workspace open (cold start from an empty directory).
- Create an entity, verify it appears on the canvas.
- Step the time cursor forward, verify the effective graph updates.
- Open the properties panel for a selected entity.
- Quit and relaunch, verify workspace state persists.

E2E tests live under `tests/e2e/specs/`. Avoid timeout-based assertions; use deterministic waits (element visibility, network-idle equivalents via IPC event stubs).

## Related documents

| Document                                                           | What it covers                          |
| ------------------------------------------------------------------ | --------------------------------------- |
| [Testing index](./README.md)                                       | The cross-cutting posture and rules.    |
| [boundary-and-contract-tests.md](./boundary-and-contract-tests.md) | The contract layer in full.             |
| [coverage-and-gates.md](./coverage-and-gates.md)                   | Coverage targets and the flakiness SLA. |
| [cross-platform-matrix.md](./cross-platform-matrix.md)             | Which layers run on which platform.     |
