# Testing Strategy

Defines test layers, coverage expectations, and per-module obligations across Aideon Desktop's renderer, host, and engine crates.

Most regressions surface at boundaries. Every layer targets the seam, not just the interior.

---

## Test Layers

| Layer | Tooling | Scope |
|---|---|---|
| Unit | Vitest (TS), `cargo test` (Rust) | Pure functions, utilities, adapters in isolation |
| Contract / boundary | Vitest + `@tauri-apps/api/mocks` (TS), `cargo test` (Rust) | IPC command envelopes, DTO shape parity, typed trait surfaces |
| Integration | `cargo test --all-targets` | Engine-to-engine flows, host ↔ engine trait calls, storage round-trips |
| Replay / rebuild | `cargo test` (dedicated test binary) | Rebuild derived state from canonical ops-log; verify graph equivalence |
| Crash recovery | `cargo test` (with controlled process termination) | Kill-during-append, kill-during-blob-attach, kill-during-projection-rebuild |
| E2E / smoke | Tauri WebDriver (`tauri-driver`) | Packaged binary; critical user flows end-to-end |

---

## Coverage Targets

| Language / crate group | Lines | Branches | Functions | Statements |
|---|---|---|---|---|
| TypeScript / React (new code) | ≥ 80 % | ≥ 80 % | ≥ 80 % | ≥ 80 % |
| Rust host (`crates/desktop`) | ≥ 80 % | ≥ 80 % | ≥ 80 % | — |
| Rust engines (`crates/praxis`, `crates/chrona`, `crates/metis`, `crates/continuum`, `crates/mneme`) | ≥ 90 % | ≥ 90 % | ≥ 90 % | — |

Coverage gates are hard failures in CI. Overall coverage must trend upward; never regress existing baselines.

Generated code is excluded from coverage accounting. Deterministic tests are preferred over broad snapshots. Flaky tests are fixed or quarantined with a tracking issue.

---

## Common Commands

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

### E2E Prerequisites

- Install the driver: `cargo install tauri-driver` (or set `TAURI_E2E_DRIVER_PATH`).
- Linux (Ubuntu 24.04): `sudo apt install webkit2gtk-driver` on PATH.
- E2E specs live under `tests/e2e/specs/`.

---

## Layer Detail

### Unit Tests

- Cover pure functions, utilities, store reducers, and adapter helpers in isolation.
- Use fixed seeds for graph-data generators; never rely on wall-clock time.
- React component unit tests use Vitest + Testing Library; assert behaviour and state, not markup structure.
- Rust unit tests use `#[cfg(test)]` modules inline or under `tests/` per crate.

### Contract / Boundary Tests

#### IPC Contract (TypeScript)

Every command listed in [`docs/contracts/ipc-manifest.json`](../contracts/ipc-manifest.json) must have a test that:

1. Calls the Tauri command wrapper (request/response envelope) using `mockIPC` from `@tauri-apps/api/mocks`.
2. Asserts the response shape for at least one realistic success scenario.
3. Asserts the error envelope shape for at least one error scenario.

Tests live under `tests/e2e/specs/ipc/` or alongside the adapter they exercise. The ipc-manifest is a contract artifact; shape changes require updating [`docs/04-contracts/CONTRACTS-AND-SCHEMAS.md`](../04-contracts/CONTRACTS-AND-SCHEMAS.md).

```ts
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';

afterEach(() => clearMocks());

test('temporal_state_at returns a valid StateAtResponse envelope', async () => {
  mockIPC((cmd, args) => {
    if (cmd === 'temporal_state_at') return { ok: true, data: stubStateAt(args) };
  });
  const result = await praxisApi.temporalStateAt({ asOf: '2025-01-01', scenario: null });
  expect(result).toMatchObject({ ok: true, data: expect.objectContaining({ nodes: expect.any(Array) }) });
});
```

#### DTO Parity (TypeScript ↔ Rust)

When a DTO type is added or changed:

- Update the TypeScript definition in `app/AideonDesktop/src/dtos/`.
- Update the Rust definition in `crates/mneme` (or the owning crate).
- Add a contract test asserting that the serialised form from the Rust side deserialises cleanly into the TypeScript type.

#### Rust Trait Surfaces

Engine traits defined in `crates/praxis`, `crates/chrona`, `crates/metis`, `crates/continuum`, and `crates/mneme` must have at least one integration test that exercises the trait through its public surface (not just an internal helper).

### Integration Tests

- Test engine-to-engine flows through typed traits, not through Tauri commands.
- Test host ↔ engine wiring: verify that a `WorkerState` dispatch reaches the correct engine trait method and the response flows back correctly.
- Test storage round-trips: write an op, read it back, assert canonical form matches.
- Use the patterns in `crates/desktop/src/temporal.rs` and `crates/praxis/tests/merge_flow.rs` as golden paths.

### Replay / Rebuild Tests

The workspace is split into a **canonical portable folder** (ops-log, blobs, workspace metadata) and a **derived runtime database** (`.aideon/runtime`). Rebuild tests verify that the invariant holds: deleting the runtime and rebuilding from canonical files yields an equivalent effective graph.

Each replay test must:

1. Build a synthetic graph by appending ops to the canonical ops-log.
2. Flush and close the runtime database.
3. Delete the runtime directory.
4. Trigger a full rebuild from the canonical ops-log.
5. Assert that the rebuilt graph is identical (node count, edge count, temporal state) to the pre-delete snapshot.

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

Replay tests run in the workspace integration test suite (`cargo test -p aideon_desktop -- replay`).

### Crash Recovery Tests

Crash recovery tests simulate an unclean shutdown at each critical write boundary and verify that a subsequent cold start leaves the system in a consistent state with no data loss beyond the interrupted operation.

Three required scenarios:

| Scenario | Injection point | Expected post-recovery state |
|---|---|---|
| Kill during op append | After write begins, before fsync | Op either fully present or fully absent; no partial write |
| Kill during blob attach | After blob write begins, before content-address index update | Blob either indexed and retrievable or fully absent; no dangling reference |
| Kill during projection rebuild | After runtime DB is partially written | Runtime is discarded; next cold start triggers a clean rebuild from canonical |

Each test uses a controllable fault-injection wrapper that panics (or signals) at the designated point, then re-launches a fresh host process against the same workspace directory.

```rust
#[test]
fn crash_during_op_append_leaves_consistent_state() {
    let ws = TempWorkspace::new();
    ws.fault_inject_after(FaultPoint::OpAppendWrite);
    let _ = std::panic::catch_unwind(|| ws.append_op(synthetic_op()));
    ws.clear_fault();
    ws.cold_start();
    let ops = ws.read_canonical_ops();
    assert!(ops.len() == 0 || ops.last().unwrap().is_complete());
}
```

### E2E / Smoke Tests

E2E tests run against the packaged Tauri binary via Tauri WebDriver. They cover critical user flows only; detailed edge-case coverage belongs in lower layers.

Required smoke flows:

- Launch and workspace open (cold start from empty directory).
- Create a node, verify it appears in the canvas.
- Step the time cursor forward, verify graph state updates.
- Open the properties panel for a selected node.
- Quit and relaunch, verify workspace state persists.

E2E tests live under `tests/e2e/specs/`. Avoid timeout-based assertions; use deterministic waits (element visibility, network idle equivalents via IPC event stubs).

---

## Boundary Coverage Matrix

Every changed boundary must cover the relevant rows:

| Boundary | What to test |
|---|---|
| Temporal context (valid-time / asserted-time / HLC) | Correct time propagation through IPC and engine calls; `as-of` queries return state consistent with the supplied timestamp |
| Scenario context | Ops scoped to a scenario do not bleed into the base layer; scenario branch/merge is covered |
| Accepted-work + backpressure | Long jobs return an accepted-work response; the caller polls or subscribes; cancellation stops the job cleanly |
| Projection freshness | A write that affects a projection triggers an invalidation or refresh; stale reads are not served after a write is committed |
| Stable error envelopes | All IPC commands return the same error envelope shape on failure; renderer parses error type from envelope, not from message string |
| Renderer isolation | No renderer HTTP calls; no renderer FS access; renderer receives only typed IPC responses |
| Content-addressed blobs | A stored blob is retrievable by its content address; re-attaching identical content does not duplicate storage |
| Single-writer queue | Concurrent writes are serialised; no two writes corrupt each other's op record |

---

## Per-Module Obligations

### `app/AideonDesktop` (Renderer)

- Unit: adapters, hooks, store reducers, utility functions.
- Contract: all IPC commands in `ipc-manifest.json` (see [IPC Contract](#ipc-contract-typescript) above).
- DTO parity: every DTO type paired with its Rust counterpart.
- UI component smoke: loading, error, and empty states covered by Vitest + Testing Library.
- Renderer boundary: tests assert that no `fetch` / `XMLHttpRequest` / FS calls are made outside IPC; use `mockIPC` / `mockWindows` exclusively.

### `crates/desktop` (Host)

- Unit: command handlers, error mapping, config resolution.
- Integration: `WorkerState` dispatch to engine traits; cold-start workspace resolution; capability / permission checks.
- Crash recovery tests (see above).
- IPC envelope: every command handler tested for correct `Ok` and `Err` envelope wrapping.
- No Tauri-specific code in engine trait implementations; host is the only Tauri-aware crate.

### `crates/praxis` (Graph / temporal engine)

- Unit: op application, temporal graph queries (`state_at`, `diff`, `topology_delta`), scenario branching.
- Integration: full `merge_flow` golden path (see `crates/praxis/tests/merge_flow.rs`).
- Replay: rebuild test targeting praxis graph state.
- Coverage target: ≥ 90 %.

### `crates/mneme` (Storage)

- Unit: op serialisation / deserialisation, content-address blob storage, index integrity.
- Integration: single-writer queue under concurrent writes; storage trait swap (in-memory ↔ file-backed).
- Crash recovery tests for op-append and blob-attach scenarios.
- Coverage target: ≥ 90 %.

### `crates/chrona` (Time engine)

- Unit: HLC generation, valid-time / asserted-time propagation, Plan/Actual layer queries.
- Integration: time context flows correctly through scenario and plan-event operations.
- See `docs/05-modules/mneme/RUNTIME-AND-ENGINE.md` for time-first invariants.
- Coverage target: ≥ 90 %.

### `crates/metis` (Analytics)

- Unit: centrality, impact analysis, TCO calculation with deterministic graph seeds.
- Integration: analytics dispatch through `WorkerState`; golden 5 k / 50 k node datasets for performance envelope assertions.
- PII redaction: any analytics output that includes node labels must pass through the redaction layer; redaction is tested.
- Coverage target: ≥ 90 %.

### `crates/continuum` (Scheduler / connectors)

- Unit: connector adapter stubs, job lifecycle (enqueue, run, retry, cancel).
- Integration: accepted-work response and backpressure under concurrent scheduling.
- Coverage target: ≥ 90 %.

---

## Cross-Platform Matrix

CI runs the full test suite on all three platforms. Platform-specific behaviour is explicitly tested, not assumed to be equivalent.

| Platform | Unit + integration | Contract (IPC) | Replay / rebuild | Crash recovery | E2E smoke |
|---|---|---|---|---|---|
| macOS (arm64 / x86_64) | required | required | required | required | optional (binary signed) |
| Windows (x86_64) | required | required | required | required | required |
| Linux (x86_64, Ubuntu 24.04) | required | required | required | required | required (headless `xvfb-run`) |

Platform-specific notes:

- **Path resolution**: workspace folder resolution uses `dirs`/`directories` crates and Tauri path helpers; tests must not hard-code repo-relative paths.
- **Windows file locking**: crash recovery tests on Windows must account for file-lock semantics (files cannot be deleted while open); fault-injection wrappers handle this explicitly.
- **macOS E2E**: Tauri WebDriver runs against a locally built (unsigned) binary in CI; signed binary testing is a pre-release manual gate.
- **Linux headless**: `pnpm run webdriver:test:headless` wraps with `xvfb-run`; WebKit driver (`webkit2gtk-driver`) must be on PATH.

---

## Rules

- Update tests whenever behaviour or DTO shapes change; never ship a shape change without a corresponding contract test update.
- Prefer deterministic tests (fixed seeds, fixed timestamps, synthetic graphs) over tests that depend on wall-clock time or filesystem state.
- Validate boundary rules in tests: assert no renderer HTTP, no open ports, no direct FS access from the renderer.
- Node / Vitest tests that touch Tauri IPC or window APIs must use `mockIPC`, `mockWindows`, and `clearMocks` from `@tauri-apps/api/mocks`; never invoke real Tauri APIs in unit or contract tests.
- Add tests for PII redaction and role filtering wherever code touches export or analytics outputs.
- Do not suppress lint or type errors in test files; refactor the test to satisfy static analysis.

---

## Related Documents

- [Coding Standards](CODING-STANDARDS.md)
- [Design Governance](DESIGN-GOVERNANCE.md)
- [Architecture Boundary](../01-architecture/ARCHITECTURE-BOUNDARY.md)
- [Contracts and Schemas](../04-contracts/CONTRACTS-AND-SCHEMAS.md)
- [Runtime and Engine (Mneme)](../05-modules/mneme/RUNTIME-AND-ENGINE.md)
- [Desktop-First Workspace](../03-design/DESKTOP-FIRST-WORKSPACE.md)
